/**
 * UploadVideo Component
 * This shows how to upload videos to IPFS via the backend API
 * 
 * Features:
 * - Handle file selection
 * - Use apiClient.uploadVideo() with FormData
 * - Show upload progress and success/error messages
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Upload, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../app/context/WalletContext';
import { apiClient } from '../services/api';
import { Input } from '../app/components/ui/input';
import { Button } from '../app/components/ui/button';
import { Label } from '../app/components/ui/label';
import { Textarea } from '../app/components/ui/textarea';

const UploadVideo = () => {
  const navigate = useNavigate();
  const { isConnected } = useWallet();
  
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  if (!isConnected) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Connect Your Wallet</h2>
        <p className="text-slate-400 mb-6">You need to connect your wallet to upload videos</p>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('video/')) {
        setError('Please select a valid video file');
        return;
      }
      
      // Validate file size (e.g., max 500MB)
      if (selectedFile.size > 500 * 1024 * 1024) {
        setError('Video file must be less than 500MB');
        return;
      }
      
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!file || !title.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      setUploadProgress(0);

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);

      // Simulate progress tracking (in a real scenario, use fetch API with upload events)
      const uploadInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + Math.random() * 30, 90));
      }, 500);

      // Upload video
      const result = await apiClient.uploadVideo(formData);

      clearInterval(uploadInterval);
      setUploadProgress(100);

      // Reset form
      setFile(null);
      setTitle('');
      setDescription('');
      setSuccess(true);

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/app/videos');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      console.error('Upload failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Upload Video</h1>
        <p className="text-slate-400">Share your content with the PayPerView community</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-800 rounded-xl border border-slate-700 p-8 space-y-6"
      >
        {success && (
          <div className="bg-emerald-900/50 border border-emerald-400 text-emerald-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <div>
              <p className="font-bold">Video uploaded successfully!</p>
              <p className="text-sm">Redirecting to your videos...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-400 text-red-200 px-4 py-3 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          {/* File Upload */}
          <div>
            <Label className="text-slate-200 mb-3 block">Video File *</Label>
            <div className="border-2 border-dashed border-slate-600 rounded-lg p-8 text-center hover:border-indigo-500 transition-colors cursor-pointer">
              <input
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                disabled={loading}
                className="hidden"
                id="video-input"
                required
              />
              <label htmlFor="video-input" className="cursor-pointer">
                <Upload className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                <p className="text-white font-medium mb-1">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-slate-400">
                  MP4, WebM, AVI or MOV (max 500MB)
                </p>
              </label>
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-slate-200 mb-2 block">Title *</Label>
            <Input
              value={title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
              placeholder="Give your video a catchy title..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              disabled={loading}
              required
              maxLength={100}
            />
            <p className="text-xs text-slate-400 mt-1">
              {title.length}/100 characters
            </p>
          </div>

          {/* Description */}
          <div>
            <Label className="text-slate-200 mb-2 block">Description</Label>
            <Textarea
              value={description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
              placeholder="Tell viewers about your video..."
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500 resize-none"
              disabled={loading}
              rows={4}
              maxLength={1000}
            />
            <p className="text-xs text-slate-400 mt-1">
              {description.length}/1000 characters
            </p>
          </div>

          {/* Upload Progress */}
          {loading && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-300">Uploading...</span>
                <span className="text-sm font-mono text-indigo-400">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-slate-700/50 p-4 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-300">
              <span className="font-semibold">💡 Tip:</span> Your video will be stored on IPFS for decentralized access. 
              Once uploaded, it can be monetized through ad campaigns.
            </p>
          </div>

          {/* Earnings Info */}
          <div className="bg-indigo-900/30 p-4 rounded-lg border border-indigo-500/30">
            <p className="text-sm text-indigo-200">
              <span className="font-semibold">🎬 Earnings:</span> Earn revenue from ad placements on your videos. 
              You keep 70% of ad revenue, with 30% going to platform operations.
            </p>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={loading || !file || !title.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Video
              </>
            )}
          </Button>
        </form>
      </motion.div>
    </div>
  );
};

export default UploadVideo;
