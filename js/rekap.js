/**
 * rekap.js
 * Logic untuk halaman rekap.html dan absensi.html (riwayat absensi admin)
 */

// ============================================================
// SHARED TOAST (untuk halaman admin)
// ============================================================
function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icons = { success: 'fa-check-circle', error: 'fa-times-circle', warning: 'fa-exclamation-circle', info: 'fa-info-circle' };
  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('toast-hide');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
  }, 3000);
}

function initSidebarRekap() {
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
}

// ============================================================
// HALAMAN ABSENSI (absensi.html) — RIWAYAT LENGKAP
// ============================================================
function initAbsensiPage() {
  const historyBody = document.getElementById('historyTableBody');
  if (!historyBody) return;

  requireAdminAuth();
  initSidebarRekap();

  const session = getAdminSession();
  const adminUsernameEl = document.getElementById('adminUsername');
  if (adminUsernameEl && session) adminUsernameEl.textContent = session.username;

  let searchQuery = '';
  let startDate = '';
  let endDate = '';

  async function loadHistory() {
    let data = await getAttendanceAsync();

    // Filter rentang tanggal
    if (startDate && endDate) {
      data = data.filter(a => a.tanggal >= startDate && a.tanggal <= endDate);
    } else if (startDate) {
      data = data.filter(a => a.tanggal >= startDate);
    } else if (endDate) {
      data = data.filter(a => a.tanggal <= endDate);
    }

    // Filter nama
    if (searchQuery) {
      data = data.filter(a => a.nama.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Sort terbaru dulu
    data.sort((a, b) => {
      if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
      return b.jam.localeCompare(a.jam);
    });

    const countEl = document.getElementById('historyCount');
    if (countEl) countEl.textContent = data.length;

    if (data.length === 0) {
      historyBody.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <i class="fas fa-clipboard-list"></i>
            <p>Belum ada data absensi yang sesuai filter.</p>
          </td>
        </tr>
      `;
      return;
    }

    historyBody.innerHTML = data.map(function (record, index) {
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

  const searchInput = document.getElementById('searchHistory');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = this.value.trim();
      loadHistory();
    });
  }

  const startInput = document.getElementById('filterStartDateHistory');
  if (startInput) {
    startInput.addEventListener('change', function () {
      startDate = this.value;
      loadHistory();
    });
  }

  const endInput = document.getElementById('filterEndDateHistory');
  if (endInput) {
    endInput.addEventListener('change', function () {
      endDate = this.value;
      loadHistory();
    });
  }

  const resetBtn = document.getElementById('resetHistoryFilter');
  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      searchQuery = '';
      startDate = '';
      endDate = '';
      if (searchInput) searchInput.value = '';
      if (startInput) startInput.value = '';
      if (endInput) endInput.value = '';
      loadHistory();
    });
  }

  // Export CSV
  const exportBtn = document.getElementById('exportCsvHistory');
  if (exportBtn) {
    exportBtn.addEventListener('click', async function () {
      let data = await getAttendanceAsync();
      if (startDate && endDate) {
        data = data.filter(a => a.tanggal >= startDate && a.tanggal <= endDate);
      } else if (startDate) {
        data = data.filter(a => a.tanggal >= startDate);
      } else if (endDate) {
        data = data.filter(a => a.tanggal <= endDate);
      }
      if (searchQuery) data = data.filter(a => a.nama.toLowerCase().includes(searchQuery.toLowerCase()));
      data.sort((a, b) => {
        if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
        return b.jam.localeCompare(a.jam);
      });
      const fileSuffix = startDate && endDate ? `-${startDate}-sd-${endDate}` : '';
      exportToCSV(data, `riwayat-absensi-kkn${fileSuffix}`);
    });
  }

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });
  document.getElementById('logoutBtnSidebar')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });

  loadHistory();
}

// ============================================================
// HALAMAN REKAP (rekap.html)
// ============================================================
function initRekapPage() {
  const rekapTable = document.getElementById('rekapTableBody');
  if (!rekapTable) return;

  requireAdminAuth();
  initSidebarRekap();

  const session = getAdminSession();
  const adminUsernameEl = document.getElementById('adminUsername');
  if (adminUsernameEl && session) adminUsernameEl.textContent = session.username;

  // Default range: bulan ini
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const today = getTodayDateString();

  const startInput = document.getElementById('rekapStart');
  const endInput = document.getElementById('rekapEnd');
  if (startInput) startInput.value = firstDay;
  if (endInput) endInput.value = today;

  async function calcRekap() {
    const start = startInput ? startInput.value : firstDay;
    const end = endInput ? endInput.value : today;

    if (!start || !end || start > end) {
      showToast('Rentang tanggal tidak valid.', 'error');
      return;
    }

    const members = await getMembersAsync();
    const allAttendance = await getAttendanceAsync();
    const attendanceInRange = allAttendance.filter(a => a.tanggal >= start && a.tanggal <= end);

    // Hitung hari unik dalam rentang yang ada absensinya
    const uniqueDays = new Set(attendanceInRange.map(a => a.tanggal));
    const totalHari = uniqueDays.size;

    // Rekap per anggota
    const rekapData = members.map(function (member) {
      const hadirCount = attendanceInRange.filter(a => a.anggotaId === member.id).length;
      const persentase = totalHari > 0 ? Math.round((hadirCount / totalHari) * 100) : 0;
      return { ...member, hadirCount, persentase };
    });

    // Sort: paling banyak hadir dulu
    rekapData.sort((a, b) => b.hadirCount - a.hadirCount || a.nama.localeCompare(b.nama));

    // Total statistik
    const totalKehadiran = attendanceInRange.length;
    const totalAnggota = members.length;
    const avgPersentase = totalHari > 0 && totalAnggota > 0
      ? Math.round((totalKehadiran / (totalAnggota * totalHari)) * 100)
      : 0;

    // Update stat cards
    const elTotalAnggota = document.getElementById('rekapTotalAnggota');
    const elTotalKehadiran = document.getElementById('rekapTotalKehadiran');
    const elTotalHari = document.getElementById('rekapTotalHari');
    const elPersentase = document.getElementById('rekapPersentase');

    if (elTotalAnggota) elTotalAnggota.textContent = totalAnggota;
    if (elTotalKehadiran) elTotalKehadiran.textContent = totalKehadiran;
    if (elTotalHari) elTotalHari.textContent = totalHari;
    if (elPersentase) elPersentase.textContent = avgPersentase + '%';

    // Render tabel
    renderRekapTable(rekapData);

    // Update info periode
    const periodeEl = document.getElementById('rekapPeriode');
    if (periodeEl) {
      periodeEl.textContent = `${formatTanggalIndonesia(start)} — ${formatTanggalIndonesia(end)}`;
    }
  }

  function renderRekapTable(data) {
    if (data.length === 0) {
      rekapTable.innerHTML = `
        <tr>
          <td colspan="4" class="empty-state">
            <i class="fas fa-chart-bar"></i>
            <p>Tidak ada data dalam rentang ini.</p>
          </td>
        </tr>
      `;
      return;
    }

    rekapTable.innerHTML = data.map(function (row, index) {
      const barWidth = row.persentase;
      const barColor = row.persentase >= 80 ? 'var(--color-success)' :
        row.persentase >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';

      return `
        <tr>
          <td>${index + 1}</td>
          <td><span class="member-name">${row.nama}</span></td>
          <td><strong>${row.hadirCount}</strong> hari</td>
          <td>
            <div class="progress-cell">
              <div class="progress-bar-wrap">
                <div class="progress-bar-fill" style="width:${barWidth}%; background:${barColor}"></div>
              </div>
              <span class="progress-label">${row.persentase}%</span>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // Events
  const hitungBtn = document.getElementById('hitungRekapBtn');
  if (hitungBtn) {
    hitungBtn.addEventListener('click', calcRekap);
  }

  // Export CSV
  const exportBtn = document.getElementById('exportCsvRekap');
  if (exportBtn) {
    exportBtn.addEventListener('click', function () {
      const start = startInput ? startInput.value : firstDay;
      const end = endInput ? endInput.value : today;
      const members = getMembers();
      const attendanceInRange = getAttendanceByRange(start, end);
      const uniqueDays = new Set(attendanceInRange.map(a => a.tanggal));
      const totalHari = uniqueDays.size;

      const rekapData = members.map(function (member) {
        const hadirCount = attendanceInRange.filter(a => a.anggotaId === member.id).length;
        const persentase = totalHari > 0 ? Math.round((hadirCount / totalHari) * 100) : 0;
        return { nama: member.nama, hadirCount, persentase };
      });
      rekapData.sort((a, b) => b.hadirCount - a.hadirCount);

      exportRekapToCSV(rekapData, start, end);
    });
  }

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });
  document.getElementById('logoutBtnSidebar')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });

  // Auto hitung saat pertama kali
  calcRekap();
}

// ============================================================
// CSV EXPORT FUNCTIONS
// ============================================================

/**
 * Export data absensi ke CSV
 * @param {Array} data Array of attendance records
 * @param {string} filename Nama file (tanpa ekstensi)
 */
function exportToCSV(data, filename) {
  if (data.length === 0) {
    showToast('Tidak ada data untuk diexport.', 'warning');
    return;
  }

  const headers = ['Nama', 'Tanggal', 'Jam', 'Status'];
  const rows = data.map(function (record) {
    return [
      `"${record.nama}"`,
      record.tanggal,
      record.jam,
      record.status,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, filename);
  showToast(`Data berhasil diexport (${data.length} baris).`, 'success');
}

/**
 * Export rekap kehadiran ke CSV
 */
function exportRekapToCSV(data, start, end) {
  if (data.length === 0) {
    showToast('Tidak ada data untuk diexport.', 'warning');
    return;
  }

  const headers = ['No', 'Nama', 'Jumlah Hadir', 'Persentase Kehadiran'];
  const rows = data.map(function (row, index) {
    return [
      index + 1,
      `"${row.nama}"`,
      row.hadirCount,
      `${row.persentase}%`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  downloadCSV(csvContent, `rekap-kkn-${start}-sd-${end}`);
  showToast(`Rekap berhasil diexport (${data.length} anggota).`, 'success');
}

/**
 * Trigger download file CSV
 * @param {string} content CSV string
 * @param {string} filename Nama file tanpa ekstensi
 */
function downloadCSV(content, filename) {
  // BOM untuk Excel agar encoding UTF-8 terbaca dengan benar
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============================================================
// AUTO-INIT
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  initAbsensiPage();
  initRekapPage();
});
