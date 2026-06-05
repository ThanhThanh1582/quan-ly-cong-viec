/* ===================================================
   MEMBERS MODULE
   =================================================== */

const Members = (() => {
  let editingId = null;
  let selectedColor = '#6366f1';

  function render() {
    const container = document.getElementById('membersList');
    const members   = DB.getMembers();
    const tasks     = DB.getTasks();

    if (!members.length) {
      container.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">👥</div>
        <h3>Chưa có thành viên nào</h3>
        <p>Thêm thành viên để phân công công việc</p>
      </div>`;
      return;
    }

    container.innerHTML = members.map(m => {
      const memberTasks = tasks.filter(t => t.assigneeId === m.id);
      const doneTasks   = memberTasks.filter(t => t.status === 'done').length;
      const projects    = DB.getProjects().filter(p => (p.memberIds || []).includes(m.id));

      return `
      <div class="member-card">
        <div class="member-actions">
          <button class="btn-icon" data-action="edit" data-id="${m.id}" title="Chỉnh sửa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" data-action="delete" data-id="${m.id}" title="Xóa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        </div>
        <div class="member-avatar-xl" style="background:${m.color || '#6366f1'}">${initials(m.name)}</div>
        <div class="member-name">${m.name}</div>
        ${m.role  ? `<div class="member-role">${m.role}</div>`   : ''}
        ${m.email ? `<div class="member-email">${m.email}</div>` : ''}
        <div class="member-stats">
          <div class="member-stat">
            <span class="member-stat-num" style="color:var(--accent)">${memberTasks.length}</span>
            <span class="member-stat-lbl">Công việc</span>
          </div>
          <div class="member-stat">
            <span class="member-stat-num" style="color:var(--success)">${doneTasks}</span>
            <span class="member-stat-lbl">Hoàn thành</span>
          </div>
          <div class="member-stat">
            <span class="member-stat-num" style="color:var(--warning)">${projects.length}</span>
            <span class="member-stat-lbl">Dự án</span>
          </div>
        </div>
      </div>`;
    }).join('');

    // Actions
    container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        handleAction(btn.dataset.action, btn.dataset.id);
      });
    });
  }

  function handleAction(action, id) {
    if (action === 'edit')   openEdit(id);
    if (action === 'delete') confirmDelete(id);
  }

  // ---- Modal ----
  function openAdd() {
    editingId = null;
    document.getElementById('memberModalTitle').textContent = 'Thêm thành viên';
    document.getElementById('memberId').value  = '';
    document.getElementById('memberName').value  = '';
    document.getElementById('memberEmail').value = '';
    document.getElementById('memberRole').value  = '';
    selectedColor = '#6366f1';
    updateColorPicker('#memberColorPicker', selectedColor);
    document.getElementById('memberColor').value = selectedColor;
    openModal('memberModal');
    setTimeout(() => document.getElementById('memberName').focus(), 100);
  }

  function openEdit(id) {
    const m = DB.getMembers().find(m => m.id === id);
    if (!m) return;
    editingId = id;
    document.getElementById('memberModalTitle').textContent = 'Chỉnh sửa thành viên';
    document.getElementById('memberId').value  = m.id;
    document.getElementById('memberName').value  = m.name;
    document.getElementById('memberEmail').value = m.email || '';
    document.getElementById('memberRole').value  = m.role  || '';
    selectedColor = m.color || '#6366f1';
    updateColorPicker('#memberColorPicker', selectedColor);
    document.getElementById('memberColor').value = selectedColor;
    openModal('memberModal');
  }

  function saveMember() {
    const name = document.getElementById('memberName').value.trim();
    if (!name) { showToast('Vui lòng nhập họ và tên!', 'error'); return; }

    const data = {
      name,
      email: document.getElementById('memberEmail').value.trim(),
      role:  document.getElementById('memberRole').value.trim(),
      color: document.getElementById('memberColor').value,
    };

    if (editingId) {
      DB.updateMember(editingId, data);
      showToast('Đã cập nhật thành viên', 'success');
    } else {
      DB.addMember({ id: uid(), ...data, createdAt: Date.now() });
      showToast('Đã thêm thành viên', 'success');
    }

    closeModal('memberModal');
    render();
    Dashboard.render();
  }

  function confirmDelete(id) {
    const m = DB.getMembers().find(m => m.id === id);
    document.getElementById('confirmMessage').textContent =
      `Xóa thành viên "${m?.name}"? Các công việc được phân công sẽ bị hủy liên kết.`;
    document.getElementById('confirmDeleteBtn').onclick = () => {
      DB.deleteMember(id);
      closeModal('confirmModal');
      render();
      Tasks.render();
      Projects.render();
      Dashboard.render();
      showToast('Đã xóa thành viên', 'success');
    };
    openModal('confirmModal');
  }

  function updateColorPicker(selector, color) {
    document.querySelectorAll(`${selector} .color-swatch`).forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
  }

  function init() {
    document.getElementById('addMemberBtn').addEventListener('click', openAdd);
    document.getElementById('saveMemberBtn').addEventListener('click', saveMember);
    document.getElementById('closeMemberModal').addEventListener('click', () => closeModal('memberModal'));
    document.getElementById('cancelMemberModal').addEventListener('click', () => closeModal('memberModal'));

    // Color picker
    document.getElementById('memberColorPicker').addEventListener('click', e => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      selectedColor = swatch.dataset.color;
      document.getElementById('memberColor').value = selectedColor;
      updateColorPicker('#memberColorPicker', selectedColor);
    });
  }

  return { init, render, openAdd };
})();
