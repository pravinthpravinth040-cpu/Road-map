/**
 * ============================================================================
 * SkillPath - Resources Directory Engine (resources.js)
 * Synchronizes official admin-curated resources and student personal bookmarks
 * with Supabase backend and interactive categorization.
 * ============================================================================
 */

(function () {
  'use strict';

  const state = {
    currentUser: null,
    resources: [],
    domains: []
  };

  const LOCAL_STORAGE_KEY = 'skillpath_guest_resources';

  document.addEventListener('DOMContentLoaded', async () => {
    state.currentUser = await SkillPathAuth.getUser();

    initResourceEvents();
    await loadResourcesData();
  });

  async function loadResourcesData() {
    const client = SkillPathAuth.getClient();
    if (!client) return;

    try {
      // 1. Fetch Global Domains
      const { data: domains } = await client
        .from('domains')
        .select('id, title, icon')
        .eq('is_global', true);

      state.domains = domains || [];
      populateDomainSelect();

      // 2. Fetch Resources (RLS automatically provides global resources + user's own resources)
      const { data: resources, error: resErr } = await client
        .from('resources')
        .select('*')
        .order('is_global', { ascending: false })
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;

      state.resources = resources || [];

      // If guest has local bookmarks, merge them
      if (!state.currentUser) {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
          try {
            const parsed = JSON.parse(local);
            state.resources = [...state.resources, ...parsed];
          } catch (e) {
            // ignore
          }
        }
      }

      renderResourcesGrid();

    } catch (err) {
      console.error('Failed to load resources:', err);
      showResourceToast('error', 'Could not load resources directory.');
    }
  }

  function populateDomainSelect() {
    const select = document.getElementById('resDomain');
    if (!select) return;

    select.innerHTML = '<option value="General">General</option>';
    state.domains.forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.title;
      opt.textContent = `${d.icon || '🎯'} ${d.title}`;
      select.appendChild(opt);
    });
  }

  function renderResourcesGrid() {
    const grid = document.getElementById('resourcesGrid');
    const emptyState = document.getElementById('emptyResources');
    grid.innerHTML = '';

    const query = (document.getElementById('resourceSearch')?.value || '').toLowerCase();
    const categoryFilter = document.getElementById('resourceCategoryFilter')?.value || 'ALL';
    const originFilter = document.getElementById('resourceOriginFilter')?.value || 'ALL';

    let list = state.resources;

    if (categoryFilter !== 'ALL') {
      list = list.filter(r => r.category === categoryFilter);
    }

    if (originFilter === 'GLOBAL') {
      list = list.filter(r => r.is_global);
    } else if (originFilter === 'PERSONAL') {
      list = list.filter(r => !r.is_global);
    }

    if (query) {
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(query) ||
        (r.notes || '').toLowerCase().includes(query) ||
        (r.domain || '').toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      emptyState.style.display = 'block';
      return;
    }

    emptyState.style.display = 'none';

    list.forEach(item => {
      const card = document.createElement('article');
      card.className = 'resource-card';
      card.style.position = 'relative';

      // Card Header
      const headerDiv = document.createElement('div');
      headerDiv.style.display = 'flex';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.alignItems = 'flex-start';
      headerDiv.style.marginBottom = '0.75rem';

      // Category and Origin Badges
      const badgesWrap = document.createElement('div');
      badgesWrap.style.display = 'flex';
      badgesWrap.style.gap = '0.35rem';
      badgesWrap.style.flexWrap = 'wrap';

      const originBadge = document.createElement('span');
      originBadge.className = item.is_global ? 'roadmap-badge badge-global' : 'badge-role-user';
      originBadge.style.fontSize = '0.7rem';
      originBadge.textContent = item.is_global ? '🛡️ Admin Curated' : '👤 Personal Bookmark';
      badgesWrap.appendChild(originBadge);

      if (item.category) {
        const catBadge = document.createElement('span');
        catBadge.className = 'badge-role-user';
        catBadge.style.fontSize = '0.7rem';
        catBadge.textContent = item.category;
        badgesWrap.appendChild(catBadge);
      }

      headerDiv.appendChild(badgesWrap);

      // If personal resource, show delete button
      if (!item.is_global) {
        const delBtn = document.createElement('button');
        delBtn.style.background = 'transparent';
        delBtn.style.border = 'none';
        delBtn.style.color = 'var(--text-dim)';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '0.9rem';
        delBtn.textContent = '🗑️';
        delBtn.title = 'Remove bookmark';
        delBtn.onclick = () => deletePersonalResource(item);
        headerDiv.appendChild(delBtn);
      }

      card.appendChild(headerDiv);

      // Title
      const titleH3 = document.createElement('h3');
      titleH3.className = 'resource-card-title';
      titleH3.textContent = item.title;
      card.appendChild(titleH3);

      // Domain tag
      if (item.domain && item.domain !== 'General') {
        const domainP = document.createElement('div');
        domainP.style.fontSize = '0.78rem';
        domainP.style.color = 'var(--primary-light)';
        domainP.style.marginBottom = '0.4rem';
        domainP.textContent = `🎯 ${item.domain}`;
        card.appendChild(domainP);
      }

      // Notes
      if (item.notes) {
        const notesP = document.createElement('p');
        notesP.className = 'resource-card-notes';
        notesP.textContent = item.notes;
        card.appendChild(notesP);
      }

      // Visit Button
      const linkA = document.createElement('a');
      linkA.href = item.url;
      linkA.target = '_blank';
      linkA.rel = 'noopener noreferrer';
      linkA.className = 'btn btn-outline btn-sm';
      linkA.style.marginTop = 'auto';
      linkA.style.display = 'inline-flex';
      linkA.style.alignItems = 'center';
      linkA.style.gap = '0.4rem';
      linkA.textContent = 'Explore Resource ↗';
      card.appendChild(linkA);

      grid.appendChild(card);
    });
  }

  async function deletePersonalResource(item) {
    if (state.currentUser && item.id) {
      const client = SkillPathAuth.getClient();
      await client.from('resources').delete().eq('id', item.id);
    }
    state.resources = state.resources.filter(r => r !== item);

    // Update local storage
    const local = state.resources.filter(r => !r.is_global && (!state.currentUser || !r.created_by));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));

    showResourceToast('info', 'Bookmark removed.');
    renderResourcesGrid();
  }

  function initResourceEvents() {
    // Search & Filter listeners
    document.getElementById('resourceSearch')?.addEventListener('input', () => {
      renderResourcesGrid();
    });
    document.getElementById('resourceCategoryFilter')?.addEventListener('change', () => {
      renderResourcesGrid();
    });
    document.getElementById('resourceOriginFilter')?.addEventListener('change', () => {
      renderResourcesGrid();
    });

    // Open Modal button
    document.getElementById('btnOpenAddResource')?.addEventListener('click', () => {
      openResourceModal('modalAddResource');
    });

    // Form submit
    document.getElementById('formAddResource')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = document.getElementById('resTitle').value.trim();
      const url = document.getElementById('resUrl').value.trim();
      const category = document.getElementById('resCategory').value;
      const domain = document.getElementById('resDomain').value;
      const notes = document.getElementById('resNotes').value.trim();

      if (!title || !url) {
        showResourceToast('error', 'Title and URL are required.');
        return;
      }

      const newBookmark = {
        id: 'res_' + Date.now(),
        title,
        url,
        category,
        domain,
        notes,
        is_global: false,
        created_at: new Date().toISOString()
      };

      if (state.currentUser) {
        const client = SkillPathAuth.getClient();
        try {
          const { data, error } = await client
            .from('resources')
            .insert({
              title,
              url,
              category,
              domain,
              notes,
              is_global: false,
              user_id: state.currentUser.id
            })
            .select()
            .single();

          if (error) throw error;
          if (data) newBookmark.id = data.id;
        } catch (err) {
          console.error('Failed to save to cloud:', err);
        }
      } else {
        const local = state.resources.filter(r => !r.is_global);
        local.push(newBookmark);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
      }

      state.resources.unshift(newBookmark);
      closeResourceModal('modalAddResource');
      showResourceToast('success', 'Resource bookmarked!');
      renderResourcesGrid();

      // Reset form
      document.getElementById('resTitle').value = '';
      document.getElementById('resUrl').value = '';
      document.getElementById('resNotes').value = '';
    });
  }

  function openResourceModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closeResourceModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function showResourceToast(type, message) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg toast-${type}`;

    const iconSpan = document.createElement('span');
    iconSpan.style.fontSize = '1.1rem';
    iconSpan.textContent = type === 'success' ? '✅' : type === 'error' ? '⚠️' : 'ℹ️';
    toast.appendChild(iconSpan);

    const textSpan = document.createElement('span');
    textSpan.style.flex = '1';
    textSpan.textContent = message;
    toast.appendChild(textSpan);

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  window.openResourceModal = openResourceModal;
  window.closeResourceModal = closeResourceModal;

})();
