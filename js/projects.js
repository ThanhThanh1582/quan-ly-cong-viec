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

  let expandedProjectIds = [];

  function renderList() {
    const list = document.getElementById('projectList');
    const projects = DB.getProjects();
    const q = (document.getElementById('globalSearch').value || '').toLowerCase();
    const filterDept = document.getElementById('projectFilterDepartment').value;

    let filtered = projects;
    if (filterDept) {
      filtered = filtered.filter(p => p.department === filterDept);
    }
    if (q) {
      filtered = filtered.filter(p => p.name.toLowerCase().includes(q) || (p.desc || '').toLowerCase().includes(q));
    }

    if (!filtered.length) {
      list.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📁</div>
        <h3>${q || filterDept ? 'Không tìm thấy dự án' : 'Chưa có dự án nào'}</h3>
        <p>${q || filterDept ? 'Thử thay đổi bộ lọc' : 'Bấm nút "Thêm dự án" để bắt đầu'}</p>
      </div>`;
      return;
    }

    list.innerHTML = filtered.map(p => buildProjectItem(p, q)).join('');
    attachListDragDrop();
    attachListActions();

    // Re-render expanded bodies
    setTimeout(() => {
      expandedProjectIds.forEach(id => {
        if (filtered.some(p => p.id === id)) {
          renderProjectBody(id);
        }
      });
    }, 0);
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
    const isExpanded = expandedProjectIds.includes(p.id);

    // Get tags
    const tags = (p.tagIds || []).map(id => DB.getTags().find(t => t.id === id)).filter(Boolean);
    const tagChips = tags.map(t => `<span class="tag-chip" style="background:${t.color}15;color:${t.color};border-color:${t.color}30">${t.name}</span>`).join('');

    return `
    <div class="project-item ${isExpanded ? 'expanded' : ''}" id="project-item-${p.id}" data-id="${p.id}" draggable="true">
      <div class="project-item-header" onclick="Projects.toggleExpand('${p.id}')">
        <div class="drag-handle" onclick="event.stopPropagation()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="6" r="1.5" fill="currentColor"/><circle cx="16" cy="6" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="12" r="1.5" fill="currentColor"/><circle cx="16" cy="12" r="1.5" fill="currentColor"/>
            <circle cx="8" cy="18" r="1.5" fill="currentColor"/><circle cx="16" cy="18" r="1.5" fill="currentColor"/>
          </svg>
        </div>
        <div class="project-color-bar" style="background:${p.color || '#6366f1'}"></div>
        <div class="project-info">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div class="project-name">${highlighted}</div>
            ${p.department ? `<span class="dept-badge">${p.department}</span>` : ''}
            ${tagChips ? `<div class="project-tags-list">${tagChips}</div>` : ''}
          </div>
          <div class="project-desc">${p.desc || '<span style="color:var(--text-muted)">Không có mô tả</span>'}</div>
        </div>
        <div class="project-meta" onclick="event.stopPropagation()">
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
          <svg class="project-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          <div class="project-actions">
            <button class="btn-icon" data-action="edit" data-id="${p.id}" title="Chỉnh sửa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" data-action="delete" data-id="${p.id}" title="Xóa">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      </div>
      <div class="project-item-body" id="project-body-${p.id}" onclick="event.stopPropagation()">
        <!-- Tasks details rendered here -->
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
    document.getElementById('projectDepartment').value = '';
    document.getElementById('projectStatus').value = 'todo';
    document.getElementById('projectPriority').value = 'urgent-important';
    document.getElementById('projectStart').value = '';
    document.getElementById('projectEnd').value = '';
    selectedColor = '#6366f1';
    updateColorPicker('projectColorPicker', selectedColor);
    document.getElementById('projectColor').value = selectedColor;
    buildMemberCheckboxes([]);
    buildTagCheckboxes('projectTagCheckboxes', 'proj-tags', []);
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
    document.getElementById('projectDepartment').value = p.department || '';
    document.getElementById('projectStatus').value = p.status || 'todo';
    document.getElementById('projectPriority').value = p.priority || 'low';
    document.getElementById('projectStart').value = p.startDate || '';
    document.getElementById('projectEnd').value = p.endDate || '';
    selectedColor = p.color || '#6366f1';
    updateColorPicker('projectColorPicker', selectedColor);
    document.getElementById('projectColor').value = selectedColor;
    buildMemberCheckboxes(p.memberIds || []);
    buildTagCheckboxes('projectTagCheckboxes', 'proj-tags', p.tagIds || []);
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

  function buildTagCheckboxes(containerId, nameAttr, selectedIds = []) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const tags = DB.getTags();
    if (!tags.length) {
      container.innerHTML = `<div class="empty-state-mini">Chưa có thẻ. Tạo thẻ trong mục Quản lý thẻ.</div>`;
      return;
    }
    container.innerHTML = tags.map(tag => `
      <label class="tag-checkbox-item">
        <input type="checkbox" name="${nameAttr}" value="${tag.id}" ${selectedIds.includes(tag.id) ? 'checked' : ''} />
        <span class="tag-chip" style="background:${tag.color}15;color:${tag.color};border-color:${tag.color}30">${tag.name}</span>
      </label>
    `).join('');
  }

  function saveProject() {
    const name = document.getElementById('projectName').value.trim();
    if (!name) { showToast('Vui lòng nhập tên dự án!', 'error'); return; }

    const memberIds = [...document.querySelectorAll('#projectMemberCheckboxes input:checked')].map(i => i.value);
    const tagIds = [...document.querySelectorAll('#projectTagCheckboxes input:checked')].map(i => i.value);

    const data = {
      name,
      desc: document.getElementById('projectDesc').value.trim(),
      department: document.getElementById('projectDepartment').value.trim(),
      status: document.getElementById('projectStatus').value,
      priority: document.getElementById('projectPriority').value,
      startDate: document.getElementById('projectStart').value,
      endDate: document.getElementById('projectEnd').value,
      color: document.getElementById('projectColor').value,
      memberIds,
      tagIds,
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

    updateDeptFilters();
  }

  function updateDeptFilters() {
    const projects = DB.getProjects();
    const depts = [...new Set(projects.map(p => p.department).filter(Boolean))];

    // Update Project filter
    const projDeptSel = document.getElementById('projectFilterDepartment');
    if (projDeptSel) {
      const val = projDeptSel.value;
      projDeptSel.innerHTML = '<option value="">Tất cả phòng ban</option>';
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        projDeptSel.appendChild(opt);
      });
      if (depts.includes(val)) projDeptSel.value = val;
    }

    // Update Tasks filter
    const taskDeptSel = document.getElementById('taskFilterDepartment');
    if (taskDeptSel) {
      const val = taskDeptSel.value;
      taskDeptSel.innerHTML = '<option value="">Tất cả phòng ban</option>';
      depts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        taskDeptSel.appendChild(opt);
      });
      if (depts.includes(val)) taskDeptSel.value = val;
    }

    // Update Members filter
    const memDeptSel = document.getElementById('memberFilterDepartment');
    if (memDeptSel) {
      const val = memDeptSel.value;
      memDeptSel.innerHTML = '<option value="">Tất cả phòng ban</option>';
      const memDepts = [...new Set(DB.getMembers().map(m => m.department).filter(Boolean))];
      memDepts.forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = d;
        memDeptSel.appendChild(opt);
      });
      if (memDepts.includes(val)) memDeptSel.value = val;
    }
  }

  // Expanded project tasks rendering
  function toggleExpand(id) {
    const idx = expandedProjectIds.indexOf(id);
    if (idx === -1) {
      expandedProjectIds.push(id);
      document.getElementById(`project-item-${id}`)?.classList.add('expanded');
      renderProjectBody(id);
    } else {
      expandedProjectIds.splice(idx, 1);
      document.getElementById(`project-item-${id}`)?.classList.remove('expanded');
    }
  }

  function renderProjectBody(projectId) {
    const bodyEl = document.getElementById(`project-body-${projectId}`);
    if (!bodyEl) return;

    const project = getProjectById(projectId);
    const tasks = DB.getTasks().filter(t => t.projectId === projectId);

    const viewOpts = DB.getSetting('projectColumns', {
      assignee: true,
      status: true,
      priority: true,
      tags: true,
      dueDate: true,
      estimate: true
    });

    if (!tasks.length) {
      bodyEl.innerHTML = `
        <div class="empty-state-mini" style="margin-top:10px">Không có công việc nào thuộc dự án này</div>
        <button class="proj-add-task-btn" onclick="Projects.quickAddTask('${projectId}')">+ Thêm công việc mới</button>
      `;
      return;
    }

    const colSelectHtml = `
      <div class="column-selector-panel">
        <span style="font-weight:600;font-size:12px;color:var(--text-secondary)">Tùy chọn cột:</span>
        <label><input type="checkbox" data-col="assignee" ${viewOpts.assignee ? 'checked' : ''} /> Người thực hiện</label>
        <label><input type="checkbox" data-col="status" ${viewOpts.status ? 'checked' : ''} /> Trạng thái</label>
        <label><input type="checkbox" data-col="priority" ${viewOpts.priority ? 'checked' : ''} /> Độ ưu tiên</label>
        <label><input type="checkbox" data-col="tags" ${viewOpts.tags ? 'checked' : ''} /> Thẻ</label>
        <label><input type="checkbox" data-col="dueDate" ${viewOpts.dueDate ? 'checked' : ''} /> Hạn chót</label>
        <label><input type="checkbox" data-col="estimate" ${viewOpts.estimate ? 'checked' : ''} /> Ước tính</label>
      </div>
    `;

    const tableHeaders = `
      <th>Tên công việc</th>
      ${viewOpts.assignee ? '<th>Người thực hiện</th>' : ''}
      ${viewOpts.status ? '<th>Trạng thái</th>' : ''}
      ${viewOpts.priority ? '<th>Độ ưu tiên</th>' : ''}
      ${viewOpts.tags ? '<th>Thẻ</th>' : ''}
      ${viewOpts.dueDate ? '<th>Hạn chót</th>' : ''}
      ${viewOpts.estimate ? '<th>Ước tính</th>' : ''}
      <th>Thao tác</th>
    `;

    const tableRows = tasks.map(t => {
      const assignee = t.assigneeId ? getMemberById(t.assigneeId) : null;
      const taskTags = (t.tagIds || []).map(tid => DB.getTags().find(tag => tag.id === tid)).filter(Boolean);
      const tagChipsHtml = taskTags.map(tag => `<span class="tag-chip" style="background:${tag.color}15;color:${tag.color};border-color:${tag.color}30">${tag.name}</span>`).join('');
      const overdue = t.dueDate && isOverdue(t.dueDate) && t.status !== 'done';

      return `
        <tr>
          <td style="font-weight:500;">
            <span class="task-checkbox ${t.status === 'done' ? 'done' : ''}" style="display:inline-block;vertical-align:middle;margin-right:8px;cursor:pointer" onclick="Projects.toggleTaskDone('${t.id}', '${projectId}')"></span>
            <span class="${t.status === 'done' ? 'done' : ''}" style="vertical-align:middle;">${t.name}</span>
          </td>
          ${viewOpts.assignee ? `<td>${assignee ? memberAvatar(assignee) + ` <span style="font-size:12px;margin-left:5px">${assignee.name}</span>` : '<span class="text-muted">Chưa phân công</span>'}</td>` : ''}
          ${viewOpts.status ? `<td>${statusBadge(t.status || 'todo')}</td>` : ''}
          ${viewOpts.priority ? `<td>${priorityBadge(t.priority || 'low')}</td>` : ''}
          ${viewOpts.tags ? `<td>${tagChipsHtml || '<span class="text-muted">–</span>'}</td>` : ''}
          ${viewOpts.dueDate ? `<td class="${overdue ? 'overdue' : ''}">${t.dueDate ? fmtDate(t.dueDate) : '<span class="text-muted">–</span>'}</td>` : ''}
          ${viewOpts.estimate ? `<td>${t.estimate ? t.estimate + 'h' : '<span class="text-muted">–</span>'}</td>` : ''}
          <td>
            <div style="display:flex;gap:5px;">
              <button class="btn-icon" onclick="Projects.editTask('${t.id}')" title="Sửa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" onclick="Projects.deleteTask('${t.id}')" title="Xóa">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    bodyEl.innerHTML = `
      ${colSelectHtml}
      <div class="project-task-table-container">
        <table class="project-task-table">
          <thead>
            <tr>${tableHeaders}</tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
      <button class="proj-add-task-btn" onclick="Projects.quickAddTask('${projectId}')">+ Thêm công việc mới</button>
    `;

    // Attach listener to checkboxes
    bodyEl.querySelectorAll('.column-selector-panel input[type="checkbox"]').forEach(chk => {
      chk.addEventListener('change', () => {
        const col = chk.dataset.col;
        viewOpts[col] = chk.checked;
        DB.setSetting('projectColumns', viewOpts);
        renderProjectBody(projectId);
      });
    });
  }

  function quickAddTask(projectId) {
    if (typeof Tasks !== 'undefined') {
      Tasks.openAdd({ projectId });
    }
  }

  function editTask(taskId) {
    if (typeof Tasks !== 'undefined') {
      Tasks.openEditById(taskId);
    }
  }

  function deleteTask(taskId) {
    if (typeof Tasks !== 'undefined') {
      Tasks.deleteTaskById(taskId);
    }
  }

  function toggleTaskDone(taskId, projectId) {
    const t = DB.getTasks().find(t => t.id === taskId);
    if (!t) return;
    const newStatus = t.status === 'done' ? 'todo' : 'done';
    DB.updateTask(taskId, { status: newStatus });
    renderProjectBody(projectId);
    if (typeof Tasks !== 'undefined') Tasks.render();
    if (typeof Dashboard !== 'undefined') Dashboard.render();
    if (typeof Matrix !== 'undefined') Matrix.render();
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

    const projDeptSel = document.getElementById('projectFilterDepartment');
    if (projDeptSel) {
      projDeptSel.addEventListener('change', render);
    }

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

  return {
    init,
    render,
    openAdd,
    openEdit,
    updateFilterDropdowns,
    toggleExpand,
    renderProjectBody,
    quickAddTask,
    editTask,
    deleteTask,
    toggleTaskDone
  };
})();
