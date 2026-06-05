/* ===================================================
   TASKS MODULE
   =================================================== */

const Tasks = (() => {
  let editingId = null;

  // ---- Render ----
  function render() {
    renderList();
    renderKanban();
    populateMemberSelect();
  }

  function getFiltered() {
    let tasks = DB.getTasks();
    const filterProject    = document.getElementById('taskFilterProject').value;
    const filterDept       = document.getElementById('taskFilterDepartment').value;
    const filterStatus     = document.getElementById('taskFilterStatus').value;
    const filterCompletion = document.getElementById('taskFilterCompletion').value;
    const filterPriority   = document.getElementById('taskFilterPriority').value;
    const q = (document.getElementById('globalSearch').value || '').toLowerCase();

    if (filterProject)  tasks = tasks.filter(t => t.projectId === filterProject);
    if (filterDept)     tasks = tasks.filter(t => t.projectId && getProjectById(t.projectId)?.department === filterDept);
    if (filterStatus)   tasks = tasks.filter(t => t.status === filterStatus);
    if (filterCompletion) {
      if (filterCompletion === 'active') {
        tasks = tasks.filter(t => t.status !== 'done');
      } else if (filterCompletion === 'done') {
        tasks = tasks.filter(t => t.status === 'done');
      }
    }
    if (filterPriority) tasks = tasks.filter(t => t.priority === filterPriority);
    if (q)              tasks = tasks.filter(t => t.name.toLowerCase().includes(q) || (t.desc || '').toLowerCase().includes(q));

    return tasks;
  }

  function renderList() {
    const container = document.getElementById('taskListFull');
    const tasks = getFiltered();
    const q = (document.getElementById('globalSearch').value || '').toLowerCase();

    if (!tasks.length) {
      container.innerHTML = `<div class="empty-state">
        <div class="empty-icon">✅</div>
        <h3>Không có công việc nào</h3>
        <p>Hãy thêm công việc mới hoặc thay đổi bộ lọc</p>
      </div>`;
      return;
    }

    container.innerHTML = tasks.map(t => buildTaskItem(t, q)).join('');
    attachListDragDrop();
    attachListActions();
  }

  function buildTaskItem(t, q = '') {
    const project  = t.projectId ? getProjectById(t.projectId) : null;
    const assignee = t.assigneeId ? getMemberById(t.assigneeId) : null;
    const overdue  = t.dueDate && isOverdue(t.dueDate) && t.status !== 'done';
    const highlighted = q ? highlightText(t.name, q) : t.name;

    const tags = (t.tagIds || []).map(id => DB.getTags().find(tag => tag.id === id)).filter(Boolean);
    const tagChipsHtml = tags.map(tag => `<span class="tag-chip" style="background:${tag.color}15;color:${tag.color};border-color:${tag.color}30">${tag.name}</span>`).join('');

    return `
    <div class="task-item" data-id="${t.id}" draggable="true">
      <div class="drag-handle">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/>
          <circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/>
        </svg>
      </div>
      <div class="task-checkbox ${t.status === 'done' ? 'done' : ''}"
           data-action="toggle" data-id="${t.id}" title="Đánh dấu hoàn thành"></div>
      <div class="task-name ${t.status === 'done' ? 'done' : ''}">${highlighted}</div>
      <div class="task-meta">
        ${project ? `<span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--text-secondary)"><span style="width:8px;height:8px;border-radius:50%;background:${project.color};display:inline-block"></span>${project.name}</span>` : ''}
        ${tagChipsHtml ? `<div style="display:inline-flex;gap:4px;flex-wrap:wrap">${tagChipsHtml}</div>` : ''}
        ${statusBadge(t.status || 'todo')}
        ${priorityBadge(t.priority || 'low')}
        ${assignee ? memberAvatar(assignee) : ''}
        ${t.dueDate ? `<span class="task-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${fmtDate(t.dueDate)}</span>` : ''}
        ${t.estimate ? `<span style="font-size:12px;color:var(--text-muted)">${t.estimate}h</span>` : ''}
        <div class="task-actions">
          <button class="btn-icon" data-action="edit" data-id="${t.id}" title="Chỉnh sửa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete" data-id="${t.id}" title="Xóa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  function renderKanban() {
    const statuses = ['todo', 'inprogress', 'review', 'done'];
    const tasks = getFiltered();

    statuses.forEach(status => {
      const col     = document.getElementById(`task-kanban-${status}`);
      const countEl = document.getElementById(`task-kanban-count-${status}`);
      const items   = tasks.filter(t => (t.status || 'todo') === status);
      countEl.textContent = items.length;

      if (!items.length) {
        col.innerHTML = `<div class="empty-state-mini">Không có công việc</div>`;
      } else {
        col.innerHTML = items.map(t => buildTaskKanbanCard(t)).join('');
        col.querySelectorAll('.kanban-card').forEach(card => {
          makeDraggable(card, 'task-kanban', () => card.dataset.id, () => {});
          card.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); handleAction(btn.dataset.action, btn.dataset.id); });
          });
        });
      }

      makeColDropTarget(col, 'task-kanban', (id, target) => {
        const newStatus = target.closest('.kanban-col').dataset.status;
        DB.updateTask(id, { status: newStatus });
        render();
        Dashboard.render();
        Projects.render();
        showToast('Đã cập nhật trạng thái', 'success');
      });
    });
  }

  function buildTaskKanbanCard(t) {
    const project  = t.projectId ? getProjectById(t.projectId) : null;
    const assignee = t.assigneeId ? getMemberById(t.assigneeId) : null;
    const overdue  = t.dueDate && isOverdue(t.dueDate) && t.status !== 'done';

    const tags = (t.tagIds || []).map(id => DB.getTags().find(tag => tag.id === id)).filter(Boolean);
    const tagChipsHtml = tags.map(tag => `<span class="tag-chip" style="background:${tag.color}15;color:${tag.color};border-color:${tag.color}30;font-size:10px;padding:1px 5px">${tag.name}</span>`).join('');

    return `
    <div class="kanban-card" data-id="${t.id}" draggable="true">
      <div class="kanban-card-bar" style="background:${project ? project.color : '#6366f1'}"></div>
      <div class="kanban-card-name">${t.name}</div>
      ${project ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${project.name}</div>` : ''}
      ${tagChipsHtml ? `<div style="display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px">${tagChipsHtml}</div>` : ''}
      <div class="kanban-card-footer">
        ${priorityBadge(t.priority || 'low')}
        <div style="display:flex;align-items:center;gap:6px">
          ${t.dueDate ? `<span style="font-size:11px;color:${overdue ? 'var(--danger)' : 'var(--text-muted)'}">${fmtDateShort(t.dueDate)}</span>` : ''}
          ${assignee ? memberAvatar(assignee) : ''}
          <button class="btn-icon" data-action="edit" data-id="${t.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete" data-id="${t.id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
      </div>
    </div>`;
  }

  // ---- Drag & Drop (list reorder) ----
  function attachListDragDrop() {
    const items = document.querySelectorAll('#taskListFull .task-item');
    items.forEach(item => {
      item.addEventListener('dragstart', e => {
        _dragSrc = item;
        _dragType = 'task-list';
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.dataset.id);
        setTimeout(() => item.classList.add('dragging'), 0);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });
      item.addEventListener('dragover', e => {
        if (_dragType !== 'task-list') return;
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', e => {
        if (!item.contains(e.relatedTarget)) item.classList.remove('drag-over');
      });
      item.addEventListener('drop', e => {
        if (_dragType !== 'task-list') return;
        e.preventDefault();
        item.classList.remove('drag-over');
        const srcId = e.dataTransfer.getData('text/plain');
        const tgtId = item.dataset.id;
        if (srcId === tgtId) return;
        reorderTasks(srcId, tgtId);
      });
    });
  }

  function reorderTasks(srcId, targetId) {
    let list = DB.getTasks();
    const srcIdx = list.findIndex(t => t.id === srcId);
    const tgtIdx = list.findIndex(t => t.id === targetId);
    if (srcIdx === -1 || tgtIdx === -1) return;
    const [item] = list.splice(srcIdx, 1);
    list.splice(tgtIdx, 0, item);
    DB.saveTasks(list);
    renderList();
  }

  // ---- Actions ----
  function attachListActions() {
    document.querySelectorAll('#taskListFull [data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.id);
      });
    });
  }

  function handleAction(action, id) {
    if (action === 'edit')   openEdit(id);
    if (action === 'delete') confirmDelete(id);
    if (action === 'toggle') toggleDone(id);
  }

  function toggleDone(id) {
    const t = DB.getTasks().find(t => t.id === id);
    if (!t) return;
    const newStatus = t.status === 'done' ? 'todo' : 'done';
    DB.updateTask(id, { status: newStatus });
    render();
    Dashboard.render();
    Projects.render();
    Matrix.render();
  }

  // ---- Modal ----
  function populateMemberSelect() {
    const sel = document.getElementById('taskAssignee');
    const val = sel.value;
    sel.innerHTML = '<option value="">Chưa phân công</option>';
    DB.getMembers().forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = m.name;
      sel.appendChild(opt);
    });
    if (val) sel.value = val;
  }

  function buildTagCheckboxes(selectedIds = []) {
    const container = document.getElementById('taskTagCheckboxes');
    if (!container) return;
    const tags = DB.getTags();
    if (!tags.length) {
      container.innerHTML = `<div class="empty-state-mini">Chưa có thẻ. Tạo thẻ trong mục Quản lý thẻ.</div>`;
      return;
    }
    container.innerHTML = tags.map(tag => `
      <label class="tag-checkbox-item">
        <input type="checkbox" name="task-tags" value="${tag.id}" ${selectedIds.includes(tag.id) ? 'checked' : ''} />
        <span class="tag-chip" style="background:${tag.color}15;color:${tag.color};border-color:${tag.color}30">${tag.name}</span>
      </label>
    `).join('');
  }

  function openAdd(prefill = {}) {
    editingId = null;
    document.getElementById('taskModalTitle').textContent = 'Thêm công việc mới';
    document.getElementById('taskId').value = '';
    document.getElementById('taskName').value = prefill.name || '';
    document.getElementById('taskDesc').value = '';
    document.getElementById('taskProject').value = prefill.projectId || '';
    document.getElementById('taskStatus').value = prefill.status || 'todo';
    document.getElementById('taskPriority').value = prefill.priority || 'urgent-important';
    document.getElementById('taskDueDate').value = prefill.dueDate || '';
    document.getElementById('taskEstimate').value = '';
    document.getElementById('taskAssignee').value = '';
    populateMemberSelect();
    Projects.updateFilterDropdowns();
    buildTagCheckboxes(prefill.tagIds || []);
    if (prefill.projectId) document.getElementById('taskProject').value = prefill.projectId;
    openModal('taskModal');
    setTimeout(() => document.getElementById('taskName').focus(), 100);
  }

  function openEdit(id) {
    const t = DB.getTasks().find(t => t.id === id);
    if (!t) return;
    editingId = id;
    document.getElementById('taskModalTitle').textContent = 'Chỉnh sửa công việc';
    document.getElementById('taskId').value = t.id;
    document.getElementById('taskName').value = t.name;
    document.getElementById('taskDesc').value = t.desc || '';
    document.getElementById('taskStatus').value = t.status || 'todo';
    document.getElementById('taskPriority').value = t.priority || 'low';
    document.getElementById('taskDueDate').value = t.dueDate || '';
    document.getElementById('taskEstimate').value = t.estimate || '';
    populateMemberSelect();
    Projects.updateFilterDropdowns();
    document.getElementById('taskProject').value = t.projectId || '';
    document.getElementById('taskAssignee').value = t.assigneeId || '';
    buildTagCheckboxes(t.tagIds || []);
    openModal('taskModal');
  }

  function saveTask() {
    const name = document.getElementById('taskName').value.trim();
    if (!name) { showToast('Vui lòng nhập tên công việc!', 'error'); return; }

    const tagIds = [...document.querySelectorAll('#taskTagCheckboxes input:checked')].map(i => i.value);

    const data = {
      name,
      desc:       document.getElementById('taskDesc').value.trim(),
      projectId:  document.getElementById('taskProject').value,
      assigneeId: document.getElementById('taskAssignee').value,
      status:     document.getElementById('taskStatus').value,
      priority:   document.getElementById('taskPriority').value,
      dueDate:    document.getElementById('taskDueDate').value,
      estimate:   parseFloat(document.getElementById('taskEstimate').value) || 0,
      tagIds,
    };

    if (editingId) {
      DB.updateTask(editingId, data);
      showToast('Đã cập nhật công việc', 'success');
    } else {
      DB.addTask({ id: uid(), ...data, createdAt: Date.now() });
      showToast('Đã thêm công việc mới', 'success');
    }

    closeModal('taskModal');
    render();
    Dashboard.render();
    Projects.render();
    Matrix.render();
    Calendar.render();
  }

  function confirmDelete(id) {
    const t = DB.getTasks().find(t => t.id === id);
    document.getElementById('confirmMessage').textContent = `Xóa công việc "${t?.name}"?`;
    document.getElementById('confirmDeleteBtn').onclick = () => {
      DB.deleteTask(id);
      closeModal('confirmModal');
      render();
      Dashboard.render();
      Projects.render();
      Matrix.render();
      Calendar.render();
      showToast('Đã xóa công việc', 'success');
    };
    openModal('confirmModal');
  }

  // ---- Init ----
  function init() {
    document.getElementById('addTaskBtn').addEventListener('click', () => openAdd());
    document.getElementById('saveTaskBtn').addEventListener('click', saveTask);
    document.getElementById('closeTaskModal').addEventListener('click', () => closeModal('taskModal'));
    document.getElementById('cancelTaskModal').addEventListener('click', () => closeModal('taskModal'));

    // Filters
    ['taskFilterProject', 'taskFilterDepartment', 'taskFilterStatus', 'taskFilterCompletion', 'taskFilterPriority'].forEach(id => {
      document.getElementById(id)?.addEventListener('change', render);
    });

    // Tab switching
    document.querySelectorAll('#view-tasks .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#view-tasks .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        document.getElementById('task-list-content').classList.toggle('active', tab === 'task-list');
        document.getElementById('task-kanban-content').classList.toggle('active', tab === 'task-kanban');
        if (tab === 'task-kanban') renderKanban();
      });
    });
  }

  function openEditById(id) { openEdit(id); }
  function deleteTaskById(id) { confirmDelete(id); }
  return { init, render, openAdd, openEditById, deleteTaskById, renderKanban };
})();
