import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { WalletProvider } from './context/WalletContext';

// Pages
import LandingPage from './pages/LandingPage';
import VideoFeed from './pages/VideoFeed';
import VideoPlayer from './pages/VideoPlayer';
import UploadVideo from './pages/UploadVideo';
import CreateCampaign from './pages/CreateCampaign';
import Analytics from './pages/Analytics';
import Settlements from './pages/Settlements';
import BannerRevenue from './pages/BannerRevenue';
import MyVideos from './pages/MyVideos';
import AuthDiagnostic from './pages/AuthDiagnostic';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

const App = () => {
  return (
    <WalletProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          
          {/* Diagnostic pages */}
          <Route path="/auth-test" element={<AuthDiagnostic />} />
          
          <Route path="/app" element={<DashboardLayout />}>
            <Route index element={<Navigate to="/app/feed" replace />} />
            <Route path="feed" element={<VideoFeed />} />
            <Route path="watch/:id" element={<VideoPlayer />} />
            <Route path="upload" element={<UploadVideo />} />
            <Route path="videos" element={<MyVideos />} />
            <Route path="campaigns" element={<CreateCampaign />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="revenue" element={<BannerRevenue />} />
            <Route path="settlements" element={<Settlements />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" theme="dark" />
      </BrowserRouter>
    </WalletProvider>
  );
};

export default App;
