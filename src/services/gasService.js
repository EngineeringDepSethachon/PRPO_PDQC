/**
 * Google Apps Script (GAS) Web App & Google Sheets Integration Service
 * Handles live bidirectional syncing, offline fallback, optimistic mutations,
 * and connection health testing.
 */

const STORAGE_KEY_GAS_URL = 'prpo_gas_api_url';
const STORAGE_KEY_LAST_SYNC = 'prpo_last_sync_time';
const STORAGE_KEY_SYNC_STATUS = 'prpo_sync_status'; // 'OFFLINE' | 'CONNECTED' | 'SYNCING' | 'ERROR'

class GasService {
  constructor() {
    this.listeners = new Set();
  }

  // Get active GAS Web App URL
  getGasUrl() {
    const fromStorage = localStorage.getItem(STORAGE_KEY_GAS_URL);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
    return (import.meta.env.VITE_GAS_API_URL || '').trim();
  }

  // Set & Save GAS Web App URL
  setGasUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem(STORAGE_KEY_GAS_URL, url.trim());
      localStorage.setItem(STORAGE_KEY_SYNC_STATUS, 'CONNECTED');
    } else {
      localStorage.removeItem(STORAGE_KEY_GAS_URL);
      localStorage.setItem(STORAGE_KEY_SYNC_STATUS, 'OFFLINE');
    }
    this.notifyListeners();
  }

  isConfigured() {
    const url = this.getGasUrl();
    return Boolean(url && url.startsWith('https://script.google.com/'));
  }

  getLastSyncTime() {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  }

  setLastSyncTime() {
    const now = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, now);
    this.notifyListeners();
    return now;
  }

  getSyncStatus() {
    if (!this.isConfigured()) return 'OFFLINE';
    return localStorage.getItem(STORAGE_KEY_SYNC_STATUS) || 'CONNECTED';
  }

  setSyncStatus(status) {
    localStorage.setItem(STORAGE_KEY_SYNC_STATUS, status);
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    const state = {
      isConfigured: this.isConfigured(),
      gasUrl: this.getGasUrl(),
      syncStatus: this.getSyncStatus(),
      lastSyncTime: this.getLastSyncTime()
    };
    this.listeners.forEach(cb => {
      try { cb(state); } catch (e) { console.error(e); }
    });
  }

  /**
   * Test connection to Google Apps Script Web App (Ping Test)
   */
  async testConnection(customUrl = null) {
    const targetUrl = customUrl ? customUrl.trim() : this.getGasUrl();
    if (!targetUrl) {
      throw new Error('กรุณาระบุ Google Apps Script Web App URL');
    }

    try {
      const pingUrl = targetUrl.includes('?') ? `${targetUrl}&action=ping` : `${targetUrl}?action=ping`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('การเชื่อมต่อหมดเวลา (Timeout 15 วินาที) โปรดตรวจเช็คสิทธิ์ Web App ให้เป็น "Anyone"');
      }
      throw new Error(`เชื่อมต่อไม่สำเร็จ: ${err.message || 'โปรดตรวจสอบ URL และสิทธิ์การ Deploy'}`);
    }
  }

  /**
   * Pull Initial Data from Google Sheets Database
   */
  async pullInitialData() {
    if (!this.isConfigured()) return null;

    try {
      this.setSyncStatus('SYNCING');
      const targetUrl = this.getGasUrl();
      const fetchUrl = targetUrl.includes('?') ? `${targetUrl}&action=getInitialData` : `${targetUrl}?action=getInitialData`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(fetchUrl, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (result.status === 'success' && result.data) {
        this.setLastSyncTime();
        this.setSyncStatus('CONNECTED');
        return result.data;
      } else {
        throw new Error(result.message || 'โครงสร้างข้อมูลไม่ถูกต้อง');
      }
    } catch (err) {
      console.warn('[GasService] Pull from Google Sheets failed:', err);
      this.setSyncStatus('ERROR');
      throw err;
    }
  }

  /**
   * Send mutation (Action + Payload) to GAS Backend
   */
  async sendMutation(action, payload, user = null) {
    if (!this.isConfigured()) return null;

    try {
      const targetUrl = this.getGasUrl();
      const bodyPayload = {
        action,
        payload,
        user: typeof user === 'object' ? { name: user?.name, title: user?.title, department: user?.department } : { name: user || 'User' },
        timestamp: new Date().toISOString()
      };

      // Use text/plain to avoid CORS preflight OPTIONS request on Google Apps Script
      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyPayload)
      });

      const result = await response.json();
      this.setLastSyncTime();
      return result;
    } catch (err) {
      console.warn(`[GasService] Mutation ${action} to GAS failed:`, err);
      // Non-blocking for offline resilience
      return { status: 'offline_buffered', error: err.toString() };
    }
  }

  /**
   * Sync All Data from Local to Google Sheets (Full Backup/Push)
   */
  async syncAllToGAS(fullState, user = null) {
    if (!this.isConfigured()) {
      throw new Error('ยังไม่ได้กำหนด URL ของ Google Apps Script');
    }

    try {
      this.setSyncStatus('SYNCING');
      const targetUrl = this.getGasUrl();
      const bodyPayload = {
        action: 'syncAllData',
        payload: fullState,
        user: typeof user === 'object' ? { name: user?.name, title: user?.title } : { name: user || 'User' },
        timestamp: new Date().toISOString()
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (result.status === 'success') {
        this.setLastSyncTime();
        this.setSyncStatus('CONNECTED');
        return result;
      } else {
        throw new Error(result.message || 'การซิงค์ข้อมูลล้มเหลว');
      }
    } catch (err) {
      this.setSyncStatus('ERROR');
      throw err;
    }
  }
}

export const gasService = new GasService();
