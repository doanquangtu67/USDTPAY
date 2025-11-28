export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface WalletActivity {
  id: string;
  type: 'received' | 'sent';
  amount: number;
  timestamp: string;
}

export interface TronWallet {
  address: string;
  privateKey: string;
  balance: number;
  hexAddress: string;
  activity: WalletActivity[];
  isMain?: boolean; // New field to identify the primary wallet
  label?: string; // Optional label for UI
}

export interface ApiKeyPurchase {
  id: string;
  key: string;
  purchasedAt: string;
  expiresAt: string;
  durationLabel: string;
  cost: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  joinedAt: string; // ISO Date string
  status: 'active' | 'suspended';
  apiKey?: string;
  apiKeyCreatedAt?: string; // ISO Date for key generation
  apiKeyExpiresAt?: string; // ISO Date for expiration
  apiKeyHistory?: ApiKeyPurchase[]; // History of purchased keys
  usage?: number;
  password?: string;
  subscriptionPlanId?: string;
  wallet?: TronWallet; // User's personal Tron wallet
  subWallets?: TronWallet[]; // Secondary wallets controlled by API key
  
  // 2FA Fields
  isTwoFactorEnabled?: boolean;
  twoFactorSecret?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
}

export interface ApiProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  endpoints: number;
}