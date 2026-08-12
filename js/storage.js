/**
 * storage.js
 * Storage Manager: Mendukung Supabase Cloud Database & localStorage Fallback
 */

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

// Initialize Supabase Client
let dbClient = null;

function getSupabase() {
  if (dbClient) return dbClient;
  if (typeof supabase !== 'undefined' && typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY) {
    try {
      dbClient = supabase.createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);
      console.log('✅ Connected to Supabase Cloud Database');
      return dbClient;
    } catch (e) {
      console.error('❌ Failed to initialize Supabase client:', e);
    }
  }
  return null;
}

/**
 * Inisialisasi data awal
 */
async function initializeData() {
  const sb = getSupabase();
  if (!localStorage.getItem(KEYS.MEMBERS) || JSON.parse(localStorage.getItem(KEYS.MEMBERS) || '[]').length === 0) {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(DEFAULT_MEMBERS));
  }
  if (!localStorage.getItem(KEYS.ATTENDANCE)) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
  }

  if (sb) {
    try {
      const { data } = await sb.from('kkn_members').select('id').limit(1);
      if (!data || data.length === 0) {
        await sb.from('kkn_members').insert(DEFAULT_MEMBERS);
      }
    } catch (e) {
      console.warn('Supabase init check warning:', e);
    }
  }
}

// ============================================================
// MEMBER FUNCTIONS (ASYNC & SYNC)
// ============================================================

async function getMembersAsync() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('kkn_members').select('*').order('id', { ascending: true });
      if (!error && data && data.length > 0) {
        saveMembers(data);
        return data;
      }
    } catch (e) {
      console.error('Error fetching members from Supabase:', e);
    }
  }
  return getMembers();
}

function getMembers() {
  try {
    const data = localStorage.getItem(KEYS.MEMBERS);
    return data ? JSON.parse(data) : DEFAULT_MEMBERS;
  } catch (e) {
    return DEFAULT_MEMBERS;
  }
}

function saveMembers(members) {
  try {
    localStorage.setItem(KEYS.MEMBERS, JSON.stringify(members));
  } catch (e) {}
}

async function addMemberAsync(nama) {
  const sb = getSupabase();
  const namaClean = nama.trim();
  if (sb) {
    try {
      const { data, error } = await sb.from('kkn_members').insert([{ nama: namaClean }]).select().single();
      if (!error && data) {
        const local = getMembers();
        local.push(data);
        saveMembers(local);
        return data;
      }
    } catch (e) {
      console.error('Error adding member to Supabase:', e);
    }
  }
  return addMember(namaClean);
}

function addMember(nama) {
  const members = getMembers();
  const maxId = members.reduce((max, m) => Math.max(max, parseInt(m.id) || 0), 0);
  const newMember = { id: maxId + 1, nama: nama.trim() };
  members.push(newMember);
  saveMembers(members);
  return newMember;
}

async function updateMemberAsync(id, namaBaru) {
  const sb = getSupabase();
  const namaClean = namaBaru.trim();
  if (sb) {
    try {
      await sb.from('kkn_members').update({ nama: namaClean }).eq('id', id);
    } catch (e) {
      console.error('Error updating member in Supabase:', e);
    }
  }
  return updateMember(id, namaClean);
}

function updateMember(id, namaBaru) {
  const members = getMembers();
  const index = members.findIndex(m => parseInt(m.id) === parseInt(id));
  if (index === -1) return false;
  members[index].nama = namaBaru.trim();
  saveMembers(members);
  return true;
}

async function deleteMemberAsync(id) {
  const sb = getSupabase();
  if (sb) {
    try {
      await sb.from('kkn_members').delete().eq('id', id);
    } catch (e) {
      console.error('Error deleting member from Supabase:', e);
    }
  }
  return deleteMember(id);
}

function deleteMember(id) {
  const members = getMembers();
  const filtered = members.filter(m => parseInt(m.id) !== parseInt(id));
  if (filtered.length === members.length) return false;
  saveMembers(filtered);
  return true;
}

// ============================================================
// ATTENDANCE FUNCTIONS (ASYNC & SYNC)
// ============================================================

async function getAttendanceAsync() {
  const sb = getSupabase();
  if (sb) {
    try {
      const { data, error } = await sb.from('kkn_attendance').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        const mapped = data.map(item => ({
          id: item.id,
          anggotaId: item.anggota_id,
          nama: item.nama,
          tanggal: item.tanggal,
          jam: item.jam,
          status: item.status || 'Hadir'
        }));
        saveAttendance(mapped);
        return mapped;
      }
    } catch (e) {
      console.error('Error fetching attendance from Supabase:', e);
    }
  }
  return getAttendance();
}

function getAttendance() {
  try {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

function saveAttendance(attendance) {
  try {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(attendance));
  } catch (e) {}
}

async function addAttendanceAsync(anggotaId, nama) {
  const today = getTodayDateString();
  const already = await isAlreadyAttendedAsync(anggotaId, today);
  if (already) {
    console.warn(`Anggota ID ${anggotaId} (${nama}) sudah absen hari ini (${today})`);
    return null;
  }

  const sb = getSupabase();
  const now = new Date();
  const jam = now.toTimeString().split(' ')[0];
  const targetId = parseInt(anggotaId);
  const namaClean = nama.trim();

  if (sb) {
    try {
      const { data, error } = await sb.from('kkn_attendance').insert([{
        anggota_id: targetId,
        nama: namaClean,
        tanggal: today,
        jam: jam,
        status: 'Hadir'
      }]).select().single();

      if (!error && data) {
        const record = {
          id: data.id,
          anggotaId: data.anggota_id,
          nama: data.nama,
          tanggal: data.tanggal,
          jam: data.jam,
          status: data.status || 'Hadir'
        };
        const local = getAttendance();
        local.push(record);
        saveAttendance(local);
        return record;
      }
    } catch (e) {
      console.error('Error adding attendance to Supabase:', e);
    }
  }

  return addAttendance(targetId, namaClean);
}

function addAttendance(anggotaId, nama) {
  const today = getTodayDateString();
  if (isAlreadyAttended(anggotaId, today)) return null;

  const attendance = getAttendance();
  const maxId = attendance.reduce((max, a) => Math.max(max, parseInt(a.id) || 0), 0);
  const now = new Date();
  const jam = now.toTimeString().split(' ')[0];

  const record = {
    id: maxId + 1,
    anggotaId: parseInt(anggotaId),
    nama: nama.trim(),
    tanggal: today,
    jam: jam,
    status: 'Hadir',
  };

  attendance.push(record);
  saveAttendance(attendance);
  return record;
}

async function isAlreadyAttendedAsync(anggotaId, tanggal) {
  const sb = getSupabase();
  const targetId = parseInt(anggotaId);
  if (sb) {
    try {
      const { data, error } = await sb.from('kkn_attendance')
        .select('*')
        .eq('anggota_id', targetId)
        .eq('tanggal', tanggal);
      if (!error && data && data.length > 0) {
        return {
          id: data[0].id,
          anggotaId: data[0].anggota_id,
          nama: data[0].nama,
          tanggal: data[0].tanggal,
          jam: data[0].jam,
          status: data[0].status || 'Hadir'
        };
      }
    } catch (e) {
      console.error('Error checking attendance in Supabase:', e);
    }
  }
  return isAlreadyAttended(targetId, tanggal);
}

function isAlreadyAttended(anggotaId, tanggal) {
  const attendance = getAttendance();
  const targetId = parseInt(anggotaId);
  return attendance.find(a => parseInt(a.anggotaId) === targetId && a.tanggal === tanggal) || null;
}

function getTodayAttendance() {
  const today = getTodayDateString();
  return getAttendance().filter(a => a.tanggal === today);
}

function getAttendanceByDate(tanggal) {
  return getAttendance().filter(a => a.tanggal === tanggal);
}

function getAttendanceByRange(startDate, endDate) {
  return getAttendance().filter(a => a.tanggal >= startDate && a.tanggal <= endDate);
}

// ============================================================
// ADMIN SESSION & UTILS
// ============================================================

function getAdminSession() {
  const data = sessionStorage.getItem(KEYS.ADMIN_SESSION);
  return data ? JSON.parse(data) : null;
}

function setAdminSession(username) {
  const session = { username, loginAt: new Date().toISOString(), isLoggedIn: true };
  sessionStorage.setItem(KEYS.ADMIN_SESSION, JSON.stringify(session));
}

function clearAdminSession() {
  sessionStorage.removeItem(KEYS.ADMIN_SESSION);
}

function isAdminLoggedIn() {
  const session = getAdminSession();
  return session !== null && session.isLoggedIn === true;
}

function getTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTanggalIndonesia(dateStr) {
  if (!dateStr) return '';
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const day = parseInt(parts[2]);
  const month = parseInt(parts[1]) - 1;
  const year = parts[0];
  return `${day} ${bulan[month]} ${year}`;
}

function formatTanggalShort(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatJamShort(jamStr) {
  return jamStr ? jamStr.substring(0, 5) : '';
}

initializeData();
