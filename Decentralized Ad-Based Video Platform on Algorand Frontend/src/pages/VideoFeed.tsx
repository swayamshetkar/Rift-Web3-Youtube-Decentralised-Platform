/**
 * VideoFeed Component
 * This shows how to use the API client to fetch real videos from the backend
 * 
 * Features:
 * - Fetch videos from apiClient.listVideos()
 * - Track views using apiClient.trackView()
 * - Integrated with authentication flow
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Play, Heart, Share2, Eye, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../app/context/WalletContext';
import { apiClient } from '../services/api';
import { getStoredDeviceFingerprint } from '../utils/deviceFingerprint';

interface Video {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator_name: string;
  created_at: string;
  views: number;
  ipfs_hash: string;
}

const VideoFeed = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { walletAddress, isConnected } = useWallet();
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Fetch videos from backend
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.listVideos(page * 20, 20);
        
        if (page === 0) {
          setVideos(data);
        } else {
          setVideos(prev => [...prev, ...data]);
        }
        
        setHasMore(data.length === 20);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch videos');
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [page]);

  // Track view when user clicks play
  const handlePlayVideo = async (video: Video) => {
    if (isConnected && walletAddress) {
      try {
        await apiClient.trackView({
          video_id: video.id,
          watch_seconds: 0,
          wallet: walletAddress,
          device_fingerprint: getStoredDeviceFingerprint()
        });
      } catch (err) {
        console.error('Failed to track view:', err);
      }
    }
    
    navigate(`/app/watch/${video.id}`);
  };

  if (loading && page === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (error && page === 0) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => setPage(0)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Discover Videos</h1>
        <p className="text-slate-400">Watch videos and earn rewards</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {videos.map((video) => (
          <motion.div
            key={video.id}
            whileHover={{ y: -4 }}
            className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 group cursor-pointer"
            onClick={() => handlePlayVideo(video)}
          >
            {/* Thumbnail with play button overlay */}
            <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Play className="w-12 h-12 text-white fill-white opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all" />
              <span className="absolute top-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded">
                12:34
              </span>
            </div>

            {/* Video info */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-white truncate hover:text-indigo-400 transition-colors">
                  {video.title}
                </h3>
                <p className="text-sm text-slate-400 truncate">{video.creator_name}</p>
              </div>

              <p className="text-sm text-slate-400 line-clamp-2">{video.description}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <div className="flex items-center gap-1" title="Views">
                  <Eye className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-400">{video.views.toLocaleString()}</span>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-slate-700/50 rounded-full transition-colors">
                    <Heart className="w-4 h-4 text-slate-400 hover:text-red-400" />
                  </button>
                  <button className="p-2 hover:bg-slate-700/50 rounded-full transition-colors">
                    <Share2 className="w-4 h-4 text-slate-400 hover:text-slate-200" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center py-8">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More Videos'}
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoFeed;
