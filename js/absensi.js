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

  // ============================================================
  // SEARCHABLE DROPDOWN NAMA
  // ============================================================
  const members = getMembers();
  const searchInput = document.getElementById('searchMember');
  const dropdownList = document.getElementById('dropdownList');
  const selectedNameEl = document.getElementById('selectedName');
  const selectedCard = document.getElementById('selectedCard');
  const hadirBtn = document.getElementById('hadirBtn');
  const alreadyCard = document.getElementById('alreadyCard');
  const successCard = document.getElementById('successCard');

  let selectedMember = null;

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

  // Pilih anggota
  function selectMember(member) {
    selectedMember = member;
    searchInput.value = member.nama;
    dropdownList.style.display = 'none';

    // Tampilkan card nama terpilih
    selectedNameEl.textContent = member.nama;
    selectedCard.style.display = 'block';

    // Cek apakah sudah absen hari ini
    const today = getTodayDateString();
    const existing = isAlreadyAttended(member.id, today);

    alreadyCard.style.display = 'none';
    successCard.style.display = 'none';
    hadirBtn.disabled = false;
    hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
    hadirBtn.classList.remove('btn-disabled');

    if (existing) {
      // Sudah absen — nonaktifkan tombol dan tampilkan info
      hadirBtn.disabled = true;
      hadirBtn.classList.add('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check-double"></i> SUDAH ABSEN';
      showAlreadyCard(member, existing);
    }
  }

  // Tampilkan card sudah absen
  function showAlreadyCard(member, record) {
    document.getElementById('alreadyName').textContent = member.nama;
    document.getElementById('alreadyTanggal').textContent = formatTanggalIndonesia(record.tanggal);
    document.getElementById('alreadyJam').textContent = formatJamShort(record.jam);
    alreadyCard.style.display = 'block';
  }

  // Event: search input
  searchInput.addEventListener('focus', function () {
    const currentMembers = getMembers();
    renderDropdown(currentMembers);
    dropdownList.style.display = 'block';
  });

  searchInput.addEventListener('input', function () {
    const q = this.value.trim();
    const currentMembers = getMembers();
    const filtered = currentMembers.filter(m =>
      m.nama.toLowerCase().includes(q.toLowerCase())
    );
    renderDropdown(filtered);
    dropdownList.style.display = 'block';

    // Cek jika ketikan persis sama dengan salah satu anggota
    const exactMatch = currentMembers.find(m => m.nama.toLowerCase() === q.toLowerCase());
    if (exactMatch) {
      selectMember(exactMatch);
    } else if (!q) {
      selectedMember = null;
      selectedCard.style.display = 'none';
      alreadyCard.style.display = 'none';
      successCard.style.display = 'none';
      hadirBtn.disabled = false;
      hadirBtn.classList.remove('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';
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
  hadirBtn.addEventListener('click', function () {
    const currentMembers = getMembers();

    // Jika belum ada selectedMember, coba cocokkan dari teks pencarian
    if (!selectedMember) {
      const q = searchInput.value.trim();
      if (q) {
        // Cek exact match atau 1 match saja
        const match = currentMembers.find(m => m.nama.toLowerCase() === q.toLowerCase()) ||
                      (currentMembers.filter(m => m.nama.toLowerCase().includes(q.toLowerCase())).length === 1 ?
                       currentMembers.find(m => m.nama.toLowerCase().includes(q.toLowerCase())) : null);
        if (match) {
          selectMember(match);
        }
      }
    }

    if (!selectedMember) {
      showToast('Silakan pilih nama Anda dari daftar terlebih dahulu.', 'error');
      return;
    }

    if (hadirBtn.disabled) return;

    // Loading state
    hadirBtn.disabled = true;
    hadirBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';

    setTimeout(function () {
      const record = addAttendance(selectedMember.id, selectedMember.nama);

      if (record) {
        showSuccessCard(selectedMember, record);
        showToast('Absensi berhasil dicatat!', 'success');
      } else {
        // Sudah absen
        showToast('Anda sudah melakukan absensi hari ini.', 'warning');
        const today = getTodayDateString();
        const existing = isAlreadyAttended(selectedMember.id, today);
        if (existing) {
          showAlreadyCard(selectedMember, existing);
        }
        hadirBtn.classList.add('btn-disabled');
        hadirBtn.innerHTML = '<i class="fas fa-check-double"></i> SUDAH ABSEN';
      }
    }, 300);
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
  // TOMBOL KEMBALI
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
      hadirBtn.disabled = false;
      hadirBtn.classList.remove('btn-disabled');
      hadirBtn.innerHTML = '<i class="fas fa-check"></i> HADIR';

      // Scroll ke atas
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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
