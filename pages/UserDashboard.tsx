import React, { useState, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { Button } from '../components/Button';
import { ChainType } from '../types';
import { 
  Key, 
  Copy, 
  CheckCircle, 
  Zap, 
  LogOut,
  Wallet,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Timer,
  ShieldCheck,
  Lock,
  Plus,
  History,
  Shield,
  QrCode,
  Globe
} from 'lucide-react';

export const UserDashboard: React.FC = () => {
  const { 
    currentUser, logout, refreshUserBalance, sendUserTron, trxPrice, 
    purchaseApiKey, createSubWallet, withdrawSubWallet,
    generateTwoFactorSecret, enableTwoFactor, disableTwoFactor
  } = useStore();
  const [copied, setCopied] = useState(false);
  
  // Wallet states
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [sendingTx, setSendingTx] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txMessage, setTxMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [walletTwoFactorCode, setWalletTwoFactorCode] = useState('');
  
  // Rental State
  const [renting, setRenting] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isKeyActive, setIsKeyActive] = useState(false);

  // Sub-Wallet States
  const [showCreateSub, setShowCreateSub] = useState(false);
  const [inputApiKey, setInputApiKey] = useState('');
  const [selectedChain, setSelectedChain] = useState<ChainType>('TRX');
  const [creatingSub, setCreatingSub] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<{[key: string]: string}>({});
  const [subWalletTwoFactorCode, setSubWalletTwoFactorCode] = useState<{[key: string]: string}>({});
  const [withdrawing, setWithdrawing] = useState<string | null>(null);

  // 2FA Setup State
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [tempSecret, setTempSecret] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupError, setSetupError] = useState('');

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (currentUser?.id && currentUser.wallet) {
        refreshUserBalance(currentUser.id);
        intervalId = setInterval(() => {
            refreshUserBalance(currentUser.id);
        }, 5000);
    }
    return () => {
        if(intervalId) clearInterval(intervalId);
    }
  }, [currentUser?.id, refreshUserBalance]);

  // Countdown Timer Logic
  useEffect(() => {
    const checkStatus = () => {
        if (!currentUser?.apiKeyExpiresAt) {
            setIsKeyActive(false);
            setTimeLeft('');
            return;
        }

        const now = new Date().getTime();
        const expire = new Date(currentUser.apiKeyExpiresAt).getTime();
        const diff = expire - now;

        if (diff > 0) {
            setIsKeyActive(true);
            
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m ${seconds}s`;
            
            setTimeLeft(timeString);
        } else {
            setIsKeyActive(false);
            setTimeLeft('Expired');
        }
    };

    checkStatus();
    const timerId = setInterval(checkStatus, 1000);
    return () => clearInterval(timerId);
  }, [currentUser?.apiKeyExpiresAt]);

  const handleCopyKey = () => {
    if (currentUser?.apiKey) {
      navigator.clipboard.writeText(currentUser.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleCopyAddress = (addr?: string) => {
      if (addr) {
          navigator.clipboard.writeText(addr);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
  }

  const handleRefreshBalance = async () => {
      if(!currentUser) return;
      setLoadingBalance(true);
      await refreshUserBalance(currentUser.id);
      setLoadingBalance(false);
  }

  const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser || !recipient || !amount) return;

      setSendingTx(true);
      setTxMessage(null);

      const res = await sendUserTron(currentUser.id, recipient, parseFloat(amount), walletTwoFactorCode);
      
      setSendingTx(false);
      setTxMessage({ type: res.success ? 'success' : 'error', text: res.message });
      
      if (res.success) {
          setRecipient('');
          setAmount('');
          setWalletTwoFactorCode('');
          setTimeout(() => setTxMessage(null), 5000);
      }
  }

  const rentalOptions = [
      { label: '1 Hour', cost: 1, id: 'rent_1h' },
      { label: '1 Day', cost: 2, id: 'rent_1d' },
      { label: '1 Week', cost: 3, id: 'rent_1w' },
      { label: '1 Month', cost: 4, id: 'rent_1m' },
      { label: '1 Year', cost: 5, id: 'rent_1y' },
  ];

  const handlePurchase = async (label: string, cost: number, id: string) => {
      if (!currentUser) return;
      setRenting(id);
      const res = await purchaseApiKey(currentUser.id, label, cost);
      if (!res.success) {
          alert(res.message);
      }
      setRenting(null);
  };

  const handleCreateSubWallet = async (e: React.FormEvent) => {
      e.preventDefault();
      if(!currentUser) return;
      setCreatingSub(true);
      const res = await createSubWallet(currentUser.id, inputApiKey, selectedChain);
      setCreatingSub(false);
      
      if(res.success) {
          setShowCreateSub(false);
          setInputApiKey('');
      } else {
          alert(res.message);
      }
  };

  const handleWithdrawSub = async (subAddr: string) => {
      if(!currentUser) return;
      const amt = parseFloat(withdrawAmount[subAddr] || '0');
      const code = subWalletTwoFactorCode[subAddr] || '';
      
      if(amt <= 0) return;

      setWithdrawing(subAddr);
      const res = await withdrawSubWallet(currentUser.id, subAddr, amt, code);
      setWithdrawing(null);

      if(res.success) {
          setWithdrawAmount(prev => ({...prev, [subAddr]: ''}));
          setSubWalletTwoFactorCode(prev => ({...prev, [subAddr]: ''}));
      } else {
          alert(res.message);
      }
  }

  // 2FA Handlers
  const initiate2FASetup = () => {
      if(!currentUser) return;
      const { secret, otpauthUrl } = generateTwoFactorSecret(currentUser.id);
      setTempSecret(secret);
      const encodedUrl = encodeURIComponent(otpauthUrl);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodedUrl}`);
      setShow2FASetup(true);
      setSetupError('');
  };

  const confirm2FASetup = () => {
      if(!currentUser) return;
      if(enableTwoFactor(currentUser.id, tempSecret, setupToken)) {
          setShow2FASetup(false);
          setSetupToken('');
          setTempSecret('');
      } else {
          setSetupError('Invalid code. Please try again.');
      }
  };

  const handleDisable2FA = () => {
      if(window.confirm('Are you sure you want to disable 2FA? This will make your account less secure.')) {
          if(currentUser) disableTwoFactor(currentUser.id);
      }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-gray-200">
        {/* Navbar */}
      <nav className="border-b border-white/10 bg-dark-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-600 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Nexus<span className="text-brand-400">API</span></span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{currentUser?.username}</p>
                <p className="text-xs text-gray-400">
                  {isKeyActive ? 'Premium Member' : 'Free User'}
                </p>
              </div>
              <Button variant="ghost" onClick={logout} className="p-2">
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Welcome Section */}
        <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
                <p className="text-gray-400">Manage your API keys, wallet, and rentals.</p>
            </div>
            
            {/* Security Status */}
            <div className="bg-dark-900 border border-white/5 p-4 rounded-xl flex items-center gap-4">
                <div className={`p-2 rounded-lg ${currentUser?.isTwoFactorEnabled ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                    <Shield className={`h-6 w-6 ${currentUser?.isTwoFactorEnabled ? 'text-green-500' : 'text-red-500'}`} />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-white">Security</h3>
                    <p className="text-xs text-gray-400">
                        2FA is {currentUser?.isTwoFactorEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                </div>
                <div>
                    {currentUser?.isTwoFactorEnabled ? (
                        <Button variant="secondary" className="text-xs py-1" onClick={handleDisable2FA}>Disable</Button>
                    ) : (
                        <Button className="text-xs py-1" onClick={initiate2FASetup}>Enable 2FA</Button>
                    )}
                </div>
            </div>
        </div>

        {/* 2FA Setup Modal/Area */}
        {show2FASetup && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
                <div className="bg-dark-900 border border-white/10 rounded-2xl max-w-sm w-full p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <QrCode className="h-5 w-5 text-brand-400" /> Setup 2FA
                    </h3>
                    <p className="text-sm text-gray-400 mb-4">Scan this QR code with Google Authenticator, then enter the code below.</p>
                    
                    <div className="bg-white p-4 rounded-lg mb-4 w-fit mx-auto">
                        <img src={qrUrl} alt="2FA QR Code" className="w-32 h-32" />
                    </div>
                    
                    <div className="space-y-3">
                        <input 
                            type="text" 
                            placeholder="Enter 6-digit code"
                            value={setupToken}
                            onChange={(e) => setSetupToken(e.target.value)}
                            className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-center text-white text-lg tracking-widest focus:border-brand-500 focus:outline-none"
                            maxLength={6}
                        />
                        {setupError && <p className="text-red-400 text-xs text-center">{setupError}</p>}
                        <div className="flex gap-2">
                            <Button variant="secondary" className="w-full" onClick={() => setShow2FASetup(false)}>Cancel</Button>
                            <Button className="w-full" onClick={confirm2FASetup} disabled={setupToken.length !== 6}>Verify</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Wallet */}
            <div className="lg:col-span-1 space-y-6">
                
                 {/* My Wallet Card */}
                 <div className="bg-gradient-to-br from-gray-900 to-dark-900 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl -translate-y-6 translate-x-6 pointer-events-none"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <div className="flex items-center gap-2">
                            <Wallet className="text-red-500 h-5 w-5" />
                            <h3 className="font-bold text-white">My Wallet</h3>
                        </div>
                        <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0" 
                            onClick={handleRefreshBalance} 
                            isLoading={loadingBalance}
                        >
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>

                    {currentUser?.wallet ? (
                        <div className="space-y-6 relative z-10">
                            {/* Balance Section */}
                            <div className="text-center py-2 bg-black/20 rounded-xl border border-white/5">
                                <div className="text-xs text-emerald-400 flex items-center justify-center gap-1 mb-1">
                                    <TrendingUp className="h-3 w-3" />
                                    1 TRX ≈ ${trxPrice}
                                </div>
                                <div className="flex items-baseline justify-center gap-1">
                                    <span className="text-3xl font-bold text-white">{currentUser.wallet.balance}</span>
                                    <span className="text-sm text-red-500">TRX</span>
                                </div>
                                <div className="text-sm text-gray-500 mt-1">
                                    ≈ ${(currentUser.wallet.balance * trxPrice).toFixed(2)} USDT
                                </div>
                            </div>

                            {/* Address Section */}
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5">
                                <label className="text-[10px] text-gray-500 uppercase font-semibold">Address (Read Only)</label>
                                <div className="flex items-center justify-between gap-2 mt-1">
                                    <code className="text-xs text-gray-300 font-mono truncate">
                                        {currentUser.wallet.address}
                                    </code>
                                    <button onClick={() => handleCopyAddress(currentUser.wallet?.address)} className="text-gray-500 hover:text-white">
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Transfer Form */}
                            <div className="pt-4 border-t border-white/5">
                                <h4 className="text-xs font-bold text-gray-400 mb-2">Transfer Funds</h4>
                                <form onSubmit={handleSend} className="space-y-2">
                                    <input 
                                        type="text" 
                                        placeholder="Recipient Address" 
                                        className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
                                        value={recipient}
                                        onChange={e => setRecipient(e.target.value)}
                                    />
                                    
                                    <div className="flex gap-2">
                                        <input 
                                            type="number" 
                                            placeholder="Amount" 
                                            step="0.000001"
                                            className="w-full bg-dark-950 border border-white/10 rounded px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-red-500 focus:outline-none"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                        />
                                    </div>

                                    {currentUser.isTwoFactorEnabled && (
                                        <div className="relative">
                                            <ShieldCheck className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-brand-400" />
                                            <input 
                                                type="text" 
                                                placeholder="2FA Code"
                                                maxLength={6}
                                                className="w-full bg-dark-950 border border-brand-500/30 rounded px-3 py-2 pl-8 text-xs text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
                                                value={walletTwoFactorCode}
                                                onChange={e => setWalletTwoFactorCode(e.target.value)}
                                            />
                                        </div>
                                    )}

                                    <Button 
                                        type="submit" 
                                        className="w-full bg-red-600 hover:bg-red-500 border-none py-1.5 text-xs mt-2"
                                        isLoading={sendingTx}
                                        disabled={!recipient || !amount || (currentUser.isTwoFactorEnabled && walletTwoFactorCode.length !== 6)}
                                    >
                                        Send TRX <ArrowRight className="h-3 w-3 ml-1" />
                                    </Button>
                                    
                                    {txMessage && (
                                        <p className={`text-[10px] ${txMessage.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                                            {txMessage.text}
                                        </p>
                                    )}
                                </form>
                            </div>

                             {/* Recent Activity Log */}
                             <div className="pt-4 border-t border-white/5">
                                <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                    <Clock className="h-3 w-3" /> Recent Activity
                                </h4>
                                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1 custom-scrollbar">
                                    {!currentUser.wallet.activity || currentUser.wallet.activity.length === 0 ? (
                                        <p className="text-[10px] text-gray-600 italic">No transactions yet.</p>
                                    ) : (
                                        currentUser.wallet.activity.map((activity) => (
                                            <div key={activity.id} className="flex items-center justify-between p-1.5 bg-black/20 rounded border border-white/5">
                                                <div className="flex items-center gap-1.5">
                                                    {activity.type === 'received' ? (
                                                        <ArrowDownLeft className="h-3 w-3 text-green-500" />
                                                    ) : (
                                                        <ArrowUpRight className="h-3 w-3 text-red-500" />
                                                    )}
                                                    <span className="text-[10px] text-gray-300 capitalize">{activity.type}</span>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[10px] font-bold ${activity.type === 'received' ? 'text-green-400' : 'text-white'}`}>
                                                        {activity.type === 'received' ? '+' : '-'}{activity.amount} TRX
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-gray-500">Wallet not initialized.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column: API Rental & Sub-Wallets */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Active Key Display (Only if active) */}
                {isKeyActive && currentUser?.apiKey && (
                    <div className="bg-gradient-to-r from-brand-900/40 to-dark-900 border border-brand-500/30 rounded-2xl p-6 relative overflow-hidden">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <Key className="text-brand-400 h-5 w-5" />
                                    <h3 className="font-bold text-white text-lg">Active API Key</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-xs border border-green-500/20 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                        Live
                                    </span>
                                </div>
                                <div className="bg-dark-950/50 border border-white/5 rounded-lg p-3 flex items-center justify-between group mb-3">
                                    <code className="text-sm text-brand-200 font-mono truncate mr-2 tracking-wide">
                                        {currentUser.apiKey}
                                    </code>
                                    <button 
                                        onClick={handleCopyKey}
                                        className="text-gray-500 hover:text-white transition-colors"
                                    >
                                        {copied ? <CheckCircle className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>
                                <div className="flex gap-6 text-sm">
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Calendar className="h-4 w-4 text-brand-500" />
                                        <span>Expires: <span className="text-white">{new Date(currentUser.apiKeyExpiresAt!).toLocaleDateString()}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <Timer className="h-4 w-4 text-brand-500" />
                                        <span>Time Left: <span className="text-white font-mono">{timeLeft}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rental Options */}
                <div className="bg-dark-900 border border-white/5 rounded-2xl p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white">Rent API Access</h2>
                            <p className="text-sm text-gray-400">Instant activation. Pay with TRX.</p>
                        </div>
                        <span className="text-xs font-medium bg-brand-500/10 text-brand-400 px-2 py-1 rounded">High Speed</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rentalOptions.map((opt) => (
                            <div key={opt.id} className={`group border rounded-xl p-5 transition-all duration-200 flex flex-col justify-between ${
                                isKeyActive ? 'border-white/5 bg-dark-800/20 opacity-75' : 'border-white/10 bg-dark-800/40 hover:bg-dark-800/80 hover:border-brand-500/30'
                            }`}>
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="p-2 bg-dark-800 rounded-lg group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-colors">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <span className="text-lg font-bold text-white">{opt.cost} <span className="text-xs font-normal text-red-500">TRX</span></span>
                                    </div>
                                    <h3 className="font-bold text-white text-lg">{opt.label}</h3>
                                    <p className="text-xs text-gray-400 mt-1">Full access to all endpoints</p>
                                </div>
                                <Button 
                                    className="mt-4 w-full" 
                                    onClick={() => handlePurchase(opt.label, opt.cost, opt.id)}
                                    isLoading={renting === opt.id}
                                    variant={isKeyActive ? 'secondary' : 'primary'}
                                >
                                    {isKeyActive ? 'Extend' : 'Rent Now'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secure Sub-Wallets Vault */}
                <div className="bg-dark-900 border border-white/5 rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className={`h-5 w-5 ${isKeyActive ? 'text-green-500' : 'text-gray-500'}`} />
                            <h2 className="text-lg font-bold text-white">Secure Vault (Sub-Wallets)</h2>
                        </div>
                        {isKeyActive && (
                            <Button 
                                variant="secondary" 
                                className="text-xs py-1 h-8" 
                                onClick={() => setShowCreateSub(!showCreateSub)}
                            >
                                <Plus className="h-4 w-4 mr-1" /> New Wallet
                            </Button>
                        )}
                    </div>

                    {isKeyActive ? (
                        <div className="p-6">
                            {showCreateSub && (
                                <div className="mb-6 bg-dark-950 p-4 rounded-xl border border-white/10">
                                    <h4 className="text-sm font-bold text-white mb-2">Create New Sub-Wallet</h4>
                                    <p className="text-xs text-gray-400 mb-3">Enter your active API key to confirm identity and generate a new wallet.</p>
                                    <div className="flex gap-2 mb-2">
                                        <select 
                                            value={selectedChain}
                                            onChange={(e) => setSelectedChain(e.target.value as ChainType)}
                                            className="bg-dark-900 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                                        >
                                            <option value="TRX">TRX (Tron)</option>
                                            <option value="ETH">ETH (Virtual)</option>
                                            <option value="BNB">BNB (Virtual)</option>
                                            <option value="SOL">SOL (Virtual)</option>
                                        </select>
                                        <input 
                                            type="text" 
                                            value={inputApiKey}
                                            onChange={(e) => setInputApiKey(e.target.value)}
                                            placeholder="Enter API Key (nx_...)" 
                                            className="flex-1 bg-dark-900 border border-white/10 rounded px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                                        />
                                        <Button type="submit" isLoading={creatingSub} disabled={!inputApiKey} onClick={handleCreateSubWallet}>
                                            Create
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {!currentUser?.subWallets || currentUser.subWallets.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-sm">
                                    No sub-wallets created.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {currentUser.subWallets.map((wallet, index) => (
                                        <div key={wallet.address} className="bg-dark-950/50 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                        wallet.chain === 'TRX' ? 'border-red-500 text-red-400' :
                                                        wallet.chain === 'ETH' ? 'border-blue-500 text-blue-400' :
                                                        wallet.chain === 'BNB' ? 'border-yellow-500 text-yellow-400' :
                                                        'border-purple-500 text-purple-400'
                                                    }`}>
                                                        {wallet.chain}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-300 uppercase">{wallet.label || `Wallet ${index + 1}`}</span>
                                                </div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <code className="text-xs text-gray-300 font-mono">{wallet.address}</code>
                                                    <button onClick={() => handleCopyAddress(wallet.address)} className="text-gray-500 hover:text-white">
                                                        <Copy className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-white">{wallet.balance} {wallet.chain}</span>
                                                    {wallet.chain === 'TRX' && (
                                                        <span className="text-[10px] text-gray-500">≈ ${(wallet.balance * trxPrice).toFixed(2)}</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 items-end">
                                                <div className="flex gap-2 items-center">
                                                    <input 
                                                        type="number" 
                                                        placeholder="Amount"
                                                        className="w-20 bg-dark-900 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                                                        value={withdrawAmount[wallet.address] || ''}
                                                        onChange={(e) => setWithdrawAmount(prev => ({...prev, [wallet.address]: e.target.value}))}
                                                    />
                                                    
                                                    {currentUser.isTwoFactorEnabled && (
                                                        <input 
                                                            type="text"
                                                            placeholder="2FA Code"
                                                            maxLength={6}
                                                            className="w-20 bg-dark-900 border border-brand-500/30 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
                                                            value={subWalletTwoFactorCode[wallet.address] || ''}
                                                            onChange={(e) => setSubWalletTwoFactorCode(prev => ({...prev, [wallet.address]: e.target.value}))}
                                                        />
                                                    )}

                                                    <Button 
                                                        variant="secondary" 
                                                        className="text-xs py-1.5 h-auto whitespace-nowrap"
                                                        onClick={() => handleWithdrawSub(wallet.address)}
                                                        isLoading={withdrawing === wallet.address}
                                                        disabled={currentUser.isTwoFactorEnabled && (!subWalletTwoFactorCode[wallet.address] || subWalletTwoFactorCode[wallet.address].length !== 6)}
                                                    >
                                                        {wallet.chain === 'TRX' ? 'Withdraw' : 'Simulate Out'}
                                                    </Button>
                                                </div>
                                                {currentUser.isTwoFactorEnabled && <span className="text-[10px] text-gray-500">2FA Required</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500">
                            <div className="p-4 bg-dark-950 rounded-full mb-3 border border-white/5">
                                <Lock className="h-8 w-8 text-gray-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-300 mb-1">Vault Locked</h3>
                            <p className="text-sm max-w-sm mx-auto">
                                Active API Key required to access or create sub-wallets. Rent a key above to unlock your secure vault.
                            </p>
                        </div>
                    )}
                </div>

                {/* Purchase History */}
                <div className="bg-dark-900 border border-white/5 rounded-2xl overflow-hidden mt-6">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center gap-2">
                            <History className="h-5 w-5 text-gray-400" />
                            <h2 className="text-lg font-bold text-white">Purchase History</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-gray-400 text-xs uppercase font-medium">
                                <tr>
                                    <th className="px-6 py-4">Plan</th>
                                    <th className="px-6 py-4">Cost</th>
                                    <th className="px-6 py-4">Purchase Date</th>
                                    <th className="px-6 py-4">Expiration</th>
                                    <th className="px-6 py-4">API Key</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {(!currentUser?.apiKeyHistory || currentUser.apiKeyHistory.length === 0) ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                                            No history available.
                                        </td>
                                    </tr>
                                ) : (
                                    currentUser.apiKeyHistory.map((purchase) => (
                                        <tr key={purchase.id} className="hover:bg-white/5 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-white">{purchase.durationLabel}</td>
                                            <td className="px-6 py-4 text-sm text-white">{purchase.cost} TRX</td>
                                            <td className="px-6 py-4 text-xs text-gray-400">{new Date(purchase.purchasedAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-xs text-gray-400">{new Date(purchase.expiresAt).toLocaleString()}</td>
                                            <td className="px-6 py-4 text-xs font-mono text-brand-400">{purchase.key}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};