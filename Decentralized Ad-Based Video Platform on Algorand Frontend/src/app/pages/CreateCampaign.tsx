import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, CheckCircle2, Coins, ArrowRight, ShieldCheck, AlertTriangle, UploadCloud, FileVideo, X, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

const CreateCampaign = () => {
  const [budget, setBudget] = useState(100);
  const [rewardPerView, setRewardPerView] = useState(0.05);
  const [videoId, setVideoId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Existing campaigns
  const [myCampaigns, setMyCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const estimatedViews = Math.floor(budget / rewardPerView);
  const platformFee = budget * 0.02;

  // Fetch existing campaigns
  const fetchCampaigns = async () => {
    try {
      const data = await apiClient.getMyAds();
      setMyCampaigns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Drag & drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleDeposit = () => {
    if (!file) {
      toast.error('Please select an ad video file');
      return;
    }
    setShowConfirm(true);
  };

  const confirmTransaction = async () => {
    setSubmitting(true);
    try {
      const formData = new FormData();
      if (videoId) formData.append('video_id', videoId);
      formData.append('budget', String(budget));
      formData.append('reward_per_view', String(rewardPerView));
      formData.append('file', file!);

      await apiClient.createAd(formData);
      toast.success('Campaign created! Funds locked in escrow.');
      setShowConfirm(false);
      setFile(null);
      setVideoId('');
      setBudget(100);
      setRewardPerView(0.05);
      fetchCampaigns(); // Refresh list
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Transaction failed';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (campaignId: string) => {
    try {
      await apiClient.withdrawCampaign(campaignId);
      toast.success('Remaining funds withdrawn');
      fetchCampaigns();
    } catch (error) {
      toast.error('Withdraw failed');
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Create Ad Campaign</h1>
          <p className="text-slate-400">Promote your content with decentralized transparency.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="space-y-6">
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
            <h3 className="font-bold text-lg text-white mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-400" />
              Campaign Details
            </h3>

            <div className="space-y-4">
              {/* Ad Video Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Ad Video File</label>
                <div
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700/50'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <input type="file" accept="video/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                  {file ? (
                    <div className="flex flex-col items-center">
                      <FileVideo className="w-10 h-10 text-indigo-400 mb-2" />
                      <p className="text-white font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      <button type="button" onClick={(e) => { e.preventDefault(); setFile(null); }} className="mt-2 px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-full text-xs text-white flex items-center gap-1">
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <UploadCloud className="w-10 h-10 text-slate-500 mb-2" />
                      <p className="text-sm text-slate-300">Drag & drop your ad video</p>
                      <p className="text-xs text-slate-500 mt-1">MP4, WebM up to 100MB</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Target Video ID (optional)</label>
                <input
                  type="text"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                  placeholder="Leave empty for all videos"
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>

              <div className="pt-4 border-t border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Total Budget (ADMC)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">ADMC</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Reward Per View</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0.01"
                    max="1.00"
                    step="0.01"
                    value={rewardPerView}
                    onChange={(e) => setRewardPerView(parseFloat(e.target.value))}
                    className="flex-1 accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="font-mono text-white font-bold w-16 text-right">{rewardPerView.toFixed(2)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2">Higher rewards attract more viewers faster.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Estimation & Action */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-xl border border-slate-700 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <h3 className="font-bold text-lg text-white mb-6 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-emerald-400" />
              Campaign Estimation
            </h3>

            <div className="space-y-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Est. Total Views</span>
                <span className="text-2xl font-bold text-white font-mono">{estimatedViews.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Platform Fee (2%)</span>
                <span className="text-slate-200 font-mono">{platformFee.toFixed(2)} ADMC</span>
              </div>
              <div className="h-px bg-slate-700 my-4" />
              <div className="flex justify-between items-center">
                <span className="text-indigo-300 font-bold">Total Deposit</span>
                <span className="text-3xl font-bold text-indigo-400 font-mono">{(budget + platformFee).toFixed(2)} ADMC</span>
              </div>
            </div>

            <button
              onClick={handleDeposit}
              disabled={!file}
              className={`w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2 group ${!file ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Deposit & Launch
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-slate-500">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              Smart Contract Verified
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <p className="text-sm text-amber-200/80">
              Funds are held in an escrow smart contract. Unused funds can be withdrawn at any time after the campaign ends.
            </p>
          </div>
        </div>
      </div>

      {/* Existing Campaigns */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-white mb-4">My Campaigns</h2>
        {loadingCampaigns ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : myCampaigns.length === 0 ? (
          <div className="text-center py-8 text-slate-500 bg-slate-800/50 rounded-xl border border-slate-700">
            No campaigns yet. Create your first one above!
          </div>
        ) : (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">Campaign ID</th>
                  <th className="px-6 py-3">Budget</th>
                  <th className="px-6 py-3">Remaining</th>
                  <th className="px-6 py-3">Reward/View</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {myCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-indigo-400 text-xs">{c.id?.substring(0, 12)}...</td>
                    <td className="px-6 py-3 text-white font-mono">{c.budget} ADMC</td>
                    <td className="px-6 py-3 text-slate-300 font-mono">{c.remaining_budget ?? c.budget} ADMC</td>
                    <td className="px-6 py-3 text-slate-300 font-mono">{c.reward_per_view}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold border ${c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                        }`}>
                        {c.status || 'active'}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => handleWithdraw(c.id)}
                        className="px-3 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        Withdraw
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowConfirm(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 max-w-md w-full"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-8 h-8 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Confirm Deposit</h3>
                <p className="text-slate-400 text-sm">
                  Deposit <span className="text-white font-mono font-bold">{(budget + platformFee).toFixed(2)} ADMC</span> and upload your ad video.
                </p>
              </div>

              <div className="space-y-3 mb-8 bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Ad File</span>
                  <span className="text-slate-200 truncate max-w-[200px]">{file?.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Network</span>
                  <span className="text-emerald-400 font-medium">Algorand Testnet</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gas Fee</span>
                  <span className="text-slate-200 font-mono">0.001 ALGO</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmTransaction}
                  disabled={submitting}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {submitting ? 'Submitting...' : 'Sign & Pay'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CreateCampaign;
