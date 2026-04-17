import {beforeUserSignedIn} from "firebase-functions/v2/identity";
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/logger";
import {randomBytes} from "crypto";
import {getFirestore} from "firebase-admin/firestore";
import {initializeApp} from "firebase-admin/app";

initializeApp();
const db = getFirestore("astral-diary-firestoredb");

export const validateVerificationOnSignIn = beforeUserSignedIn({region: "asia-southeast1"}, (event) => {
  const user = event.data;
  const SIGNUP_GRACE_WINDOW_MS = 60000; // 1 minute to allow for latency/cold starts

  const creation = user?.metadata.creationTime ?
    new Date(user?.metadata.creationTime).getTime() :
    0;

  const accountAge = creation ? Date.now() - creation : Number.MAX_SAFE_INTEGER;

  const claims = (user?.customClaims ?? {}) as Record<string, unknown>;
  const graceUsed = claims["unverifiedGraceUsed"] === true;

  logger.info("Validate Verification On Sign In", {
    uid: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified,
    accountAgeMs: accountAge,
    creationTime: user?.metadata.creationTime,
    withinGraceWindow: accountAge <= SIGNUP_GRACE_WINDOW_MS,
    graceUsed: graceUsed,
  });

  // If verified, always allow
  if (user?.emailVerified) {
    return {
      customClaims: {
        ...claims,
      },
    };
  }

  // If not verified:
  // Allow ONLY the initial signup auto-login (short window) and ONLY once.
  const withinGraceWindow = accountAge >= 0 &&
    accountAge <= SIGNUP_GRACE_WINDOW_MS;

  if (withinGraceWindow && !graceUsed) {
    logger.info(`Allowing grace period sign-in for new user: ${user?.email} (Age: ${accountAge}ms)`);
    // Consume the grace so next unverified sign-in is blocked
    return {
      customClaims: {
        ...claims,
        unverifiedGraceUsed: true,
      },
    };
  }

  logger.warn(`Blocking unverified sign-in for user: ${user?.email} (Age: ${accountAge}ms, GraceUsed: ${graceUsed})`);
  throw new HttpsError(
    "permission-denied",
    "You must verify your email before signing in."
  );
});

export const generateAndSaveUserPepper = onCall(
  {region: "asia-southeast1", enforceAppCheck: false},
  async (request) => {
    try {
      const userId = request.auth?.uid;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const userPepper = randomBytes(16).toString("hex");

      await db.collection("users").doc(userId).set(
        {
          userPepper: userPepper,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {merge: true}
      );

      logger.info(`User pepper saved for ${userId}`);

      return {
        success: true,
        message: "User pepper generated and saved",
      };
    } catch (error: any) {
      logger.error("Error saving user pepper:", error);
      throw new Error(error.message);
    }
  }
);

export const getUserPepper = onCall(
  {region: "asia-southeast1", enforceAppCheck: false},
  async (request) => {
    try {
      const userId = request.auth?.uid;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const userDoc = await db.collection("users").doc(userId).get();

      if (!userDoc.exists) {
        logger.warn(`User document not found for ${userId}`);
        return {
          userPepper: null,
          success: true,
        };
      }

      const userData = userDoc.data();
      const userPepper = userData?.userPepper ?? null;

      if (!userPepper) {
        logger.warn(`User pepper not found for ${userId}`);
      } else {
        logger.info(`Retrieved user pepper for ${userId}`);
      }

      return {
        userPepper: userPepper,
        success: true,
      };
    } catch (error: any) {
      logger.error("Error retrieving user pepper:", error);
      throw new Error(error.message);
    }
  }
);
