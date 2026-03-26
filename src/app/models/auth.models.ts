export interface UserModel {
  email: string;
  name: string;
}

export interface LoginResponseDto {
  userId: string;
  email: string;
  name: string;
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
  totalEntries: number;
  firstEntryId: string | null;
  firstEntryDate: Date | null;
  latestEntryId: string | null;
  latestEntryDate: Date | null;
  currentStreak: number;
}
