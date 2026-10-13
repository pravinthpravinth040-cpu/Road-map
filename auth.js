/**
 * ============================================================================
 * SkillPath - Authentication & Session Engine (auth.js)
 * Powered by Supabase Authentication
 * Handles sign up, sign in, sign out, password recovery, route protection,
 * and user profile navigation menu.
 * ============================================================================
 */

// Initialize Supabase Client using central config
let supabaseClient = null;

try {
  if (typeof window.supabase !== 'undefined' && window.SUPABASE_CONFIG) {
    supabaseClient = window.supabase.createClient(
      window.SUPABASE_CONFIG.url,
      window.SUPABASE_CONFIG.anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      }
    );
    window.supabaseClient = supabaseClient;
  }
} catch (e) {
  console.error('Failed to initialize Supabase client in auth.js:', e);
}

const SkillPathAuth = {
  getClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined' && window.SUPABASE_CONFIG) {
      supabaseClient = window.supabase.createClient(
        window.SUPABASE_CONFIG.url,
        window.SUPABASE_CONFIG.anonKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storage: window.localStorage
          }
        }
      );
      window.supabaseClient = supabaseClient;
    }
    return supabaseClient;
  },

  /**
   * Get current user session
   */
  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (e) {
      console.warn('Could not retrieve Supabase session:', e);
      return null;
    }
  },

  /**
   * Get current authenticated user
   */
  async getUser() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getUser();
      if (error || !data) return null;
      return data.user;
    } catch (e) {
      return null;
    }
  },

  /**
   * Register a new user
   */
  async signUp(email, password, fullName) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client is not available.');

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName ? fullName.trim() : '';

    const { data, error } = await client.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName
        },
        emailRedirectTo: `${window.location.origin}/login.html`
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in an existing user
   */
  async signIn(email, password, rememberMe = true) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client is not available.');

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign out the current user
   */
  async signOut() {
    const client = this.getClient();
    if (!client) return;

    try {
      await client.auth.signOut();
    } catch (e) {
      console.warn('Error during sign out:', e);
    }

    // Redirect to login page
    window.location.href = 'login.html';
  },

  /**
   * Send a password reset email
   */
  async resetPasswordForEmail(email) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client is not available.');

    const cleanEmail = email.trim().toLowerCase();
    const redirectUrl = `${window.location.origin}/reset-password.html`;

    const { data, error } = await client.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: redirectUrl
    });

    if (error) throw error;
    return data;
  },

  /**
   * Update the user's password (used in reset-password.html)
   */
  async updatePassword(newPassword) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client is not available.');

    const { data, error } = await client.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    return data;
  },

  /**
   * Page Protection: Redirect to login if user is not authenticated
   */
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      const currentUrl = window.location.pathname.split('/').pop() + window.location.search;
      const redirectParam = encodeURIComponent(currentUrl || 'index.html');
      window.location.href = `login.html?redirect=${redirectParam}`;
      return null;
    }
    return session.user;
  },

  /**
   * Auth Page Protection: Redirect to dashboard if user is already authenticated
   */
  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || 'index.html';
      window.location.href = redirectUrl;
      return true;
    }
    return false;
  },

  /**
   * Render dynamic Navbar Auth State
   */
  async renderNavbarAuth() {
    const container = document.getElementById('navAuthContainer');
    if (!container) return;

    const user = await this.getUser();

    if (user) {
      const fullName = (user.user_metadata && user.user_metadata.full_name) || '';
      const displayName = fullName || user.email.split('@')[0];
      const initial = displayName.charAt(0).toUpperCase();

      // Check if user has legacy localStorage data
      let hasLocalData = false;
      try {
        const raw = localStorage.getItem('skillpath_db_v1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && ((parsed.domains && parsed.domains.length > 0) || (parsed.resources && parsed.resources.length > 0))) {
            hasLocalData = true;
          }
        }
      } catch (e) {}

      container.innerHTML = `
        <div class="user-dropdown-wrapper">
          <button id="userDropdownBtn" class="user-profile-btn" aria-haspopup="true" aria-expanded="false">
            <span class="user-avatar-circle">${escapeHtml(initial)}</span>
            <span class="user-name-label">${escapeHtml(displayName)}</span>
            <span class="dropdown-chevron">▼</span>
          </button>

          <div id="userDropdownMenu" class="user-dropdown-menu">
            <div class="user-dropdown-header">
              <span class="dropdown-user-name">${escapeHtml(displayName)}</span>
              <span class="dropdown-user-email">${escapeHtml(user.email)}</span>
            </div>

            ${hasLocalData ? `
              <button id="btnImportLocalDataNav" class="dropdown-item import-item">
                <span>📥 Import Local Data</span>
              </button>
            ` : ''}

            <a href="index.html" class="dropdown-item">📊 My Roadmaps</a>
            <a href="planner.html" class="dropdown-item">📅 Study Planner</a>
            <a href="resources.html" class="dropdown-item">📚 Saved Resources</a>

            <div class="dropdown-divider"></div>
            <button id="btnLogoutNav" class="dropdown-item logout-item">
              <span>🚪 Log Out</span>
            </button>
          </div>
        </div>
      `;

      // Setup dropdown toggle
      const dropdownBtn = document.getElementById('userDropdownBtn');
      const dropdownMenu = document.getElementById('userDropdownMenu');

      if (dropdownBtn && dropdownMenu) {
        dropdownBtn.onclick = (e) => {
          e.stopPropagation();
          const isOpen = dropdownMenu.classList.contains('open');
          dropdownMenu.classList.toggle('open', !isOpen);
          dropdownBtn.setAttribute('aria-expanded', !isOpen);
        };

        // Close on outside click
        document.addEventListener('click', (e) => {
          if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('open');
            dropdownBtn.setAttribute('aria-expanded', 'false');
          }
        });
      }

      // Logout handler
      const logoutBtn = document.getElementById('btnLogoutNav');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          SkillPathAuth.signOut();
        };
      }

      // Local data import handler
      const importBtn = document.getElementById('btnImportLocalDataNav');
      if (importBtn) {
        importBtn.onclick = async () => {
          if (typeof SkillPathDB !== 'undefined' && SkillPathDB.importLocalDataToAccount) {
            importBtn.disabled = true;
            importBtn.textContent = 'Importing...';
            const res = await SkillPathDB.importLocalDataToAccount();
            if (res.success) {
              if (typeof showToast === 'function') {
                showToast(`Successfully imported ${res.count} roadmaps to your account!`, 'success');
              }
              setTimeout(() => window.location.reload(), 1200);
            } else {
              if (typeof showToast === 'function') {
                showToast(res.error || 'Failed to import local data.', 'error');
              }
              importBtn.disabled = false;
              importBtn.textContent = '📥 Import Local Data';
            }
          }
        };
      }
    } else {
      // Logged out: Show Log In & Sign Up buttons
      container.innerHTML = `
        <div class="nav-guest-actions">
          <a href="login.html" class="btn btn-outline btn-sm">Log In</a>
          <a href="register.html" class="btn btn-primary btn-sm">Sign Up</a>
        </div>
      `;
    }
  },

  /**
   * Helper to bind show/hide password buttons
   */
  initPasswordToggle(buttonId, inputId) {
    const btn = document.getElementById(buttonId);
    const input = document.getElementById(inputId);
    if (!btn || !input) return;

    btn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '👁️‍🗨️' : '👁️';
      btn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });
  }
};

/**
 * HTML Escaping Helper to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Expose globally
window.SkillPathAuth = SkillPathAuth;
window.escapeHtml = escapeHtml;

// Auto-render navbar auth on DOM load
document.addEventListener('DOMContentLoaded', () => {
  SkillPathAuth.renderNavbarAuth();
});
