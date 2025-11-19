export interface User {
  id: number;
  name: string;
  surname: string;
  login: string;
  password_hash: string;
  report_language: 'pl' | 'en';
  role: 'admin' | 'user';
  created_at: number;
  last_login: number | null;
  active: boolean;
}

export interface LoginCredentials {
  login: string;
  password: string;
}

export interface RegisterUserInput {
  name: string;
  surname: string;
  login: string;
  password: string;
  report_language: 'pl' | 'en';
  role?: 'admin' | 'user';
}

export interface UserSession {
  user: User;
  loginTime: number;
}

// Public user info (without password hash)
export type PublicUser = Omit<User, 'password_hash'>;
