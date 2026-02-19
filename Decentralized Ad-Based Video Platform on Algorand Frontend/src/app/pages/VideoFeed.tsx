import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Clock, MoreVertical, Coins, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

const POLL_INTERVAL = 10_000; // 10 seconds

const VideoFeed = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVideos = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await apiClient.listVideos(0, 20);
      setVideos(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      setError('Failed to load videos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos(true);
    const interval = setInterval(() => fetchVideos(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatViews = (views: number) => {
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return String(views);
  };

  const formatDate = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours} hours ago`;
      const days = Math.floor(hours / 24);
      if (days < 7) return `${days} days ago`;
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
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

  if (error && videos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 mb-4">{error}</p>
        <button onClick={() => fetchVideos(true)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Recommended Videos</h2>
        <div className="flex gap-2">
          <button className="px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-sm hover:bg-slate-700 transition-colors">All</button>
          <button className="px-3 py-1 hover:bg-slate-800 text-slate-400 rounded-full text-sm transition-colors">Web3</button>
          <button className="px-3 py-1 hover:bg-slate-800 text-slate-400 rounded-full text-sm transition-colors">Gaming</button>
          <button className="px-3 py-1 hover:bg-slate-800 text-slate-400 rounded-full text-sm transition-colors">Art</button>
        </div>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-lg mb-2">No videos yet</p>
          <p className="text-sm">Be the first to upload!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <motion.div
              key={video.id}
              whileHover={{ y: -5 }}
              className="group cursor-pointer bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 transition-all"
              onClick={() => navigate(`/app/watch/${video.id}`)}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-700 overflow-hidden">
                {video.thumbnail_url || video.cid ? (
                  <img
                    src={video.thumbnail_url || `https://ipfs.io/ipfs/${video.cid}`}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <Play className="w-10 h-10 text-slate-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                {video.duration && (
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-medium">
                    {video.duration}
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-emerald-500/90 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg flex items-center gap-1 backdrop-blur-sm">
                  <Coins className="w-3 h-3" />
                  {video.reward_per_view || '0.05'} ADMC
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 bg-indigo-600/90 rounded-full flex items-center justify-center backdrop-blur-sm shadow-lg">
                    <Play className="w-6 h-6 text-white ml-1 fill-current" />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300 border border-slate-600">
                      {(video.users?.username || 'U').substring(0, 2).toUpperCase()}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium line-clamp-2 leading-tight mb-1 group-hover:text-indigo-400 transition-colors">
                      {video.title}
                    </h3>
                    <p className="text-sm text-slate-400 mb-1">{video.users?.username || 'Unknown'}</p>
                    <div className="flex items-center text-xs text-slate-500">
                      <span>{formatViews(video.total_views || 0)} views</span>
                      <span className="mx-1">•</span>
                      <span>{formatDate(video.created_at)}</span>
                    </div>
                  </div>
                  <button className="self-start text-slate-500 hover:text-white transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoFeed;
