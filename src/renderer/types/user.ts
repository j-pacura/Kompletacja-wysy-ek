export interface User {
  id: number;
  name: string;
  surname: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: number;
  last_login: number | null;
  active: boolean;
}

export interface LoginCredentials {
  name: string;
  surname: string;
  password: string;
}

export interface RegisterUserInput {
  name: string;
  surname: string;
  password: string;
  role?: 'admin' | 'user';
}

export interface UserSession {
  user: User;
  loginTime: number;
}

// Public user info (without password hash)
export type PublicUser = Omit<User, 'password_hash'>;
