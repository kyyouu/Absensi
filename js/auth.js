/**
 * auth.js
 * Logic untuk login dan logout admin
 */

// Kredensial admin (untuk prototype)
const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'admin123',
};

/**
 * Proses login admin
 * @param {string} username
 * @param {string} password
 * @returns {boolean} Berhasil atau tidak
 */
function adminLogin(username, password) {
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    setAdminSession(username);
    return true;
  }
  return false;
}

/**
 * Proses logout admin
 */
function adminLogout() {
  clearAdminSession();
  window.location.href = 'admin-login.html';
}

/**
 * Guard: Redirect ke login jika admin belum login
 * Panggil di setiap halaman admin
 */
function requireAdminAuth() {
  if (!isAdminLoggedIn()) {
    window.location.href = 'admin-login.html';
  }
}

// ============================================================
// Logic halaman admin-login.html
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  // Cek apakah ini halaman login
  const loginForm = document.getElementById('loginForm');
  if (!loginForm) return;

  // Jika sudah login, redirect ke dashboard
  if (isAdminLoggedIn()) {
    window.location.href = 'dashboard-admin.html';
    return;
  }

  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const passwordToggle = document.getElementById('passwordToggle');

  // Toggle password visibility
  if (passwordToggle) {
    passwordToggle.addEventListener('click', function () {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      passwordToggle.innerHTML = type === 'password'
        ? '<i class="fas fa-eye"></i>'
        : '<i class="fas fa-eye-slash"></i>';
    });
  }

  // Handle form submit
  loginForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validasi
    if (!username || !password) {
      showLoginError('Username dan password harus diisi.');
      return;
    }

    // Loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Masuk...';

    // Simulasi loading singkat
    setTimeout(function () {
      if (adminLogin(username, password)) {
        loginBtn.innerHTML = '<i class="fas fa-check"></i> Berhasil!';
        loginBtn.classList.add('btn-success');
        setTimeout(function () {
          window.location.href = 'dashboard-admin.html';
        }, 600);
      } else {
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
        showLoginError('Username atau password salah.');
        // Shake animation
        loginForm.classList.add('shake');
        setTimeout(() => loginForm.classList.remove('shake'), 500);
      }
    }, 500);
  });

  function showLoginError(msg) {
    if (loginError) {
      loginError.textContent = msg;
      loginError.style.display = 'flex';
    }
  }

  // Sembunyikan error saat user mengetik
  [usernameInput, passwordInput].forEach(function (el) {
    el.addEventListener('input', function () {
      if (loginError) loginError.style.display = 'none';
    });
  });
});
