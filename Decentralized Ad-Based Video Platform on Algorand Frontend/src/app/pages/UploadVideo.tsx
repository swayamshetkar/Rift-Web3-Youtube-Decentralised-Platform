import React, { useState } from 'react';
import { UploadCloud, X, CheckCircle, FileVideo, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../services/api';

const UploadVideo = () => {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [enableAds, setEnableAds] = useState(true);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title) {
      toast.error("Please provide a file and title");
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('file', file);

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      const result = await new Promise<any>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            setProgress(pct);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText));
            } catch {
              resolve({});
            }
          } else {
            reject(new Error(`Upload failed: HTTP ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        const baseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
        xhr.open('POST', `${baseUrl}/videos/upload`);

        const token = localStorage.getItem('access_token');
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.send(formData);
      });

      setProgress(100);
      toast.success("Video uploaded successfully to IPFS!");
      setTimeout(() => navigate('/app/feed'), 1000);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Upload failed';
      toast.error(msg);
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Upload Video</h1>
          <p className="text-slate-400">Share your content with the decentralized world.</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-8">

          {/* File Upload Area */}
          <div
            className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-all ${dragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-indigo-400 hover:bg-slate-700/50'
              }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept="video/*"
              onChange={handleChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <AnimatePresence mode="wait">
              {file ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-indigo-600/20 rounded-full flex items-center justify-center mb-4 text-indigo-400">
                    <FileVideo className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">{file.name}</h3>
                  <p className="text-sm text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFile(null);
                    }}
                    className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-full text-sm text-white transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" /> Remove
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center"
                >
                  <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400">
                    <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2">Drag and drop video files to upload</h3>
                  <p className="text-sm text-slate-400 mb-6">Your videos will be decentralized on IPFS.</p>
                  <button type="button" className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors pointer-events-none">
                    Select Files
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                placeholder="Video title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
                placeholder="Tell viewers about your video..."
              />
            </div>

            {/* Monetization Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-6 rounded-full p-1 transition-colors cursor-pointer ${enableAds ? 'bg-indigo-600' : 'bg-slate-600'}`} onClick={() => setEnableAds(!enableAds)}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${enableAds ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-white">Enable Ads</h4>
                  <p className="text-xs text-slate-400">Earn revenue from verified views</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-400 px-2 py-1 bg-emerald-500/10 rounded border border-emerald-500/20">
                Est. 2.5 ADMC / 1k views
              </span>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-white">Uploading to IPFS...</span>
                <span className="text-indigo-400">{progress}%</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              {progress === 100 && (
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Upload complete!
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-2 text-slate-400 hover:text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file || !title}
              className={`px-8 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 ${(uploading || !file || !title) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {uploading ? 'Uploading...' : 'Publish Video'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadVideo;
