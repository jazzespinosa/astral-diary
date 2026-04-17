export interface UserModel {
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
}

export interface LoginResponseDto {
  userId: string;
  email: string;
  name: string;
  avatar: string | null;
}

export interface SignUpResponseDto {
  name: string;
  email: string;
}

export interface AuthError {
  message: string;
}

export interface GetUserInfoResponse {
  email: string;
  displayName: string;
  avatar: string | null;
  dailyEntries: number;
  totalEntries: number;
  firstEntryId: string | null;
  firstEntryDate: Date | null;
  latestEntryId: string | null;
  latestEntryDate: Date | null;
  currentStreak: number;
}
