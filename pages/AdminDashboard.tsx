import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../contexts/StoreContext';
import { UserRole, ChainType } from '../types';
import { Button } from '../components/Button';
import { 
  Users, 
  Activity, 
  DollarSign, 
  Search, 
  Trash2, 
  Power, 
  Shield,
  Sparkles,
  Wallet,
  Copy,
  CheckCircle, 
  RefreshCw,
  Send,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Star,
  Plus,
  Layers,
  Calendar,
  Globe
} from 'lucide-react';
import { generateWelcomeEmail, generateApiDescription } from '../services/geminiService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const AdminDashboard: React.FC = () => {
  const { users, logout, deleteUser, toggleUserStatus, adminWallets, walletActivity, createAdminWallet, deleteAdminWallet, setMainWallet, refreshWalletBalance, sendTron, trxPrice } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  
  // Wallet states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState<string | null>(null); 
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  const [sendingTx, setSendingTx] = useState(false);
  const [sendRecipient, setSendRecipient] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [txStatus, setTxStatus] = useState<{success: boolean, message: string} | null>(null);

  const mainWallet = useMemo(() => adminWallets.find(w => w.isMain && w.chain === 'TRX') || adminWallets.find(w => w.chain === 'TRX'), [adminWallets]);

  // Filter out the admin from the report table
  const userList = useMemo(() => {
    return users.filter(u => 
      u.role === UserRole.USER && 
      (u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
       u.email.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [users, searchTerm]);

  const activeRentals = useMemo(() => {
    const now = new Date();
    return users.filter(u => 
        u.role === UserRole.USER && 
        u.apiKeyExpiresAt && 
        new Date(u.apiKeyExpiresAt) > now
    ).length;
  }, [users]);

  const treasuryValue = useMemo(() => {
    return adminWallets.filter(w => w.chain === 'TRX').reduce((total, w) => total + w.balance, 0);
  }, [adminWallets]);

  const chartData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const data = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dayName = days[d.getDay()]; 
        
        const count = users.filter(u => {
            if (u.role !== UserRole.USER) return false;
            const joined = new Date(u.joinedAt);
            return joined.toDateString() === d.toDateString();
        }).length;

        data.push({ name: dayName, newUsers: count });
    }
    return data;
  }, [users]);

  const stats = [
    { label: 'Total Users', value: users.length - 1, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: 'Active Keys', value: activeRentals.toString(), icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Treasury (TRX)', value: `${treasuryValue.toLocaleString()}`, icon: DollarSign, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  ];

  const handleGenerateWelcome = async (username: string) => {
    setLoadingAi(true);
    const text = await generateWelcomeEmail(username);
    setAiResponse(text);
    setLoadingAi(false);
  };

  const handleGeneratePromo = async () => {
    setLoadingAi(true);
    const text = await generateApiDescription('DeepLearning V5');
    setAiResponse(text);
    setLoadingAi(false);
  };

  const handleCreateWallet = async (chain: ChainType) => {
    await createAdminWallet(chain);
    setShowCreateModal(false);
  };

  const handleDeleteWallet = (address: string) => {
    if (window.confirm("Are you sure you want to delete this wallet? This action cannot be undone.")) {
        deleteAdminWallet(address);
    }
  }

  const handleRefreshBalance = async () => {
    setLoadingBalance(true);
    await refreshWalletBalance();
    setLoadingBalance(false);
  };

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleSendTron = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendRecipient || !sendAmount) return;
    
    setSendingTx(true);
    setTxStatus(null);
    const result = await sendTron(sendRecipient, parseFloat(sendAmount));
    setTxStatus(result);
    setSendingTx(false);
    
    if (result.success) {
      setSendAmount('');
      setSendRecipient('');
      setTimeout(() => setTxStatus(null), 5000);
    }
  };

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;
    if (adminWallets.length > 0) {
        handleRefreshBalance();
        intervalId = setInterval(() => {
            refreshWalletBalance();
        }, 5000);
    }
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [adminWallets.length, refreshWalletBalance]); 

  return (
    <div className="min-h-screen bg-dark-950 text-gray-200 font-sans">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-dark-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-brand-600 rounded-lg">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">Nexus<span className="text-brand-400">Admin</span></span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">Administrator</span>
              <Button variant="secondary" onClick={logout} className="text-sm py-1">Logout</Button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-dark-900 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
              <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 ${stat.color}`}>
                <stat.icon size={64} />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className={`p-3 rounded-xl ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Main Column: Wallet + Users */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* Tron Wallets Management Section */}
                <div className="bg-gradient-to-br from-dark-900 to-dark-800 border border-red-500/20 rounded-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -translate-y-10 translate-x-10 pointer-events-none"></div>
                    
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <Wallet className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white">Wallet Management</h2>
                                    <p className="text-xs text-red-400">Multi-Chain Support</p>
                                </div>
                            </div>
                            <div className="flex gap-2 relative">
                                <Button 
                                    variant="secondary" 
                                    onClick={() => setShowCreateModal(!showCreateModal)} 
                                    className="text-xs py-1 h-8"
                                >
                                    <Plus className="h-4 w-4 mr-1" /> New Wallet
                                </Button>
                                {showCreateModal && (
                                    <div className="absolute top-full right-0 mt-2 bg-dark-900 border border-white/10 rounded-lg shadow-xl p-2 z-20 w-48 flex flex-col gap-1">
                                        <button className="text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded" onClick={() => handleCreateWallet('TRX')}>
                                            <span className="text-red-500 font-bold">TRX</span> Tron (Testnet)
                                        </button>
                                        <button className="text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded" onClick={() => handleCreateWallet('ETH')}>
                                            <span className="text-blue-400 font-bold">ETH</span> Ethereum (Virtual)
                                        </button>
                                        <button className="text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded" onClick={() => handleCreateWallet('BNB')}>
                                            <span className="text-yellow-400 font-bold">BNB</span> Binance (Virtual)
                                        </button>
                                        <button className="text-left px-3 py-2 text-sm text-gray-300 hover:bg-white/10 rounded" onClick={() => handleCreateWallet('SOL')}>
                                            <span className="text-purple-400 font-bold">SOL</span> Solana (Virtual)
                                        </button>
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    onClick={handleRefreshBalance} 
                                    isLoading={loadingBalance}
                                    className="h-8 w-8 p-0 rounded-full"
                                >
                                    <RefreshCw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {adminWallets.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400 mb-4">No treasury wallets configured.</p>
                                <Button onClick={() => handleCreateWallet('TRX')} className="bg-red-600 hover:bg-red-700 text-white border-none">
                                    Generate First Wallet
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Wallet List Table */}
                                <div className="overflow-x-auto bg-dark-950/50 rounded-xl border border-white/5">
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 text-gray-400 text-xs uppercase font-medium">
                                            <tr>
                                                <th className="px-4 py-3">Chain</th>
                                                <th className="px-4 py-3">Address</th>
                                                <th className="px-4 py-3">Balance</th>
                                                <th className="px-4 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {adminWallets.map((wallet) => (
                                                <tr key={wallet.address} className={`hover:bg-white/5 transition-colors ${wallet.isMain ? 'bg-red-500/5' : ''}`}>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                                wallet.chain === 'TRX' ? 'border-red-500 text-red-400' :
                                                                wallet.chain === 'ETH' ? 'border-blue-500 text-blue-400' :
                                                                wallet.chain === 'BNB' ? 'border-yellow-500 text-yellow-400' :
                                                                'border-purple-500 text-purple-400'
                                                            }`}>
                                                                {wallet.chain}
                                                            </span>
                                                            {wallet.isMain && (
                                                                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-2">
                                                                <code className="text-xs text-gray-300 font-mono" title={wallet.address}>
                                                                    {wallet.address.slice(0, 6)}...{wallet.address.slice(-6)}
                                                                </code>
                                                                <button onClick={() => handleCopyAddress(wallet.address)} className="text-gray-500 hover:text-white">
                                                                    {copiedAddress === wallet.address ? <CheckCircle className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                                                                </button>
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <button 
                                                                    onClick={() => setShowPrivateKey(showPrivateKey === wallet.address ? null : wallet.address)}
                                                                    className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1"
                                                                >
                                                                    {showPrivateKey === wallet.address ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                                                    {showPrivateKey === wallet.address ? wallet.privateKey : 'Show Key'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-white">{wallet.balance.toLocaleString()} {wallet.chain}</span>
                                                            {wallet.chain === 'TRX' && (
                                                                <span className="text-[10px] text-gray-500">≈ ${(wallet.balance * trxPrice).toFixed(2)}</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {!wallet.isMain && wallet.chain === 'TRX' && (
                                                                <Button 
                                                                    variant="secondary" 
                                                                    className="text-[10px] px-2 py-1 h-auto"
                                                                    onClick={() => setMainWallet(wallet.address)}
                                                                >
                                                                    Set Main
                                                                </Button>
                                                            )}
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleDeleteWallet(wallet.address)}
                                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                                title="Delete Wallet"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Send & Activity Section (Uses Main Wallet) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                    
                                    {/* Send Form */}
                                    <div>
                                        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                                            <Send className="h-4 w-4 text-red-400" /> Transfer TRX
                                        </h3>
                                        <p className="text-[10px] text-gray-500 mb-4">
                                            Sending from <strong>Main TRX Wallet</strong>: {mainWallet ? `${mainWallet.address.slice(0, 6)}...` : 'None'}
                                        </p>
                                        
                                        <form onSubmit={handleSendTron} className="space-y-3">
                                            <div>
                                                <input 
                                                    type="text" 
                                                    placeholder="Recipient Address (T...)" 
                                                    value={sendRecipient}
                                                    onChange={(e) => setSendRecipient(e.target.value)}
                                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none placeholder-gray-600"
                                                />
                                            </div>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="number" 
                                                    placeholder="Amount" 
                                                    value={sendAmount}
                                                    onChange={(e) => setSendAmount(e.target.value)}
                                                    step="0.000001"
                                                    className="w-full bg-dark-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none placeholder-gray-600"
                                                />
                                                <Button 
                                                    type="submit" 
                                                    className="bg-red-600 hover:bg-red-500 text-white border-none whitespace-nowrap"
                                                    isLoading={sendingTx}
                                                    disabled={!sendRecipient || !sendAmount || !mainWallet}
                                                >
                                                    Send
                                                </Button>
                                            </div>
                                        </form>
                                        {txStatus && (
                                            <div className={`mt-3 p-2 rounded text-xs border ${txStatus.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                                {txStatus.message}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Recent Activity Log (Main Wallet Only) */}
                                    <div className="flex flex-col h-full min-h-[150px]">
                                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                                            <Clock className="h-4 w-4 text-gray-400" /> Recent Activity
                                        </h3>
                                        <div className="space-y-2 flex-1 overflow-y-auto pr-1 custom-scrollbar max-h-[150px]">
                                            {walletActivity.length === 0 ? (
                                                <p className="text-xs text-gray-600 italic">No recent transactions on main wallet.</p>
                                            ) : (
                                                walletActivity.map((activity) => (
                                                    <div key={activity.id} className="flex items-center justify-between p-2 bg-dark-950/50 rounded-lg border border-white/5">
                                                        <div className="flex items-center gap-2">
                                                            {activity.type === 'received' ? (
                                                                <ArrowDownLeft className="h-4 w-4 text-green-500" />
                                                            ) : (
                                                                <ArrowUpRight className="h-4 w-4 text-red-500" />
                                                            )}
                                                            <span className="text-xs text-gray-300 capitalize">{activity.type}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`text-xs font-bold ${activity.type === 'received' ? 'text-green-400' : 'text-white'}`}>
                                                                {activity.type === 'received' ? '+' : '-'}{activity.amount} TRX
                                                            </p>
                                                            <p className="text-[10px] text-gray-600">{new Date(activity.timestamp).toLocaleTimeString()}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* New User Report Table */}
                <div className="bg-dark-900 border border-white/5 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                    <h2 className="text-lg font-bold text-white">New User Report</h2>
                    <p className="text-sm text-gray-400">Monitor newly registered API tenants.</p>
                    </div>
                    <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                    <thead className="bg-dark-800/50 text-gray-400 text-xs uppercase font-medium">
                        <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Main Wallet</th>
                        <th className="px-6 py-4">Subscription Details</th>
                        <th className="px-6 py-4 text-center">Sub-Wallets</th>
                        <th className="px-6 py-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {userList.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            No users found. New signups will appear here.
                            </td>
                        </tr>
                        ) : (
                        userList.map((user) => (
                            <tr key={user.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-brand-900 flex items-center justify-center text-brand-300 font-bold text-xs">
                                    {user.username.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white">{user.username}</p>
                                    <p className="text-xs text-gray-500">{user.email}</p>
                                    <p className="text-[10px] text-gray-600 mt-0.5">Joined {new Date(user.joinedAt).toLocaleDateString()}</p>
                                </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                user.status === 'active' 
                                    ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                }`}>
                                {user.status === 'active' ? 'Active' : 'Suspended'}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                {user.wallet ? (
                                    <div className="flex items-center gap-2">
                                        <Wallet className="h-3 w-3 text-red-500" />
                                        <code className="text-xs text-gray-400 font-mono" title={user.wallet.address}>
                                            {user.wallet.address.slice(0, 6)}...{user.wallet.address.slice(-4)}
                                        </code>
                                    </div>
                                ) : (
                                    <span className="text-xs text-gray-600 italic">No Wallet</span>
                                )}
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5">
                                    {user.apiKeyExpiresAt && new Date(user.apiKeyExpiresAt) > new Date() ? (
                                        <>
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-sm font-bold text-white">
                                                    {user.apiKeyHistory && user.apiKeyHistory.length > 0 ? user.apiKeyHistory[0].durationLabel : 'Custom'}
                                                </span>
                                                <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 rounded">Active</span>
                                            </div>
                                            {user.apiKeyCreatedAt && (
                                                <span className="text-[10px] text-gray-500 flex items-center gap-1">
                                                    <Calendar className="h-3 w-3" />
                                                    Bought: {new Date(user.apiKeyCreatedAt).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Clock className="h-3 w-3" />
                                                Exp: {new Date(user.apiKeyExpiresAt).toLocaleDateString()}
                                            </span>
                                        </>
                                    ) : (
                                         <span className="text-gray-600 italic text-xs">No Active Subscription</span>
                                    )}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-dark-800 border border-white/10 text-xs font-mono text-white">
                                    <Layers className="h-3 w-3 mr-1 text-brand-400" />
                                    {user.subWallets?.length || 0}
                                </span>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handleGenerateWelcome(user.username)}
                                    className="p-1.5 text-brand-400 hover:bg-brand-400/10 rounded transition-colors" 
                                    title="Generate AI Welcome Email"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <button 
                                    onClick={() => toggleUserStatus(user.id)}
                                    className={`p-1.5 rounded transition-colors ${user.status === 'active' ? 'text-amber-400 hover:bg-amber-400/10' : 'text-green-400 hover:bg-green-400/10'}`}
                                    title={user.status === 'active' ? 'Suspend' : 'Activate'}
                                >
                                    <Power size={16} />
                                </button>
                                <button 
                                    onClick={() => deleteUser(user.id)}
                                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded transition-colors" 
                                    title="Delete User"
                                >
                                    <Trash2 size={16} />
                                </button>
                                </div>
                            </td>
                            </tr>
                        ))
                        )}
                    </tbody>
                    </table>
                </div>
                </div>
            </div>

            {/* Sidebar Charts & AI */}
            <div className="space-y-6">
                {/* Growth Chart */}
                <div className="bg-dark-900 border border-white/5 rounded-2xl p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">User Growth (7 Days)</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis dataKey="name" stroke="#666" tick={{fontSize: 12}} />
                                <YAxis stroke="#666" tick={{fontSize: 12}} allowDecimals={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                    cursor={{fill: '#ffffff0a'}}
                                />
                                <Bar dataKey="newUsers" fill="#0ea5e9" radius={[4, 4, 0, 0]} name="New Users" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Assistant */}
                <div className="bg-gradient-to-br from-indigo-900/40 to-dark-900 border border-indigo-500/30 rounded-2xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="text-indigo-400 h-5 w-5" />
                        <h3 className="font-bold text-white">Gemini AI Assistant</h3>
                    </div>
                    <p className="text-sm text-indigo-200/80 mb-4">Generate marketing copy or system messages.</p>
                    
                    <div className="space-y-3">
                        <Button 
                            variant="secondary" 
                            className="w-full justify-start text-xs border-indigo-500/30 hover:bg-indigo-500/20"
                            onClick={handleGeneratePromo}
                            isLoading={loadingAi}
                        >
                           Generate Promo Blurb
                        </Button>
                    </div>

                    {aiResponse && (
                        <div className="mt-4 p-3 bg-dark-950/50 rounded-lg border border-indigo-500/20">
                            <p className="text-xs text-gray-300 italic">"{aiResponse}"</p>
                            <button onClick={() => setAiResponse(null)} className="text-[10px] text-indigo-400 mt-2 hover:underline">Clear</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </main>
    </div>
  );
};