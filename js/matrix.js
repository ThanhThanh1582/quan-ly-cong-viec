/* ===================================================
   MATRIX MODULE – Eisenhower
   =================================================== */

const Matrix = (() => {

  function render() {
    const type = document.getElementById('matrixFilterType')?.value || 'projects';
    const quadrants = ['urgent-important', 'important', 'urgent', 'low'];
    const ids       = ['q1', 'q2', 'q3', 'q4'];

    const items = type === 'projects' ? DB.getProjects() : DB.getTasks();

    quadrants.forEach((q, i) => {
      const filtered = items.filter(it => (it.priority || 'low') === q);
      const countEl  = document.getElementById(`${ids[i]}-count`);
      const itemsEl  = document.getElementById(`${ids[i]}-items`);
      countEl.textContent = filtered.length;

      if (!filtered.length) {
        itemsEl.innerHTML = `<div class="empty-state-mini">Không có mục nào</div>`;
        return;
      }

      itemsEl.innerHTML = filtered.map(it => buildMatrixItem(it, type)).join('');

      // Click to edit
      itemsEl.querySelectorAll('.matrix-item').forEach(el => {
        el.addEventListener('click', () => {
          if (type === 'projects') { Projects.openEdit(el.dataset.id); }
          else { Tasks.openAdd(); /* open edit */ }
        });
      });
    });

    // Drag & drop between quadrants
    quadrants.forEach((q, i) => {
      const col = document.getElementById(`${ids[i]}-items`);
      col.addEventListener('dragover', e => { e.preventDefault(); col.closest('.matrix-quadrant').classList.add('drag-over'); });
      col.addEventListener('dragleave', e => {
        if (!col.contains(e.relatedTarget)) col.closest('.matrix-quadrant').classList.remove('drag-over');
      });
      col.addEventListener('drop', e => {
        e.preventDefault();
        col.closest('.matrix-quadrant').classList.remove('drag-over');
        const id = e.dataTransfer.getData('text/plain');
        if (!id) return;
        const targetQ = col.closest('.matrix-quadrant').dataset.quadrant;
        if (type === 'projects') { DB.updateProject(id, { priority: targetQ }); Projects.render(); }
        else                     { DB.updateTask(id, { priority: targetQ }); Tasks.render(); }
        render();
        showToast('Đã cập nhật phân loại', 'success');
      });
    });
  }

  function buildMatrixItem(it, type) {
    const project = (type === 'tasks' && it.projectId) ? getProjectById(it.projectId) : null;
    const color   = type === 'projects' ? (it.color || '#6366f1') : (project ? project.color : '#6366f1');
    return `
    <div class="matrix-item" data-id="${it.id}" draggable="true"
         ondragstart="event.dataTransfer.setData('text/plain','${it.id}')">
      <div class="matrix-item-color" style="background:${color}"></div>
      <span class="matrix-item-name">${it.name}</span>
      ${type === 'tasks' ? statusBadge(it.status || 'todo') : ''}
    </div>`;
  }

  function init() {
    document.getElementById('matrixFilterType')?.addEventListener('change', render);
  }

  return { init, render };
})();
