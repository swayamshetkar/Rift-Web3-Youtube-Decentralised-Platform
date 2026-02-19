import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ArrowDownCircle, CheckCircle2, XCircle, AlertTriangle, Clock, Zap, DollarSign, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';

const POLL_INTERVAL = 15_000;

const Settlements = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [settData, summData] = await Promise.all([
        apiClient.getSettlements(100).catch(() => []),
        apiClient.getSettlementSummary().catch(() => null),
      ]);
      setSettlements(Array.isArray(settData) ? settData : []);
      setSummary(summData);
    } catch (err) {
      console.error('Failed to fetch settlements:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const handleTrigger = async (type: 'video' | 'banner') => {
    setTriggering(type);
    try {
      if (type === 'video') {
        await apiClient.triggerSettlement();
      } else {
        await apiClient.triggerBannerSettlement();
      }
      toast.success(`${type === 'video' ? 'Video' : 'Banner'} settlement triggered!`);
      fetchData(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to trigger ${type} settlement: ${msg}`);
    } finally {
      setTriggering(null);
    }
  };

  const statusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-amber-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const statusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pending': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'failed': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Settlements</h1>
          <p className="text-slate-400">Track token distributions and trigger new settlements.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => handleTrigger('video')}
            disabled={triggering !== null}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {triggering === 'video' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Trigger Video Settlement
          </button>
          <button
            onClick={() => handleTrigger('banner')}
            disabled={triggering !== null}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 disabled:opacity-50"
          >
            {triggering === 'banner' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Trigger Banner Settlement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Settled', value: `${(summary.total_settled || 0).toFixed(2)} ADMC`, icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Total Fees', value: `${(summary.total_fees || 0).toFixed(2)} ADMC`, icon: TrendingUp, color: 'text-amber-400' },
            { label: 'Pending', value: `${(summary.pending_amount || 0).toFixed(2)} ADMC`, icon: Clock, color: 'text-indigo-400' },
            { label: 'Settlements', value: summary.settlement_count || 0, icon: ArrowDownCircle, color: 'text-purple-400' },
          ].map((card, idx) => (
            <div key={idx} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-sm text-slate-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Settlements Table */}
      {settlements.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-xl border border-slate-700">
          <p className="text-slate-400 mb-2">No settlements yet</p>
          <p className="text-xs text-slate-500">Trigger a settlement to distribute earned tokens.</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium">ID</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium">Fee</th>
                  <th className="px-6 py-4 font-medium">Tx Hash</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {settlements.map((s, idx) => (
                  <motion.tr
                    key={s.id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-mono text-indigo-400 text-xs">{(s.id || '').substring(0, 10)}...</td>
                    <td className="px-6 py-4 text-slate-400 text-xs">{formatDate(s.date || s.created_at)}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs font-medium">{s.type || 'video'}</span>
                    </td>
                    <td className="px-6 py-4 text-white font-mono font-bold">{(s.amount || 0).toFixed(4)} ADMC</td>
                    <td className="px-6 py-4 text-slate-400 font-mono">{(s.fee || 0).toFixed(4)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-500 max-w-[120px] truncate">
                      {s.tx_hash ? (
                        <a href={`https://testnet.algoexplorer.io/tx/${s.tx_hash}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                          {s.tx_hash.substring(0, 12)}...
                        </a>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border w-fit ${statusColor(s.status)}`}>
                        {statusIcon(s.status)}
                        {s.status || 'pending'}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settlements;
