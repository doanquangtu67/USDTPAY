import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, UserRole, ApiProduct, TronWallet, WalletActivity, ApiKeyPurchase } from '../types';

interface StoreContextType {
  users: User[];
  currentUser: User | null;
  products: ApiProduct[];
  adminWallets: TronWallet[];
  walletActivity: WalletActivity[];
  trxPrice: number;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  register: (username: string, email: string, password: string) => Promise<void>;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  createAdminWallet: () => Promise<void>;
  deleteAdminWallet: (address: string) => void;
  setMainWallet: (address: string) => void;
  refreshWalletBalance: () => Promise<void>;
  sendTron: (toAddress: string, amount: number) => Promise<{ success: boolean; message: string; txid?: string }>;
  subscribeToPlan: (planId: string) => void;
  refreshUserBalance: (userId: string) => Promise<void>;
  sendUserTron: (userId: string, toAddress: string, amount: number, twoFactorToken?: string) => Promise<{ success: boolean; message: string; txid?: string }>;
  purchaseApiKey: (userId: string, durationLabel: string, cost: number) => Promise<{ success: boolean; message: string }>;
  createSubWallet: (userId: string, inputApiKey: string) => Promise<{ success: boolean; message: string }>;
  withdrawSubWallet: (userId: string, subWalletAddress: string, amount: number, twoFactorToken?: string) => Promise<{ success: boolean; message: string }>;
  
  // 2FA Methods
  generateTwoFactorSecret: (userId: string) => { secret: string; otpauthUrl: string };
  enableTwoFactor: (userId: string, secret: string, token: string) => boolean;
  disableTwoFactor: (userId: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const MOCK_ADMIN: User = {
  id: 'admin-001',
  username: 'admin',
  email: 'admin@nexus.com',
  role: UserRole.ADMIN,
  joinedAt: new Date().toISOString(),
  status: 'active',
  password: '123456',
  subWallets: [],
  apiKeyHistory: []
};

const INITIAL_PRODUCTS: ApiProduct[] = [
  { id: 'p1', name: 'Sentiment Analysis API', description: 'Real-time text emotion detection.', price: 49, endpoints: 5 },
  { id: 'p2', name: 'Image Recognition V2', description: 'High-fidelity object detection.', price: 99, endpoints: 12 },
  { id: 'p3', name: 'Crypto High-Freq Data', description: 'Nanosecond latency market data.', price: 299, endpoints: 3 },
];

// Helper to access window.TronWeb safely
const getTronWeb = (privateKey?: string) => {
  if (typeof window === 'undefined') return null;
  // @ts-ignore
  const tw = window.TronWeb;
  if (!tw) return null;
  
  try {
    // Initialize for Shasta Testnet
    return new tw({
      fullHost: 'https://api.shasta.trongrid.io',
      // Valid dummy key for read-only operations to prevent constructor errors
      privateKey: privateKey || '0101010101010101010101010101010101010101010101010101010101010101' 
    });
  } catch (e) {
    console.error("TronWeb initialization failed", e);
    return null;
  }
};

// Helper for OTPAuth
const verifyToken = (secret: string, token: string): boolean => {
  if (typeof window === 'undefined') return false;
  // @ts-ignore
  const OTPAuth = window.OTPAuth;
  if (!OTPAuth) return true; // Fail safe or dev mode? Let's assume false if library missing.

  const totp = new OTPAuth.TOTP({
    issuer: 'NexusAPI',
    label: 'User',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret)
  });

  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [products] = useState<ApiProduct[]>(INITIAL_PRODUCTS);
  const [adminWallets, setAdminWallets] = useState<TronWallet[]>([]);
  const [walletActivity, setWalletActivity] = useState<WalletActivity[]>([]);
  const [trxPrice, setTrxPrice] = useState<number>(0.15); // Default fallback price
  
  const previousBalanceRef = useRef<number | null>(null);

  useEffect(() => {
    const storedUsers = localStorage.getItem('nexus_users');
    const storedAuth = localStorage.getItem('nexus_auth_user');
    const storedWallets = localStorage.getItem('nexus_admin_wallets');
    const storedOldWallet = localStorage.getItem('nexus_admin_wallet');
    const storedActivity = localStorage.getItem('nexus_wallet_activity');

    if (storedUsers) {
      let parsedUsers = JSON.parse(storedUsers);
      parsedUsers = parsedUsers.map((u: User) => {
        if (u.username === 'admin' && !u.password) {
          return { ...u, password: '123456' };
        }
        if (u.wallet && !u.wallet.activity) {
          u.wallet.activity = [];
        }
        if (!u.subWallets) {
          u.subWallets = [];
        }
        if (!u.apiKeyHistory) {
          u.apiKeyHistory = [];
        }
        return u;
      });
      setUsers(parsedUsers);
    } else {
      setUsers([MOCK_ADMIN]);
      localStorage.setItem('nexus_users', JSON.stringify([MOCK_ADMIN]));
    }

    if (storedAuth) {
      const authUser = JSON.parse(storedAuth);
      if (authUser.wallet && !authUser.wallet.activity) {
        authUser.wallet.activity = [];
      }
      if (!authUser.subWallets) {
        authUser.subWallets = [];
      }
      if (!authUser.apiKeyHistory) {
        authUser.apiKeyHistory = [];
      }
      setCurrentUser(authUser);
    }

    if (storedWallets) {
      const wallets = JSON.parse(storedWallets);
      setAdminWallets(wallets);
      const main = wallets.find((w: TronWallet) => w.isMain);
      if (main) previousBalanceRef.current = main.balance;
    } else if (storedOldWallet) {
      const oldWallet = JSON.parse(storedOldWallet);
      if (!oldWallet.activity) oldWallet.activity = [];
      oldWallet.isMain = true; 
      setAdminWallets([oldWallet]);
      previousBalanceRef.current = oldWallet.balance;
      localStorage.setItem('nexus_admin_wallets', JSON.stringify([oldWallet]));
    }

    if (storedActivity) {
      setWalletActivity(JSON.parse(storedActivity));
    }
    
    fetchTrxPrice();
  }, []);

  const fetchTrxPrice = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tron&vs_currencies=usd');
      if (res.ok) {
        const data = await res.json();
        if (data.tron?.usd) {
          setTrxPrice(data.tron.usd);
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live TRX price, using fallback.");
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchTrxPrice, 120000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const mainWallet = adminWallets.find(w => w.isMain);
    if (mainWallet) {
      const currentBalance = mainWallet.balance;
      const prevBalance = previousBalanceRef.current;

      if (prevBalance !== null && prevBalance !== currentBalance) {
        // Floating point safety check
        if (Math.abs(currentBalance - prevBalance) > 0.000001) {
            const diff = currentBalance - prevBalance;
            const type = diff > 0 ? 'received' : 'sent';
            
            const newActivity: WalletActivity = {
            id: crypto.randomUUID(),
            type,
            amount: Math.abs(diff),
            timestamp: new Date().toISOString()
            };

            setWalletActivity(prev => {
            const updated = [newActivity, ...prev].slice(50);
            localStorage.setItem('nexus_wallet_activity', JSON.stringify(updated));
            return updated;
            });
        }
      }

      previousBalanceRef.current = currentBalance;
    }
    
    if (adminWallets.length > 0 || adminWallets.length === 0) {
      localStorage.setItem('nexus_admin_wallets', JSON.stringify(adminWallets));
    }
  }, [adminWallets]);

  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('nexus_users', JSON.stringify(users));
    }
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('nexus_auth_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('nexus_auth_user');
    }
  }, [currentUser]);

  const login = useCallback((username: string, password: string): boolean => {
    const user = users.find(u => u.username === username);
    if (user && user.password === password) {
      setCurrentUser(user);
      return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    let wallet: TronWallet | undefined;
    try {
      const tronWeb = getTronWeb();
      if (tronWeb) {
        const account = await tronWeb.utils.accounts.generateAccount();
        if (account) {
          wallet = {
            address: account.address.base58,
            hexAddress: account.address.hex,
            privateKey: account.privateKey,
            balance: 0,
            activity: []
          };
        }
      }
    } catch (e) {
      console.error("Failed to generate user wallet", e);
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email,
      role: UserRole.USER,
      joinedAt: new Date().toISOString(),
      status: 'active',
      apiKey: 'nx_' + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join(''),
      usage: 0,
      password: password,
      wallet: wallet,
      subWallets: [],
      apiKeyHistory: [],
      isTwoFactorEnabled: false
    };
    
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser); 
  }, []);

  const deleteUser = useCallback((id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  }, []);

  const toggleUserStatus = useCallback((id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    }));
  }, []);
  
  const subscribeToPlan = useCallback((planId: string) => {
    if (!currentUser) return;
    const updatedUser = { ...currentUser, subscriptionPlanId: planId };
    setCurrentUser(updatedUser);
    setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
  }, [currentUser]);

  const createAdminWallet = useCallback(async () => {
    try {
      const tronWeb = getTronWeb();
      if (!tronWeb) {
        console.error("TronWeb library not loaded");
        alert("TronWeb library is not loaded. Please refresh the page.");
        return;
      }
      
      const account = await tronWeb.utils.accounts.generateAccount();
      
      if (account) {
        const newWallet: TronWallet = {
          address: account.address.base58,
          hexAddress: account.address.hex,
          privateKey: account.privateKey,
          balance: 0,
          activity: [],
          isMain: adminWallets.length === 0, 
          label: `Wallet ${adminWallets.length + 1}`
        };
        
        if (newWallet.isMain) {
           previousBalanceRef.current = 0;
           setWalletActivity([]); 
        }

        setAdminWallets(prev => [...prev, newWallet]);
      }
    } catch (e) {
      console.error("Failed to create wallet", e);
      alert("Failed to generate wallet. See console for details.");
    }
  }, [adminWallets.length]);

  const deleteAdminWallet = useCallback((address: string) => {
    setAdminWallets(prev => {
        const walletToDelete = prev.find(w => w.address === address);
        if (!walletToDelete) return prev;

        const filteredWallets = prev.filter(w => w.address !== address);

        if (walletToDelete.isMain && filteredWallets.length > 0) {
            const newWallets = filteredWallets.map((w, index) => {
                if (index === 0) {
                    return { ...w, isMain: true };
                }
                return w;
            });
            previousBalanceRef.current = newWallets[0].balance;
            return newWallets;
        }

        return filteredWallets;
    });
  }, []);

  const setMainWallet = useCallback((address: string) => {
    setAdminWallets(prev => {
        const next = prev.map(w => ({
            ...w,
            isMain: w.address === address
        }));
        const newMain = next.find(w => w.isMain);
        if (newMain) previousBalanceRef.current = newMain.balance;
        return next;
    });
  }, []);

  const refreshWalletBalance = useCallback(async () => {
    if (adminWallets.length === 0) return;
    
    // Optimization: Reuse a single TronWeb instance for read operations
    const readerTronWeb = getTronWeb();
    if (!readerTronWeb) return;

    const walletBalances = new Map<string, number>();
    
    // Execute sequentially to avoid rate limiting / network congestion
    for (const wallet of adminWallets) {
        try {
            // No need to set private key for fetching balance
            const balanceSun = await readerTronWeb.trx.getBalance(wallet.address);
            const balanceTrx = Number(readerTronWeb.fromSun(balanceSun));
            walletBalances.set(wallet.address, balanceTrx);
        } catch (e) {
            console.warn(`Failed to refresh balance for ${wallet.address}`, e);
        }
    }
    
    setAdminWallets(prevWallets => {
        return prevWallets.map(w => {
            if (walletBalances.has(w.address)) {
                return { ...w, balance: walletBalances.get(w.address)! };
            }
            return w;
        });
    });
  }, [adminWallets]);

  const sendTron = useCallback(async (toAddress: string, amount: number): Promise<{ success: boolean; message: string; txid?: string }> => {
    const mainWallet = adminWallets.find(w => w.isMain);
    if (!mainWallet) return { success: false, message: "No Main Wallet selected" };
    
    try {
      const tronWeb = getTronWeb(mainWallet.privateKey);
      if (!tronWeb) return { success: false, message: "TronWeb not initialized" };

      tronWeb.setPrivateKey(mainWallet.privateKey);
      const amountSun = tronWeb.toSun(amount);

      const receipt = await tronWeb.trx.sendTransaction(toAddress, amountSun);
      
      if (receipt.result) {
        setTimeout(() => refreshWalletBalance(), 3000);
        return { success: true, message: "Transaction broadcasted successfully", txid: receipt.txid };
      } else {
        return { success: false, message: "Transaction failed to broadcast" };
      }
    } catch (e: any) {
      console.error("Transfer error", e);
      return { success: false, message: e.message || "Transfer failed" };
    }
  }, [adminWallets, refreshWalletBalance]);

  const refreshUserBalance = useCallback(async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.wallet) return;

    // Reuse reader instance
    const readerTronWeb = getTronWeb();
    if (!readerTronWeb) return;

    try {
        // Refresh Main Wallet
        const balanceSun = await readerTronWeb.trx.getBalance(user.wallet.address);
        const currentBalance = Number(readerTronWeb.fromSun(balanceSun));
      
        let activity = user.wallet.activity || [];
        const prevBalance = user.wallet.balance;
      
        // Update activity only if there is a significant change
        if (Math.abs(currentBalance - prevBalance) > 0.000001) {
            const diff = currentBalance - prevBalance;
            const newActivity: WalletActivity = {
                id: crypto.randomUUID(),
                type: diff > 0 ? 'received' : 'sent',
                amount: Math.abs(diff),
                timestamp: new Date().toISOString()
            };
            activity = [newActivity, ...activity].slice(0, 50);
        }

        // Refresh Sub Wallets (Sequential)
        let updatedSubWallets = user.subWallets || [];
        if (updatedSubWallets.length > 0) {
            const newSubWallets = [];
            for (const sw of updatedSubWallets) {
                 try {
                    const swBalSun = await readerTronWeb.trx.getBalance(sw.address);
                    const swBal = Number(readerTronWeb.fromSun(swBalSun));
                    newSubWallets.push({ ...sw, balance: swBal });
                } catch (e) {
                    // Keep old state on failure
                    newSubWallets.push(sw);
                }
            }
            updatedSubWallets = newSubWallets;
        }
      
        // Functional update to avoid stale state bugs
        setUsers(prevUsers => {
             return prevUsers.map(u => {
                 if (u.id === userId && u.wallet) {
                     return {
                        ...u, 
                        wallet: { 
                            ...u.wallet, 
                            balance: currentBalance,
                            activity: activity
                        },
                        subWallets: updatedSubWallets
                     };
                 }
                 return u;
             });
        });

        // Sync Current User 
        if (currentUser?.id === userId) {
            setCurrentUser(prev => {
                if(!prev || !prev.wallet) return prev;
                 return {
                    ...prev, 
                    wallet: { 
                        ...prev.wallet, 
                        balance: currentBalance,
                        activity: activity
                    },
                    subWallets: updatedSubWallets
                 };
            });
        }
    } catch (e) {
      console.error("Failed to fetch user balance", e);
    }
  }, [users, currentUser?.id]);

  const sendUserTron = useCallback(async (userId: string, toAddress: string, amount: number, twoFactorToken?: string): Promise<{ success: boolean; message: string; txid?: string }> => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.wallet) return { success: false, message: "User wallet not found" };

    // 2FA Verification
    if (user.isTwoFactorEnabled) {
        if (!twoFactorToken) return { success: false, message: "2FA Token required" };
        if (!user.twoFactorSecret || !verifyToken(user.twoFactorSecret, twoFactorToken)) {
            return { success: false, message: "Invalid 2FA Code" };
        }
    }

    try {
      const tronWeb = getTronWeb(user.wallet.privateKey);
      if (!tronWeb) return { success: false, message: "TronWeb error" };

      tronWeb.setPrivateKey(user.wallet.privateKey);
      const amountSun = tronWeb.toSun(amount);
      const receipt = await tronWeb.trx.sendTransaction(toAddress, amountSun);

      if (receipt.result) {
        setTimeout(() => refreshUserBalance(userId), 3000);
        return { success: true, message: "Sent successfully", txid: receipt.txid };
      }
      return { success: false, message: "Transaction failed" };
    } catch (e: any) {
      return { success: false, message: e.message || "Transfer failed" };
    }
  }, [users, refreshUserBalance]);

  // --- SUB-WALLET LOGIC ---

  const createSubWallet = useCallback(async (userId: string, inputApiKey: string): Promise<{ success: boolean; message: string }> => {
      const user = users.find(u => u.id === userId);
      if (!user) return { success: false, message: "User not found" };

      // Validate API Key presence and correctness
      if (user.apiKey !== inputApiKey) {
          return { success: false, message: "Invalid API Key." };
      }

      // Validate Expiration
      const now = new Date();
      if (!user.apiKeyExpiresAt || new Date(user.apiKeyExpiresAt) < now) {
          return { success: false, message: "API Key expired. Please rent a new key." };
      }

      try {
          const tronWeb = getTronWeb();
          if (!tronWeb) return { success: false, message: "TronWeb library missing" };

          const account = await tronWeb.utils.accounts.generateAccount();
          if (account) {
              const newSubWallet: TronWallet = {
                  address: account.address.base58,
                  hexAddress: account.address.hex,
                  privateKey: account.privateKey,
                  balance: 0,
                  activity: [],
                  label: `Sub-Wallet ${(user.subWallets?.length || 0) + 1}`
              };

              const updatedUser = {
                  ...user,
                  subWallets: [...(user.subWallets || []), newSubWallet]
              };

              setUsers(prev => prev.map(u => u.id === userId ? updatedUser : u));
              if (currentUser?.id === userId) setCurrentUser(updatedUser);

              return { success: true, message: "Sub-wallet created successfully." };
          }
          return { success: false, message: "Failed to generate wallet." };
      } catch (e: any) {
          return { success: false, message: e.message || "Error creating sub-wallet" };
      }
  }, [users, currentUser?.id]);

  const withdrawSubWallet = useCallback(async (userId: string, subWalletAddress: string, amount: number, twoFactorToken?: string): Promise<{ success: boolean; message: string }> => {
      const user = users.find(u => u.id === userId);
      if (!user || !user.wallet) return { success: false, message: "User or main wallet not found" };

      const subWallet = user.subWallets?.find(w => w.address === subWalletAddress);
      if (!subWallet) return { success: false, message: "Sub-wallet not found" };

      // Validate Key Again for Action
      const now = new Date();
      if (!user.apiKeyExpiresAt || new Date(user.apiKeyExpiresAt) < now) {
          return { success: false, message: "API Key expired. Cannot access vault." };
      }

      // 2FA Verification
      if (user.isTwoFactorEnabled) {
        if (!twoFactorToken) return { success: false, message: "2FA Token required" };
        if (!user.twoFactorSecret || !verifyToken(user.twoFactorSecret, twoFactorToken)) {
            return { success: false, message: "Invalid 2FA Code" };
        }
      }

      if (subWallet.balance < amount) {
          return { success: false, message: "Insufficient funds in sub-wallet." };
      }

      // Find Admin Wallet for Fee
      const mainAdminWallet = adminWallets.find(w => w.isMain) || adminWallets[0];
      if (!mainAdminWallet) {
          return { success: false, message: "System error: Admin wallet not found for fee processing." };
      }

      try {
          const tronWeb = getTronWeb(subWallet.privateKey);
          if (!tronWeb) return { success: false, message: "Connection error" };

          tronWeb.setPrivateKey(subWallet.privateKey);

          // Calculate amounts in SUN (integer)
          const totalSun = Number(tronWeb.toSun(amount));
          const feeSun = Math.floor(totalSun * 0.05); // 5% Fee
          const netSun = totalSun - feeSun; // 95% to User

          // 1. Send Net to User Main Wallet
          const receiptNet = await tronWeb.trx.sendTransaction(user.wallet.address, netSun);

          if (!receiptNet.result) {
              return { success: false, message: "Transfer to main wallet failed." };
          }

          // 2. Send Fee to Admin (Sequentially, if first succeeded)
          try {
              const receiptFee = await tronWeb.trx.sendTransaction(mainAdminWallet.address, feeSun);
              if(!receiptFee.result) {
                  console.warn("Fee transfer returned false result");
              }
          } catch (err) {
              console.error("Fee transfer failed", err);
              // Log error but success for user since they got funds
          }

          setTimeout(() => refreshUserBalance(userId), 3000);
          
          const netTrx = tronWeb.fromSun(netSun);
          return { success: true, message: `Transferred ${netTrx} TRX to main wallet. (5% fee deducted)` };
      } catch (e: any) {
          return { success: false, message: e.message || "Transfer error" };
      }
  }, [users, refreshUserBalance, adminWallets]);

  // --- PURCHASE API KEY ---
  const purchaseApiKey = useCallback(async (userId: string, durationLabel: string, cost: number): Promise<{ success: boolean; message: string }> => {
    const user = users.find(u => u.id === userId);
    if (!user || !user.wallet) return { success: false, message: "User not found" };

    if (user.wallet.balance < cost) {
        return { success: false, message: "Insufficient TRX balance" };
    }

    // Ensure we have a destination. Fallback to first wallet if 'isMain' flag is missing in some edge case.
    const mainAdminWallet = adminWallets.find(w => w.isMain) || adminWallets[0];
    if (!mainAdminWallet) return { success: false, message: "System error: Payment receiver unavailable" };

    try {
        const tronWeb = getTronWeb(user.wallet.privateKey);
        if (!tronWeb) return { success: false, message: "Wallet connection failed" };

        // Send Transaction: User -> Admin Main
        tronWeb.setPrivateKey(user.wallet.privateKey);
        const amountSun = tronWeb.toSun(cost);
        const receipt = await tronWeb.trx.sendTransaction(mainAdminWallet.address, amountSun);

        if (!receipt.result) {
            return { success: false, message: "Payment transaction failed" };
        }

        // Calculate Expiration
        const now = new Date();
        const expiresAt = new Date();
        
        switch(durationLabel) {
            case '1 Hour': expiresAt.setTime(now.getTime() + 60 * 60 * 1000); break;
            case '1 Day': expiresAt.setDate(now.getDate() + 1); break;
            case '1 Week': expiresAt.setDate(now.getDate() + 7); break;
            case '1 Month': expiresAt.setMonth(now.getMonth() + 1); break;
            case '1 Year': expiresAt.setFullYear(now.getFullYear() + 1); break;
            default: expiresAt.setHours(now.getHours() + 1);
        }

        const newPurchase: ApiKeyPurchase = {
          id: crypto.randomUUID(),
          key: user.apiKey || '',
          purchasedAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          durationLabel,
          cost
        };

        // Update User State (Deduct balance, set Key Dates, Log Activity)
        setUsers(prev => prev.map(u => {
            if (u.id === userId && u.wallet) {
                return {
                    ...u,
                    apiKeyCreatedAt: now.toISOString(),
                    apiKeyExpiresAt: expiresAt.toISOString(),
                    apiKeyHistory: [newPurchase, ...(u.apiKeyHistory || [])],
                    wallet: {
                        ...u.wallet,
                        balance: u.wallet.balance - cost, // Optimistic update
                        activity: [{
                            id: crypto.randomUUID(),
                            type: 'sent',
                            amount: cost,
                            timestamp: now.toISOString()
                        }, ...u.wallet.activity]
                    }
                };
            }
            return u;
        }));

        if (currentUser?.id === userId) {
            setCurrentUser(prev => {
                if(!prev || !prev.wallet) return prev;
                return {
                    ...prev,
                    apiKeyCreatedAt: now.toISOString(),
                    apiKeyExpiresAt: expiresAt.toISOString(),
                    apiKeyHistory: [newPurchase, ...(prev.apiKeyHistory || [])],
                    wallet: {
                        ...prev.wallet,
                        balance: prev.wallet.balance - cost,
                        activity: [{
                            id: crypto.randomUUID(),
                            type: 'sent',
                            amount: cost,
                            timestamp: now.toISOString()
                        }, ...prev.wallet.activity]
                    }
                };
            });
        }

        return { success: true, message: `Successfully rented for ${durationLabel}` };

    } catch (e: any) {
        console.error("Purchase error", e);
        return { success: false, message: e.message || "Purchase failed" };
    }
  }, [users, adminWallets, currentUser?.id]);

  // --- 2FA Logic ---

  const generateTwoFactorSecret = useCallback((userId: string) => {
    // Generate a random base32 secret
    // Simple implementation since otpauth handles parsing
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 16; i++) {
        secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // @ts-ignore
    const OTPAuth = window.OTPAuth;
    if(!OTPAuth) return { secret, otpauthUrl: '' };

    const totp = new OTPAuth.TOTP({
      issuer: 'NexusAPI',
      label: 'NexusUser',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret)
    });

    return { secret, otpauthUrl: totp.toString() };
  }, []);

  const enableTwoFactor = useCallback((userId: string, secret: string, token: string) => {
    if (verifyToken(secret, token)) {
        setUsers(prev => prev.map(u => {
            if(u.id === userId) {
                return { ...u, isTwoFactorEnabled: true, twoFactorSecret: secret };
            }
            return u;
        }));
        if(currentUser?.id === userId) {
            setCurrentUser(prev => prev ? ({ ...prev, isTwoFactorEnabled: true, twoFactorSecret: secret }) : null);
        }
        return true;
    }
    return false;
  }, [currentUser?.id]);

  const disableTwoFactor = useCallback((userId: string) => {
      setUsers(prev => prev.map(u => {
          if(u.id === userId) {
              return { ...u, isTwoFactorEnabled: false, twoFactorSecret: undefined };
          }
          return u;
      }));
      if(currentUser?.id === userId) {
          setCurrentUser(prev => prev ? ({ ...prev, isTwoFactorEnabled: false, twoFactorSecret: undefined }) : null);
      }
  }, [currentUser?.id]);

  return (
    <StoreContext.Provider value={{ 
      users, currentUser, products, adminWallets, walletActivity, trxPrice,
      login, logout, register, deleteUser, toggleUserStatus,
      createAdminWallet, deleteAdminWallet, setMainWallet, refreshWalletBalance, sendTron, subscribeToPlan,
      refreshUserBalance, sendUserTron, purchaseApiKey, createSubWallet, withdrawSubWallet,
      generateTwoFactorSecret, enableTwoFactor, disableTwoFactor
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};