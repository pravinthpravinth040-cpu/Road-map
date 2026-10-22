/**
 * ============================================================================
 * SkillPath - Administrative Control Panel Engine (admin.js)
 * Central management for Global Domains, Tasks, Weekly Planner Templates,
 * Curated Resources, User Roles, and Announcements.
 * ============================================================================
 */

(function () {
  'use strict';

  // Global State
  const state = {
    currentUser: null,
    domains: [],
    tasks: [],
    templates: [],
    activeTemplateId: null,
    slots: [],
    resources: [],
    users: [],
    announcements: [],
    userProgress: [],
    activeFilterDomainId: ''
  };

  const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ];

  // ==========================================================================
  // INITIALIZATION & AUTH GUARD
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Enforce admin access guard
    const user = await SkillPathAuth.requireAdmin();
    if (!user) return;
    state.currentUser = user;

    // 2. Setup Tab Switching
    initTabs();

    // 3. Setup Modal Event Handlers
    initModalHandlers();

    // 4. Setup Color Picker Sync
    initColorSync();

    // 5. Load All Platform Data
    await loadInitialData();
  });

  // Tab Switching Logic
  function initTabs() {
    const tabBtns = document.querySelectorAll('.admin-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const pane = document.getElementById(targetTab);
        if (pane) pane.classList.add('active');

        // Refresh views based on selected tab
        if (targetTab === 'tab-overview') renderOverview();
        if (targetTab === 'tab-domains') renderDomainsTable();
        if (targetTab === 'tab-tasks') renderTasksTable();
        if (targetTab === 'tab-planner') renderPlannerView();
        if (targetTab === 'tab-resources') renderResourcesTable();
        if (targetTab === 'tab-users') renderUsersTable();
        if (targetTab === 'tab-announcements') renderAnnouncementsTable();
      });
    });
  }

  // Color picker sync
  function initColorSync() {
    const colorInput = document.getElementById('domainColor');
    const hexInput = document.getElementById('domainColorHex');
    if (colorInput && hexInput) {
      colorInput.addEventListener('input', () => {
        hexInput.value = colorInput.value;
      });
      hexInput.addEventListener('input', () => {
        if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
          colorInput.value = hexInput.value;
        }
      });
    }
  }

  // ==========================================================================
  // DATA FETCHING LAYER
  // ==========================================================================
  async function loadInitialData() {
    const client = SkillPathAuth.getClient();
    if (!client) {
      showToast('error', 'Supabase client is not available.');
      return;
    }

    try {
      // 1. Fetch Domains
      const { data: domains, error: domErr } = await client
        .from('domains')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (domErr) throw domErr;
      state.domains = (domains || []).filter(d => d.is_global);

      // Populate domain dropdowns in task filter and modals
      populateDomainDropdowns();

      // 2. Fetch Tasks
      const { data: tasks, error: taskErr } = await client
        .from('tasks')
        .select('*')
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      if (taskErr) throw taskErr;
      state.tasks = tasks || [];

      // 3. Fetch Planner Templates & Slots
      const { data: templates, error: tmplErr } = await client
        .from('planner_templates')
        .select('*')
        .order('created_at', { ascending: true });

      if (tmplErr) throw tmplErr;
      state.templates = templates || [];

      const defaultTemplate = state.templates.find(t => t.is_default) || state.templates[0];
      state.activeTemplateId = defaultTemplate ? defaultTemplate.id : null;

      await loadPlannerSlots();

      // 4. Fetch Resources
      const { data: resources, error: resErr } = await client
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

      if (resErr) throw resErr;
      state.resources = (resources || []).filter(r => r.is_global);

      // 5. Fetch Users (Profiles)
      const { data: users, error: userErr } = await client
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (userErr) throw userErr;
      state.users = users || [];

      // 6. Fetch User Progress (for statistics)
      const { data: progress, error: progErr } = await client
        .from('user_progress')
        .select('*');

      if (!progErr) {
        state.userProgress = progress || [];
      }

      // 7. Fetch Announcements
      const { data: announcements, error: annErr } = await client
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!annErr) {
        state.announcements = announcements || [];
      }

      // Initial Renders
      renderOverview();
      renderDomainsTable();
      renderTasksTable();
      renderPlannerView();
      renderResourcesTable();
      renderUsersTable();
      renderAnnouncementsTable();

    } catch (err) {
      console.error('Failed to load admin data:', err);
      showToast('error', `Failed to load dashboard data: ${err.message || err}`);
    }
  }

  async function loadPlannerSlots() {
    if (!state.activeTemplateId) {
      state.slots = [];
      return;
    }
    const client = SkillPathAuth.getClient();
    const { data: slots, error } = await client
      .from('planner_slots')
      .select('*')
      .eq('template_id', state.activeTemplateId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    if (!error) {
      state.slots = slots || [];
    }
  }

  function populateDomainDropdowns() {
    // 1. Task filter
    const filterSelect = document.getElementById('filterTaskDomain');
    if (filterSelect) {
      const currentVal = filterSelect.value;
      filterSelect.innerHTML = '<option value="">All Domains</option>';
      state.domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.icon || '🎯'} ${d.title}`;
        filterSelect.appendChild(opt);
      });
      if (currentVal) filterSelect.value = currentVal;
    }

    // 2. Task Modal domain select
    const taskDomainSelect = document.getElementById('taskDomainId');
    if (taskDomainSelect) {
      taskDomainSelect.innerHTML = '';
      state.domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.icon || '🎯'} ${d.title}`;
        taskDomainSelect.appendChild(opt);
      });
    }

    // 3. Slot Modal domain select
    const slotDomainSelect = document.getElementById('slotDomainId');
    if (slotDomainSelect) {
      slotDomainSelect.innerHTML = '<option value="">None (General Study)</option>';
      state.domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.icon || '🎯'} ${d.title}`;
        slotDomainSelect.appendChild(opt);
      });
    }

    // 4. Resource Modal domain select
    const resDomainSelect = document.getElementById('resourceDomainId');
    if (resDomainSelect) {
      resDomainSelect.innerHTML = '<option value="">General</option>';
      state.domains.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d.id;
        opt.textContent = `${d.icon || '🎯'} ${d.title}`;
        resDomainSelect.appendChild(opt);
      });
    }
  }

  // ==========================================================================
  // TAB 1: OVERVIEW RENDERING
  // ==========================================================================
  function renderOverview() {
    const totalUsers = state.users.length;
    const totalDomains = state.domains.length;
    const totalTasks = state.tasks.length;
    const totalResources = state.resources.length;

    document.getElementById('statOverviewUsers').textContent = totalUsers;
    document.getElementById('statOverviewDomains').textContent = totalDomains;
    document.getElementById('statOverviewTasks').textContent = totalTasks;
    document.getElementById('statOverviewResources').textContent = totalResources;

    // Calculate Platform-wide completion rate
    const studentUsers = state.users.filter(u => u.role !== 'admin');
    const studentCount = studentUsers.length || 1;
    const totalPossibleCompletions = studentCount * (totalTasks || 1);
    const actualCompletions = state.userProgress.filter(p => p.completed).length;
    const avgCompletion = totalTasks > 0 && studentCount > 0
      ? Math.min(100, Math.round((actualCompletions / totalPossibleCompletions) * 100))
      : 0;

    document.getElementById('statOverviewAvgCompletion').textContent = `${avgCompletion}%`;

    // Render per-domain breakdown
    const breakdownContainer = document.getElementById('domainProgressBreakdown');
    breakdownContainer.innerHTML = '';

    if (state.domains.length === 0) {
      breakdownContainer.innerHTML = '<p style="color: var(--text-dim);">No global domains configured yet.</p>';
      return;
    }

    state.domains.forEach(domain => {
      const domainTasks = state.tasks.filter(t => t.domain_id === domain.id);
      const domainTaskCount = domainTasks.length;
      const domainTaskIds = new Set(domainTasks.map(t => t.id));

      const domainCompletions = state.userProgress.filter(
        p => p.completed && domainTaskIds.has(p.task_id)
      ).length;

      const domainPossible = (studentUsers.length || 1) * (domainTaskCount || 1);
      const domainRate = domainTaskCount > 0 && studentUsers.length > 0
        ? Math.min(100, Math.round((domainCompletions / domainPossible) * 100))
        : 0;

      const itemCard = document.createElement('div');
      itemCard.style.padding = '0.85rem 0';
      itemCard.style.borderBottom = '1px solid var(--border-subtle)';

      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'center';
      headerRow.style.marginBottom = '0.4rem';

      const titleGroup = document.createElement('div');
      titleGroup.style.display = 'flex';
      titleGroup.style.alignItems = 'center';
      titleGroup.style.gap = '0.5rem';

      const iconSpan = document.createElement('span');
      iconSpan.textContent = domain.icon || '🎯';
      titleGroup.appendChild(iconSpan);

      const titleSpan = document.createElement('strong');
      titleSpan.textContent = domain.title;
      titleGroup.appendChild(titleSpan);

      const badgeSpan = document.createElement('span');
      badgeSpan.className = domain.is_visible ? 'badge-status-active' : 'badge-status-inactive';
      badgeSpan.textContent = domain.is_visible ? 'Visible' : 'Hidden';
      titleGroup.appendChild(badgeSpan);

      headerRow.appendChild(titleGroup);

      const statsSpan = document.createElement('span');
      statsSpan.style.fontSize = '0.85rem';
      statsSpan.style.color = 'var(--text-muted)';
      statsSpan.textContent = `${domainRate}% Avg Completion (${domainTaskCount} tasks)`;
      headerRow.appendChild(statsSpan);

      itemCard.appendChild(headerRow);

      // Progress bar
      const barTrack = document.createElement('div');
      barTrack.className = 'progress-bar-track';
      barTrack.style.height = '6px';

      const barFill = document.createElement('div');
      barFill.className = 'progress-bar-fill';
      barFill.style.width = `${domainRate}%`;
      barFill.style.backgroundColor = domain.color || '#6366f1';
      barTrack.appendChild(barFill);

      itemCard.appendChild(barTrack);
      breakdownContainer.appendChild(itemCard);
    });
  }

  // ==========================================================================
  // TAB 2: DOMAINS TABLE & REORDERING
  // ==========================================================================
  function renderDomainsTable() {
    const tbody = document.getElementById('domainsTableBody');
    tbody.innerHTML = '';

    const query = (document.getElementById('searchDomains')?.value || '').toLowerCase();
    const filtered = state.domains.filter(d =>
      d.title.toLowerCase().includes(query) || (d.description || '').toLowerCase().includes(query)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 2rem;">No domains found.</td></tr>`;
      return;
    }

    filtered.forEach((domain, idx) => {
      const tr = document.createElement('tr');

      // Icon
      const tdIcon = document.createElement('td');
      tdIcon.style.fontSize = '1.35rem';
      tdIcon.textContent = domain.icon || '🎯';
      tr.appendChild(tdIcon);

      // Title
      const tdTitle = document.createElement('td');
      const titleBold = document.createElement('strong');
      titleBold.textContent = domain.title;
      tdTitle.appendChild(titleBold);
      tr.appendChild(tdTitle);

      // Description
      const tdDesc = document.createElement('td');
      tdDesc.style.maxWidth = '280px';
      tdDesc.style.fontSize = '0.85rem';
      tdDesc.style.color = 'var(--text-muted)';
      tdDesc.textContent = domain.description || '—';
      tr.appendChild(tdDesc);

      // Color preview
      const tdColor = document.createElement('td');
      const colorBox = document.createElement('span');
      colorBox.style.display = 'inline-block';
      colorBox.style.width = '18px';
      colorBox.style.height = '18px';
      colorBox.style.borderRadius = '4px';
      colorBox.style.verticalAlign = 'middle';
      colorBox.style.marginRight = '0.35rem';
      colorBox.style.backgroundColor = domain.color || '#6366f1';
      tdColor.appendChild(colorBox);
      const colorText = document.createElement('span');
      colorText.textContent = domain.color || '#6366f1';
      tdColor.appendChild(colorText);
      tr.appendChild(tdColor);

      // Reorder buttons
      const tdOrder = document.createElement('td');
      const orderControls = document.createElement('div');
      orderControls.style.display = 'inline-flex';
      orderControls.style.gap = '0.25rem';

      const btnUp = document.createElement('button');
      btnUp.className = 'btn-icon-sm';
      btnUp.textContent = '↑';
      btnUp.title = 'Move up';
      btnUp.disabled = idx === 0;
      btnUp.onclick = () => moveDomainOrder(domain.id, -1);
      orderControls.appendChild(btnUp);

      const btnDown = document.createElement('button');
      btnDown.className = 'btn-icon-sm';
      btnDown.textContent = '↓';
      btnDown.title = 'Move down';
      btnDown.disabled = idx === filtered.length - 1;
      btnDown.onclick = () => moveDomainOrder(domain.id, 1);
      orderControls.appendChild(btnDown);

      tdOrder.appendChild(orderControls);
      tr.appendChild(tdOrder);

      // Visibility Switch
      const tdVis = document.createElement('td');
      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch-control';

      const switchInput = document.createElement('input');
      switchInput.type = 'checkbox';
      switchInput.checked = !!domain.is_visible;
      switchInput.onchange = () => toggleDomainVisibility(domain.id, switchInput.checked);

      const switchSlider = document.createElement('span');
      switchSlider.className = 'switch-slider';

      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(switchSlider);
      tdVis.appendChild(switchLabel);
      tr.appendChild(tdVis);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-secondary btn-sm';
      btnEdit.style.marginRight = '0.35rem';
      btnEdit.textContent = '✏️ Edit';
      btnEdit.onclick = () => openEditDomainModal(domain);
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.textContent = '🗑️ Delete';
      btnDel.onclick = () => confirmDeleteDomain(domain);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function toggleDomainVisibility(domainId, isVisible) {
    const client = SkillPathAuth.getClient();
    const { error } = await client
      .from('domains')
      .update({ is_visible: isVisible })
      .eq('id', domainId);

    if (error) {
      showToast('error', `Failed to update visibility: ${error.message}`);
      await loadInitialData();
    } else {
      const target = state.domains.find(d => d.id === domainId);
      if (target) target.is_visible = isVisible;
      showToast('success', `Domain visibility updated.`);
    }
  }

  async function moveDomainOrder(domainId, direction) {
    const idx = state.domains.findIndex(d => d.id === domainId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= state.domains.length) return;

    const currentDomain = state.domains[idx];
    const swapDomain = state.domains[swapIdx];

    const currentPos = currentDomain.position || idx;
    const swapPos = swapDomain.position || swapIdx;

    const newCurrentPos = swapPos === currentPos ? (direction > 0 ? currentPos + 1 : currentPos - 1) : swapPos;
    const newSwapPos = currentPos;

    currentDomain.position = newCurrentPos;
    swapDomain.position = newSwapPos;

    // Swap locally
    state.domains[idx] = swapDomain;
    state.domains[swapIdx] = currentDomain;
    renderDomainsTable();

    // Persist to Supabase
    const client = SkillPathAuth.getClient();
    await Promise.all([
      client.from('domains').update({ position: newCurrentPos }).eq('id', currentDomain.id),
      client.from('domains').update({ position: newSwapPos }).eq('id', swapDomain.id)
    ]);
  }

  function openEditDomainModal(domain) {
    document.getElementById('modalDomainTitle').textContent = 'Edit Global IT Domain';
    document.getElementById('domainEditId').value = domain.id;
    document.getElementById('domainTitle').value = domain.title || '';
    document.getElementById('domainDescription').value = domain.description || '';
    document.getElementById('domainIcon').value = domain.icon || '🎯';
    document.getElementById('domainColor').value = domain.color || '#6366f1';
    document.getElementById('domainColorHex').value = domain.color || '#6366f1';
    document.getElementById('domainIsVisible').checked = domain.is_visible !== false;

    openAdminModal('modalDomain');
  }

  function confirmDeleteDomain(domain) {
    showConfirmDialog(
      `Delete Roadmap Domain: "${domain.title}"?`,
      'Deleting this domain will permanently remove all associated curriculum tasks and learner progress records. This action cannot be undone.',
      async () => {
        const client = SkillPathAuth.getClient();
        const { error } = await client.from('domains').delete().eq('id', domain.id);
        if (error) {
          showToast('error', `Failed to delete domain: ${error.message}`);
        } else {
          showToast('success', `Domain deleted successfully.`);
          await loadInitialData();
        }
      }
    );
  }

  // ==========================================================================
  // TAB 3: TASKS TABLE & REORDERING
  // ==========================================================================
  function renderTasksTable() {
    const tbody = document.getElementById('tasksTableBody');
    tbody.innerHTML = '';

    const filterDomainId = document.getElementById('filterTaskDomain')?.value || '';
    const query = (document.getElementById('searchTasks')?.value || '').toLowerCase();

    let list = state.tasks;
    if (filterDomainId) {
      list = list.filter(t => t.domain_id === filterDomainId);
    }
    if (query) {
      list = list.filter(t =>
        t.title.toLowerCase().includes(query) || (t.description || '').toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No tasks found for this selection.</td></tr>`;
      return;
    }

    list.forEach((task, idx) => {
      const tr = document.createElement('tr');

      // Order buttons
      const tdOrder = document.createElement('td');
      const orderControls = document.createElement('div');
      orderControls.style.display = 'inline-flex';
      orderControls.style.gap = '0.25rem';

      const btnUp = document.createElement('button');
      btnUp.className = 'btn-icon-sm';
      btnUp.textContent = '↑';
      btnUp.title = 'Move up';
      btnUp.disabled = idx === 0;
      btnUp.onclick = () => moveTaskOrder(task.id, -1);
      orderControls.appendChild(btnUp);

      const btnDown = document.createElement('button');
      btnDown.className = 'btn-icon-sm';
      btnDown.textContent = '↓';
      btnDown.title = 'Move down';
      btnDown.disabled = idx === list.length - 1;
      btnDown.onclick = () => moveTaskOrder(task.id, 1);
      orderControls.appendChild(btnDown);

      tdOrder.appendChild(orderControls);
      tr.appendChild(tdOrder);

      // Title & Domain
      const tdTitle = document.createElement('td');
      const taskTitle = document.createElement('div');
      taskTitle.style.fontWeight = '600';
      taskTitle.textContent = task.title;
      tdTitle.appendChild(taskTitle);

      const domain = state.domains.find(d => d.id === task.domain_id);
      if (domain) {
        const domainBadge = document.createElement('span');
        domainBadge.style.fontSize = '0.75rem';
        domainBadge.style.color = domain.color || 'var(--text-muted)';
        domainBadge.textContent = `${domain.icon || '🎯'} ${domain.title}`;
        tdTitle.appendChild(domainBadge);
      }
      tr.appendChild(tdTitle);

      // Level Badge
      const tdLevel = document.createElement('td');
      const levelSpan = document.createElement('span');
      const lvl = (task.level || 'Beginner').toLowerCase();
      levelSpan.className = `badge-level-${lvl}`;
      levelSpan.textContent = task.level || 'Beginner';
      tdLevel.appendChild(levelSpan);
      tr.appendChild(tdLevel);

      // Est. Hours
      const tdHours = document.createElement('td');
      tdHours.textContent = `${task.estimated_hours || 10} hrs`;
      tr.appendChild(tdHours);

      // Resource Link
      const tdLink = document.createElement('td');
      if (task.resource_url) {
        const a = document.createElement('a');
        a.href = task.resource_url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.className = 'admin-task-link';
        a.textContent = '🔗 Docs';
        tdLink.appendChild(a);
      } else {
        tdLink.textContent = '—';
      }
      tr.appendChild(tdLink);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-secondary btn-sm';
      btnEdit.style.marginRight = '0.35rem';
      btnEdit.textContent = '✏️ Edit';
      btnEdit.onclick = () => openEditTaskModal(task);
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.textContent = '🗑️ Delete';
      btnDel.onclick = () => confirmDeleteTask(task);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function moveTaskOrder(taskId, direction) {
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= state.tasks.length) return;

    const currentTask = state.tasks[idx];
    const swapTask = state.tasks[swapIdx];

    const currentPos = currentTask.position || idx;
    const swapPos = swapTask.position || swapIdx;

    const newCurrentPos = swapPos === currentPos ? (direction > 0 ? currentPos + 1 : currentPos - 1) : swapPos;
    const newSwapPos = currentPos;

    currentTask.position = newCurrentPos;
    swapTask.position = newSwapPos;

    state.tasks[idx] = swapTask;
    state.tasks[swapIdx] = currentTask;
    renderTasksTable();

    const client = SkillPathAuth.getClient();
    await Promise.all([
      client.from('tasks').update({ position: newCurrentPos }).eq('id', currentTask.id),
      client.from('tasks').update({ position: newSwapPos }).eq('id', swapTask.id)
    ]);
  }

  function openEditTaskModal(task) {
    document.getElementById('modalTaskTitle').textContent = 'Edit Curriculum Task';
    document.getElementById('taskEditId').value = task.id;
    document.getElementById('taskDomainId').value = task.domain_id;
    document.getElementById('taskTitle').value = task.title || '';
    document.getElementById('taskDescription').value = task.description || '';
    document.getElementById('taskLevel').value = task.level || 'Beginner';
    document.getElementById('taskEstimatedHours').value = task.estimated_hours || 10;
    document.getElementById('taskResourceUrl').value = task.resource_url || '';

    openAdminModal('modalTask');
  }

  function confirmDeleteTask(task) {
    showConfirmDialog(
      `Delete Task: "${task.title}"?`,
      'This task will be removed from all student roadmaps and metrics.',
      async () => {
        const client = SkillPathAuth.getClient();
        const { error } = await client.from('tasks').delete().eq('id', task.id);
        if (error) {
          showToast('error', `Failed to delete task: ${error.message}`);
        } else {
          showToast('success', `Task deleted.`);
          await loadInitialData();
        }
      }
    );
  }

  // ==========================================================================
  // TAB 4: WEEKLY PLANNER ENGINE (TEMPLATES & SLOTS)
  // ==========================================================================
  function renderPlannerView() {
    const select = document.getElementById('selectPlannerTemplate');
    select.innerHTML = '';

    if (state.templates.length === 0) {
      select.innerHTML = '<option value="">No templates created</option>';
      document.getElementById('plannerTemplateDesc').textContent = 'Create your first planner template to structure student weekly schedules.';
      document.getElementById('badgeTemplateDefault').style.display = 'none';
      renderSlotsGrid();
      return;
    }

    state.templates.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.title} ${t.is_default ? '★ (Default)' : ''}`;
      select.appendChild(opt);
    });

    if (state.activeTemplateId) {
      select.value = state.activeTemplateId;
    } else {
      state.activeTemplateId = state.templates[0].id;
      select.value = state.activeTemplateId;
    }

    const currentTemplate = state.templates.find(t => t.id === state.activeTemplateId);
    if (currentTemplate) {
      document.getElementById('plannerTemplateDesc').textContent = currentTemplate.description || 'No description provided.';
      document.getElementById('badgeTemplateDefault').style.display = currentTemplate.is_default ? 'inline-flex' : 'none';
    }

    renderSlotsGrid();
  }

  function renderSlotsGrid() {
    const grid = document.getElementById('adminPlannerDaysGrid');
    grid.innerHTML = '';

    DAYS_OF_WEEK.forEach((dayName, dayIndex) => {
      const col = document.createElement('div');
      col.className = 'planner-day-col';

      // Header
      const header = document.createElement('div');
      header.className = 'planner-day-header';

      const title = document.createElement('h3');
      title.className = 'planner-day-title';
      title.textContent = dayName;
      header.appendChild(title);

      const btnAddSlot = document.createElement('button');
      btnAddSlot.className = 'btn-add-day-task';
      btnAddSlot.textContent = '+';
      btnAddSlot.title = `Add slot for ${dayName}`;
      btnAddSlot.onclick = () => {
        openNewSlotModal(dayIndex);
      };
      header.appendChild(btnAddSlot);

      col.appendChild(header);

      // Slot list
      const slotContainer = document.createElement('div');
      slotContainer.style.padding = '0.75rem';
      slotContainer.style.minHeight = '180px';

      const daySlots = state.slots.filter(s => s.day_of_week === dayIndex);

      if (daySlots.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.fontSize = '0.8rem';
        emptyMsg.style.color = 'var(--text-dim)';
        emptyMsg.style.textAlign = 'center';
        emptyMsg.style.marginTop = '2rem';
        emptyMsg.textContent = 'No slots planned';
        slotContainer.appendChild(emptyMsg);
      } else {
        daySlots.forEach(slot => {
          const card = document.createElement('div');
          card.className = 'planner-slot-card official-slot';

          // Time badge
          if (slot.start_time) {
            const timeSpan = document.createElement('span');
            timeSpan.className = 'slot-time-badge';
            const sTime = slot.start_time.substring(0, 5);
            const eTime = slot.end_time ? slot.end_time.substring(0, 5) : '';
            timeSpan.textContent = `⏰ ${sTime}${eTime ? ' - ' + eTime : ''}`;
            card.appendChild(timeSpan);
          }

          // Slot Title
          const slotTitle = document.createElement('div');
          slotTitle.className = 'slot-title';
          slotTitle.textContent = slot.title;
          card.appendChild(slotTitle);

          // Linked Domain
          if (slot.domain_id) {
            const domain = state.domains.find(d => d.id === slot.domain_id);
            if (domain) {
              const domTag = document.createElement('div');
              domTag.style.fontSize = '0.75rem';
              domTag.style.color = domain.color || 'var(--primary-light)';
              domTag.textContent = `${domain.icon || '🎯'} ${domain.title}`;
              card.appendChild(domTag);
            }
          }

          // Notes
          if (slot.notes) {
            const notesDiv = document.createElement('div');
            notesDiv.className = 'slot-notes';
            notesDiv.textContent = slot.notes;
            card.appendChild(notesDiv);
          }

          // Actions
          const actionRow = document.createElement('div');
          actionRow.style.display = 'flex';
          actionRow.style.justifyContent = 'flex-end';
          actionRow.style.gap = '0.35rem';
          actionRow.style.marginTop = '0.5rem';

          const editBtn = document.createElement('button');
          editBtn.className = 'btn btn-secondary btn-sm';
          editBtn.style.padding = '0.2rem 0.45rem';
          editBtn.style.fontSize = '0.75rem';
          editBtn.textContent = '✏️';
          editBtn.title = 'Edit Slot';
          editBtn.onclick = () => openEditSlotModal(slot);
          actionRow.appendChild(editBtn);

          const delBtn = document.createElement('button');
          delBtn.className = 'btn btn-danger btn-sm';
          delBtn.style.padding = '0.2rem 0.45rem';
          delBtn.style.fontSize = '0.75rem';
          delBtn.textContent = '🗑️';
          delBtn.title = 'Delete Slot';
          delBtn.onclick = () => confirmDeleteSlot(slot);
          actionRow.appendChild(delBtn);

          card.appendChild(actionRow);
          slotContainer.appendChild(card);
        });
      }

      col.appendChild(slotContainer);
      grid.appendChild(col);
    });
  }

  function openNewSlotModal(dayIndex) {
    if (!state.activeTemplateId) {
      showToast('info', 'Please select or create a template first.');
      return;
    }
    document.getElementById('modalSlotTitle').textContent = `Add Study Slot for ${DAYS_OF_WEEK[dayIndex]}`;
    document.getElementById('slotEditId').value = '';
    document.getElementById('slotDayOfWeek').value = String(dayIndex);
    document.getElementById('slotTitle').value = '';
    document.getElementById('slotStartTime').value = '09:00';
    document.getElementById('slotEndTime').value = '11:00';
    document.getElementById('slotDomainId').value = '';
    document.getElementById('slotNotes').value = '';

    openAdminModal('modalPlannerSlot');
  }

  function openEditSlotModal(slot) {
    document.getElementById('modalSlotTitle').textContent = `Edit Study Slot`;
    document.getElementById('slotEditId').value = slot.id;
    document.getElementById('slotDayOfWeek').value = String(slot.day_of_week);
    document.getElementById('slotTitle').value = slot.title || '';
    document.getElementById('slotStartTime').value = (slot.start_time || '').substring(0, 5);
    document.getElementById('slotEndTime').value = (slot.end_time || '').substring(0, 5);
    document.getElementById('slotDomainId').value = slot.domain_id || '';
    document.getElementById('slotNotes').value = slot.notes || '';

    openAdminModal('modalPlannerSlot');
  }

  function confirmDeleteSlot(slot) {
    showConfirmDialog(
      `Delete Slot: "${slot.title}"?`,
      'This slot will be removed from this weekly study plan.',
      async () => {
        const client = SkillPathAuth.getClient();
        const { error } = await client.from('planner_slots').delete().eq('id', slot.id);
        if (error) {
          showToast('error', `Failed to delete slot: ${error.message}`);
        } else {
          showToast('success', `Slot deleted.`);
          await loadPlannerSlots();
          renderSlotsGrid();
        }
      }
    );
  }

  // ==========================================================================
  // TAB 5: RESOURCES TABLE
  // ==========================================================================
  function renderResourcesTable() {
    const tbody = document.getElementById('resourcesTableBody');
    tbody.innerHTML = '';

    const categoryFilter = document.getElementById('filterResourceCategory')?.value || 'ALL';
    const query = (document.getElementById('searchResources')?.value || '').toLowerCase();

    let list = state.resources;
    if (categoryFilter !== 'ALL') {
      list = list.filter(r => r.category === categoryFilter);
    }
    if (query) {
      list = list.filter(r =>
        r.title.toLowerCase().includes(query) || (r.notes || '').toLowerCase().includes(query)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-dim); padding: 2rem;">No resources found.</td></tr>`;
      return;
    }

    list.forEach(res => {
      const tr = document.createElement('tr');

      // Title
      const tdTitle = document.createElement('td');
      const titleStrong = document.createElement('strong');
      titleStrong.textContent = res.title;
      tdTitle.appendChild(titleStrong);
      if (res.notes) {
        const notesDiv = document.createElement('div');
        notesDiv.style.fontSize = '0.8rem';
        notesDiv.style.color = 'var(--text-muted)';
        notesDiv.textContent = res.notes;
        tdTitle.appendChild(notesDiv);
      }
      tr.appendChild(tdTitle);

      // Category
      const tdCat = document.createElement('td');
      const catBadge = document.createElement('span');
      catBadge.className = 'badge-role-user';
      catBadge.textContent = res.category || 'General';
      tdCat.appendChild(catBadge);
      tr.appendChild(tdCat);

      // Domain
      const tdDom = document.createElement('td');
      const domain = state.domains.find(d => d.id === res.domain_id);
      tdDom.textContent = domain ? `${domain.icon || '🎯'} ${domain.title}` : (res.domain || 'General');
      tr.appendChild(tdDom);

      // Link
      const tdLink = document.createElement('td');
      const linkA = document.createElement('a');
      linkA.href = res.url;
      linkA.target = '_blank';
      linkA.rel = 'noopener noreferrer';
      linkA.className = 'admin-task-link';
      linkA.textContent = '🔗 Visit Link';
      tdLink.appendChild(linkA);
      tr.appendChild(tdLink);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-secondary btn-sm';
      btnEdit.style.marginRight = '0.35rem';
      btnEdit.textContent = '✏️ Edit';
      btnEdit.onclick = () => openEditResourceModal(res);
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.textContent = '🗑️ Delete';
      btnDel.onclick = () => confirmDeleteResource(res);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  function openEditResourceModal(res) {
    document.getElementById('modalResourceTitle').textContent = 'Edit Global Resource';
    document.getElementById('resourceEditId').value = res.id;
    document.getElementById('resourceTitle').value = res.title || '';
    document.getElementById('resourceUrl').value = res.url || '';
    document.getElementById('resourceCategory').value = res.category || 'Documentation';
    document.getElementById('resourceDomainId').value = res.domain_id || '';
    document.getElementById('resourceNotes').value = res.notes || '';

    openAdminModal('modalResource');
  }

  function confirmDeleteResource(res) {
    showConfirmDialog(
      `Delete Resource: "${res.title}"?`,
      'This resource will be removed from the official student directory.',
      async () => {
        const client = SkillPathAuth.getClient();
        const { error } = await client.from('resources').delete().eq('id', res.id);
        if (error) {
          showToast('error', `Failed to delete resource: ${error.message}`);
        } else {
          showToast('success', `Resource deleted.`);
          await loadInitialData();
        }
      }
    );
  }

  // ==========================================================================
  // TAB 6: USERS DIRECTORY & ROLE MANAGEMENT
  // ==========================================================================
  function renderUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    const query = (document.getElementById('searchUsers')?.value || '').toLowerCase();
    const filtered = state.users.filter(u =>
      (u.full_name || '').toLowerCase().includes(query) || (u.email || '').toLowerCase().includes(query)
    );

    document.getElementById('userCountBadge').textContent = `${state.users.length} Total Registered`;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-dim); padding: 2rem;">No matching users.</td></tr>`;
      return;
    }

    filtered.forEach(user => {
      const tr = document.createElement('tr');

      // Name & Avatar
      const tdName = document.createElement('td');
      const nameWrapper = document.createElement('div');
      nameWrapper.style.display = 'flex';
      nameWrapper.style.alignItems = 'center';
      nameWrapper.style.gap = '0.65rem';

      const avatar = document.createElement('span');
      avatar.className = 'user-avatar-circle';
      avatar.textContent = ((user.full_name || user.email || 'U').charAt(0)).toUpperCase();
      nameWrapper.appendChild(avatar);

      const nameText = document.createElement('strong');
      nameText.textContent = user.full_name || 'Unnamed Student';
      nameWrapper.appendChild(nameText);

      tdName.appendChild(nameWrapper);
      tr.appendChild(tdName);

      // Email
      const tdEmail = document.createElement('td');
      tdEmail.style.color = 'var(--text-muted)';
      tdEmail.textContent = user.email || '—';
      tr.appendChild(tdEmail);

      // Role Badge
      const tdRole = document.createElement('td');
      const roleBadge = document.createElement('span');
      roleBadge.className = user.role === 'admin' ? 'badge-role-admin' : 'badge-role-user';
      roleBadge.textContent = user.role === 'admin' ? '🛡️ Admin' : '👤 Student';
      tdRole.appendChild(roleBadge);
      tr.appendChild(tdRole);

      // Joined Date
      const tdJoined = document.createElement('td');
      tdJoined.style.fontSize = '0.85rem';
      tdJoined.style.color = 'var(--text-dim)';
      tdJoined.textContent = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—';
      tr.appendChild(tdJoined);

      // Overall Progress
      const tdProg = document.createElement('td');
      const completedCount = state.userProgress.filter(p => p.user_id === user.id && p.completed).length;
      const totalCount = state.tasks.length || 1;
      const pct = Math.min(100, Math.round((completedCount / totalCount) * 100));

      const progContainer = document.createElement('div');
      progContainer.style.display = 'flex';
      progContainer.style.alignItems = 'center';
      progContainer.style.gap = '0.5rem';

      const pctSpan = document.createElement('span');
      pctSpan.style.fontSize = '0.82rem';
      pctSpan.style.fontWeight = '600';
      pctSpan.textContent = `${pct}%`;
      progContainer.appendChild(pctSpan);

      tdProg.appendChild(progContainer);
      tr.appendChild(tdProg);

      // Actions: View Progress + Promote / Demote
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';

      const btnView = document.createElement('button');
      btnView.className = 'btn btn-outline btn-sm';
      btnView.style.marginRight = '0.35rem';
      btnView.textContent = '📊 Progress';
      btnView.onclick = () => viewUserProgress(user);
      tdActions.appendChild(btnView);

      // Role button
      const btnRole = document.createElement('button');
      btnRole.className = user.role === 'admin' ? 'btn btn-outline btn-sm' : 'btn btn-secondary btn-sm';
      btnRole.textContent = user.role === 'admin' ? 'Demote to Student' : 'Promote to Admin';
      btnRole.onclick = () => toggleUserRole(user);
      tdActions.appendChild(btnRole);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  function viewUserProgress(user) {
    document.getElementById('modalUserProgressTitle').textContent = `Progress: ${user.full_name || user.email}`;
    document.getElementById('modalUserProgressSubtitle').textContent = user.email;

    const listContainer = document.getElementById('userProgressDetailsList');
    listContainer.innerHTML = '';

    const userCompletedTaskIds = new Set(
      state.userProgress.filter(p => p.user_id === user.id && p.completed).map(p => p.task_id)
    );

    if (state.domains.length === 0) {
      listContainer.innerHTML = '<p style="color: var(--text-dim);">No domains configured.</p>';
      openAdminModal('modalUserProgress');
      return;
    }

    state.domains.forEach(domain => {
      const dTasks = state.tasks.filter(t => t.domain_id === domain.id);
      const doneCount = dTasks.filter(t => userCompletedTaskIds.has(t.id)).length;
      const pct = dTasks.length > 0 ? Math.round((doneCount / dTasks.length) * 100) : 0;

      const card = document.createElement('div');
      card.style.background = 'var(--bg-surface-elevated)';
      card.style.padding = '0.85rem';
      card.style.borderRadius = 'var(--radius-md)';
      card.style.border = '1px solid var(--border-subtle)';

      const titleRow = document.createElement('div');
      titleRow.style.display = 'flex';
      titleRow.style.justifyContent = 'space-between';
      titleRow.style.marginBottom = '0.35rem';

      const tSpan = document.createElement('strong');
      tSpan.textContent = `${domain.icon || '🎯'} ${domain.title}`;
      titleRow.appendChild(tSpan);

      const pSpan = document.createElement('span');
      pSpan.style.color = '#34d399';
      pSpan.style.fontWeight = '600';
      pSpan.textContent = `${doneCount}/${dTasks.length} (${pct}%)`;
      titleRow.appendChild(pSpan);

      card.appendChild(titleRow);

      const track = document.createElement('div');
      track.className = 'progress-bar-track';
      track.style.height = '6px';
      const fill = document.createElement('div');
      fill.className = 'progress-bar-fill';
      fill.style.width = `${pct}%`;
      fill.style.backgroundColor = domain.color || '#6366f1';
      track.appendChild(fill);
      card.appendChild(track);

      listContainer.appendChild(card);
    });

    openAdminModal('modalUserProgress');
  }

  function toggleUserRole(user) {
    const isPromoting = user.role !== 'admin';
    const newRole = isPromoting ? 'admin' : 'user';
    const actionWord = isPromoting ? 'Promote' : 'Demote';

    showConfirmDialog(
      `${actionWord} ${user.full_name || user.email}?`,
      isPromoting
        ? `This user will receive full administrative access to edit global domains, curriculums, and platform content.`
        : `This administrator will be demoted to a normal student account. (Note: Demotion is blocked if they are the last remaining administrator).`,
      async () => {
        const client = SkillPathAuth.getClient();
        try {
          const { data, error } = await client.rpc('set_user_role', {
            target_user_id: user.id,
            new_role: newRole
          });

          if (error) throw error;

          showToast('success', `User role successfully updated to ${newRole}.`);
          await loadInitialData();
        } catch (err) {
          showToast('error', `Role change failed: ${err.message || err}`);
        }
      }
    );
  }

  // ==========================================================================
  // TAB 7: ANNOUNCEMENTS
  // ==========================================================================
  function renderAnnouncementsTable() {
    const tbody = document.getElementById('announcementsTableBody');
    tbody.innerHTML = '';

    if (state.announcements.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 2rem;">No announcements created yet.</td></tr>`;
      return;
    }

    state.announcements.forEach(ann => {
      const tr = document.createElement('tr');

      // Message
      const tdMsg = document.createElement('td');
      tdMsg.style.fontWeight = '500';
      tdMsg.textContent = ann.message;
      tr.appendChild(tdMsg);

      // Status
      const tdStatus = document.createElement('td');
      const switchLabel = document.createElement('label');
      switchLabel.className = 'switch-control';

      const switchInput = document.createElement('input');
      switchInput.type = 'checkbox';
      switchInput.checked = !!ann.is_active;
      switchInput.onchange = () => toggleAnnouncementStatus(ann.id, switchInput.checked);

      const slider = document.createElement('span');
      slider.className = 'switch-slider';
      switchLabel.appendChild(switchInput);
      switchLabel.appendChild(slider);

      tdStatus.appendChild(switchLabel);
      tr.appendChild(tdStatus);

      // Date
      const tdDate = document.createElement('td');
      tdDate.style.fontSize = '0.85rem';
      tdDate.style.color = 'var(--text-dim)';
      tdDate.textContent = ann.created_at ? new Date(ann.created_at).toLocaleDateString() : '—';
      tr.appendChild(tdDate);

      // Actions
      const tdActions = document.createElement('td');
      tdActions.style.textAlign = 'right';

      const btnEdit = document.createElement('button');
      btnEdit.className = 'btn btn-secondary btn-sm';
      btnEdit.style.marginRight = '0.35rem';
      btnEdit.textContent = '✏️ Edit';
      btnEdit.onclick = () => openEditAnnouncementModal(ann);
      tdActions.appendChild(btnEdit);

      const btnDel = document.createElement('button');
      btnDel.className = 'btn btn-danger btn-sm';
      btnDel.textContent = '🗑️ Delete';
      btnDel.onclick = () => confirmDeleteAnnouncement(ann);
      tdActions.appendChild(btnDel);

      tr.appendChild(tdActions);
      tbody.appendChild(tr);
    });
  }

  async function toggleAnnouncementStatus(annId, isActive) {
    const client = SkillPathAuth.getClient();
    const { error } = await client
      .from('announcements')
      .update({ is_active: isActive })
      .eq('id', annId);

    if (error) {
      showToast('error', `Failed to update status: ${error.message}`);
      await loadInitialData();
    } else {
      const target = state.announcements.find(a => a.id === annId);
      if (target) target.is_active = isActive;
      showToast('success', `Announcement status updated.`);
    }
  }

  function openEditAnnouncementModal(ann) {
    document.getElementById('modalAnnouncementTitle').textContent = 'Edit Dashboard Announcement';
    document.getElementById('announcementEditId').value = ann.id;
    document.getElementById('announcementMessage').value = ann.message || '';
    document.getElementById('announcementIsActive').checked = ann.is_active !== false;

    openAdminModal('modalAnnouncement');
  }

  function confirmDeleteAnnouncement(ann) {
    showConfirmDialog(
      'Delete Announcement?',
      'This message banner will be removed permanently.',
      async () => {
        const client = SkillPathAuth.getClient();
        const { error } = await client.from('announcements').delete().eq('id', ann.id);
        if (error) {
          showToast('error', `Failed to delete announcement: ${error.message}`);
        } else {
          showToast('success', `Announcement deleted.`);
          await loadInitialData();
        }
      }
    );
  }

  // ==========================================================================
  // MODAL FORMS & ACTIONS
  // ==========================================================================
  function initModalHandlers() {
    const client = () => SkillPathAuth.getClient();

    // 1. Form Domain
    document.getElementById('btnOpenAddDomainModal')?.addEventListener('click', () => {
      document.getElementById('modalDomainTitle').textContent = 'Create Global IT Domain';
      document.getElementById('domainEditId').value = '';
      document.getElementById('domainTitle').value = '';
      document.getElementById('domainDescription').value = '';
      document.getElementById('domainIcon').value = '🎯';
      document.getElementById('domainColor').value = '#6366f1';
      document.getElementById('domainColorHex').value = '#6366f1';
      document.getElementById('domainIsVisible').checked = true;
      openAdminModal('modalDomain');
    });

    document.getElementById('formDomain')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('domainEditId').value;
      const title = document.getElementById('domainTitle').value.trim();
      const description = document.getElementById('domainDescription').value.trim();
      const icon = document.getElementById('domainIcon').value.trim() || '🎯';
      const color = document.getElementById('domainColor').value || '#6366f1';
      const is_visible = document.getElementById('domainIsVisible').checked;

      if (!title) {
        showToast('error', 'Domain title is required.');
        return;
      }

      try {
        if (editId) {
          const { error } = await client()
            .from('domains')
            .update({ title, description, icon, color, is_visible })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Domain updated successfully.');
        } else {
          const maxPos = state.domains.length > 0 ? Math.max(...state.domains.map(d => d.position || 0)) + 1 : 1;
          const { error } = await client()
            .from('domains')
            .insert({
              title,
              description,
              icon,
              color,
              is_visible,
              is_global: true,
              position: maxPos,
              created_by: state.currentUser.id
            });
          if (error) throw error;
          showToast('success', 'Global domain created successfully.');
        }
        closeAdminModal('modalDomain');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Domain save failed: ${err.message || err}`);
      }
    });

    // 2. Form Task
    document.getElementById('btnOpenAddTaskModal')?.addEventListener('click', () => {
      document.getElementById('modalTaskTitle').textContent = 'Add Curriculum Task';
      document.getElementById('taskEditId').value = '';
      document.getElementById('taskTitle').value = '';
      document.getElementById('taskDescription').value = '';
      document.getElementById('taskLevel').value = 'Beginner';
      document.getElementById('taskEstimatedHours').value = '10';
      document.getElementById('taskResourceUrl').value = '';
      if (state.domains.length > 0) {
        document.getElementById('taskDomainId').value = document.getElementById('filterTaskDomain').value || state.domains[0].id;
      }
      openAdminModal('modalTask');
    });

    document.getElementById('formTask')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('taskEditId').value;
      const domain_id = document.getElementById('taskDomainId').value;
      const title = document.getElementById('taskTitle').value.trim();
      const description = document.getElementById('taskDescription').value.trim();
      const level = document.getElementById('taskLevel').value;
      const estimated_hours = parseFloat(document.getElementById('taskEstimatedHours').value) || 10;
      const resource_url = document.getElementById('taskResourceUrl').value.trim();

      if (!title || !domain_id) {
        showToast('error', 'Title and target domain are required.');
        return;
      }

      try {
        if (editId) {
          const { error } = await client()
            .from('tasks')
            .update({ domain_id, title, description, level, estimated_hours, resource_url })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Task updated successfully.');
        } else {
          const maxPos = state.tasks.filter(t => t.domain_id === domain_id).length + 1;
          const { error } = await client()
            .from('tasks')
            .insert({
              domain_id,
              title,
              description,
              level,
              estimated_hours,
              resource_url,
              position: maxPos
            });
          if (error) throw error;
          showToast('success', 'Curriculum task added.');
        }
        closeAdminModal('modalTask');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Task save failed: ${err.message || err}`);
      }
    });

    // 3. Filter Task Domain & Search
    document.getElementById('filterTaskDomain')?.addEventListener('change', () => {
      renderTasksTable();
    });
    document.getElementById('searchTasks')?.addEventListener('input', () => {
      renderTasksTable();
    });

    // 4. Domains search
    document.getElementById('searchDomains')?.addEventListener('input', () => {
      renderDomainsTable();
    });

    // 5. Form Planner Template
    document.getElementById('btnOpenCreateTemplateModal')?.addEventListener('click', () => {
      document.getElementById('modalTemplateTitle').textContent = 'Create Planner Template';
      document.getElementById('templateEditId').value = '';
      document.getElementById('templateTitle').value = '';
      document.getElementById('templateDescription').value = '';
      document.getElementById('templateIsDefault').checked = state.templates.length === 0;
      openAdminModal('modalPlannerTemplate');
    });

    document.getElementById('btnEditTemplate')?.addEventListener('click', () => {
      const template = state.templates.find(t => t.id === state.activeTemplateId);
      if (!template) return;
      document.getElementById('modalTemplateTitle').textContent = 'Edit Planner Template';
      document.getElementById('templateEditId').value = template.id;
      document.getElementById('templateTitle').value = template.title || '';
      document.getElementById('templateDescription').value = template.description || '';
      document.getElementById('templateIsDefault').checked = !!template.is_default;
      openAdminModal('modalPlannerTemplate');
    });

    document.getElementById('formPlannerTemplate')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('templateEditId').value;
      const title = document.getElementById('templateTitle').value.trim();
      const description = document.getElementById('templateDescription').value.trim();
      const is_default = document.getElementById('templateIsDefault').checked;

      if (!title) {
        showToast('error', 'Template title is required.');
        return;
      }

      try {
        if (is_default) {
          // If setting as default, clear existing default first
          await client().from('planner_templates').update({ is_default: false }).eq('is_default', true);
        }

        if (editId) {
          const { error } = await client()
            .from('planner_templates')
            .update({ title, description, is_default })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Template updated.');
        } else {
          const { data, error } = await client()
            .from('planner_templates')
            .insert({
              title,
              description,
              is_default,
              created_by: state.currentUser.id
            })
            .select()
            .single();
          if (error) throw error;
          state.activeTemplateId = data.id;
          showToast('success', 'Planner template created.');
        }
        closeAdminModal('modalPlannerTemplate');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Template save failed: ${err.message || err}`);
      }
    });

    // Set as Default Template button
    document.getElementById('btnSetTemplateDefault')?.addEventListener('click', async () => {
      if (!state.activeTemplateId) return;
      try {
        const { error: rpcErr } = await client().rpc('set_default_planner_template', {
          target_template_id: state.activeTemplateId
        });
        if (rpcErr) {
          // Fallback manual update
          await client().from('planner_templates').update({ is_default: false }).eq('is_default', true);
          await client().from('planner_templates').update({ is_default: true }).eq('id', state.activeTemplateId);
        }
        showToast('success', 'Template set as official default plan for students.');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Could not set default: ${err.message || err}`);
      }
    });

    // Delete Template
    document.getElementById('btnDeleteTemplate')?.addEventListener('click', () => {
      const template = state.templates.find(t => t.id === state.activeTemplateId);
      if (!template) return;
      showConfirmDialog(
        `Delete Template: "${template.title}"?`,
        'All weekly schedule slots in this template will be removed.',
        async () => {
          const { error } = await client().from('planner_templates').delete().eq('id', template.id);
          if (error) {
            showToast('error', `Failed to delete template: ${error.message}`);
          } else {
            showToast('success', 'Template deleted.');
            state.activeTemplateId = null;
            await loadInitialData();
          }
        }
      );
    });

    // Select Template change
    document.getElementById('selectPlannerTemplate')?.addEventListener('change', async (e) => {
      state.activeTemplateId = e.target.value;
      await loadPlannerSlots();
      renderPlannerView();
    });

    // Form Planner Slot
    document.getElementById('formPlannerSlot')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('slotEditId').value;
      const day_of_week = parseInt(document.getElementById('slotDayOfWeek').value, 10);
      const start_time = document.getElementById('slotStartTime').value;
      const end_time = document.getElementById('slotEndTime').value;
      const title = document.getElementById('slotTitle').value.trim();
      const domain_id = document.getElementById('slotDomainId').value || null;
      const notes = document.getElementById('slotNotes').value.trim();

      if (!title || !state.activeTemplateId) {
        showToast('error', 'Slot title and template are required.');
        return;
      }

      try {
        if (editId) {
          const { error } = await client()
            .from('planner_slots')
            .update({ day_of_week, start_time, end_time, title, domain_id, notes })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Slot updated.');
        } else {
          const { error } = await client()
            .from('planner_slots')
            .insert({
              template_id: state.activeTemplateId,
              day_of_week,
              start_time,
              end_time,
              title,
              domain_id,
              notes
            });
          if (error) throw error;
          showToast('success', 'Slot added.');
        }
        closeAdminModal('modalPlannerSlot');
        await loadPlannerSlots();
        renderSlotsGrid();
      } catch (err) {
        showToast('error', `Slot save failed: ${err.message || err}`);
      }
    });

    // 6. Resources Form
    document.getElementById('btnOpenAddResourceModal')?.addEventListener('click', () => {
      document.getElementById('modalResourceTitle').textContent = 'Add Global Resource';
      document.getElementById('resourceEditId').value = '';
      document.getElementById('resourceTitle').value = '';
      document.getElementById('resourceUrl').value = '';
      document.getElementById('resourceCategory').value = 'Documentation';
      document.getElementById('resourceDomainId').value = '';
      document.getElementById('resourceNotes').value = '';
      openAdminModal('modalResource');
    });

    document.getElementById('formResource')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('resourceEditId').value;
      const title = document.getElementById('resourceTitle').value.trim();
      const url = document.getElementById('resourceUrl').value.trim();
      const category = document.getElementById('resourceCategory').value;
      const domain_id = document.getElementById('resourceDomainId').value || null;
      const notes = document.getElementById('resourceNotes').value.trim();

      const domainObj = state.domains.find(d => d.id === domain_id);
      const domainName = domainObj ? domainObj.title : 'General';

      if (!title || !url) {
        showToast('error', 'Resource title and destination URL are required.');
        return;
      }

      try {
        if (editId) {
          const { error } = await client()
            .from('resources')
            .update({ title, url, category, domain_id, domain: domainName, notes })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Resource updated.');
        } else {
          const { error } = await client()
            .from('resources')
            .insert({
              title,
              url,
              category,
              domain_id,
              domain: domainName,
              notes,
              is_global: true,
              created_by: state.currentUser.id
            });
          if (error) throw error;
          showToast('success', 'Global resource saved.');
        }
        closeAdminModal('modalResource');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Resource save failed: ${err.message || err}`);
      }
    });

    document.getElementById('filterResourceCategory')?.addEventListener('change', () => {
      renderResourcesTable();
    });
    document.getElementById('searchResources')?.addEventListener('input', () => {
      renderResourcesTable();
    });

    // 7. Users Search
    document.getElementById('searchUsers')?.addEventListener('input', () => {
      renderUsersTable();
    });

    // 8. Announcements Form
    document.getElementById('btnOpenAddAnnouncementModal')?.addEventListener('click', () => {
      document.getElementById('modalAnnouncementTitle').textContent = 'Post Dashboard Announcement';
      document.getElementById('announcementEditId').value = '';
      document.getElementById('announcementMessage').value = '';
      document.getElementById('announcementIsActive').checked = true;
      openAdminModal('modalAnnouncement');
    });

    document.getElementById('formAnnouncement')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const editId = document.getElementById('announcementEditId').value;
      const message = document.getElementById('announcementMessage').value.trim();
      const is_active = document.getElementById('announcementIsActive').checked;

      if (!message) {
        showToast('error', 'Announcement message is required.');
        return;
      }

      try {
        if (editId) {
          const { error } = await client()
            .from('announcements')
            .update({ message, is_active })
            .eq('id', editId);
          if (error) throw error;
          showToast('success', 'Announcement updated.');
        } else {
          const { error } = await client()
            .from('announcements')
            .insert({
              message,
              is_active,
              created_by: state.currentUser.id
            });
          if (error) throw error;
          showToast('success', 'Announcement published.');
        }
        closeAdminModal('modalAnnouncement');
        await loadInitialData();
      } catch (err) {
        showToast('error', `Announcement save failed: ${err.message || err}`);
      }
    });
  }

  // ==========================================================================
  // CONFIRMATION MODAL & TOAST HELPER
  // ==========================================================================
  let confirmCallback = null;

  function showConfirmDialog(title, message, onConfirm) {
    document.getElementById('modalConfirmTitle').textContent = title;
    document.getElementById('modalConfirmMessage').textContent = message;
    confirmCallback = onConfirm;

    const btnConfirm = document.getElementById('btnConfirmAction');
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      try {
        if (confirmCallback) await confirmCallback();
      } finally {
        btnConfirm.disabled = false;
        closeAdminModal('modalConfirm');
        confirmCallback = null;
      }
    };

    openAdminModal('modalConfirm');
  }

  function showToast(type, message) {
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

  function openAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closeAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  // Expose helpers globally for inline triggers
  window.openAdminModal = openAdminModal;
  window.closeAdminModal = closeAdminModal;
  window.showToast = showToast;
  window.showConfirmDialog = showConfirmDialog;

})();
