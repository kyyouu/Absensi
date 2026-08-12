/**
 * anggota.js
 * Logic untuk halaman anggota.html (manajemen data anggota)
 */

document.addEventListener('DOMContentLoaded', function () {
  requireAdminAuth();

  // Sidebar toggle
  initSidebar();

  const session = getAdminSession();
  const adminUsernameEl = document.getElementById('adminUsername');
  if (adminUsernameEl && session) adminUsernameEl.textContent = session.username;

  // ============================================================
  // STATE
  // ============================================================
  let searchQuery = '';
  let editingId = null;

  // ============================================================
  // RENDER TABEL
  // ============================================================
  function renderTable() {
    const members = getMembers();
    const filtered = members.filter(m =>
      m.nama.toLowerCase().includes(searchQuery.toLowerCase())
    );
    filtered.sort((a, b) => a.nama.localeCompare(b.nama));

    const tbody = document.getElementById('memberTableBody');
    const countEl = document.getElementById('memberCount');

    if (countEl) countEl.textContent = members.length;

    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="empty-state">
            <i class="fas fa-users"></i>
            <p>Tidak ada anggota ditemukan.</p>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(function (member, index) {
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(member.nama)}</td>
          <td>
            <div class="action-btns">
              <button class="btn-action btn-edit" onclick="openEditModal(${member.id})">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button class="btn-action btn-delete" onclick="openDeleteModal(${member.id}, '${escapeHtml(member.nama)}')">
                <i class="fas fa-trash"></i> Hapus
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ============================================================
  // FORM TAMBAH ANGGOTA
  // ============================================================
  const addForm = document.getElementById('addMemberForm');
  const addNameInput = document.getElementById('addMemberName');
  const addError = document.getElementById('addMemberError');

  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const nama = addNameInput.value.trim();

      if (!nama) {
        showFieldError(addError, 'Nama anggota tidak boleh kosong.');
        return;
      }
      if (nama.length < 2) {
        showFieldError(addError, 'Nama terlalu pendek.');
        return;
      }

      // Cek duplikat
      const members = getMembers();
      const duplicate = members.find(m => m.nama.toLowerCase() === nama.toLowerCase());
      if (duplicate) {
        showFieldError(addError, 'Anggota dengan nama ini sudah ada.');
        return;
      }

      addMember(nama);
      addNameInput.value = '';
      hideFieldError(addError);
      renderTable();
      showToast(`Anggota "${nama}" berhasil ditambahkan.`, 'success');
    });

    addNameInput.addEventListener('input', function () {
      hideFieldError(addError);
    });
  }

  // ============================================================
  // SEARCH
  // ============================================================
  const searchInput = document.getElementById('searchMember');
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      searchQuery = this.value.trim();
      renderTable();
    });
  }

  // ============================================================
  // MODAL EDIT
  // ============================================================
  const editModal = document.getElementById('editModal');
  const editNameInput = document.getElementById('editMemberName');
  const editError = document.getElementById('editMemberError');
  const editForm = document.getElementById('editMemberForm');

  window.openEditModal = function (id) {
    const members = getMembers();
    const member = members.find(m => m.id === id);
    if (!member) return;

    editingId = id;
    if (editNameInput) editNameInput.value = member.nama;
    if (editError) hideFieldError(editError);
    openModal(editModal);
  };

  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const namaBaru = editNameInput.value.trim();

      if (!namaBaru) {
        showFieldError(editError, 'Nama tidak boleh kosong.');
        return;
      }

      const members = getMembers();
      const duplicate = members.find(m =>
        m.nama.toLowerCase() === namaBaru.toLowerCase() && m.id !== editingId
      );
      if (duplicate) {
        showFieldError(editError, 'Nama ini sudah digunakan.');
        return;
      }

      updateMember(editingId, namaBaru);
      closeModal(editModal);
      renderTable();
      showToast('Nama anggota berhasil diperbarui.', 'success');
    });
  }

  document.getElementById('closeEditModal')?.addEventListener('click', () => closeModal(editModal));
  document.getElementById('cancelEditBtn')?.addEventListener('click', () => closeModal(editModal));

  // ============================================================
  // MODAL HAPUS
  // ============================================================
  const deleteModal = document.getElementById('deleteModal');
  const deleteNameEl = document.getElementById('deleteMemberName');
  let deletingId = null;

  window.openDeleteModal = function (id, nama) {
    deletingId = id;
    if (deleteNameEl) deleteNameEl.textContent = nama;
    openModal(deleteModal);
  };

  document.getElementById('confirmDeleteBtn')?.addEventListener('click', function () {
    if (deletingId === null) return;
    const members = getMembers();
    const member = members.find(m => m.id === deletingId);
    deleteMember(deletingId);
    closeModal(deleteModal);
    renderTable();
    showToast(`Anggota "${member?.nama || ''}" berhasil dihapus.`, 'success');
    deletingId = null;
  });

  document.getElementById('closeDeleteModal')?.addEventListener('click', () => closeModal(deleteModal));
  document.getElementById('cancelDeleteBtn')?.addEventListener('click', () => closeModal(deleteModal));

  // ============================================================
  // LOGOUT
  // ============================================================
  document.getElementById('logoutBtn')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });
  document.getElementById('logoutBtnSidebar')?.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirm('Logout dari admin?')) adminLogout();
  });

  // ============================================================
  // INIT
  // ============================================================
  renderTable();
});

// ============================================================
// HELPER FUNCTIONS (global scope)
// ============================================================

function initSidebar() {
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

function openModal(modal) {
  if (modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('modal-active'), 10);
  }
}

function closeModal(modal) {
  if (modal) {
    modal.classList.remove('modal-active');
    setTimeout(() => modal.style.display = 'none', 200);
  }
}

function showFieldError(el, msg) {
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function hideFieldError(el) {
  if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

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

  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-circle',
    info: 'fa-info-circle',
  };

  toast.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(function () {
    toast.classList.add('toast-hide');
    setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 400);
  }, 3000);
}
