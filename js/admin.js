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

    // Khusus Dashboard Admin: Tampilkan HANYA absensi hari ini
    currentData = todayAttendance.filter(function (a) {
      return a.nama.toLowerCase().includes(searchQuery.toLowerCase());
    });

    currentData.sort((a, b) => {
      return b.jam.localeCompare(a.jam);
    });
    renderTable(currentData);
  }

  let currentData = [];
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
          <td colspan="6" class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            <p>Belum ada data absensi hari ini.</p>
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
          <td>
            <button class="btn-action btn-delete btn-delete-attendance" data-id="${record.id || ''}" data-anggota-id="${record.anggotaId || ''}" data-nama="${record.nama}" data-tanggal="${record.tanggal}">
              <i class="fas fa-trash"></i> Hapus
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Event listener hapus per baris absensi
  const attendanceTbody = document.getElementById('attendanceTableBody');
  if (attendanceTbody) {
    attendanceTbody.addEventListener('click', async function (e) {
      const deleteBtn = e.target.closest('.btn-delete-attendance');
      if (!deleteBtn) return;

      const id = deleteBtn.dataset.id;
      const anggotaId = deleteBtn.dataset.anggotaId;
      const tanggal = deleteBtn.dataset.tanggal;
      const nama = deleteBtn.dataset.nama;
      const tglDisplay = formatTanggalShort(tanggal);

      if (confirm(`Apakah Anda yakin ingin menghapus data absensi ${nama} pada tanggal ${tglDisplay}?`)) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        const res = await deleteAttendanceAsync(id, anggotaId, tanggal);
        if (res !== false) {
          await updateStatsAndTable();
        } else {
          loadTable();
        }
      }
    });
  }


  // Search real-time
  const searchInput = document.getElementById('searchAttendance');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = this.value.trim();
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
  // PENGATURAN LOKASI GPS POSKO
  // ============================================================
  const coordsDisplay = document.getElementById('poskoCoordsDisplay');
  const radiusInput = document.getElementById('poskoRadiusInput');
  const btnSetLocation = document.getElementById('btnSetCurrentLocation');
  const btnSaveGps = document.getElementById('btnSaveGpsConfig');

  function updateGpsConfigUI() {
    if (!coordsDisplay) return;
    const config = getPoskoLocationConfig();
    if (config.lat !== null && config.lng !== null) {
      coordsDisplay.innerHTML = `<span style="color:var(--color-success);"><i class="fas fa-circle-check"></i> Lat: ${config.lat.toFixed(6)}, Lng: ${config.lng.toFixed(6)} (Radius: ${config.radius}m)</span>`;
    } else {
      coordsDisplay.innerHTML = `<span style="color:var(--color-warning);"><i class="fas fa-triangle-exclamation"></i> Belum Diatur (Menggunakan Koordinat Default)</span>`;
    }
    if (radiusInput) radiusInput.value = config.radius || 50;
  }

  if (btnSetLocation) {
    btnSetLocation.addEventListener('click', async function () {
      btnSetLocation.disabled = true;
      btnSetLocation.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Membaca GPS HP...';
      const loc = typeof getDeviceLocation === 'function' ? await getDeviceLocation() : null;
      btnSetLocation.disabled = false;
      btnSetLocation.innerHTML = '<i class="fas fa-crosshairs"></i> Set Lokasi Posko Saat Ini (GPS)';

      if (!loc || loc.error) {
        alert(loc ? loc.message : 'Gagal mengakses GPS browser.');
        return;
      }

      const radius = radiusInput ? radiusInput.value : 50;
      savePoskoLocationConfig(loc.lat, loc.lng, radius, true);
      updateGpsConfigUI();
      alert(`✅ Lokasi Posko KKN Berhasil Disimpan!\n\nLatitude: ${loc.lat.toFixed(6)}\nLongitude: ${loc.lng.toFixed(6)}\nAkurasi GPS HP: ~${loc.accuracy} meter\nRadius Maksimal: ${radius} meter`);
    });
  }

  if (btnSaveGps) {
    btnSaveGps.addEventListener('click', function () {
      const config = getPoskoLocationConfig();
      const radius = radiusInput ? radiusInput.value : 50;
      savePoskoLocationConfig(config.lat, config.lng, radius, true);
      updateGpsConfigUI();
      alert('✅ Jarak radius lokasi berhasil diperbarui.');
    });
  }

  updateGpsConfigUI();

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
