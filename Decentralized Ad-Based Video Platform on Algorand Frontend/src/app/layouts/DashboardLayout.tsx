import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useWallet } from '../context/WalletContext';
import { 
  Home, 
  UploadCloud, 
  Video, 
  Megaphone, 
  DollarSign, 
  History, 
  BarChart2, 
  Settings, 
  Menu, 
  X, 
  Wallet, 
  Bell, 
  Search,
  LogOut,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isConnected, walletAddress, balance, connect, disconnect, network } = useWallet();
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const navItems = [
    { name: 'Home', path: '/app/feed', icon: Home },
    { name: 'Upload Video', path: '/app/upload', icon: UploadCloud },
    { name: 'My Videos', path: '/app/videos', icon: Video },
    { name: 'Ad Campaigns', path: '/app/campaigns', icon: Megaphone },
    { name: 'Banner Revenue', path: '/app/revenue', icon: DollarSign },
    { name: 'Settlements', path: '/app/settlements', icon: History },
    { name: 'Analytics', path: '/app/analytics', icon: BarChart2 },
  ];

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast.success('Address copied to clipboard');
    }
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-800 border-r border-slate-700 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700 bg-slate-800">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-white">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white">
                <Video className="w-5 h-5 fill-current" />
              </div>
              ProofOfView
            </div>
            <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'}
                `}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </div>

          <div className="p-4 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/50 border border-slate-700">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                JS
              </div>
              <div className="flex-1 overflow-hidden">
                <h4 className="text-sm font-medium text-white truncate">John Studio</h4>
                <p className="text-xs text-slate-400 truncate">Creator Pro</p>
              </div>
            </div>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700 h-16 flex items-center justify-between px-4 sm:px-6 lg:px-8 z-30 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="lg:hidden text-slate-400 hover:text-white">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex items-center relative">
              <Search className="w-4 h-4 absolute left-3 text-slate-500" />
              <input 
                type="text" 
                placeholder="Search videos, creators..." 
                className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-full text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 w-64 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Network Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {network}
            </div>

            <button className="relative text-slate-400 hover:text-white transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900" />
            </button>

            {/* Wallet Connect */}
            {isConnected ? (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-700">
                <div className="flex flex-col items-end mr-2">
                  <span className="text-xs text-slate-400 font-medium">Balance</span>
                  <span className="text-sm font-bold text-white font-mono">{balance.toFixed(2)} ALGO</span>
                </div>
                <div className="relative group">
                  <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 px-4 py-2 rounded-lg font-mono text-sm transition-all group-hover:border-indigo-500/50">
                    <Wallet className="w-4 h-4 text-indigo-400" />
                    {walletAddress}
                    <ChevronDown className="w-4 h-4 text-slate-500" />
                  </button>
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 hidden group-hover:block animate-in fade-in slide-in-from-top-2 z-50">
                    <button onClick={handleCopyAddress} className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition-colors">
                      Copy Address
                    </button>
                    <button onClick={disconnect} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition-colors flex items-center gap-2">
                      <LogOut className="w-3 h-3" />
                      Disconnect
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button 
                onClick={connect}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-900 p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {/* Warning Banner if not connected */}
            {!isConnected && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-amber-200 font-medium">Wallet not connected</h3>
                    <p className="text-amber-500/80 text-sm">Please connect your Algorand wallet to access all features.</p>
                  </div>
                </div>
                <button 
                  onClick={connect}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg text-sm transition-colors"
                >
                  Connect Now
                </button>
              </motion.div>
            )}
            
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
