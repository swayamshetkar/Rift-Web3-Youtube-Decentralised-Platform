/**
 * Example: Updated MyVideos Component
 * This shows how to fetch and display the current user's uploaded videos
 * 
 * Usage:
 * - Use apiClient.getMyVideos() to fetch user's videos
 * - Display video stats and management options
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Edit2, Trash2, Eye, TrendingUp, Loader, AlertCircle } from 'lucide-react';
import { useWallet } from '../context/WalletContext';
import { apiClient } from '../services/api';
import { Link } from 'react-router-dom';

interface UserVideo {
  id: string;
  title: string;
  description: string;
  created_at: string;
  views: number;
  ipfs_hash: string;
  earned: number; // Amount earned from this video
}

export const MyVideosExample = () => {
  const [videos, setVideos] = useState<UserVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useWallet();

  useEffect(() => {
    if (!isConnected) {
      setError('Please connect your wallet to view your videos');
      setLoading(false);
      return;
    }

    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await apiClient.getMyVideos();
        setVideos(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch your videos');
        console.error('Failed to fetch videos:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-slate-400 mb-6">You need to connect your wallet to view your videos</p>
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Go to Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Videos</h1>
          <p className="text-slate-400">Manage your uploaded videos and view performance.</p>
        </div>
        <Link
          to="/app/upload"
          className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
        >
          Upload New Video
        </Link>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-400 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {videos.length === 0 ? (
        <div className="text-center py-12 bg-slate-800/50 rounded-lg border border-slate-700">
          <h3 className="text-lg font-bold text-white mb-2">No Videos Yet</h3>
          <p className="text-slate-400 mb-6">Upload your first video to get started</p>
          <Link
            to="/app/upload"
            className="inline-block px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Upload Video
          </Link>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {videos.map((video) => (
            <motion.div
              key={video.id}
              whileHover={{ x: 4 }}
              className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-indigo-500/50 transition-colors"
            >
              <div className="flex flex-col md:flex-row gap-6">
                {/* Thumbnail */}
                <div className="flex-shrink-0 w-full md:w-32 h-32 bg-slate-900 rounded-lg flex items-center justify-center text-slate-600">
                  {video.ipfs_hash ? (
                    <img
                      src={`https://ipfs.io/ipfs/${video.ipfs_hash}`}
                      alt={video.title}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="text-center">
                      <Eye className="w-6 h-6 mx-auto mb-1" />
                      <span className="text-xs">No Preview</span>
                    </div>
                  )}
                </div>

                {/* Video Details */}
                <div className="flex-grow space-y-2">
                  <h3 className="text-lg font-bold text-white">{video.title}</h3>
                  <p className="text-sm text-slate-400 line-clamp-2">{video.description}</p>
                  
                  <div className="flex gap-8 pt-2">
                    <div className="flex items-center gap-2 text-slate-400">
                      <Eye className="w-4 h-4" />
                      <span className="text-sm">{video.views.toLocaleString()} views</span>
                    </div>
                    <div className="flex items-center gap-2 text-emerald-400">
                      <TrendingUp className="w-4 h-4" />
                      <span className="text-sm font-medium">{video.earned.toFixed(2)} ADMC earned</span>
                    </div>
                  </div>

                  <div className="pt-2 text-xs text-slate-500">
                    Uploaded: {new Date(video.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 md:flex-shrink-0">
                  <button className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors text-slate-400 hover:text-white flex items-center gap-2 justify-center md:justify-start">
                    <Edit2 className="w-4 h-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                  <button className="p-2 hover:bg-red-900/20 rounded-lg transition-colors text-slate-400 hover:text-red-400 flex items-center gap-2 justify-center md:justify-start">
                    <Trash2 className="w-4 h-4" />
                    <span className="text-sm">Delete</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default MyVideosExample;
