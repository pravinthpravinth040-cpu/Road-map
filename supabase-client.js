/**
 * ============================================================================
 * SkillPath - Reusable Supabase Client & Cloud Sync Layer
 * Project: Road-map
 * URL: https://gixtsahnwyckrdsxgbdn.supabase.co
 * Key: sb_publishable_r5cMN9gp3srjq4-MqtOQEA_hLh96VN3
 * ============================================================================
 */

// Supabase Configuration (Overridable via window.SUPABASE_CONFIG if needed)
const SUPABASE_CONFIG = window.SUPABASE_CONFIG || {
  url: 'https://gixtsahnwyckrdsxgbdn.supabase.co',
  anonKey: 'sb_publishable_r5cMN9gp3srjq4-MqtOQEA_hLh96VN3'
};

// Initialize Supabase Client (uses window.supabase from CDN or bundle)
let supabaseClient = null;

try {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } else {
    console.warn('Supabase SDK not loaded yet. Will initialize when ready.');
  }
} catch (e) {
  console.error('Failed to initialize Supabase client:', e);
}

// Expose client globally
window.supabaseClient = supabaseClient;

/**
 * Authentication Wrapper
 */
const SkillPathAuth = {
  getClient() {
    if (!supabaseClient && typeof window.supabase !== 'undefined') {
      supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      window.supabaseClient = supabaseClient;
    }
    return supabaseClient;
  },

  async getSession() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      return data.session;
    } catch (e) {
      console.warn('Could not fetch Supabase session:', e);
      return null;
    }
  },

  async getUser() {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data, error } = await client.auth.getUser();
      if (error) return null;
      return data.user;
    } catch (e) {
      return null;
    }
  },

  async signUp(email, password, fullName = '') {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client unavailable');

    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          full_name: fullName.trim()
        }
      }
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const client = this.getClient();
    if (!client) throw new Error('Supabase client unavailable');

    const { data, error } = await client.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = this.getClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },

  onAuthStateChange(callback) {
    const client = this.getClient();
    if (!client) return null;
    return client.auth.onAuthStateChange(callback);
  }
};

/**
 * Cloud Database Operations Layer
 */
const SkillPathCloud = {
  // Check if tables are ready in Supabase schema
  async isCloudAvailable() {
    const client = SkillPathAuth.getClient();
    if (!client) return false;
    try {
      const user = await SkillPathAuth.getUser();
      if (!user) return false;
      const { error } = await client.from('roadmaps').select('id').limit(1);
      // PGRST205 indicates table does not exist in schema cache
      if (error && error.code === 'PGRST205') {
        return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Fetch all roadmaps, stages, and progress items for current user
   */
  async fetchRoadmaps() {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return null;

    try {
      // 1. Fetch user roadmaps
      const { data: roadmaps, error: rmError } = await client
        .from('roadmaps')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (rmError) throw rmError;
      if (!roadmaps || roadmaps.length === 0) return [];

      // 2. Fetch stages for these roadmaps
      const roadmapIds = roadmaps.map(r => r.id);
      const { data: stages, error: stgError } = await client
        .from('roadmap_stages')
        .select('*')
        .in('roadmap_id', roadmapIds)
        .order('position', { ascending: true });

      if (stgError) throw stgError;

      // 3. Fetch user progress items (topics and projects)
      const stageIds = (stages || []).map(s => s.id);
      let progressItems = [];
      if (stageIds.length > 0) {
        const { data: items, error: itmError } = await client
          .from('user_progress')
          .select('*')
          .in('stage_id', stageIds)
          .order('position', { ascending: true });
        if (itmError) throw itmError;
        progressItems = items || [];
      }

      // 4. Assemble into local domain structure
      const formattedDomains = roadmaps.map(rm => {
        const rmStages = (stages || [])
          .filter(s => s.roadmap_id === rm.id)
          .map(stg => {
            const stgItems = progressItems.filter(p => p.stage_id === stg.id);
            const topics = stgItems
              .filter(p => p.item_type === 'topic')
              .map(t => ({
                id: t.local_id || t.id,
                cloudId: t.id,
                title: t.title,
                link: t.link || '',
                completed: !!t.completed
              }));

            const projects = stgItems
              .filter(p => p.item_type === 'project')
              .map(p => ({
                id: p.local_id || p.id,
                cloudId: p.id,
                title: p.title,
                link: p.link || '',
                completed: !!p.completed
              }));

            return {
              id: stg.local_id || stg.id,
              cloudId: stg.id,
              title: stg.title,
              weeks: stg.weeks || 1,
              topics,
              projects
            };
          });

        return {
          id: rm.local_id || rm.id,
          cloudId: rm.id,
          name: rm.name,
          description: rm.description || '',
          icon: rm.icon || '🎯',
          color: rm.color || '#6366f1',
          stages: rmStages
        };
      });

      return formattedDomains;
    } catch (e) {
      console.warn('Failed to fetch roadmaps from Supabase:', e);
      return null;
    }
  },

  /**
   * Save (insert/update) a roadmap and all nested stages/items in Supabase
   */
  async saveRoadmap(domain) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      // Upsert roadmap
      let cloudRoadmapId = domain.cloudId;
      if (!cloudRoadmapId) {
        // Check if exists by local_id
        const { data: existing } = await client
          .from('roadmaps')
          .select('id')
          .eq('user_id', user.id)
          .eq('local_id', domain.id)
          .maybeSingle();

        if (existing) {
          cloudRoadmapId = existing.id;
        }
      }

      if (cloudRoadmapId) {
        await client
          .from('roadmaps')
          .update({
            name: domain.name,
            description: domain.description,
            icon: domain.icon,
            color: domain.color,
            updated_at: new Date().toISOString()
          })
          .eq('id', cloudRoadmapId);
      } else {
        const { data: newRm, error: insertErr } = await client
          .from('roadmaps')
          .insert({
            user_id: user.id,
            name: domain.name,
            description: domain.description,
            icon: domain.icon,
            color: domain.color,
            local_id: domain.id
          })
          .select('id')
          .single();

        if (insertErr) throw insertErr;
        cloudRoadmapId = newRm.id;
        domain.cloudId = cloudRoadmapId;
      }

      // Sync stages
      if (domain.stages && domain.stages.length > 0) {
        for (let sIdx = 0; sIdx < domain.stages.length; sIdx++) {
          const stage = domain.stages[sIdx];
          let stageCloudId = stage.cloudId;

          if (!stageCloudId) {
            const { data: existingStg } = await client
              .from('roadmap_stages')
              .select('id')
              .eq('roadmap_id', cloudRoadmapId)
              .eq('local_id', stage.id)
              .maybeSingle();

            if (existingStg) {
              stageCloudId = existingStg.id;
            }
          }

          if (stageCloudId) {
            await client
              .from('roadmap_stages')
              .update({
                title: stage.title,
                weeks: stage.weeks,
                position: sIdx
              })
              .eq('id', stageCloudId);
          } else {
            const { data: newStg, error: stgErr } = await client
              .from('roadmap_stages')
              .insert({
                user_id: user.id,
                roadmap_id: cloudRoadmapId,
                title: stage.title,
                weeks: stage.weeks,
                position: sIdx,
                local_id: stage.id
              })
              .select('id')
              .single();

            if (stgErr) throw stgErr;
            stageCloudId = newStg.id;
            stage.cloudId = stageCloudId;
          }

          // Sync topics under stage
          if (stage.topics) {
            for (let tIdx = 0; tIdx < stage.topics.length; tIdx++) {
              const topic = stage.topics[tIdx];
              await this.upsertProgressItem(stageCloudId, topic, 'topic', tIdx, user.id);
            }
          }

          // Sync projects under stage
          if (stage.projects) {
            for (let pIdx = 0; pIdx < stage.projects.length; pIdx++) {
              const project = stage.projects[pIdx];
              await this.upsertProgressItem(stageCloudId, project, 'project', pIdx, user.id);
            }
          }
        }
      }

      return true;
    } catch (e) {
      console.warn('Error saving roadmap to Supabase:', e);
      return false;
    }
  },

  async upsertProgressItem(stageCloudId, item, itemType, position, userId) {
    const client = SkillPathAuth.getClient();
    try {
      const { data: existing } = await client
        .from('user_progress')
        .select('id')
        .eq('stage_id', stageCloudId)
        .eq('local_id', item.id)
        .maybeSingle();

      if (existing) {
        await client
          .from('user_progress')
          .update({
            title: item.title,
            link: item.link || '',
            completed: !!item.completed,
            position,
            completed_at: item.completed ? new Date().toISOString() : null
          })
          .eq('id', existing.id);
        item.cloudId = existing.id;
      } else {
        const { data: newItem } = await client
          .from('user_progress')
          .insert({
            user_id: userId,
            stage_id: stageCloudId,
            item_type: itemType,
            title: item.title,
            link: item.link || '',
            completed: !!item.completed,
            position,
            local_id: item.id,
            completed_at: item.completed ? new Date().toISOString() : null
          })
          .select('id')
          .single();
        if (newItem) item.cloudId = newItem.id;
      }
    } catch (e) {
      console.warn('Progress item upsert warning:', e);
    }
  },

  async deleteRoadmap(domainId) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('roadmaps')
        .delete()
        .eq('user_id', user.id)
        .or(`id.eq.${domainId},local_id.eq.${domainId}`);
      return true;
    } catch (e) {
      console.warn('Failed to delete roadmap in Supabase:', e);
      return false;
    }
  },

  async updateProgressCompletion(localItemId, completed) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('user_progress')
        .update({
          completed: !!completed,
          completed_at: completed ? new Date().toISOString() : null
        })
        .eq('user_id', user.id)
        .or(`id.eq.${localItemId},local_id.eq.${localItemId}`);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Weekly Planner Cloud Operations
   */
  async fetchPlannerTasks() {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return null;

    try {
      const { data, error } = await client
        .from('planner_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const planner = {
        Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [], Saturday: [], Sunday: []
      };

      (data || []).forEach(row => {
        if (planner[row.day]) {
          planner[row.day].push({
            id: row.local_id || row.id,
            cloudId: row.id,
            text: row.task_text,
            completed: !!row.completed,
            priority: row.priority || 'normal'
          });
        }
      });

      return planner;
    } catch (e) {
      console.warn('Could not fetch planner tasks from Supabase:', e);
      return null;
    }
  },

  async savePlannerTask(day, task) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      const { data, error } = await client
        .from('planner_tasks')
        .insert({
          user_id: user.id,
          day,
          task_text: task.text,
          completed: !!task.completed,
          priority: task.priority || 'normal',
          local_id: task.id
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) task.cloudId = data.id;
      return true;
    } catch (e) {
      console.warn('Could not save planner task to Supabase:', e);
      return false;
    }
  },

  async togglePlannerTask(taskId, completed) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('planner_tasks')
        .update({ completed: !!completed })
        .eq('user_id', user.id)
        .or(`id.eq.${taskId},local_id.eq.${taskId}`);
      return true;
    } catch (e) {
      return false;
    }
  },

  async deletePlannerTask(taskId) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('planner_tasks')
        .delete()
        .eq('user_id', user.id)
        .or(`id.eq.${taskId},local_id.eq.${taskId}`);
      return true;
    } catch (e) {
      return false;
    }
  },

  async clearPlannerTasks() {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('planner_tasks')
        .delete()
        .eq('user_id', user.id);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Bookmarked Resources Cloud Operations
   */
  async fetchResources() {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return null;

    try {
      const { data, error } = await client
        .from('bookmarked_resources')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(r => ({
        id: r.local_id || r.id,
        cloudId: r.id,
        title: r.title,
        url: r.url,
        domain: r.domain || 'General',
        notes: r.notes || ''
      }));
    } catch (e) {
      console.warn('Could not fetch resources from Supabase:', e);
      return null;
    }
  },

  async saveResource(res) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      const { data, error } = await client
        .from('bookmarked_resources')
        .insert({
          user_id: user.id,
          title: res.title,
          url: res.url,
          domain: res.domain || 'General',
          notes: res.notes || '',
          local_id: res.id
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) res.cloudId = data.id;
      return true;
    } catch (e) {
      console.warn('Could not save resource to Supabase:', e);
      return false;
    }
  },

  async deleteResource(resourceId) {
    const client = SkillPathAuth.getClient();
    const user = await SkillPathAuth.getUser();
    if (!client || !user) return false;

    try {
      await client
        .from('bookmarked_resources')
        .delete()
        .eq('user_id', user.id)
        .or(`id.eq.${resourceId},local_id.eq.${resourceId}`);
      return true;
    } catch (e) {
      return false;
    }
  }
};

/**
 * Safe Migration: Sync LocalStorage to Supabase on Login
 */
const SkillPathMigrate = {
  async migrateLocalDataToCloud() {
    const user = await SkillPathAuth.getUser();
    if (!user) return { success: false, error: 'Not authenticated' };

    const isAvailable = await SkillPathCloud.isCloudAvailable();
    if (!isAvailable) {
      console.info('Supabase tables not configured yet. Skipping auto-migration.');
      return { success: false, notConfigured: true };
    }

    try {
      const localData = SkillPathDB.getData();
      let migratedCount = 0;

      // 1. Migrate Roadmaps / Domains
      if (localData.domains && localData.domains.length > 0) {
        for (const domain of localData.domains) {
          await SkillPathCloud.saveRoadmap(domain);
          migratedCount++;
        }
      }

      // 2. Migrate Planner Tasks
      if (localData.planner) {
        for (const [day, tasks] of Object.entries(localData.planner)) {
          if (Array.isArray(tasks)) {
            for (const task of tasks) {
              await SkillPathCloud.savePlannerTask(day, task);
            }
          }
        }
      }

      // 3. Migrate Resources
      if (localData.resources && localData.resources.length > 0) {
        for (const res of localData.resources) {
          await SkillPathCloud.saveResource(res);
        }
      }

      return { success: true, count: migratedCount };
    } catch (e) {
      console.error('Migration error:', e);
      return { success: false, error: e.message };
    }
  }
};

// Export to window
window.SkillPathAuth = SkillPathAuth;
window.SkillPathCloud = SkillPathCloud;
window.SkillPathMigrate = SkillPathMigrate;
