/**
 * API Client for Backend Communication
 * Handles all API requests for video platform
 */

const API_BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';

// ── Response Interfaces ──────────────────────────────────────────────

interface VideoResponse {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  creator_name: string;
  created_at: string;
  views: number;
  ipfs_hash: string;
  subscribers?: number;
}

interface TrackViewPayload {
  video_id: string;
  watch_seconds: number;
  wallet: string;
  device_fingerprint: string;
}

interface UploadResponse {
  id: string;
  ipfs_hash: string;
  title: string;
  creator_id: string;
}

interface AdCampaign {
  id: string;
  advertiser_id: string;
  video_id: string;
  budget: number;
  remaining_budget: number;
  reward_per_view: number;
  status: string;
  created_at: string;
  ipfs_hash?: string;
}

interface BannerAd {
  id: string;
  advertiser_id: string;
  tier: string;
  fixed_price: number;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

interface Settlement {
  id: string;
  date: string;
  amount: number;
  fee: number;
  tx_hash: string;
  status: string;
  type?: string;
}

interface AdSummary {
  total_campaigns: number;
  active_campaigns: number;
  total_budget: number;
  total_spent: number;
  total_views: number;
  total_earnings: number;
  subscribers?: number;
}

interface SettlementSummary {
  total_settled: number;
  total_fees: number;
  pending_amount: number;
  settlement_count: number;
}

// ── API Client ───────────────────────────────────────────────────────

class APIClient {
  /** Returns JSON headers with optional Bearer token */
  private getAuthHeader(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  /** Returns only Authorization header (for multipart/form-data – browser sets Content-Type) */
  private getAuthHeaderMultipart(): Record<string, string> {
    const token = localStorage.getItem('access_token');
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  // ────────────────────────────────────────────────────────────────────
  // AUTH
  // ────────────────────────────────────────────────────────────────────

  async getChallenge(walletAddress: string): Promise<{ message: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async signup(payload: {
    wallet_address: string;
    signature: string;
    message: string;
    username: string;
    role: 'creator' | 'viewer' | 'advertiser';
  }): Promise<{ access_token: string; user: any }> {
    console.log('Sending signup request:', {
      wallet_address: payload.wallet_address,
      message: payload.message,
      signature: payload.signature.substring(0, 20) + '...',
      username: payload.username,
      role: payload.role,
    });
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Signup error:', data);
      throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async login(payload: {
    wallet_address: string;
    signature: string;
    message: string;
  }): Promise<{ access_token: string; user: any }> {
    console.log('Sending login request:', {
      wallet_address: payload.wallet_address,
      message: payload.message,
      signature: payload.signature.substring(0, 20) + '...',
    });
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Login error:', data);
      throw new Error(data.detail || data.error || `HTTP ${response.status}`);
    }
    return data;
  }

  async getMe(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // VIDEOS
  // ────────────────────────────────────────────────────────────────────

  async listVideos(offset = 0, limit = 20): Promise<VideoResponse[]> {
    const response = await fetch(`${API_BASE_URL}/videos/list?offset=${offset}&limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getVideo(videoId: string): Promise<VideoResponse> {
    const response = await fetch(`${API_BASE_URL}/videos/${videoId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getUserVideos(): Promise<VideoResponse[]> {
    const response = await fetch(`${API_BASE_URL}/videos/me`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async uploadVideo(formData: FormData): Promise<UploadResponse> {
    const response = await fetch(`${API_BASE_URL}/videos/upload`, {
      method: 'POST',
      headers: this.getAuthHeaderMultipart(),
      body: formData,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // VIEWS
  // ────────────────────────────────────────────────────────────────────

  async trackView(payload: TrackViewPayload): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/views/track`, {
      method: 'POST',
      headers: {
        ...this.getAuthHeader(),
        'x-device-fingerprint': payload.device_fingerprint,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  }

  // ────────────────────────────────────────────────────────────────────
  // ADS (VIDEO CAMPAIGNS)
  // ────────────────────────────────────────────────────────────────────

  async createAd(formData: FormData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ads/create`, {
      method: 'POST',
      headers: this.getAuthHeaderMultipart(),
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data.detail;
      const msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return response.json();
  }

  async getActiveAds(): Promise<AdCampaign[]> {
    const response = await fetch(`${API_BASE_URL}/ads/active`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getMyAds(): Promise<AdCampaign[]> {
    const response = await fetch(`${API_BASE_URL}/ads/me`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async withdrawCampaign(campaignId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ads/campaign/${campaignId}/withdraw`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // ADS (BANNER)
  // ────────────────────────────────────────────────────────────────────

  async createBannerAd(formData: FormData): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/ads/banner/create`, {
      method: 'POST',
      headers: this.getAuthHeaderMultipart(),
      body: formData,
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data.detail;
      const msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return response.json();
  }

  async getActiveBanners(): Promise<BannerAd[]> {
    const response = await fetch(`${API_BASE_URL}/ads/banner/active`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getMyBanners(): Promise<BannerAd[]> {
    const response = await fetch(`${API_BASE_URL}/ads/banner/me`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async getAdSummary(): Promise<AdSummary> {
    const response = await fetch(`${API_BASE_URL}/ads/summary`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // SETTLEMENT
  // ────────────────────────────────────────────────────────────────────

  async getSettlements(limit = 100): Promise<Settlement[]> {
    const response = await fetch(`${API_BASE_URL}/settlement/?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  async triggerSettlement(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/settlement/trigger`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data.detail;
      const msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return response.json();
  }

  async triggerBannerSettlement(): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/settlement/trigger-banner`, {
      method: 'POST',
      headers: this.getAuthHeader(),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const detail = data.detail;
      const msg = typeof detail === 'string' ? detail : detail ? JSON.stringify(detail) : `HTTP ${response.status}`;
      throw new Error(msg);
    }
    return response.json();
  }

  async getSettlementSummary(): Promise<SettlementSummary> {
    const response = await fetch(`${API_BASE_URL}/settlement/summary`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  // ────────────────────────────────────────────────────────────────────
  // WALLETS
  // ────────────────────────────────────────────────────────────────────

  async getBalance(): Promise<{ balance: number }> {
    try {
      const response = await fetch(`${API_BASE_URL}/wallets/balance`, {
        headers: this.getAuthHeader(),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    } catch {
      return { balance: 0 };
    }
  }

  async getPlatformBalance(): Promise<{ balance: number }> {
    const response = await fetch(`${API_BASE_URL}/wallets/platform-balance`, {
      headers: this.getAuthHeader(),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

export const apiClient = new APIClient();
