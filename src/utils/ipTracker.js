/**
 * IP Tracker & Device Info Utility for System Audit & PDPA Compliance
 * พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)
 */

let memoryClientIp = null;

/**
 * Detect client OS and Browser
 */
export function getClientDeviceInfo() {
  if (typeof window === 'undefined' || !navigator) {
    return 'Web Client (Node/SSR)';
  }

  const ua = navigator.userAgent || '';
  let os = 'Unknown OS';
  if (/Windows NT 10.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS X/i.test(ua)) os = 'macOS';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/Edg\//i.test(ua)) browser = 'MS Edge';
  else if (/Chrome\//i.test(ua)) browser = 'Google Chrome';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  else if (/Firefox\//i.test(ua)) browser = 'Mozilla Firefox';

  return `${browser} on ${os}`;
}

/**
 * Fetch public IP address asynchronously with aggressive timeout and fallback
 */
export async function getClientIp() {
  if (memoryClientIp) return memoryClientIp;

  try {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem('prpo_client_ip') : null;
    if (saved && saved !== '127.0.0.1 (Local/Intranet)') {
      memoryClientIp = saved;
      return saved;
    }
  } catch {
    // Ignore sessionStorage errors
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const response = await fetch('https://api.ipify.org?format=json', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.ip) {
        memoryClientIp = data.ip;
        try {
          sessionStorage.setItem('prpo_client_ip', data.ip);
        } catch {}
        return data.ip;
      }
    }
  } catch (err) {
    // Graceful offline/network fallback
  }

  // Fallback to local indicator
  const fallbackIp = '127.0.0.1 (Local/Intranet)';
  memoryClientIp = fallbackIp;
  return fallbackIp;
}

/**
 * Return client IP synchronously (instant)
 */
export function getClientIpSync() {
  if (memoryClientIp) return memoryClientIp;
  try {
    const saved = sessionStorage.getItem('prpo_client_ip');
    if (saved) {
      memoryClientIp = saved;
      return saved;
    }
  } catch {}
  return '127.0.0.1 (Local)';
}

// Prefetch IP immediately in background on script load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    getClientIp().catch(() => {});
  }, 100);
}
