import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, Share2, MoreHorizontal, UserCheck, PlayCircle, SkipForward, BadgeDollarSign, MessageSquare, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';
import { apiClient } from '../../services/api';
import { useWallet } from '../context/WalletContext';

const VIEW_POLL_INTERVAL = 5_000; // 5 seconds

const VideoPlayer = () => {
  const { id } = useParams();
  const { walletAddress } = useWallet();
  const [video, setVideo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [adProgress, setAdProgress] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [activeAd, setActiveAd] = useState<any>(null);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const watchStartRef = useRef<number>(Date.now());
  const viewTrackedRef = useRef(false);

  // Fetch video data
  const fetchVideo = useCallback(async (showLoader = false) => {
    if (!id) return;
    try {
      if (showLoader) setLoading(true);
      const data = await apiClient.getVideo(id);
      setVideo(data);
    } catch (err) {
      console.error('Failed to fetch video:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch active ad
  useEffect(() => {
    const fetchAd = async () => {
      try {
        const ads = await apiClient.getActiveAds();
        if (Array.isArray(ads) && ads.length > 0) {
          setActiveAd(ads[0]);
          setIsAdPlaying(true);
        }
      } catch (err) {
        console.error('Failed to fetch active ads:', err);
      }
    };
    fetchAd();
  }, []);

  // Fetch related videos
  useEffect(() => {
    const fetchRelated = async () => {
      try {
        const all = await apiClient.listVideos(0, 6);
        setRelatedVideos(Array.isArray(all) ? all.filter((v: any) => v.id !== id).slice(0, 5) : []);
      } catch (err) {
        console.error('Failed to fetch related videos:', err);
      }
    };
    fetchRelated();
  }, [id]);

  // Initial fetch + polling for view count
  useEffect(() => {
    fetchVideo(true);
    const interval = setInterval(() => fetchVideo(false), VIEW_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchVideo]);

  // Track view after 10 seconds of watching
  useEffect(() => {
    if (!id || !walletAddress || viewTrackedRef.current) return;
    const timer = setTimeout(async () => {
      const watchSeconds = Math.floor((Date.now() - watchStartRef.current) / 1000);
      try {
        await apiClient.trackView({
          video_id: id,
          watch_seconds: watchSeconds,
          wallet: walletAddress,
          device_fingerprint: `fp_${navigator.userAgent.slice(0, 20)}`,
        });
        viewTrackedRef.current = true;
      } catch (err) {
        console.error('Failed to track view:', err);
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, [id, walletAddress]);

  // Simulate ad progress
  useEffect(() => {
    if (isAdPlaying) {
      const interval = setInterval(() => {
        setAdProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsAdPlaying(false);
            toast.success("Ad view verified on-chain! You earned 0.05 ADMC.");
            return 100;
          }
          return prev + 1;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [isAdPlaying]);

  const formatViews = (views: number) => {
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return String(views || 0);
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Video not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main Content */}
      <div className="flex-1">
        {/* Video Player Container */}
        <div className="relative aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl mb-4 group">
          {/* Video Content */}
          <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
            {video.cid ? (
              <video
                src={`https://ipfs.io/ipfs/${video.cid}`}
                className="w-full h-full object-cover"
                controls={!isAdPlaying}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
            ) : (
              <>
                <div className="w-full h-full bg-slate-800 flex items-center justify-center">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="z-10 w-16 h-16 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center transition-all transform hover:scale-110"
                  >
                    <PlayCircle className="w-8 h-8 text-white fill-current" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Ad Overlay */}
          {isAdPlaying && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6 z-20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold rounded">AD</span>
                  <span className="text-white text-sm font-medium">
                    {activeAd?.advertiser_name || 'Sponsor'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    if (adProgress >= 20) {
                      setIsAdPlaying(false);
                      toast.info('Ad skipped');
                    }
                  }}
                  className="text-slate-400 text-xs hover:text-white flex items-center gap-1"
                >
                  {adProgress < 20
                    ? `Skip in ${Math.max(0, 5 - Math.floor(adProgress / 20))}s`
                    : 'Skip Ad'}
                  <SkipForward className="w-3 h-3" />
                </button>
              </div>
              <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-yellow-500"
                  initial={{ width: "0%" }}
                  animate={{ width: `${adProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{video.title}</h1>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 text-slate-400 text-sm">
              <span>{formatViews(video.total_views)} views</span>
              <span>•</span>
              <span>{formatDate(video.created_at)}</span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded border border-emerald-500/20 text-xs font-bold flex items-center gap-1">
                <BadgeDollarSign className="w-3 h-3" />
                Earn 0.05 ADMC
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-medium transition-colors text-slate-200">
                <ThumbsUp className="w-4 h-4" /> {video.likes || 0}
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-medium transition-colors text-slate-200">
                <ThumbsDown className="w-4 h-4" />
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-medium transition-colors text-slate-200">
                <Share2 className="w-4 h-4" /> Share
              </button>
              <button className="flex items-center gap-2 px-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-full text-sm font-medium transition-colors text-slate-200">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Channel Info */}
        <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 mb-6 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
              {(video.users?.username || 'U').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-white flex items-center gap-1">
                {video.users?.username || 'Unknown Creator'}
                <UserCheck className="w-4 h-4 text-blue-400 fill-current" />
              </h3>
              <p className="text-sm text-slate-400">{formatViews(video.subscribers || 0)} subscribers</p>
            </div>
          </div>
          <button className="bg-white text-slate-900 hover:bg-slate-200 px-6 py-2 rounded-full font-bold text-sm transition-colors">
            Subscribe
          </button>
        </div>

        {/* Description */}
        {video.description && (
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 mb-6">
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{video.description}</p>
          </div>
        )}

        {/* Comments Section */}
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-white">Comments</h3>
          </div>
          <div className="text-center py-6 text-slate-500 text-sm">
            Comments coming soon
          </div>
        </div>
      </div>

      {/* Right Sidebar - Related Videos */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        <h3 className="font-bold text-white text-lg mb-2">Up Next</h3>
        {relatedVideos.length === 0 ? (
          <p className="text-sm text-slate-500">No related videos</p>
        ) : (
          relatedVideos.map((item) => (
            <div
              key={item.id}
              className="flex gap-2 group cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors"
              onClick={() => {
                viewTrackedRef.current = false;
                watchStartRef.current = Date.now();
                window.location.href = `/app/watch/${item.id}`;
              }}
            >
              <div className="relative w-40 h-24 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                {item.thumbnail_url || item.cid ? (
                  <img
                    src={item.thumbnail_url || `https://ipfs.io/ipfs/${item.cid}`}
                    className="w-full h-full object-cover"
                    alt={item.title}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <PlayCircle className="w-6 h-6 text-slate-600" />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <h4 className="font-medium text-sm text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
                  {item.title}
                </h4>
                <p className="text-xs text-slate-400">{item.users?.username || 'Unknown'}</p>
                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                  <span>{formatViews(item.total_views || 0)} views</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
