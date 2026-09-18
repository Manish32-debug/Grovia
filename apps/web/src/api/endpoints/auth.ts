import type {
  AuthSession,
  LoginInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from '@grovia/shared';
import { api, get, post } from '../client';

export const authApi = {
  register: (input: RegisterInput) => post<AuthSession>('/auth/register', input),
  login: (input: LoginInput) => post<AuthSession>('/auth/login', input),
  logout: () => api.post('/auth/logout'),
  me: () => get<PublicUser>('/auth/me'),
  verifyEmail: (token: string) => post<PublicUser>('/auth/verify-email', { token }),
  resendVerification: () => post<{ sent: boolean }>('/auth/resend-verification'),
  forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
  resetPassword: (input: ResetPasswordInput) =>
    post<{ message: string }>('/auth/reset-password', input),
};
