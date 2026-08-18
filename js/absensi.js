/**
 * absensi.js
 * Logic untuk halaman absensi utama (index.html)
 */

document.addEventListener('DOMContentLoaded', function () {

  // ============================================================
  // JAM & TANGGAL REAL-TIME
  // ============================================================
  function updateClock() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const clockEl = document.getElementById('clock');
    if (clockEl) clockEl.textContent = `${hours}:${minutes}:${seconds}`;

    const bulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const hariNama = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const dateStr = `${hariNama[now.getDay()]}, ${now.getDate()} ${bulan[now.getMonth()]} ${now.getFullYear()}`;
    const dateEl = document.getElementById('currentDate');
    if (dateEl) dateEl.textContent = dateStr;
  }

  updateClock();
  setInterval(updateClock, 1000);

  // Check URL parameter reset (misal: index.html?reset=true)
  if (window.location.search.includes('reset=true')) {
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([]));
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  // ============================================================
  // VALIDASI JARINGAN (WIFI POSKO KKN)
  // ============================================================
  const netCard = document.getElementById('networkStatusCard');
  const netIcon = document.getElementById('networkStatusIcon');
  const netTitle = document.getElementById('networkStatusTitle');
  const netSubtitle = document.getElementById('networkStatusSubtitle');
  const netPillText = document.getElementById('networkStatusPillText');
  const btnRefreshNet = document.getElementById('btnRefreshNet');

  let isNetworkAllowed = false;
  let isLocationAllowed = false;
  let lastNetworkResult = null;
  let lastLocationResult = null;

  function updateNetworkUI(netResult, locResult) {
    if (!netCard) return;

    if ((netResult && netResult.loading) || (locResult && locResult.loading)) {
      netCard.style.display = 'none';
      return;
    }

    if (netResult && !netResult.loading) lastNetworkResult = netResult;
    if (locResult && !locResult.loading) lastLocationResult = locResult;

    const netOK = lastNetworkResult ? lastNetworkResult.isAllowed : true;
    const locOK = lastLocationResult ? lastLocationResult.isAllowed : true;

    isNetworkAllowed = netOK;
    isLocationAllowed = locOK;

    if (netOK && locOK) {
      netCard.style.display = 'none'; // Sembunyikan banner jika terhubung & lokasi pas
    } else {
      netCard.style.display = 'flex'; // Tampilkan peringatan
      if (!netOK) {
        if (netTitle) netTitle.textContent = 'Peringatan Jaringan Posko';
        if (netSubtitle) netSubtitle.textContent = lastNetworkResult ? lastNetworkResult.message : 'Absensi hanya dapat dilakukan melalui WiFi Posko KKN.';
      } else if (!locOK) {
        if (netTitle) netTitle.textContent = 'Peringatan Lokasi GPS';
        if (netSubtitle) netSubtitle.textContent = lastLocationResult ? lastLocationResult.message : 'Anda berada di luar radius Posko KKN.';
      }
    }

    // Refresh status tombol jika member sedang terpilih atau belum
    if (selectedMember) {
      applyButtonState(selectedMember);
    } else {
      if (!isNetworkAllowed) {
        hadirBtn.disabled = true;
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-wifi"></i> KHUSUS WIFI POSKO';
      } else if (!isLocationAllowed) {
        hadirBtn.disabled = true;
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-location-dot"></i> DILUAR RADIUS POSKO';
      } else {
        hadirBtn.disabled = false;
        hadirBtn.classList.remove('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
      }
    }
  }

  async function checkNetworkState() {
    updateNetworkUI({ loading: true }, { loading: true });

    const netResult = typeof verifyNetworkConnection === 'function'
      ? await verifyNetworkConnection()
      : { isAllowed: true, isDev: true, currentIp: 'Local' };

    const locResult = typeof verifyLocationConnection === 'function'
      ? await verifyLocationConnection()
      : { isAllowed: true };

    updateNetworkUI(netResult, locResult);
    return { netResult, locResult };
  }

  // Tombol Refresh Jaringan
  if (btnRefreshNet) {
    btnRefreshNet.addEventListener('click', async function () {
      const icon = btnRefreshNet.querySelector('i');
      if (icon) icon.classList.add('fa-spin');
      await checkNetworkState();
      if (icon) icon.classList.remove('fa-spin');
      showToast('Status jaringan & lokasi GPS telah diperbarui.', 'info');
    });
  }

  // Cek Jaringan saat halaman pertama kali dimuat
  checkNetworkState();

  // ============================================================
  // SEARCHABLE DROPDOWN NAMA
  // ============================================================
  let membersList = getMembers();
  const searchInput = document.getElementById('searchMember');
  const dropdownList = document.getElementById('dropdownList');
  const selectedNameEl = document.getElementById('selectedName');
  const selectedCard = document.getElementById('selectedCard');
  const hadirBtn = document.getElementById('hadirBtn');
  const alreadyCard = document.getElementById('alreadyCard');
  const successCard = document.getElementById('successCard');

  let selectedMember = null;

  // Load members from Supabase / localStorage
  async function loadMemberList() {
    membersList = await getMembersAsync();
  }
  loadMemberList();

  // Render dropdown items
  function renderDropdown(list) {
    dropdownList.innerHTML = '';
    if (list.length === 0) {
      dropdownList.innerHTML = '<div class="dropdown-empty">Nama tidak ditemukan</div>';
      return;
    }
    list.forEach(function (member) {
      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.textContent = member.nama;
      item.dataset.id = member.id;
      item.addEventListener('click', function () {
        selectMember(member);
      });
      dropdownList.appendChild(item);
    });
  }

  // Helper untuk mengatur state tombol Hadir berdasarkan status absen, jaringan & GPS
  async function applyButtonState(member) {
    const today = getTodayDateString();
    const existing = await isAlreadyAttendedAsync(member.id, today);

    alreadyCard.style.display = 'none';
    successCard.style.display = 'none';

    if (existing) {
      // Sudah absen — nonaktifkan tombol dan tampilkan info
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check-double"></i> SUDAH ABSEN';
      showAlreadyCard(member, existing);
    } else if (!isNetworkAllowed) {
      // Jaringan bukan WiFi Posko
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-wifi"></i> KHUSUS WIFI POSKO';
    } else if (!isLocationAllowed) {
      // Lokasi GPS di luar radius Posko
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-location-dot"></i> DILUAR RADIUS POSKO';
    } else {
      // Belum absen dan jaringan & lokasi GPS Posko OK
      hadirBtn.disabled = false;
      hadirBtn.classList.remove('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
    }
  }

  // Pilih anggota
  async function selectMember(member) {
    selectedMember = member;
    searchInput.value = member.nama;
    dropdownList.style.display = 'none';

    // Tampilkan card nama terpilih
    selectedNameEl.textContent = member.nama;
    selectedCard.style.display = 'block';

    await applyButtonState(member);
  }

  // Tampilkan card sudah absen
  function showAlreadyCard(member, record) {
    document.getElementById('alreadyName').textContent = member.nama;
    document.getElementById('alreadyTanggal').textContent = formatTanggalIndonesia(record.tanggal);
    document.getElementById('alreadyJam').textContent = formatJamShort(record.jam);
    alreadyCard.style.display = 'block';
  }

  // Event: search input
  searchInput.addEventListener('focus', async function () {
    const currentMembers = await getMembersAsync();
    membersList = currentMembers;
    renderDropdown(currentMembers);
    dropdownList.style.display = 'block';
  });

  searchInput.addEventListener('input', function () {
    const q = this.value.trim();
    const filtered = membersList.filter(m =>
      m.nama.toLowerCase().includes(q.toLowerCase())
    );
    renderDropdown(filtered);
    dropdownList.style.display = 'block';

    // Cek jika ketikan persis sama dengan salah meanggota
    const exactMatch = membersList.find(m => m.nama.toLowerCase() === q.toLowerCase());
    if (exactMatch) {
      selectMember(exactMatch);
    } else if (!q) {
      selectedMember = null;
      selectedCard.style.display = 'none';
      alreadyCard.style.display = 'none';
      successCard.style.display = 'none';
      if (!isNetworkAllowed) {
        hadirBtn.disabled = true;
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-wifi"></i> KHUSUS WIFI POSKO';
      } else if (!isLocationAllowed) {
        hadirBtn.disabled = true;
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-location-dot"></i> DILUAR RADIUS POSKO';
      } else {
        hadirBtn.disabled = false;
        hadirBtn.classList.remove('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
      }
    }
  });

  // Tutup dropdown jika klik di luar
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.search-wrapper')) {
      dropdownList.style.display = 'none';
    }
  });

  // ============================================================
  // TOMBOL HADIR
  // ============================================================
  hadirBtn.addEventListener('click', async function () {
    if (hadirBtn.disabled) {
      if (!isNetworkAllowed) {
        showToast(NETWORK_CONFIG.DENIED_MESSAGE || 'Absensi hanya dapat dilakukan melalui WiFi Posko KKN.', 'error');
      } else if (!isLocationAllowed) {
        showToast('Absensi ditolak: Anda berada di luar radius Posko KKN.', 'error');
      }
      return;
    }

    const currentMembers = membersList.length > 0 ? membersList : await getMembersAsync();

    // Jika belum ada selectedMember, coba cocokkan dari teks pencarian
    if (!selectedMember) {
      const q = searchInput.value.trim();
      if (q) {
        const match = currentMembers.find(m => m.nama.toLowerCase() === q.toLowerCase()) ||
                      (currentMembers.filter(m => m.nama.toLowerCase().includes(q.toLowerCase())).length === 1 ?
                       currentMembers.find(m => m.nama.toLowerCase().includes(q.toLowerCase())) : null);
        if (match) {
          await selectMember(match);
        }
      }
    }

    if (!selectedMember) {
      showToast('Silakan pilih nama Anda dari daftar terlebih dahulu.', 'error');
      return;
    }

    // ------------------------------------------------------------
    // PENGECEKAN ULANG JARINGAN & LOKASI (PRE-SUBMIT RE-CHECK)
    // ------------------------------------------------------------
    hadirBtn.disabled = true;
    hadirBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifikasi Jaringan & GPS...';

    const checkBeforeSubmit = await checkNetworkState();

    if (!checkBeforeSubmit.netResult.isAllowed) {
      showToast(checkBeforeSubmit.netResult.message || 'Absensi hanya dapat dilakukan melalui WiFi Posko KKN.', 'error');
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-wifi"></i> BUKAN WIFI POSKO';
      return;
    }

    if (!checkBeforeSubmit.locResult.isAllowed) {
      showToast(checkBeforeSubmit.locResult.message || 'Absensi ditolak: Anda berada di luar radius Posko KKN.', 'error');
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-location-dot"></i> DILUAR RADIUS POSKO';
      return;
    }

    // Loading state simpan data
    hadirBtn.disabled = true;
    hadirBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    const record = await addAttendanceAsync(selectedMember.id, selectedMember.nama);

    if (record) {
      showSuccessCard(selectedMember, record);
      showToast('Absensi berhasil dicatat!', 'success');
    } else {
      // Sudah absen
      showToast('Anda sudah melakukan absensi hari ini.', 'warning');
      const today = getTodayDateString();
      const existing = await isAlreadyAttendedAsync(selectedMember.id, today);
      if (existing) {
        showAlreadyCard(selectedMember, existing);
      }
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check-double"></i> SUDAH ABSEN';
    }
  });

  // Tampilkan card sukses
  function showSuccessCard(member, record) {
    document.getElementById('successName').textContent = member.nama;
    document.getElementById('successTanggal').textContent = formatTanggalIndonesia(record.tanggal);
    document.getElementById('successJam').textContent = formatJamShort(record.jam);
    selectedCard.style.display = 'none';
    alreadyCard.style.display = 'none';
    successCard.style.display = 'block';
  }

  // ============================================================
  // TOMBOL KEMBALI & RESET HP
  // ============================================================
  const kembaliBtn = document.getElementById('kembaliBtn');
  if (kembaliBtn) {
    kembaliBtn.addEventListener('click', function () {
      // Reset semua state
      selectedMember = null;
      searchInput.value = '';
      selectedCard.style.display = 'none';
      alreadyCard.style.display = 'none';
      successCard.style.display = 'none';

      if (!isNetworkAllowed) {
        hadirBtn.disabled = true;
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-ban"></i> BUKAN WIFI POSKO';
      } else {
        hadirBtn.disabled = false;
        hadirBtn.classList.remove('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
      }

      // Scroll ke atas
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Tombol reset HP dihapus — user tidak bisa bypass 1 absen per hari

  // ============================================================
  // TOAST NOTIFICATION
  // ============================================================
  function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: 'fa-check-circle',
      error: 'fa-times-circle',
      warning: 'fa-exclamation-circle',
      info: 'fa-info-circle',
    };

    toast.innerHTML = `
      <i class="fas ${icons[type] || icons.info}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(function () {
      toast.classList.add('toast-hide');
      setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 400);
    }, 3000);
  }

  // Export fungsi toast ke window agar bisa dipakai global
  window.showToast = showToast;
});
