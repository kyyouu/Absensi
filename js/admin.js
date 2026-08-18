/**
 * admin.js
 * Logic untuk halaman dashboard-admin.html
 */

document.addEventListener('DOMContentLoaded', function () {
  // Guard: cek login
  requireAdminAuth();

  // Tampilkan username admin di navbar
  const session = getAdminSession();
  const adminUsernameEl = document.getElementById('adminUsername');
  if (adminUsernameEl && session) {
    adminUsernameEl.textContent = session.username;
  }

  // ============================================================
  // SIDEBAR TOGGLE (Mobile)
  // ============================================================
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', function () {
      sidebar.classList.toggle('sidebar-open');
      if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
    });
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', function () {
      sidebar.classList.remove('sidebar-open');
      sidebarOverlay.classList.remove('active');
    });
  }

  // ============================================================
  // LOGOUT
  // ============================================================
  const logoutBtn = document.getElementById('logoutBtn');
  const logoutBtnSidebar = document.getElementById('logoutBtnSidebar');

  function handleLogout(e) {
    e.preventDefault();
    if (confirm('Apakah Anda yakin ingin logout?')) {
      adminLogout();
    }
  }

  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (logoutBtnSidebar) logoutBtnSidebar.addEventListener('click', handleLogout);

  // ============================================================
  // STATISTIK & TABEL
  // ============================================================
  async function updateStatsAndTable() {
    const members = await getMembersAsync();
    const attendance = await getAttendanceAsync();
    const today = getTodayDateString();

    const todayAttendance = attendance.filter(a => String(a.tanggal || '').substring(0, 10) === today);

    const totalAnggota = members.length;
    const hadirHariIni = todayAttendance.length;
    const belumHadir = totalAnggota - hadirHariIni;

    const elTotal = document.getElementById('statTotal');
    const elHadir = document.getElementById('statHadir');
    const elBelum = document.getElementById('statBelum');

    if (elTotal) elTotal.textContent = totalAnggota;
    if (elHadir) elHadir.textContent = hadirHariIni;
    if (elBelum) elBelum.textContent = Math.max(0, belumHadir);

    // Filter untuk tabel berdasarkan rentang tanggal
    let filteredAttendance = attendance;
    if (filterStartDate && filterEndDate) {
      filteredAttendance = attendance.filter(a => {
        const t = String(a.tanggal || '').substring(0, 10);
        return t >= filterStartDate && t <= filterEndDate;
      });
    } else if (filterStartDate) {
      filteredAttendance = attendance.filter(a => {
        const t = String(a.tanggal || '').substring(0, 10);
        return t >= filterStartDate;
      });
    } else if (filterEndDate) {
      filteredAttendance = attendance.filter(a => {
        const t = String(a.tanggal || '').substring(0, 10);
        return t <= filterEndDate;
      });
    } else {
      // Jika tidak diisi, tampilkan absensi hari ini secara default
      const targetDate = today;
      filteredAttendance = attendance.filter(a => String(a.tanggal || '').substring(0, 10) === targetDate);
    }

    currentData = filteredAttendance.filter(function (a) {
      return a.nama.toLowerCase().includes(searchQuery.toLowerCase());
    });

    currentData.sort((a, b) => {
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.jam.localeCompare(a.jam);
    });
    renderTable(currentData);
  }

  let currentData = [];
  let filterStartDate = getTodayDateString();
  let filterEndDate = getTodayDateString();
  let searchQuery = '';

  function loadTable() {
    updateStatsAndTable();
  }

  function renderTable(data) {
    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            <p>Belum ada data absensi yang sesuai filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(function (record, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td><span class="member-name">${record.nama}</span></td>
          <td>${formatTanggalShort(record.tanggal)}</td>
          <td>${formatJamShort(record.jam)}</td>
          <td><span class="badge badge-hadir">Hadir</span></td>
        </tr>
      `;
    }).join('');
  }

  // Search real-time
  const searchInput = document.getElementById('searchAttendance');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = this.value.trim();
      loadTable();
    });
  }

  // Filter tanggal mulai & akhir
  const filterStartInput = document.getElementById('filterStartDate');
  const filterEndInput = document.getElementById('filterEndDate');

  if (filterStartInput) {
    filterStartInput.value = getTodayDateString();
    filterStartInput.addEventListener('change', function () {
      filterStartDate = this.value;
      loadTable();
    });
  }

  if (filterEndInput) {
    filterEndInput.value = getTodayDateString();
    filterEndInput.addEventListener('change', function () {
      filterEndDate = this.value;
      loadTable();
    });
  }

  // Reset filter
  const resetFilterBtn = document.getElementById('resetFilter');
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', function () {
      filterStartDate = getTodayDateString();
      filterEndDate = getTodayDateString();
      searchQuery = '';
      if (filterStartInput) filterStartInput.value = filterStartDate;
      if (filterEndInput) filterEndInput.value = filterEndDate;
      if (searchInput) searchInput.value = '';
      loadTable();
    });
  }

  // Reset Seluruh Absensi
  const clearAllBtn = document.getElementById('clearAllAttendanceBtn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', async function () {
      if (confirm('Apakah Anda yakin ingin MENGHAPUS SELURUH DATA ABSENSI? Action ini akan mengosongkan riwayat absensi agar semua anggota bisa absen ulang.')) {
        await clearAllAttendanceAsync();
        loadTable();
        alert('Seluruh data absensi telah di-reset!');
      }
    });
  }

  // ============================================================
  // INISIALISASI & REALTIME STORAGE / POLLING SYNC
  // ============================================================
  loadTable();

  // Polling tiap 5 detik agar dashboard admin selalu ter-update otomatis secara live
  setInterval(loadTable, 5000);

  // Listener jika ada perubahan data di tab lain (localStorage event)
  window.addEventListener('storage', function (e) {
    if (e.key === KEYS.ATTENDANCE || e.key === KEYS.MEMBERS || !e.key) {
      loadTable();
    }
  });

  // Update tanggal di header
  const headerDateEl = document.getElementById('headerDate');
  if (headerDateEl) {
    headerDateEl.textContent = formatTanggalIndonesia(getTodayDateString());
  }
});
