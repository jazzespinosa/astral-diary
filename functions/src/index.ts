import {beforeUserSignedIn} from "firebase-functions/v2/identity";
import {HttpsError} from "firebase-functions/v2/https";
import {logger} from "firebase-functions/logger";

export const validateVerificationOnSignIn = beforeUserSignedIn((event) => {
  const user = event.data;
  const SIGNUP_GRACE_WINDOW_MS = 2000; // 2 seconds

  const creation = user?.metadata.creationTime ?
    new Date(user?.metadata.creationTime).getTime() :
    0;

  const accountAge = creation ? Date.now() - creation : Number.MAX_SAFE_INTEGER;

  const claims = (user?.customClaims ?? {}) as Record<string, unknown>;
  const graceUsed = claims["unverifiedGraceUsed"] === true;

  logger.info("FUNCTION: beforeUserSignedIn", {
    user: user,
    uid: user?.uid,
    email: user?.email,
    emailVerified: user?.emailVerified,
    providerIds: (user?.providerData ?? []).map((p) => {
      return p.providerId;
    }),
  });

  // If verified, always allow
  if (user?.emailVerified) return;

  // If not verified:
  // Allow ONLY the initial signup auto-login (short window) and ONLY once.
  const withinGraceWindow = accountAge >= 0 &&
    accountAge <= SIGNUP_GRACE_WINDOW_MS;

  if (withinGraceWindow && !graceUsed) {
    // Consume the grace so next unverified sign-in is blocked
    return {
      customClaims: {
        ...claims,
        unverifiedGraceUsed: true,
      },
    };
  }

  throw new HttpsError(
    "permission-denied",
    "You must verify your email before signing in."
  );
});
