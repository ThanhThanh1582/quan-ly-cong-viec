/* ===================================================
   PROJECTS MODULE
   =================================================== */

const Projects = (() => {
  let editingId = null;
  let selectedColor = '#6366f1';

  // ---- Render ----
  function render() {
    renderList();
    renderKanban();
    updateFilterDropdowns();
  }

  function renderList() {
    const list = document.getElementById('projectList');
    const projects = DB.getProjects();
    const q = (document.getElementById('globalSearch').value || '').toLowerCase();

    const filtered = q
      ? projects.filter(p => p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q))
      : projects;

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>${q ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}</h3>
        <p>${q ? 'Thử từ khóa khác' : 'Bấm nút "Thêm dự án" để bắt đầu'}</p>
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(p => buildProjectItem(p, q)).join('');
    attachListDragDrop();
    attachListActions();
  }

  function buildProjectItem(p, q = '') {
    const members = (p.memberIds || []).map(id => getMemberById(id)).filter(Boolean);
    const memberAvatars = members.slice(0, 4).map(m => memberAvatar(m)).join('');
    const pct = projectCompletion(p.id);
    const taskCount = DB.getTasks().filter(t => t.projectId === p.id).length;

    const dateRange = (p.startDate || p.endDate)
      ? `${p.startDate ? fmtDate(p.startDate) : '?'} → ${p.endDate ? fmtDate(p.endDate) : '?'}`
      : '';

    const highlighted = q ? highlightText(p.name, q) : p.name;

    return `
    <div class="project-item" data-id="${p.id}" draggable="true">
      <div class="drag-handle">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="project-color-bar" style="background:${p.color || '#6366f1'}"></div>
      <div class="project-info">
        <div class="project-name">${highlighted}</div>
        <div class="project-desc">${p.desc || '<span style="color:var(--text-muted)">Không có mô tả</span>'}</div>
      </div>
      <div class="project-meta">
        ${statusBadge(p.status || 'todo')}
        ${priorityBadge(p.priority || 'low')}
        ${members.length ? `<div class="project-members-stack">${memberAvatars}</div>` : ''}
        <div class="project-progress">
          <div class="project-progress-label">
            <span>${taskCount} việc</span>
            <span>${pct}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;background:${p.color || '#6366f1'}"></div>
          </div>
        </div>
        ${dateRange ? `<div class="project-dates">${dateRange}</div>` : ''}
        <div class="project-actions">
          <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Chỉnh sửa">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete" data-id="${p.id}" title="Xóa">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderKanban() {
    const statuses = ['todo', 'inprogress', 'review', 'done'];
    const projects = DB.getProjects();

    statuses.forEach(status => {
      const col = document.getElementById(`kanban-${status}`);
      const countEl = document.getElementById(`kanban-count-${status}`);
      const items = projects.filter(p => (p.status || 'todo') === status);
      countEl.textContent = items.length;

      if (!items.length) {
        col.innerHTML = `<div class="empty-state-mini">Không có dự án</div>`;
        return;
      }

      col.innerHTML = items.map(p => `
        <div class="kanban-card" data-id="${p.id}" draggable="true">
          <div class="kanban-card-bar" style="background:${p.color || '#6366f1'}"></div>
          <div class="kanban-card-name">${p.name}</div>
          <div class="kanban-card-footer">
            ${priorityBadge(p.priority || 'low')}
            <div style="display:flex;gap:4px;">
              <button class="btn-icon" data-action="edit" data-id="${p.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" data-action="delete" data-id="${p.id}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </div>
        </div>`).join('');

      // Kanban card drag
      col.querySelectorAll('.kanban-card').forEach(card => {
        makeDraggable(card, 'proj-kanban', () => card.dataset.id, () => {});
        card.querySelectorAll('[data-action]').forEach(btn => {
          btn.addEventListener('click', e => { e.stopPropagation(); handleAction(btn.dataset.action, btn.dataset.id); });
        });
      });

      // Col drop target
      makeColDropTarget(col, 'proj-kanban', (id, target) => {
        const status = target.closest('.kanban-col').dataset.status;
        DB.updateProject(id, { status });
        renderKanban();
        Dashboard.render();
        showToast('Đã cập nhật trạng thái dự án', 'success');
      });
    });
  }

  // ---- Drag & Drop (list reorder) ----
  function attachListDragDrop() {
    const items = document.querySelectorAll('#projectList .project-item');
    items.forEach(item => {
      item.addEventListener('dragstart', e => {
        _dragSrc = item;
        _dragType = 'project-list';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
        setTimeout(() => item.classList.add('dragging'), 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      item.addEventListener('dragover', e => {
        if (_dragType !== 'project-list') return;
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', e => {
        if (!item.contains(e.relatedTarget)) item.classList.remove('drag-over');
      });
      item.addEventListener('drop', e => {
        if (_dragType !== 'project-list') return;
        e.preventDefault();
        item.classList.remove('drag-over');
        const srcId = e.dataTransfer.getData('text/plain');
        const targetId = item.dataset.id;
        if (srcId === targetId) return;
        reorderProjects(srcId, targetId);
      });
    });
  }

  function reorderProjects(srcId, targetId) {
    let list = DB.getProjects();
    const srcIdx = list.findIndex(p => p.id === srcId);
    const tgtIdx = list.findIndex(p => p.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [item] = list.splice(srcIdx, 1);
    list.splice(tgtIdx, 0, item);
    DB.saveProjects(list);
    render();
  }

  // ---- Actions (edit/delete) ----
  function attachListActions() {
    document.querySelectorAll('#projectList [data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.id);
      });
    });
  }

  function handleAction(action, id) {
    if (action === 'edit') openEdit(id);
    if (action === 'delete') confirmDelete(id);
  }

  // ---- Modal ----
  function openAdd() {
    editingId = null;
    document.getElementById('projectModalTitle').textContent = 'Thêm dự án mới';
    document.getElementById('projectId').value = '';
    document.getElementById('projectName').value = '';
    document.getElementById('projectDesc').value = '';
    document.getElementById('projectStatus').value = 'todo';
    document.getElementById('projectPriority').value = 'urgent-important';
    document.getElementById('projectStart').value = '';
    document.getElementById('projectEnd').value = '';
    selectedColor = '#6366f1';
    updateColorPicker('projectColorPicker', selectedColor);
    document.getElementById('projectColor').value = selectedColor;
    buildMemberCheckboxes([]);
    openModal('projectModal');
    setTimeout(() => document.getElementById('projectName').focus(), 100);
  }

  function openEdit(id) {
    const p = getProjectById(id);
    if (!p) return;
    editingId = id;
    document.getElementById('projectModalTitle').textContent = 'Chỉnh sửa dự án';
    document.getElementById('projectId').value = p.id;
    document.getElementById('projectName').value = p.name;
    document.getElementById('projectDesc').value = p.desc || '';
    document.getElementById('projectStatus').value = p.status || 'todo';
    document.getElementById('projectPriority').value = p.priority || 'low';
    document.getElementById('projectStart').value = p.startDate || '';
    document.getElementById('projectEnd').value = p.endDate || '';
    selectedColor = p.color || '#6366f1';
    updateColorPicker('projectColorPicker', selectedColor);
    document.getElementById('projectColor').value = selectedColor;
    buildMemberCheckboxes(p.memberIds || []);
    openModal('projectModal');
  }

  function buildMemberCheckboxes(selected = []) {
    const container = document.getElementById('projectMemberCheckboxes');
    const members = DB.getMembers();
    if (!members.length) {
      container.innerHTML = `<div class="empty-state-mini">Chưa có thành viên. Thêm thành viên trước.</div>`;
      return;
    }
    container.innerHTML = members.map(m => `
      <label class="member-checkbox-item">
        <input type="checkbox" name="proj-member" value="${m.id}" ${selected.includes(m.id) ? 'checked' : ''} />
        ${memberAvatar(m)}
        <span>${m.name}</span>
        ${m.role ? `<span style="color:var(--text-muted);font-size:12px">– ${m.role}</span>` : ''}
      </label>`).join('');
  }

  function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    if (!name) { showToast('Vui lòng nhập tên dự án!', 'error'); return; }

    const memberIds = [...document.querySelectorAll('#projectMemberCheckboxes input:checked')].map(i => i.value);

    const data = {
      name,
      desc: document.getElementById('projectDesc').value.trim(),
      status: document.getElementById('projectStatus').value,
      priority: document.getElementById('projectPriority').value,
      startDate: document.getElementById('projectStart').value,
      endDate: document.getElementById('projectEnd').value,
      color: document.getElementById('projectColor').value,
      memberIds,
    };

    if (editingId) {
      DB.updateProject(editingId, data);
      showToast('Đã cập nhật dự án', 'success');
    } else {
      DB.addProject({ id: uid(), ...data, createdAt: Date.now() });
      showToast('Đã thêm dự án mới', 'success');
    }

    closeModal('projectModal');
    render();
    Dashboard.render();
    Matrix.render();
    Calendar.render();
  }

  function confirmDelete(id) {
    const p = getProjectById(id);
    document.getElementById('confirmMessage').textContent =
      `Xóa dự án "${p?.name}"? Các công việc thuộc dự án sẽ không còn liên kết.`;
    document.getElementById('confirmDeleteBtn').onclick = () => {
      DB.deleteProject(id);
      closeModal('confirmModal');
      render();
      Tasks.render();
      Dashboard.render();
      Matrix.render();
      showToast('Đã xóa dự án', 'success');
    };
    openModal('confirmModal');
  }

  // Color picker
  function updateColorPicker(pickerId, color) {
    document.querySelectorAll(`#${pickerId} .color-swatch`).forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
  }

  function initColorPicker(pickerId, hiddenId) {
    document.getElementById(pickerId).addEventListener('click', e => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      selectedColor = swatch.dataset.color;
      document.getElementById(hiddenId).value = selectedColor;
      updateColorPicker(pickerId, selectedColor);
    });
  }

  // Update filter dropdowns in Tasks view
  function updateFilterDropdowns() {
    const projects = DB.getProjects();
    const selects = [document.getElementById('taskFilterProject'), document.getElementById('taskProject')];
    selects.forEach(sel => {
      if (!sel) return;
      const val = sel.value;
      const firstOpt = sel.options[0];
      sel.innerHTML = '';
      sel.appendChild(firstOpt);
      projects.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
      });
      if (val) sel.value = val;
    });
  }

  // ---- Init ----
  function init() {
    document.getElementById('addProjectBtn').addEventListener('click', openAdd);
    document.getElementById('saveProjectBtn').addEventListener('click', saveProject);
    document.getElementById('closeProjectModal').addEventListener('click', () => closeModal('projectModal'));
    document.getElementById('cancelProjectModal').addEventListener('click', () => closeModal('projectModal'));
    document.getElementById('closeConfirmModal').addEventListener('click', () => closeModal('confirmModal'));
    document.getElementById('cancelConfirmModal').addEventListener('click', () => closeModal('confirmModal'));

    initColorPicker('projectColorPicker', 'projectColor');

    // Tab switching
    document.querySelectorAll('#view-projects .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-projects .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('proj-list-content').classList.toggle('active', tab === 'list');
        document.getElementById('proj-kanban-content').classList.toggle('active', tab === 'kanban');
        if (tab === 'kanban') renderKanban();
      });
    });
  }

  return { init, render, openAdd, openEdit, updateFilterDropdowns };
})();
