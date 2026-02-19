import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { useWallet } from '../context/WalletContext';
import { useWalletAuth } from '../hooks/useWalletAuth';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, Database, PlayCircle, BarChart3, Wallet, Video, TrendingUp, Github, FileText, Twitter, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { PeraWalletConnect } from '@perawallet/connect';

// Initialize PeraWallet - this only needs to happen once
let peraWallet: PeraWalletConnect | null = null;

const getPeaWallet = () => {
  if (!peraWallet) {
    peraWallet = new PeraWalletConnect();
  }
  return peraWallet;
};

const LandingPage = () => {
  const { isConnected } = useWallet();
  const { loginWithWallet, signupWithWallet, loading } = useWalletAuth();
  const navigate = useNavigate();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'viewer' | 'creator' | 'advertiser'>('viewer');
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);
  const peraWalletRef = useRef<PeraWalletConnect | null>(null);

  // Initialize PeraWallet connection on mount
  useEffect(() => {
    const initPeraWallet = async () => {
      try {
        peraWalletRef.current = getPeaWallet();

        // Try to reconnect if user was previously connected
        const accounts = await peraWalletRef.current?.reconnectSession();
        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setWalletError(null);
        }
      } catch (error) {
        console.error('PeraWallet init error:', error);
      }
    };

    initPeraWallet();

    return () => {
      // Cleanup PeraWallet listeners if needed
    };
  }, []);

  const connectWalletFirst = async () => {
    setConnectingWallet(true);
    setWalletError(null);
    try {
      const pera = peraWalletRef.current || getPeaWallet();
      peraWalletRef.current = pera;

      const accounts = await pera.connect();

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        toast.success(`Wallet connected: ${accounts[0].slice(0, 10)}...`);
        return accounts[0];
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to connect wallet';
      setWalletError(errorMsg);
      toast.error(errorMsg);
      console.error('Wallet connection failed:', error);
    } finally {
      setConnectingWallet(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      const pera = peraWalletRef.current || getPeaWallet();
      await pera.disconnect();
      setWalletAddress('');
      setWalletError(null);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
    }
  };

  const toBase64FromBytes = (bytes: Uint8Array): string => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const normalizeSignature = (sig: unknown): string => {
    if (typeof sig === 'string') return sig;
    if (sig instanceof Uint8Array) return toBase64FromBytes(sig);
    if (Array.isArray(sig) && sig.length > 0) return normalizeSignature(sig[0]);
    if (sig && typeof sig === 'object' && 'signature' in (sig as any)) {
      return normalizeSignature((sig as any).signature);
    }
    throw new Error('Unsupported signature format returned by wallet');
  };

  const handleWalletSign = async (message: string): Promise<string> => {
    if (!peraWalletRef.current) {
      throw new Error('Wallet not initialized');
    }

    try {
      let signerAddress = walletAddress;
      if (!signerAddress) {
        const accounts = await peraWalletRef.current.reconnectSession();
        if (accounts && accounts.length > 0) {
          signerAddress = accounts[0];
          setWalletAddress(accounts[0]);
        } else {
          throw new Error('Wallet not connected');
        }
      }
      // Log for debugging
      console.log('Signing message:', message);
      console.log('Wallet address:', signerAddress);

      // Encode the message to bytes (IMPORTANT: Must be UTF-8)
      const messageBytes = new TextEncoder().encode(message);

      // Try the signMessage method if it exists (PeraWallet 1.4+)
      if (typeof (peraWalletRef.current as any).signMessage === 'function') {
        console.log('Using PeraWallet.signMessage()');
        const signatureRaw = await (peraWalletRef.current as any).signMessage({
          message: messageBytes,
          signerAddress,
        });
        const signature = normalizeSignature(signatureRaw);
        // Double base64 encode: backend _decode_signature() decodes once, then
        // algosdk.util.verify_bytes() decodes again, so we must encode twice.
        const doubleEncoded = btoa(signature);
        console.log('Signature (double-encoded):', doubleEncoded.substring(0, 20) + '...');
        return doubleEncoded;
      }

      // Try alternative: signData method
      if (typeof (peraWalletRef.current as any).signData === 'function') {
        console.log('Using PeraWallet.signData()');
        let signatureRaw: unknown;
        signatureRaw = await (peraWalletRef.current as any).signData(
          [{ data: messageBytes, message }],
          signerAddress
        );
        const signature = normalizeSignature(signatureRaw);
        // Double base64 encode: backend _decode_signature() decodes once, then
        // algosdk.util.verify_bytes() decodes again, so we must encode twice.
        const doubleEncoded = btoa(signature);
        console.log('Signature (double-encoded):', doubleEncoded.substring(0, 20) + '...');
        return doubleEncoded;
      }

      throw new Error('PeraWallet signing methods not available');

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to sign message';
      console.error('Wallet signing error:', errorMsg, error);

      const isDev = typeof import.meta !== 'undefined' && import.meta.env?.DEV;
      if (isDev) {
        const devSignature = generateDevSignature(message, walletAddress);
        // Double base64 encode for dev fallback too
        const doubleEncoded = btoa(devSignature);
        console.warn('Using dev signature as fallback (double-encoded):', doubleEncoded.substring(0, 20) + '...');
        return doubleEncoded;
      }
      throw new Error(errorMsg);
    }
  };

  // Helper function to generate development signatures
  const generateDevSignature = (message: string, walletAddress: string): string => {
    // For development: create a signature-like string that includes message hash
    // This allows the backend to at least log what was signed

    // Create a simple hash of the message
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    // Create signature-like format: hash + wallet address + random
    // This is NOT a valid Algorand signature but helps with debugging
    const hashPart = Math.abs(hash).toString(16).padEnd(10, '0');
    const addrPart = walletAddress.substring(0, 10);
    const randomPart = Math.random().toString(36).substring(2, 15);

    // Combine and encode as base64-like string
    const sigData = `${hashPart}${addrPart}${randomPart}`;
    try {
      return btoa(sigData).substring(0, 86); // Pad to look like base64 signature (~86 chars)
    } catch {
      return sigData;
    }
  };

  const handleLogin = async () => {
    if (!walletAddress.trim()) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      setConnectingWallet(true);
      await loginWithWallet(walletAddress, {
        signFunction: handleWalletSign,
      });
      setShowAuthDialog(false);
      navigate('/app');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Login failed';
      toast.error(errorMsg);
      console.error('Login failed:', error);
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleSignup = async () => {
    if (!walletAddress.trim()) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!username.trim()) {
      toast.error('Please enter a username');
      return;
    }

    try {
      setConnectingWallet(true);
      await signupWithWallet(walletAddress, username, role, {
        signFunction: handleWalletSign,
      });
      setShowAuthDialog(false);
      navigate('/app');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Signup failed';
      toast.error(errorMsg);
      console.error('Signup failed:', error);
    } finally {
      setConnectingWallet(false);
    }
  };

  const handleConnect = () => {
    setShowAuthDialog(true);
  };

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const features = [
    {
      icon: <ShieldCheck className="w-8 h-8 text-indigo-400" />,
      title: "Transparent Settlements",
      description: "Every ad view is verified on-chain. Creators get paid instantly without middleman delays."
    },
    {
      icon: <Database className="w-8 h-8 text-emerald-400" />,
      title: "IPFS Video Storage",
      description: "Decentralized storage ensures your content is censorship-resistant and always available."
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-amber-400" />,
      title: "2% Fair Platform Fee",
      description: "We take only 2% to maintain the protocol. You keep 98% of your ad revenue."
    }
  ];

  const steps = [
    { title: "Upload", desc: "Creators upload content to IPFS via our dashboard." },
    { title: "Watch", desc: "Users watch videos and view non-intrusive ads." },
    { title: "Earn", desc: "Ad revenue is calculated in real-time per view." },
    { title: "Settle", desc: "Smart contracts distribute tokens to your wallet." }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-50 font-sans selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <PlayCircle className="text-white w-5 h-5 fill-current" />
              </div>
              <span className="text-xl font-bold tracking-tight">PayPerView</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a>
              <a href="#docs" className="hover:text-white transition-colors">Docs</a>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={isConnected ? () => navigate('/app') : handleConnect}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-full font-medium transition-all shadow-lg shadow-indigo-500/20 text-sm flex items-center gap-2"
              >
                {isConnected ? 'Go to Dashboard' : (
                  <>
                    <Wallet className="w-4 h-4" />
                    Connect Wallet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-600/20 rounded-full blur-[100px]" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-indigo-400 text-xs font-medium mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              Live on Algorand Testnet
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
              Decentralized Creator <br /> Monetization
            </h1>
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Experience the future of video streaming. Transparent ad settlements,
              direct creator payments, and censorship-resistant storage powered by Web3.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={handleConnect}
                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2"
              >
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </button>
              <Link
                to="/app"
                className="w-full sm:w-auto px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-all border border-slate-700 flex items-center justify-center gap-2"
              >
                <Video className="w-5 h-5" />
                Explore Videos
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-slate-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-indigo-500/50 transition-colors backdrop-blur-sm"
              >
                <div className="mb-4 bg-slate-900/50 w-16 h-16 rounded-xl flex items-center justify-center border border-slate-700">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-slate-950 border-y border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-slate-400">Simple, transparent flow for creators and viewers.</p>
          </div>

          <div className="relative">
            {/* Connecting Line (Desktop) */}
            <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-800 -translate-y-1/2 z-0" />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {steps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center text-center">
                  <div className="w-12 h-12 rounded-full bg-slate-900 border-2 border-indigo-500 flex items-center justify-center text-indigo-400 font-bold mb-4 shadow-lg shadow-indigo-500/10">
                    {idx + 1}
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">{step.title}</h3>
                  <p className="text-sm text-slate-400 max-w-[200px]">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 pt-20 pb-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <PlayCircle className="text-indigo-500 w-6 h-6 fill-current" />
                <span className="text-xl font-bold">PayPerView</span>
              </div>
              <p className="text-slate-400 text-sm max-w-sm">
                The first decentralized video platform that ensures fair compensation through blockchain verification.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Browse Videos</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Creators</a></li>
                <li><a href="#" className="hover:text-indigo-400 transition-colors">Advertisers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-4">Community</h4>
              <div className="flex gap-4">
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><Github className="w-5 h-5" /></a>
                <a href="#" className="text-slate-400 hover:text-white transition-colors"><FileText className="w-5 h-5" /></a>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            &copy; 2026 PayPerView. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Access PayPerView</DialogTitle>
            <DialogDescription className="text-slate-400">
              Connect your Algorand wallet to get started
            </DialogDescription>
          </DialogHeader>

          {walletError && (
            <div className="bg-red-900/50 border border-red-400 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{walletError}</p>
            </div>
          )}

          <div className="space-y-4">
            {!walletAddress ? (
              <>
                <p className="text-sm text-slate-300">
                  Step 1: Connect your PeraWallet to continue
                </p>
                <Button
                  onClick={connectWalletFirst}
                  disabled={connectingWallet}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3"
                >
                  {connectingWallet ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect PeraWallet
                    </>
                  )}
                </Button>
                <p className="text-xs text-slate-400 text-center">
                  Don't have PeraWallet? <a href="https://perawallet.app" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Download it here</a>
                </p>
              </>
            ) : (
              <>
                <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
                  <p className="text-sm text-slate-300 mb-2">Connected Wallet</p>
                  <p className="text-white font-mono text-sm break-all">{walletAddress}</p>
                  <button
                    onClick={disconnectWallet}
                    className="mt-3 text-xs text-slate-400 hover:text-slate-300 underline"
                  >
                    Use different wallet
                  </button>
                </div>

                <Tabs defaultValue="login" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                    <TabsTrigger value="login" className="text-slate-300 data-[state=active]:text-white">
                      Login
                    </TabsTrigger>
                    <TabsTrigger value="signup" className="text-slate-300 data-[state=active]:text-white">
                      Sign Up
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="login" className="space-y-4 mt-4">
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      Step 2: Sign the message with your wallet
                    </p>
                    <Button
                      onClick={handleLogin}
                      disabled={connectingWallet}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
                    >
                      {connectingWallet ? (
                        <>
                          <span className="animate-spin mr-2">⟳</span>
                          Signing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Sign & Login
                        </>
                      )}
                    </Button>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4 mt-4">
                    <p className="text-sm text-slate-300 flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      Step 2: Create your profile
                    </p>
                    <div>
                      <Label className="text-slate-200">Username</Label>
                      <Input
                        placeholder="Choose a username..."
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 mt-1"
                        disabled={connectingWallet}
                        maxLength={30}
                      />
                    </div>
                    <div>
                      <Label className="text-slate-200">Account Type</Label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as 'viewer' | 'creator' | 'advertiser')}
                        className="w-full bg-slate-700 border border-slate-600 text-white px-3 py-2 rounded-lg mt-1"
                        disabled={connectingWallet}
                      >
                        <option value="viewer">👁️ Viewer - Watch & Earn</option>
                        <option value="creator">🎬 Creator - Upload & Monetize</option>
                        <option value="advertiser">📢 Advertiser - Promote Ads</option>
                      </select>
                    </div>
                    <Button
                      onClick={handleSignup}
                      disabled={connectingWallet || !username.trim()}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
                    >
                      {connectingWallet ? (
                        <>
                          <span className="animate-spin mr-2">⟳</span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Sign & Create Account
                        </>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>

                <p className="text-xs text-slate-400 text-center">
                  You'll be prompted to sign a message to verify wallet ownership
                </p>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LandingPage;
