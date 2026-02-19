import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Award, Loader2, DollarSign, Users, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { apiClient } from '../../services/api';

const BannerRevenue = () => {
  const [banners, setBanners] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [bannersData, summaryData] = await Promise.all([
        apiClient.getActiveBanners().catch(() => []),
        apiClient.getAdSummary().catch(() => null),
      ]);
      setBanners(Array.isArray(bannersData) ? bannersData : []);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch banner data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Banner Revenue</h1>
        <p className="text-slate-400">Track banner ad performance and revenue distribution.</p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Active Campaigns', value: summary.active_campaigns || 0, icon: BarChart3, color: 'text-indigo-400' },
            { label: 'Total Budget', value: `${(summary.total_budget || 0).toFixed(2)} ADMC`, icon: DollarSign, color: 'text-emerald-400' },
            { label: 'Total Views', value: (summary.total_views || 0).toLocaleString(), icon: Users, color: 'text-purple-400' },
            { label: 'Total Earnings', value: `${(summary.total_earnings || 0).toFixed(2)} ADMC`, icon: TrendingUp, color: 'text-amber-400' },
          ].map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <card.icon className={`w-5 h-5 ${card.color}`} />
                <span className="text-sm text-slate-400">{card.label}</span>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{card.value}</p>
            </motion.div>
          ))}
        </div>
      )}

      {/* Revenue Distribution Chart Placeholder */}
      <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-indigo-400" />
          Revenue Distribution
        </h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Creators', pct: 70, color: 'bg-indigo-500' },
            { label: 'Platform', pct: 20, color: 'bg-emerald-500' },
            { label: 'Stakers', pct: 10, color: 'bg-amber-500' },
          ].map((item, idx) => (
            <div key={idx} className="text-center">
              <div className="h-32 bg-slate-900/50 rounded-lg overflow-hidden flex items-end relative mb-2">
                <motion.div
                  className={`w-full ${item.color} rounded-t-lg`}
                  initial={{ height: 0 }}
                  animate={{ height: `${item.pct}%` }}
                  transition={{ duration: 1, delay: idx * 0.2 }}
                />
              </div>
              <p className="text-sm text-white font-bold">{item.pct}%</p>
              <p className="text-xs text-slate-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Banners Table */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-lg overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="font-bold text-white">Active Banner Ads</h3>
        </div>
        {banners.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            No active banner ads
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-3">ID</th>
                  <th className="px-6 py-3">Tier</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Start</th>
                  <th className="px-6 py-3">End</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {banners.map((b, idx) => (
                  <tr key={b.id || idx} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-3 font-mono text-indigo-400 text-xs">{(b.id || '').substring(0, 10)}...</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded text-xs font-bold">{b.tier || 'standard'}</span>
                    </td>
                    <td className="px-6 py-3 text-white font-mono">{(b.fixed_price || 0).toFixed(2)} ADMC</td>
                    <td className="px-6 py-3 text-slate-400 text-xs">{formatDate(b.start_date)}</td>
                    <td className="px-6 py-3 text-slate-400 text-xs">{formatDate(b.end_date)}</td>
                    <td className="px-6 py-3">
                      <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-bold">
                        {b.status || 'active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BannerRevenue;
