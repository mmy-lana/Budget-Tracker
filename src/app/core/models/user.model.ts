export type UserRole = 'owner' | 'partner' | 'demo_guest';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  telegramChatId?: string;
  mfaEnabled: boolean;
  mfaPhoneNumber?: string;
  lastLoginAt: number;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isMfaPending: boolean;
  isLoading: boolean;
  error: string | null;
}