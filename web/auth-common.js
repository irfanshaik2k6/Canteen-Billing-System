// Common Authentication and Navigation Utilities for Canteen Billing System
const Auth = {
  TOKEN_KEY: 'canteen_auth_token',
  USER_KEY: 'canteen_auth_user',

  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  },

  getUser() {
    const raw = localStorage.getItem(this.USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  setAuth(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  clearAuth() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  isAuthenticated() {
    return Boolean(this.getToken() && this.getUser());
  },

  isAdmin() {
    const user = this.getUser();
    return Boolean(user && user.role === 'admin');
  },

  // Protects page routes based on authentication & roles
  protectPage(options = {}) {
    const { adminOnly = false, redirectUrl = 'login.html' } = options;
    const currentPath = window.location.pathname;

    if (!this.isAuthenticated()) {
      window.location.href = `${redirectUrl}?redirect=${encodeURIComponent(currentPath)}`;
      return false;
    }

    const user = this.getUser();
    if (adminOnly && user.role !== 'admin') {
      alert('Access Denied: This page is restricted to administrators only.');
      window.location.href = 'index.html';
      return false;
    }

    // Check if password change is forced
    if (user.must_change_password) {
      this.showForcePasswordChangeModal();
    }

    return true;
  },

  // Authenticated fetch wrapper
  async fetch(url, options = {}) {
    const headers = options.headers || {};
    const token = this.getToken();

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    options.headers = headers;
    const response = await fetch(url, options);

    if (response.status === 401) {
      this.clearAuth();
      window.location.href = 'login.html?expired=1';
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  },

  logout() {
    this.clearAuth();
    window.location.href = 'login.html';
  },

  // Renders unified navigation header across all pages
  renderHeader(activeNav = '') {
    const headerContainer = document.querySelector('.app-header');
    if (!headerContainer) return;

    const user = this.getUser();
    const isAdmin = this.isAdmin();

    let navLinksHtml = `
      <a href="index.html" class="nav-btn ${activeNav === 'billing' ? 'active' : ''}">🍽️ Billing</a>
      <a href="history.html" class="nav-btn ${activeNav === 'history' ? 'active' : ''}">📜 Order History</a>
    `;

    if (isAdmin) {
      navLinksHtml += `
        <a href="reports.html" class="nav-btn ${activeNav === 'reports' ? 'active' : ''}">📊 Sales Reports</a>
        <a href="menu-manage.html" class="nav-btn ${activeNav === 'menu' ? 'active' : ''}">📋 Manage Menu</a>
        <a href="users-manage.html" class="nav-btn ${activeNav === 'users' ? 'active' : ''}">👥 Manage Users</a>
        <a href="settings.html" class="nav-btn ${activeNav === 'settings' ? 'active' : ''}">⚙️ Settings</a>
      `;
    }

    const userBadgeHtml = user ? `
      <div class="user-profile-badge">
        <span class="user-avatar">${user.role === 'admin' ? '👑' : '🧑‍💼'}</span>
        <div class="user-meta">
          <span class="user-name">${escapeHtml(user.username)}</span>
          <span class="user-role-label">${user.role.toUpperCase()}</span>
        </div>
        <button type="button" id="logout-btn" class="logout-btn" title="Sign Out">🚪 Logout</button>
      </div>
    ` : `
      <a href="login.html" class="nav-btn highlight">🔑 Sign In</a>
    `;

    headerContainer.innerHTML = `
      <div class="header-content">
        <div class="header-brand">
          <a href="index.html" style="text-decoration: none; display: flex; align-items: center; gap: 10px; color: inherit;">
            <span class="header-logo">🍽️</span>
            <div>
              <h1 id="app-canteen-name">Canteen Billing System</h1>
              <div class="header-tagline">Fast, Fresh &amp; Full-Stack</div>
            </div>
          </a>
        </div>
        
        <nav class="header-nav-links">
          ${navLinksHtml}
        </nav>

        <div class="header-actions">
          ${userBadgeHtml}
        </div>
      </div>
    `;

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.logout());
    }

    // Load canteen name from settings
    this.loadCanteenName();
  },

  async loadCanteenName() {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const s = await res.json();
        const el = document.getElementById('app-canteen-name');
        if (el && s.canteen_name) {
          el.textContent = s.canteen_name;
        }
      }
    } catch (e) {
      // Ignore
    }
  },

  // Modal prompting admin/user to change initial default password
  showForcePasswordChangeModal() {
    let modal = document.getElementById('force-change-pwd-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'force-change-pwd-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 440px;">
          <div class="modal-header">
            <h2 style="color: var(--terracotta);">🔒 Security: Change Default Password</h2>
          </div>
          <div style="padding: 20px;">
            <p style="margin-bottom: 16px; font-size: 14px; color: var(--dark-brown-muted);">
              For system security, you must change your initial default password before continuing.
            </p>
            <div id="pwd-change-error" class="form-error" style="display: none; margin-bottom: 14px;"></div>
            <div class="form-group" style="margin-bottom: 14px;">
              <label for="force-old-pwd" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Current Default Password</label>
              <input type="password" id="force-old-pwd" placeholder="e.g. admin123" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-warm); border-radius: var(--radius-sm);" required>
            </div>
            <div class="form-group" style="margin-bottom: 14px;">
              <label for="force-new-pwd" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">New Password (min 6 characters)</label>
              <input type="password" id="force-new-pwd" placeholder="Enter new strong password" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-warm); border-radius: var(--radius-sm);" required>
            </div>
            <div class="form-group" style="margin-bottom: 20px;">
              <label for="force-confirm-pwd" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 4px;">Confirm New Password</label>
              <input type="password" id="force-confirm-pwd" placeholder="Re-type new password" style="width: 100%; padding: 10px; border: 1.5px solid var(--border-warm); border-radius: var(--radius-sm);" required>
            </div>
            <button type="button" id="force-pwd-submit-btn" class="checkout-btn" style="width: 100%;">Save New Password &amp; Continue</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const submitBtn = document.getElementById('force-pwd-submit-btn');
      const errEl = document.getElementById('pwd-change-error');
      submitBtn.addEventListener('click', async () => {
        const oldPwd = document.getElementById('force-old-pwd').value.trim();
        const newPwd = document.getElementById('force-new-pwd').value.trim();
        const confirmPwd = document.getElementById('force-confirm-pwd').value.trim();

        if (!oldPwd || !newPwd) {
          errEl.textContent = 'Please fill in all password fields.';
          errEl.style.display = 'block';
          return;
        }

        if (newPwd.length < 6) {
          errEl.textContent = 'New password must be at least 6 characters long.';
          errEl.style.display = 'block';
          return;
        }

        if (newPwd !== confirmPwd) {
          errEl.textContent = 'New password and confirmation do not match.';
          errEl.style.display = 'block';
          return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating Password...';

        try {
          const res = await Auth.fetch('/api/auth/change-password', {
            method: 'POST',
            body: { old_password: oldPwd, new_password: newPwd }
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error || 'Failed to change password.');
          }

          // Update user in local storage
          const user = Auth.getUser();
          if (user) {
            user.must_change_password = false;
            localStorage.setItem(Auth.USER_KEY, JSON.stringify(user));
          }

          modal.style.display = 'none';
          alert('Password successfully updated! You can now use the application securely.');
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Save New Password & Continue';
        }
      });
    }

    modal.style.display = 'flex';
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.Auth = Auth;
window.escapeHtml = escapeHtml;

