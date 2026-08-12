/**
 * storage.js
 * Module penyimpanan data menggunakan localStorage
 * Struktur modular agar mudah dipindahkan ke database (Supabase, dll)
 */

// ============================================================
// CONSTANTS
// ============================================================
const KEYS = {
  MEMBERS: 'kkn_members',
  ATTENDANCE: 'kkn_attendance',
  ADMIN_SESSION: 'kkn_admin_session',
};

const DEFAULT_MEMBERS = [
  { id: 1, nama: 'Adrian Dhaniella' },
  { id: 2, nama: 'Alfia Nisa Hutami' },
  { id: 3, nama: 'Anggun Halimatul Qolbiyyah' },
  { id: 4, nama: 'Bintang Juniati' },
  { id: 5, nama: 'Diky Ardiyansyah' },
  { id: 6, nama: 'Dinar Suro Ati' },
  { id: 7, nama: 'Fachry Billhaqi Ilham' },
  { id: 8, nama: 'Jarkasih Kamaliyah' },
  { id: 9, nama: 'Meisya Lutfiyah Hanum' },
  { id: 10, nama: 'Muhammad Rizky' },
  { id: 11, nama: 'Muhammad Sahid Wahyudi' },
  { id: 12, nama: 'Nesa Erlita' },
  { id: 13, nama: 'Nur Alvia Putri Fauziah' },
  { id: 14, nama: 'Raden Krisna' },
  { id: 15, nama: 'Rifan Firmannudin' },
  { id: 16, nama: 'Rifki Rachman Fahlevi' },
  { id: 17, nama: 'Shelyn Fatikha Leddiasyahri' },
  { id: 18, nama: 'Suci Melati' },
  { id: 19, nama: 'Wildan Handanto' },
];

// ============================================================
// INISIALISASI DATA
// ============================================================

/**
 * Inisialisasi data awal saat aplikasi pertama dijalankan
 */
function initializeData() {
  if (!localStorage.getItem(KEYS.MEMBERS)) {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }
}

// ============================================================
// MEMBER FUNCTIONS
// ============================================================

/**
 * Ambil semua data anggota
 * @returns {Array} Array of member objects
 */
function getMembers() {
  const data = localStorage.getItem(KEYS.MEMBERS);
  return data ? JSON.parse(data) : [];
}

/**
 * Simpan array anggota ke localStorage
 * @param {Array} members
 */
function saveMembers(members) {
  localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
}

/**
 * Tambah anggota baru
 * @param {string} nama
 * @returns {Object} Anggota yang baru dibuat
 */
function addMember(nama) {
  const members = getMembers();
  const maxId = members.length > 0 ? Math.max(...members.map(m => m.id)) : 0;
  const newMember = { id: maxId + 1, nama: nama.trim() };
  members.push(newMember);
  saveMembers(members);
  return newMember;
}

/**
 * Update nama anggota berdasarkan ID
 * @param {number} id
 * @param {string} namaBaru
 * @returns {boolean} Berhasil atau tidak
 */
function updateMember(id, namaBaru) {
  const members = getMembers();
  const index = members.findIndex(m => m.id === id);
  if (index === -1) return false;
  members[index].nama = namaBaru.trim();
  saveMembers(members);
  return true;
}

/**
 * Hapus anggota berdasarkan ID
 * @param {number} id
 * @returns {boolean} Berhasil atau tidak
 */
function deleteMember(id) {
  const members = getMembers();
  const filtered = members.filter(m => m.id !== id);
  if (filtered.length === members.length) return false;
  saveMembers(filtered);
  return true;
}

/**
 * Cari anggota berdasarkan nama (partial, case-insensitive)
 * @param {string} query
 * @returns {Array}
 */
function searchMembers(query) {
  const members = getMembers();
  if (!query) return members;
  return members.filter(m =>
    m.nama.toLowerCase().includes(query.toLowerCase())
  );
}

// ============================================================
// ATTENDANCE FUNCTIONS
// ============================================================

/**
 * Ambil semua data absensi
 * @returns {Array}
 */
function getAttendance() {
  const data = localStorage.getItem(KEYS.ATTENDANCE);
  return data ? JSON.parse(data) : [];
}

/**
 * Simpan array absensi ke localStorage
 * @param {Array} attendance
 */
function saveAttendance(attendance) {
  localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance));
}

/**
 * Tambah record absensi baru
 * @param {number} anggotaId
 * @param {string} nama
 * @returns {Object|null} Record yang dibuat, atau null jika sudah absen hari ini
 */
function addAttendance(anggotaId, nama) {
  const today = getTodayDateString();
  if (isAlreadyAttended(anggotaId, today)) return null;

  const attendance = getAttendance();
  const maxId = attendance.length > 0 ? Math.max(...attendance.map(a => a.id)) : 0;

  const now = new Date();
  const jam = now.toTimeString().split(' ')[0]; // HH:MM:SS

  const record = {
    id: maxId + 1,
    anggotaId: anggotaId,
    nama: nama,
    tanggal: today,
    jam: jam,
    status: 'Hadir',
  };

  attendance.push(record);
  saveAttendance(attendance);
  return record;
}

/**
 * Ambil absensi hari ini
 * @returns {Array}
 */
function getTodayAttendance() {
  const today = getTodayDateString();
  return getAttendance().filter(a => a.tanggal === today);
}

/**
 * Ambil absensi berdasarkan tanggal tertentu
 * @param {string} tanggal Format YYYY-MM-DD
 * @returns {Array}
 */
function getAttendanceByDate(tanggal) {
  return getAttendance().filter(a => a.tanggal === tanggal);
}

/**
 * Ambil absensi berdasarkan rentang tanggal
 * @param {string} startDate Format YYYY-MM-DD
 * @param {string} endDate Format YYYY-MM-DD
 * @returns {Array}
 */
function getAttendanceByRange(startDate, endDate) {
  return getAttendance().filter(a => a.tanggal >= startDate && a.tanggal <= endDate);
}

/**
 * Cek apakah anggota sudah absen pada tanggal tertentu
 * @param {number} anggotaId
 * @param {string} tanggal Format YYYY-MM-DD
 * @returns {Object|null} Record absensi jika sudah, null jika belum
 */
function isAlreadyAttended(anggotaId, tanggal) {
  const attendance = getAttendance();
  return attendance.find(a => a.anggotaId === anggotaId && a.tanggal === tanggal) || null;
}

/**
 * Hapus record absensi berdasarkan ID
 * @param {number} id
 * @returns {boolean}
 */
function deleteAttendance(id) {
  const attendance = getAttendance();
  const filtered = attendance.filter(a => a.id !== id);
  if (filtered.length === attendance.length) return false;
  saveAttendance(filtered);
  return true;
}

// ============================================================
// ADMIN SESSION FUNCTIONS
// ============================================================

/**
 * Ambil status session admin
 * @returns {Object|null}
 */
function getAdminSession() {
  const data = sessionStorage.getItem(KEYS.ADMIN_SESSION);
  return data ? JSON.parse(data) : null;
}

/**
 * Set session admin setelah login
 * @param {string} username
 */
function setAdminSession(username) {
  const session = { username, loginAt: new Date().toISOString(), isLoggedIn: true };
  sessionStorage.setItem(KEYS.ADMIN_SESSION, JSON.stringify(session));
}

/**
 * Hapus session admin (logout)
 */
function clearAdminSession() {
  sessionStorage.removeItem(KEYS.ADMIN_SESSION);
}

/**
 * Cek apakah admin sudah login
 * @returns {boolean}
 */
function isAdminLoggedIn() {
  const session = getAdminSession();
  return session !== null && session.isLoggedIn === true;
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Dapatkan string tanggal hari ini dalam format YYYY-MM-DD
 * @returns {string}
 */
function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format tanggal dari YYYY-MM-DD ke format Indonesia (DD Bulan YYYY)
 * @param {string} dateStr Format YYYY-MM-DD
 * @returns {string}
 */
function formatTanggalIndonesia(dateStr) {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  const day = parseInt(parts[2]);
  const month = parseInt(parts[1]) - 1;
  const year = parts[0];
  return `${day} ${bulan[month]} ${year}`;
}

/**
 * Format tanggal dari YYYY-MM-DD ke DD/MM/YYYY
 * @param {string} dateStr
 * @returns {string}
 */
function formatTanggalShort(dateStr) {
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

/**
 * Format jam dari HH:MM:SS ke HH:MM
 * @param {string} jamStr
 * @returns {string}
 */
function formatJamShort(jamStr) {
  return jamStr.substring(0, 5);
}

// Jalankan inisialisasi saat file dimuat
initializeData();
