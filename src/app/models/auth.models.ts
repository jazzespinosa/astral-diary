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
