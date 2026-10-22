/**
 * ============================================================================
 * SkillPath - Student Weekly Planner Engine (planner.js)
 * Synchronizes the official admin-curated default template and student personal
 * slots with Supabase backend and interactive completion tracking.
 * ============================================================================
 */

(function () {
  'use strict';

  const state = {
    currentUser: null,
    defaultTemplate: null,
    officialSlots: [],
    domains: [],
    personalSlots: [],
    completedSlotIds: new Set(),
    skills: []
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

  const SKILLS_STORAGE_KEY = 'skillpath_skills_matrix';

  document.addEventListener('DOMContentLoaded', async () => {
    // 1. Check current auth state
    state.currentUser = await SkillPathAuth.getUser();

    // 2. Setup Modals & Event Listeners
    initPlannerEvents();

    // 3. Load Data & Render
    await loadPlannerData();

    // 4. Load Skills Matrix
    loadSkillsMatrix();
  });

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================
  async function loadPlannerData() {
    const client = SkillPathAuth.getClient();
    if (!client) return;

    try {
      // 1. Fetch Global Domains for badges
      const { data: domains } = await client
        .from('domains')
        .select('id, title, icon, color')
        .eq('is_global', true);
      state.domains = domains || [];

      // 2. Fetch the Default Planner Template
      const { data: templates } = await client
        .from('planner_templates')
        .select('*')
        .order('is_default', { ascending: false });

      if (templates && templates.length > 0) {
        state.defaultTemplate = templates.find(t => t.is_default) || templates[0];
        document.getElementById('plannerTitleHeading').textContent = state.defaultTemplate.title || 'Weekly Study Planner';
        if (state.defaultTemplate.description) {
          document.getElementById('plannerSubtitle').textContent = state.defaultTemplate.description;
        }
      }

      // 3. Fetch Official Slots for this Template
      if (state.defaultTemplate) {
        const { data: slots, error: slotErr } = await client
          .from('planner_slots')
          .select('*')
          .eq('template_id', state.defaultTemplate.id)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        if (!slotErr) {
          state.officialSlots = slots || [];
        }
      }

      // 4. If Signed In: Fetch User's Official Slot Progress & Personal Slots
      if (state.currentUser) {
        // Official slot progress
        const { data: progress } = await client
          .from('user_planner_progress')
          .select('slot_id, completed')
          .eq('user_id', state.currentUser.id);

        state.completedSlotIds = new Set(
          (progress || []).filter(p => p.completed).map(p => p.slot_id)
        );

        // Personal slots
        const { data: personal } = await client
          .from('user_planner_entries')
          .select('*')
          .eq('user_id', state.currentUser.id)
          .order('day_of_week', { ascending: true })
          .order('start_time', { ascending: true });

        state.personalSlots = personal || [];
      } else {
        // Fallback to localStorage for guest personal slots
        const guestSlots = localStorage.getItem('skillpath_guest_planner_slots');
        if (guestSlots) {
          try {
            state.personalSlots = JSON.parse(guestSlots);
          } catch (e) {
            state.personalSlots = [];
          }
        }
      }

      // Render the 7-day grid and calculate weekly metrics
      renderWeeklyGrid();
      updateWeeklyProgressMetrics();

    } catch (err) {
      console.error('Failed to load planner data:', err);
      showPlannerToast('error', 'Could not load official study plan.');
    }
  }

  // ==========================================================================
  // RENDER WEEKLY 7-DAY GRID
  // ==========================================================================
  function renderWeeklyGrid() {
    const grid = document.getElementById('studentPlannerGrid');
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

      const btnAdd = document.createElement('button');
      btnAdd.className = 'btn-add-day-task';
      btnAdd.textContent = '+';
      btnAdd.title = `Add personal slot for ${dayName}`;
      btnAdd.onclick = () => openPersonalSlotModal(dayIndex);
      header.appendChild(btnAdd);

      col.appendChild(header);

      // Slot Items Container
      const itemsContainer = document.createElement('div');
      itemsContainer.style.padding = '0.75rem';
      itemsContainer.style.minHeight = '180px';

      const dayOfficial = state.officialSlots.filter(s => s.day_of_week === dayIndex);
      const dayPersonal = state.personalSlots.filter(s => s.day_of_week === dayIndex);

      if (dayOfficial.length === 0 && dayPersonal.length === 0) {
        const emptyP = document.createElement('p');
        emptyP.style.fontSize = '0.8rem';
        emptyP.style.color = 'var(--text-dim)';
        emptyP.style.textAlign = 'center';
        emptyP.style.marginTop = '2rem';
        emptyP.textContent = 'No slots for this day';
        itemsContainer.appendChild(emptyP);
      }

      // 1. Render Official Curriculum Slots
      dayOfficial.forEach(slot => {
        const isDone = state.completedSlotIds.has(slot.id);
        const card = document.createElement('div');
        card.className = `planner-slot-card official-slot ${isDone ? 'completed' : ''}`;

        // Top Row: Tag & Checkbox
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.marginBottom = '0.35rem';

        const tagSpan = document.createElement('span');
        tagSpan.style.fontSize = '0.7rem';
        tagSpan.style.fontWeight = '600';
        tagSpan.style.color = '#818cf8';
        tagSpan.textContent = '🛡️ Official';
        topRow.appendChild(tagSpan);

        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        checkInput.checked = isDone;
        checkInput.style.cursor = 'pointer';
        checkInput.title = 'Mark slot completed';
        checkInput.onchange = () => toggleOfficialSlotCompletion(slot.id, checkInput.checked);
        topRow.appendChild(checkInput);

        card.appendChild(topRow);

        // Time Badge
        if (slot.start_time) {
          const timeBadge = document.createElement('span');
          timeBadge.className = 'slot-time-badge';
          const s = slot.start_time.substring(0, 5);
          const e = slot.end_time ? slot.end_time.substring(0, 5) : '';
          timeBadge.textContent = `⏰ ${s}${e ? ' - ' + e : ''}`;
          card.appendChild(timeBadge);
        }

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'slot-title';
        titleDiv.textContent = slot.title;
        card.appendChild(titleDiv);

        // Linked Domain
        if (slot.domain_id) {
          const domain = state.domains.find(d => d.id === slot.domain_id);
          if (domain) {
            const domTag = document.createElement('div');
            domTag.style.fontSize = '0.72rem';
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

        itemsContainer.appendChild(card);
      });

      // 2. Render Personal Slots
      dayPersonal.forEach(slot => {
        const isDone = !!slot.completed;
        const card = document.createElement('div');
        card.className = `planner-slot-card personal-slot ${isDone ? 'completed' : ''}`;

        // Top Row: Tag & Checkbox + Delete
        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';
        topRow.style.marginBottom = '0.35rem';

        const tagSpan = document.createElement('span');
        tagSpan.style.fontSize = '0.7rem';
        tagSpan.style.fontWeight = '600';
        tagSpan.style.color = 'var(--secondary)';
        tagSpan.textContent = '👤 Personal';
        topRow.appendChild(tagSpan);

        const actionsWrapper = document.createElement('div');
        actionsWrapper.style.display = 'flex';
        actionsWrapper.style.alignItems = 'center';
        actionsWrapper.style.gap = '0.45rem';

        const checkInput = document.createElement('input');
        checkInput.type = 'checkbox';
        checkInput.checked = isDone;
        checkInput.style.cursor = 'pointer';
        checkInput.onchange = () => togglePersonalSlotCompletion(slot, checkInput.checked);
        actionsWrapper.appendChild(checkInput);

        const delBtn = document.createElement('button');
        delBtn.style.background = 'transparent';
        delBtn.style.border = 'none';
        delBtn.style.color = 'var(--accent-rose)';
        delBtn.style.cursor = 'pointer';
        delBtn.style.fontSize = '0.85rem';
        delBtn.textContent = '✕';
        delBtn.title = 'Delete personal slot';
        delBtn.onclick = () => deletePersonalSlot(slot);
        actionsWrapper.appendChild(delBtn);

        topRow.appendChild(actionsWrapper);
        card.appendChild(topRow);

        // Time Badge
        if (slot.start_time) {
          const timeBadge = document.createElement('span');
          timeBadge.className = 'slot-time-badge';
          timeBadge.style.color = 'var(--secondary)';
          timeBadge.style.background = 'rgba(6, 182, 212, 0.15)';
          const s = slot.start_time.substring(0, 5);
          const e = slot.end_time ? slot.end_time.substring(0, 5) : '';
          timeBadge.textContent = `⏰ ${s}${e ? ' - ' + e : ''}`;
          card.appendChild(timeBadge);
        }

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.className = 'slot-title';
        titleDiv.textContent = slot.title;
        card.appendChild(titleDiv);

        // Notes
        if (slot.notes) {
          const notesDiv = document.createElement('div');
          notesDiv.className = 'slot-notes';
          notesDiv.textContent = slot.notes;
          card.appendChild(notesDiv);
        }

        itemsContainer.appendChild(card);
      });

      col.appendChild(itemsContainer);
      grid.appendChild(col);
    });
  }

  // ==========================================================================
  // PROGRESS TRACKING & COMPLETION
  // ==========================================================================
  async function toggleOfficialSlotCompletion(slotId, isCompleted) {
    if (!state.currentUser) {
      showPlannerToast('info', 'Sign in to sync your study progress across devices.');
      // Local state toggle for guests
      if (isCompleted) {
        state.completedSlotIds.add(slotId);
      } else {
        state.completedSlotIds.delete(slotId);
      }
      renderWeeklyGrid();
      updateWeeklyProgressMetrics();
      return;
    }

    const client = SkillPathAuth.getClient();

    try {
      if (isCompleted) {
        state.completedSlotIds.add(slotId);
        await client.from('user_planner_progress').upsert({
          user_id: state.currentUser.id,
          slot_id: slotId,
          completed: true,
          updated_at: new Date().toISOString()
        });
      } else {
        state.completedSlotIds.delete(slotId);
        await client.from('user_planner_progress')
          .delete()
          .eq('user_id', state.currentUser.id)
          .eq('slot_id', slotId);
      }

      renderWeeklyGrid();
      updateWeeklyProgressMetrics();
    } catch (err) {
      console.error('Failed to update slot progress:', err);
      showPlannerToast('error', 'Could not save completion status.');
    }
  }

  async function togglePersonalSlotCompletion(slot, isCompleted) {
    slot.completed = isCompleted;

    if (state.currentUser && slot.id) {
      const client = SkillPathAuth.getClient();
      await client
        .from('user_planner_entries')
        .update({ completed: isCompleted })
        .eq('id', slot.id);
    } else {
      localStorage.setItem('skillpath_guest_planner_slots', JSON.stringify(state.personalSlots));
    }

    renderWeeklyGrid();
    updateWeeklyProgressMetrics();
  }

  async function deletePersonalSlot(slot) {
    if (state.currentUser && slot.id) {
      const client = SkillPathAuth.getClient();
      await client.from('user_planner_entries').delete().eq('id', slot.id);
    }
    state.personalSlots = state.personalSlots.filter(s => s !== slot);
    localStorage.setItem('skillpath_guest_planner_slots', JSON.stringify(state.personalSlots));

    showPlannerToast('info', 'Personal slot removed.');
    renderWeeklyGrid();
    updateWeeklyProgressMetrics();
  }

  function updateWeeklyProgressMetrics() {
    const totalSlots = state.officialSlots.length + state.personalSlots.length;
    if (totalSlots === 0) {
      document.getElementById('weeklyCompletionPct').textContent = '0%';
      document.getElementById('weeklyProgressBarFill').style.width = '0%';
      return;
    }

    const officialDone = state.officialSlots.filter(s => state.completedSlotIds.has(s.id)).length;
    const personalDone = state.personalSlots.filter(s => s.completed).length;
    const totalDone = officialDone + personalDone;

    const pct = Math.min(100, Math.round((totalDone / totalSlots) * 100));

    document.getElementById('weeklyCompletionPct').textContent = `${pct}%`;
    document.getElementById('weeklyProgressBarFill').style.width = `${pct}%`;
  }

  // ==========================================================================
  // PERSONAL SLOT MODAL & CREATION
  // ==========================================================================
  function openPersonalSlotModal(dayIndex) {
    document.getElementById('personalSlotDayIndex').value = String(dayIndex);
    document.getElementById('personalSlotDayName').textContent = DAYS_OF_WEEK[dayIndex];
    document.getElementById('personalSlotTitle').value = '';
    document.getElementById('personalSlotStart').value = '18:00';
    document.getElementById('personalSlotEnd').value = '19:30';
    document.getElementById('personalSlotNotes').value = '';

    openPlannerModal('modalPersonalSlot');
  }

  function initPlannerEvents() {
    // Personal slot submit
    document.getElementById('formPersonalSlot')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const dayIndex = parseInt(document.getElementById('personalSlotDayIndex').value, 10);
      const title = document.getElementById('personalSlotTitle').value.trim();
      const start_time = document.getElementById('personalSlotStart').value;
      const end_time = document.getElementById('personalSlotEnd').value;
      const notes = document.getElementById('personalSlotNotes').value.trim();

      if (!title) {
        showPlannerToast('error', 'Please enter a goal title.');
        return;
      }

      const newSlot = {
        id: 'ps_' + Date.now(),
        day_of_week: dayIndex,
        start_time,
        end_time,
        title,
        notes,
        completed: false
      };

      if (state.currentUser) {
        const client = SkillPathAuth.getClient();
        try {
          const { data, error } = await client
            .from('user_planner_entries')
            .insert({
              user_id: state.currentUser.id,
              day_of_week: dayIndex,
              start_time,
              end_time,
              title,
              notes,
              completed: false
            })
            .select()
            .single();

          if (error) throw error;
          if (data) newSlot.id = data.id;
        } catch (err) {
          console.error('Failed to save personal slot to cloud:', err);
        }
      }

      state.personalSlots.push(newSlot);
      localStorage.setItem('skillpath_guest_planner_slots', JSON.stringify(state.personalSlots));

      closePlannerModal('modalPersonalSlot');
      showPlannerToast('success', 'Personal study goal saved!');
      renderWeeklyGrid();
      updateWeeklyProgressMetrics();
    });

    // Add Skill Modal
    document.getElementById('btnOpenAddSkillModal')?.addEventListener('click', () => {
      document.getElementById('skillName').value = '';
      document.getElementById('skillCategory').value = 'General';
      document.getElementById('skillLevel').value = 'Intermediate';
      openPlannerModal('modalAddSkill');
    });

    document.getElementById('formAddSkill')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('skillName').value.trim();
      const category = document.getElementById('skillCategory').value.trim() || 'General';
      const level = document.getElementById('skillLevel').value;

      if (!name) return;

      const skillItem = {
        id: 'sk_' + Date.now(),
        name,
        category,
        level
      };

      state.skills.push(skillItem);
      saveSkillsMatrix();
      renderSkillsMatrixTable();
      closePlannerModal('modalAddSkill');
      showPlannerToast('success', `Logged skill: ${name}`);
    });
  }

  // ==========================================================================
  // TECHNICAL SKILLS MATRIX
  // ==========================================================================
  function loadSkillsMatrix() {
    const raw = localStorage.getItem(SKILLS_STORAGE_KEY);
    if (raw) {
      try {
        state.skills = JSON.parse(raw);
      } catch (e) {
        state.skills = [];
      }
    }
    if (state.skills.length === 0) {
      state.skills = [
        { id: '1', name: 'JavaScript (ES6+)', category: 'Frontend', level: 'Advanced' },
        { id: '2', name: 'PostgreSQL / SQL', category: 'Databases', level: 'Intermediate' },
        { id: '3', name: 'Docker', category: 'DevOps', level: 'Intermediate' }
      ];
      saveSkillsMatrix();
    }
    renderSkillsMatrixTable();
  }

  function saveSkillsMatrix() {
    localStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(state.skills));
  }

  function renderSkillsMatrixTable() {
    const tbody = document.getElementById('skillsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    state.skills.forEach(skill => {
      const tr = document.createElement('tr');

      const tdName = document.createElement('td');
      const sStrong = document.createElement('strong');
      sStrong.textContent = skill.name;
      tdName.appendChild(sStrong);
      tr.appendChild(tdName);

      const tdCat = document.createElement('td');
      tdCat.textContent = skill.category || 'General';
      tr.appendChild(tdCat);

      const tdLvl = document.createElement('td');
      const lvlSpan = document.createElement('span');
      const lvlClass = (skill.level || 'Beginner').toLowerCase();
      lvlSpan.className = `badge-level-${lvlClass}`;
      lvlSpan.textContent = skill.level;
      tdLvl.appendChild(lvlSpan);
      tr.appendChild(tdLvl);

      const tdAction = document.createElement('td');
      tdAction.style.textAlign = 'right';

      const delBtn = document.createElement('button');
      delBtn.className = 'btn btn-outline btn-sm';
      delBtn.style.color = 'var(--accent-rose)';
      delBtn.style.borderColor = 'rgba(244, 63, 94, 0.3)';
      delBtn.textContent = '🗑️ Remove';
      delBtn.onclick = () => {
        state.skills = state.skills.filter(s => s.id !== skill.id);
        saveSkillsMatrix();
        renderSkillsMatrixTable();
      };
      tdAction.appendChild(delBtn);

      tr.appendChild(tdAction);
      tbody.appendChild(tr);
    });
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================
  function openPlannerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('open');
  }

  function closePlannerModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
  }

  function showPlannerToast(type, message) {
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

  window.openPlannerModal = openPlannerModal;
  window.closePlannerModal = closePlannerModal;

})();
