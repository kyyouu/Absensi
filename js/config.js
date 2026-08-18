/**
 * config.js
 * Konfigurasi Supabase untuk Aplikasi Absensi KKN
 *
 * Masukkan URL dan Anon Key dari Project Supabase Anda:
 * Supabase Dashboard -> Project Settings -> API
 */
const SUPABASE_CONFIG = {
  // Project URL Supabase
  URL: 'https://ehbidyovspcdvhavwwvu.supabase.co',

  // anon public key Supabase
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVoYmlkeW92c3BjZHZoYXZ3d3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDU0NzIsImV4cCI6MjEwMjEyMTQ3Mn0.sRFBT_ZFMgrTy6isfjjB9x18WGRGwhSGVtYDsAW3BHk'
};

/**
 * Konfigurasi Validasi Jaringan (WiFi Posko KKN)
 *
 * ALLOWED_IP: IP Publik dari WiFi Posko KKN.
 * - Single IP: '156.230.182.99'
 * - Subnet / Wildcard: '156.230.*' (Cocok untuk provider dengan IP dinamis)
 * - Multiple IP / Subnet: ['156.230.182.99', '156.230.191.152', '156.230.*']
 * - Dev Mode: '*' (Mengizinkan semua jaringan)
 */
const NETWORK_CONFIG = {
  // Rentang IP Publik WiFi Posko KKN (termasuk 203.83.40.* dan wildcard untuk IP dinamis ISP)
  ALLOWED_IP: ['203.83.40.*', '203.83.*', '156.230.*'],

  // Pesan peringatan jika jaringan tidak cocok
  DENIED_MESSAGE: 'Absensi hanya dapat dilakukan melalui WiFi Posko KKN.',

  // Timeout untuk pengecekan IP (dalam milidetik)
  TIMEOUT_MS: 5000
};

