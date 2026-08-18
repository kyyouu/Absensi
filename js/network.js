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

/**
 * ============================================================
 * GEOFENCING GPS VALIDATION
 * ============================================================
 */

/**
 * Menghitung jarak antara dua titik koordinat (dalam meter) menggunakan Haversine Formula
 */
function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Mengambil koordinat GPS perangkat browser
 * @returns {Promise<{lat: number, lng: number, accuracy: number}|{error: string, message: string}>}
 */
function getDeviceLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ error: 'not_supported', message: 'Browser Anda tidak mendukung lokasi GPS.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: Math.round(position.coords.accuracy)
        });
      },
      (error) => {
        let msg = 'Gagal mengakses lokasi GPS.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Akses lokasi (GPS) ditolak. Harap izinkan akses lokasi pada browser HP Anda.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Informasi lokasi GPS tidak tersedia.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'Waktu permintaan lokasi GPS habis (timeout). Sinyal GPS lemah.';
        }
        resolve({ error: 'denied', code: error.code, message: msg });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Memvalidasi apakah posisi GPS berada dalam radius Posko KKN
 * @returns {Promise<{ isAllowed: boolean, distance: number|null, status: string, message: string }>}
 */
async function verifyLocationConnection() {
  const locConfig = typeof getPoskoLocationConfig === 'function' ? getPoskoLocationConfig() : {};

  if (locConfig.enable === false) {
    return { isAllowed: true, distance: 0, status: 'disabled', message: 'Validasi GPS nonaktif.' };
  }

  const poskoLat = locConfig.lat;
  const poskoLng = locConfig.lng;
  const maxRadius = locConfig.radius || 50;

  if (poskoLat === null || poskoLng === null || typeof poskoLat === 'undefined') {
    return {
      isAllowed: true,
      distance: 0,
      status: 'unconfigured',
      message: 'Koordinat Posko belum diset oleh Admin. Menggunakan akses biasa.'
    };
  }

  const loc = await getDeviceLocation();

  if (!loc || loc.error) {
    return {
      isAllowed: false,
      distance: null,
      status: 'error_location',
      message: loc ? loc.message : 'Gagal mendeteksi lokasi GPS.'
    };
  }

  const distance = calculateDistanceMeters(loc.lat, loc.lng, poskoLat, poskoLng);

  if (distance <= maxRadius) {
    return {
      isAllowed: true,
      distance: distance,
      accuracy: loc.accuracy,
      status: 'success',
      message: `Lokasi GPS Posko Terverifikasi (Jarak: ${distance} m)`
    };
  } else {
    return {
      isAllowed: false,
      distance: distance,
      accuracy: loc.accuracy,
      status: 'too_far',
      message: `Anda berada di luar radius Posko KKN (Jarak: ${distance} meter, Maksimum: ${maxRadius} meter).`
    };
  }
}

