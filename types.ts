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

export type ChainType = 'TRX' | 'ETH' | 'SOL' | 'BNB';

export interface CryptoWallet {
  chain: ChainType;
  address: string;
  privateKey: string; // For virtual wallets, this is a mock key
  balance: number;
  hexAddress?: string; // Only relevant for TRX/ETH/BNB-ish
  activity: WalletActivity[];
  isMain?: boolean; 
  label?: string; 
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
  wallet?: CryptoWallet; // User's personal Tron wallet (Main)
  subWallets?: CryptoWallet[]; // Secondary wallets controlled by API key
  
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