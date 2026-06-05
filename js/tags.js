/* ===================================================
   TAGS MANAGEMENT MODULE
   =================================================== */

const TagsMng = (() => {
  let editingId = null;
  let selectedColor = '#6366f1';

  function render() {
    const container = document.getElementById('tagListContainer');
    if (!container) return;

    const tags = DB.getTags();
    if (!tags.length) {
      container.innerHTML = `
        <div class="empty-state-mini">
          Chưa có thẻ nào được tạo. Tạo thẻ ở khung bên trái.
        </div>`;
      return;
    }

    container.innerHTML = tags.map(tag => {
      const projCount = DB.getProjects().filter(p => (p.tagIds || []).includes(tag.id)).length;
      const taskCount = DB.getTasks().filter(t => (t.tagIds || []).includes(tag.id)).length;

      return `
        <div class="tag-item-card" style="border-left: 4px solid ${tag.color}">
          <div class="tag-item-info">
            <span class="tag-chip" style="background: ${tag.color}15; color: ${tag.color}; border-color: ${tag.color}30">${tag.name}</span>
            <span class="tag-item-usage">${projCount} dự án, ${taskCount} công việc</span>
          </div>
          <div class="tag-item-actions">
            <button class="btn-icon" onclick="TagsMng.openEdit('${tag.id}')" title="Sửa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="TagsMng.confirmDelete('${tag.id}')" title="Xóa">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>`;
    }).join('');
  }

  function openEdit(id) {
    const tags = DB.getTags();
    const tag = tags.find(t => t.id === id);
    if (!tag) return;

    editingId = id;
    document.getElementById('tagFormTitle').textContent = 'Chỉnh sửa thẻ';
    document.getElementById('tagName').value = tag.name;
    selectedColor = tag.color || '#6366f1';
    updateColorPicker(selectedColor);
    document.getElementById('tagColor').value = selectedColor;
    document.getElementById('cancelTagBtn').style.display = 'inline-block';
  }

  function resetForm() {
    editingId = null;
    document.getElementById('tagFormTitle').textContent = 'Tạo thẻ mới';
    document.getElementById('tagName').value = '';
    selectedColor = '#6366f1';
    updateColorPicker(selectedColor);
    document.getElementById('tagColor').value = selectedColor;
    document.getElementById('cancelTagBtn').style.display = 'none';
  }

  function saveTag() {
    const name = document.getElementById('tagName').value.trim();
    if (!name) {
      showToast('Vui lòng nhập tên thẻ!', 'error');
      return;
    }

    const color = document.getElementById('tagColor').value;

    if (editingId) {
      DB.updateTag(editingId, { name, color });
      showToast('Đã cập nhật thẻ thành công', 'success');
    } else {
      DB.addTag({ id: uid(), name, color });
      showToast('Đã thêm thẻ mới', 'success');
    }

    resetForm();
    render();
    if (typeof Projects !== 'undefined') Projects.render();
    if (typeof Tasks !== 'undefined') Tasks.render();
  }

  function confirmDelete(id) {
    const tags = DB.getTags();
    const tag = tags.find(t => t.id === id);
    if (!tag) return;

    document.getElementById('confirmMessage').textContent = `Xóa thẻ "${tag.name}"? Các dự án và công việc sẽ mất liên kết với thẻ này.`;
    document.getElementById('confirmDeleteBtn').onclick = () => {
      DB.deleteTag(id);
      closeModal('confirmModal');
      resetForm();
      render();
      if (typeof Projects !== 'undefined') Projects.render();
      if (typeof Tasks !== 'undefined') Tasks.render();
      showToast('Đã xóa thẻ', 'success');
    };
    openModal('confirmModal');
  }

  function updateColorPicker(color) {
    document.querySelectorAll('#tagColorPicker .color-swatch').forEach(s => {
      s.classList.toggle('selected', s.dataset.color === color);
    });
  }

  function init() {
    const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#06b6d4', '#14b8a6', '#f43f5e'];
    const picker = document.getElementById('tagColorPicker');
    if (picker) {
      picker.innerHTML = colors.map((c, i) => `
        <div class="color-swatch ${i === 0 ? 'selected' : ''}" data-color="${c}" style="background:${c}"></div>
      `).join('');

      picker.addEventListener('click', e => {
        const swatch = e.target.closest('.color-swatch');
        if (!swatch) return;
        selectedColor = swatch.dataset.color;
        document.getElementById('tagColor').value = selectedColor;
        updateColorPicker(selectedColor);
      });
    }

    const saveBtn = document.getElementById('saveTagBtn');
    if (saveBtn) saveBtn.addEventListener('click', saveTag);

    const cancelBtn = document.getElementById('cancelTagBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);
  }

  return { init, render, openEdit, confirmDelete };
})();
