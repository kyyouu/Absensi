/**
 * network.js
 * Logic untuk validasi IP Publik WiFi Posko KKN
 */

/**
 * Mengambil IP publik perangkat menggunakan multiple provider (dengan fallback)
 * @returns {Promise<string|null>} IP Publik atau null jika gagal
 */
async function getPublicIP() {
  const timeoutMs = (typeof NETWORK_CONFIG !== 'undefined' && NETWORK_CONFIG.TIMEOUT_MS) || 5000;

  // Daftar provider IP publik gratis yang cepat & suport CORS
  const providers = [
    { url: 'https://api.ipify.org?format=json', parse: data => data.ip },
    { url: 'https://ipapi.co/json/', parse: data => data.ip },
    { url: 'https://api64.ipify.org?format=json', parse: data => data.ip }
  ];

  for (const provider of providers) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(provider.url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const ip = provider.parse(data);
        if (ip && typeof ip === 'string') {
          return ip.trim();
        }
      }
    } catch (err) {
      console.warn(`Gagal mengambil IP dari ${provider.url}:`, err);
      // Lanjut ke provider berikutnya
    }
  }

  return null;
}

/**
 * Melakukan pengecekan apakah IP saat ini diizinkan sesuai NETWORK_CONFIG
 * @returns {Promise<{ isAllowed: boolean, currentIp: string|null, isDev: boolean, status: string, message: string }>}
 */
async function verifyNetworkConnection() {
  // Ambil konfigurasi
  const config = typeof NETWORK_CONFIG !== 'undefined' ? NETWORK_CONFIG : { ALLOWED_IP: '*' };
  const allowedConfig = config.ALLOWED_IP;
  const deniedMsg = config.DENIED_MESSAGE || 'Absensi hanya dapat dilakukan melalui WiFi Posko KKN.';

  // Mode Pengujian (jika ALLOWED_IP diisi '*' atau kosong)
  if (!allowedConfig || allowedConfig === '*' || (Array.isArray(allowedConfig) && allowedConfig.includes('*'))) {
    const fetchedIp = await getPublicIP();
    return {
      isAllowed: true,
      currentIp: fetchedIp || 'Semua IP (Dev Mode)',
      isDev: true,
      status: 'dev',
      message: 'Mode Pengujian (Semua Jaringan Diizinkan)'
    };
  }

  // Dapatkan IP publik saat ini
  const currentIp = await getPublicIP();

  if (!currentIp) {
    return {
      isAllowed: false,
      currentIp: null,
      isDev: false,
      status: 'error_fetch',
      message: 'Gagal mendeteksi IP jaringan. Pastikan koneksi internet aktif.'
    };
  }

  // Normalisasi IP yang diizinkan (bisa string tunggal atau array string)
  let allowedList = [];
  if (Array.isArray(allowedConfig)) {
    allowedList = allowedConfig.map(ip => String(ip).trim());
  } else {
    allowedList = [String(allowedConfig).trim()];
  }

  // Pengecekan IP mencakup: exact match, wildcard (cth: '156.230.*'), dan prefix (cth: '156.230.')
  const isMatched = allowedList.some(pattern => isIpMatching(pattern, currentIp));

  if (isMatched) {
    return {
      isAllowed: true,
      currentIp: currentIp,
      isDev: false,
      status: 'success',
      message: 'Terhubung ke WiFi Posko KKN'
    };
  } else {
    return {
      isAllowed: false,
      currentIp: currentIp,
      isDev: false,
      status: 'denied',
      message: deniedMsg
    };
  }
}

/**
 * Helper untuk mencocokkan IP dengan pola (exact, wildcard, atau prefix)
 */
function isIpMatching(pattern, currentIp) {
  if (!pattern || !currentIp) return false;
  pattern = pattern.trim();
  currentIp = currentIp.trim();

  // Exact match atau All Allowed
  if (pattern === currentIp || pattern === '*') return true;

  // Wildcard match (contoh: '156.230.*' atau '156.230.191.*')
  if (pattern.includes('*')) {
    const prefix = pattern.split('*')[0];
    return currentIp.startsWith(prefix);
  }

  // Prefix match (contoh: '156.230.')
  if (pattern.endsWith('.')) {
    return currentIp.startsWith(pattern);
  }

  return false;
}
