/**
 * ============================================================================
 * SkillPath - Central Configuration File
 * Contains the Supabase project URL and public anon key.
 * Only public credentials should be placed in this file.
 * ============================================================================
 */

const SUPABASE_CONFIG = {
  url: 'https://gixtsahnwyckrdsxgbdn.supabase.co',
  anonKey: 'sb_publishable_r5cMN9gp3srjq4-MqtOQEA_hLh96VN3',
  siteUrl: 'https://roadmap-ochre-xi.vercel.app'
};

// Expose globally for browser scripts
if (typeof window !== 'undefined') {
  window.SUPABASE_CONFIG = SUPABASE_CONFIG;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SUPABASE_CONFIG;
}
