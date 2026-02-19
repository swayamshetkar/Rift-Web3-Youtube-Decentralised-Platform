import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Edit2, Trash2, Eye, ThumbsUp, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiClient } from '../../services/api';

const POLL_INTERVAL = 15_000;

const MyVideos = () => {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      const data = await apiClient.getUserVideos();
      setVideos(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch my videos:', err);
      setError('Failed to load your videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(true);
    const interval = setInterval(() => fetchVideos(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Content</h1>
          <p className="text-slate-400">Manage your uploaded videos and view performance.</p>
        </div>
        <Link
          to="/app/upload"
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20"
        >
          Upload New Video
        </Link>
      </div>

      {error && videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-slate-400 mb-4">{error}</p>
          <button onClick={() => fetchVideos(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Retry</button>
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-lg text-slate-300 mb-2">You haven't uploaded any videos yet</p>
          <p className="text-sm text-slate-500 mb-6">Start sharing your content with the decentralized world.</p>
          <Link to="/app/upload" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium">
            Upload Your First Video
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-700">
                <tr>
                  <th className="px-6 py-4 font-medium w-1/3">Video</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Performance</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {videos.map((video) => (
                  <motion.tr
                    key={video.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="hover:bg-slate-700/30 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex gap-4 items-center">
                        <div className="w-24 h-16 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0 relative">
                          {(video.thumbnail_url || video.cid) ? (
                            <img
                              src={video.thumbnail_url || `https://ipfs.io/ipfs/${video.cid}`}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-800" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-white font-medium line-clamp-1 mb-1 group-hover:text-indigo-400 transition-colors">{video.title}</h4>
                          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
                            {video.cid && (
                              <>
                                <span className="truncate max-w-[100px]">{video.cid.substring(0, 10)}...</span>
                                <ExternalLink className="w-3 h-3 hover:text-indigo-400 cursor-pointer" />
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-xs font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {video.status || 'Public'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {formatDate(video.created_at)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-slate-300">
                        <div className="flex items-center gap-1" title="Views">
                          <Eye className="w-4 h-4 text-slate-500" />
                          <span>{(video.total_views || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Likes">
                          <ThumbsUp className="w-4 h-4 text-slate-500" />
                          <span>{(video.likes || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1" title="Comments">
                          <MessageSquare className="w-4 h-4 text-slate-500" />
                          <span>{video.comments || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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

export default MyVideos;
