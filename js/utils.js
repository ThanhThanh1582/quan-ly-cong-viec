/* ===================================================
   UTILS – shared helpers
   =================================================== */

// Unique ID
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Format date to dd/MM/yyyy
function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// Format date short: "15 thg 6"
function fmtDateShort(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'short' });
}

// Is overdue?
function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date(new Date().toDateString());
}

// Is due within N days?
function isDueSoon(dateStr, days = 3) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  const diff = (d - now) / 86400000;
  return diff >= 0 && diff <= days;
}

// Get initials from name
function initials(name = '') {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

// Status label map
const STATUS_LABELS = {
  todo:       'Chờ thực hiện',
  inprogress: 'Đang thực hiện',
  review:     'Đang xem xét',
  done:       'Hoàn thành',
};

// Priority label map
const PRIORITY_LABELS = {
  'urgent-important': '🔥 Quan trọng & Khẩn cấp',
  'important':        '📅 Quan trọng & Không khẩn',
  'urgent':           '🤝 Không quan trọng & Khẩn cấp',
  'low':              '🗑️ Không quan trọng & Không khẩn',
};

// Build status badge HTML
function statusBadge(status) {
  return `<span class="status-badge status-${status}">${STATUS_LABELS[status] || status}</span>`;
}

// Build priority badge HTML
function priorityBadge(priority) {
  return `<span class="priority-badge priority-${priority}">${PRIORITY_LABELS[priority] || priority}</span>`;
}

// Build member avatar HTML
function memberAvatar(member, size = '') {
  if (!member) return '';
  const cls = size === 'lg' ? 'member-avatar-lg' : '';
  return `<div class="member-avatar ${cls}" style="background:${member.color}" title="${member.name}">${initials(member.name)}</div>`;
}

// Show toast notification
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${msg}</span>`;
  container.appendChild(t);
  setTimeout(() => {
    t.classList.add('fadeout');
    t.addEventListener('animationend', () => t.remove());
  }, 3000);
}

// Open / close modal
function openModal(id) {
  document.getElementById(id).classList.add('active');
}
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('active');
  });
});

// Get member by id
function getMemberById(id) {
  return DB.getMembers().find(m => m.id === id) || null;
}

// Get project by id
function getProjectById(id) {
  return DB.getProjects().find(p => p.id === id) || null;
}

// Compute project completion %
function projectCompletion(projectId) {
  const tasks = DB.getTasks().filter(t => t.projectId === projectId);
  if (!tasks.length) return 0;
  const done = tasks.filter(t => t.status === 'done').length;
  return Math.round((done / tasks.length) * 100);
}

// ---- Drag & Drop helpers ----
let _dragSrc = null;
let _dragType = null;

function makeDraggable(el, type, getData, onDrop) {
  el.setAttribute('draggable', 'true');

  el.addEventListener('dragstart', e => {
    _dragSrc = el;
    _dragType = type;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', getData());
    setTimeout(() => el.classList.add('dragging'), 0);
  });

  el.addEventListener('dragend', () => {
    el.classList.remove('dragging');
    document.querySelectorAll('.drag-over, .drag-over-col').forEach(el => {
      el.classList.remove('drag-over', 'drag-over-col');
    });
    _dragSrc = null;
    _dragType = null;
  });
}

function makeDropTarget(el, type, onDrop) {
  el.addEventListener('dragover', e => {
    if (_dragType !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over');
  });

  el.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) {
      el.classList.remove('drag-over');
    }
  });

  el.addEventListener('drop', e => {
    if (_dragType !== type) return;
    e.preventDefault();
    el.classList.remove('drag-over');
    const data = e.dataTransfer.getData('text/plain');
    onDrop(data, el);
  });
}

function makeColDropTarget(el, type, onDrop) {
  el.addEventListener('dragover', e => {
    if (_dragType !== type) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    el.classList.add('drag-over-col');
  });
  el.addEventListener('dragleave', e => {
    if (!el.contains(e.relatedTarget)) el.classList.remove('drag-over-col');
  });
  el.addEventListener('drop', e => {
    if (_dragType !== type) return;
    e.preventDefault();
    el.classList.remove('drag-over-col');
    const data = e.dataTransfer.getData('text/plain');
    onDrop(data, el);
  });
}

// Highlight search term in text
function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(escaped, 'gi'), m => `<mark class="highlight">${m}</mark>`);
}

// Debounce
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
