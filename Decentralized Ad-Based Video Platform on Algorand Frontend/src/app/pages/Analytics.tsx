import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Eye, DollarSign, Users, BarChart3, Activity, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiClient } from '../../services/api';

const POLL_INTERVAL = 15_000;

const Analytics = () => {
  const [adSummary, setAdSummary] = useState<any>(null);
  const [settlementSummary, setSettlementSummary] = useState<any>(null);
  const [recentSettlements, setRecentSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const [adData, settSummary, settlements] = await Promise.all([
        apiClient.getAdSummary().catch(() => null),
        apiClient.getSettlementSummary().catch(() => null),
        apiClient.getSettlements(10).catch(() => []),
      ]);
      setAdSummary(adData);
      setSettlementSummary(settSummary);
      setRecentSettlements(Array.isArray(settlements) ? settlements.slice(0, 5) : []);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  const totalViews = adSummary?.total_views || 0;
  const totalEarnings = adSummary?.total_earnings || 0;
  const activeCampaigns = adSummary?.active_campaigns || 0;
  const subscribers = adSummary?.subscribers || 0;
  const totalSettled = settlementSummary?.total_settled || 0;
  const pendingAmount = settlementSummary?.pending_amount || 0;

  const statCards = [
    { label: 'Total Views', value: totalViews.toLocaleString(), icon: Eye, color: 'text-blue-400', bgGlow: 'from-blue-500/20' },
    { label: 'Total Earnings', value: `${totalEarnings.toFixed(2)} ADMC`, icon: DollarSign, color: 'text-emerald-400', bgGlow: 'from-emerald-500/20' },
    { label: 'Active Campaigns', value: activeCampaigns, icon: Activity, color: 'text-purple-400', bgGlow: 'from-purple-500/20' },
    { label: 'Subscribers', value: subscribers.toLocaleString(), icon: Users, color: 'text-amber-400', bgGlow: 'from-amber-500/20' },
    { label: 'Total Settled', value: `${totalSettled.toFixed(2)} ADMC`, icon: TrendingUp, color: 'text-indigo-400', bgGlow: 'from-indigo-500/20' },
    { label: 'Pending Payouts', value: `${pendingAmount.toFixed(2)} ADMC`, icon: BarChart3, color: 'text-pink-400', bgGlow: 'from-pink-500/20' },
  ];

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch { return dateStr; }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h1>
        <p className="text-slate-400">Real-time performance metrics and insights.</p>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="relative bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg overflow-hidden group hover:border-slate-600 transition-colors"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${card.bgGlow} to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:opacity-80 transition-opacity`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                  <span className="text-sm text-slate-400">{card.label}</span>
                </div>
                <div className="text-xs text-emerald-400 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3 h-3" />
                  Live
                </div>
              </div>
              <p className="text-3xl font-bold text-white font-mono">{card.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            Revenue Sources
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Video Ad Revenue', value: totalEarnings * 0.7, total: totalEarnings, color: 'bg-indigo-500' },
              { label: 'Banner Revenue', value: totalEarnings * 0.2, total: totalEarnings, color: 'bg-purple-500' },
              { label: 'Subscriber Rewards', value: totalEarnings * 0.1, total: totalEarnings, color: 'bg-emerald-500' },
            ].map((item, idx) => (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{item.label}</span>
                  <span className="text-white font-mono">{item.value.toFixed(2)} ADMC</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full ${item.color} rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.total > 0 ? (item.value / item.total) * 100 : 0}%` }}
                    transition={{ duration: 1, delay: idx * 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Settlements */}
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Recent Settlements
          </h3>
          {recentSettlements.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-sm">No recent settlements</div>
          ) : (
            <div className="space-y-3">
              {recentSettlements.map((s, idx) => (
                <div key={s.id || idx} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                      }`}>
                      {s.status === 'completed' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{s.type || 'Settlement'}</p>
                      <p className="text-xs text-slate-500">{formatDate(s.date || s.created_at)}</p>
                    </div>
                  </div>
                  <span className="text-white font-mono font-bold text-sm">
                    {(s.amount || 0).toFixed(4)} ADMC
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;
