/**
 * ============================================================================
 * SkillPath - Authentication & Session Engine (auth.js)
 * Powered by Supabase Authentication (Pinned SDK)
 * Handles sign up, sign in, admin verification, password reset,
 * and dynamic role-aware navigation.
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
   * Get user profile including role ('user' or 'admin')
   */
  async getProfile() {
    const user = await this.getUser();
    if (!user) return null;

    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('Could not fetch user profile:', error);
        return {
          id: user.id,
          email: user.email,
          full_name: (user.user_metadata && user.user_metadata.full_name) || '',
          role: 'user'
        };
      }

      return data || {
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata && user.user_metadata.full_name) || '',
        role: 'user'
      };
    } catch (e) {
      console.warn('Profile fetch exception:', e);
      return {
        id: user.id,
        email: user.email,
        full_name: (user.user_metadata && user.user_metadata.full_name) || '',
        role: 'user'
      };
    }
  },

  /**
   * Check if current user has 'admin' role
   */
  async isAdmin() {
    const profile = await this.getProfile();
    return !!(profile && profile.role === 'admin');
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
        emailRedirectTo: `${window.location.origin}/signin.html`
      }
    });

    if (error) throw error;
    return data;
  },

  /**
   * Sign in an existing user
   */
  async signIn(email, password) {
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
   * Sign out current user and redirect to index.html
   */
  async signOut() {
    const client = this.getClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (e) {
        console.warn('Error during sign out:', e);
      }
    }
    window.location.href = 'index.html';
  },

  /**
   * Send password reset email
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
   * Update user password
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
   * Route Guard: Require user to be authenticated, redirect to signin.html otherwise
   */
  async requireAuth() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'signin.html';
      return null;
    }
    return session.user;
  },

  /**
   * Route Guard: Require user to have 'admin' role, redirect to index.html otherwise
   */
  async requireAdmin() {
    const session = await this.getSession();
    if (!session) {
      window.location.href = 'admin-login.html';
      return null;
    }
    const adminStatus = await this.isAdmin();
    if (!adminStatus) {
      window.location.href = 'index.html';
      return null;
    }
    return session.user;
  },

  /**
   * Guest Route Guard: Redirect already authenticated users to index.html
   */
  async redirectIfAuthenticated() {
    const session = await this.getSession();
    if (session) {
      window.location.href = 'index.html';
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
      const profile = await this.getProfile();
      const isAdmin = profile && profile.role === 'admin';
      const displayName = (profile && profile.full_name) || (user.user_metadata && user.user_metadata.full_name) || user.email.split('@')[0];
      const initial = displayName.charAt(0).toUpperCase();

      container.innerHTML = `
        <div class="user-dropdown-wrapper">
          ${isAdmin ? `
            <a href="admin.html" class="btn btn-outline btn-sm admin-nav-btn" style="border-color: #818cf8; color: #a5b4fc; margin-right: 0.35rem;" title="Go to Admin Dashboard">
              🛡️ Admin
            </a>
          ` : ''}
          <button id="userDropdownBtn" class="user-profile-btn" aria-haspopup="true" aria-expanded="false">
            <span class="user-avatar-circle">${escapeHtml(initial)}</span>
            <span class="user-name-label">${escapeHtml(displayName)}</span>
            <span class="dropdown-chevron">▼</span>
          </button>

          <div id="userDropdownMenu" class="user-dropdown-menu">
            <div class="user-dropdown-header">
              <span class="dropdown-user-name">${escapeHtml(displayName)}</span>
              <span class="dropdown-user-email">${escapeHtml(user.email)}</span>
              ${isAdmin ? '<span class="admin-role-badge">🛡️ Administrator</span>' : '<span class="user-role-badge">👤 Student</span>'}
            </div>

            ${isAdmin ? `
              <a href="admin.html" class="dropdown-item admin-dropdown-item" style="color: #a5b4fc; font-weight: 600;">
                <span>🛡️ Admin Dashboard</span>
              </a>
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
    } else {
      // Logged out: Show Sign In & Sign Up buttons
      container.innerHTML = `
        <div class="nav-guest-actions">
          <a href="signin.html" class="btn btn-outline btn-sm">Sign In</a>
          <a href="signup.html" class="btn btn-primary btn-sm">Sign Up</a>
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
