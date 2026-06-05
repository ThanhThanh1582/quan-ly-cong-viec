/* ===================================================
   APP – Main orchestrator
   =================================================== */

const App = (() => {

  const VIEWS = {
    dashboard: { title: 'Tổng quan',   render: () => Dashboard.render() },
    projects:  { title: 'Dự án',       render: () => Projects.render()  },
    tasks:     { title: 'Công việc',   render: () => Tasks.render()     },
    matrix:    { title: 'Ma trận Eisenhower', render: () => Matrix.render()   },
    calendar:  { title: 'Lịch',        render: () => Calendar.render()  },
    members:   { title: 'Thành viên',  render: () => Members.render()   },
  };

  let currentView = 'dashboard';

  // ---- Navigation ----
  function switchView(viewId) {
    if (!VIEWS[viewId]) return;
    currentView = viewId;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Update page title
    document.getElementById('pageTitle').textContent = VIEWS[viewId].title;

    // Show/hide views
    document.querySelectorAll('.view').forEach(v => {
      v.classList.toggle('active', v.id === `view-${viewId}`);
    });

    // Render view
    VIEWS[viewId].render();

    // On mobile – close sidebar
    if (window.innerWidth <= 900) {
      document.getElementById('sidebar').classList.remove('mobile-open');
      document.getElementById('sidebarOverlay').classList.remove('active');
    }
  }

  // ---- Theme ----
  function initTheme() {
    const theme = DB.getSetting('theme', 'dark');
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const label = document.querySelector('.theme-label');
    if (label) label.textContent = theme === 'dark' ? 'Giao diện sáng' : 'Giao diện tối';
    DB.setSetting('theme', theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  }

  // ---- Sidebar ----
  function initSidebar() {
    const sidebar  = document.getElementById('sidebar');
    const overlay  = document.getElementById('sidebarOverlay');
    const toggleBtn = document.getElementById('sidebarToggle');
    const mobileBtn = document.getElementById('mobileMenuBtn');

    // Desktop collapse
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      DB.setSetting('sidebarCollapsed', sidebar.classList.contains('collapsed'));
    });

    // Restore collapse state
    if (DB.getSetting('sidebarCollapsed', false)) {
      sidebar.classList.add('collapsed');
    }

    // Mobile open/close
    mobileBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      overlay.classList.toggle('active', sidebar.classList.contains('mobile-open'));
    });

    overlay.addEventListener('click', () => {
      sidebar.classList.remove('mobile-open');
      overlay.classList.remove('active');
    });
  }

  // ---- Quick Add button ----
  function initQuickAdd() {
    document.getElementById('quickAddBtn').addEventListener('click', () => {
      if (currentView === 'projects') Projects.openAdd();
      else if (currentView === 'members') Members.openAdd();
      else Tasks.openAdd();
    });
  }

  // ---- Global Search ----
  function initSearch() {
    const input = document.getElementById('globalSearch');
    input.addEventListener('input', debounce(() => {
      VIEWS[currentView]?.render();
    }, 300));

    // Keyboard shortcut: Ctrl+K or /
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName))) {
        e.preventDefault();
        input.focus();
        input.select();
      }
      if (e.key === 'Escape') {
        input.blur();
        closeAllModals();
      }
    });
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }

  // ---- Init all modules ----
  function init() {
    initTheme();
    initSidebar();
    initQuickAdd();
    initSearch();

    // Nav items
    document.querySelectorAll('.nav-item[data-view]').forEach(item => {
      item.addEventListener('click', e => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    // Init modules
    Dashboard.init();
    Projects.init();
    Tasks.init();
    Matrix.init();
    Calendar.init();
    Members.init();

    // Load seed data if first time
    if (!DB.getProjects().length && !DB.getTasks().length) {
      loadSeedData();
    }

    // Initial render
    switchView('dashboard');
  }

  // ---- Seed data ----
  function loadSeedData() {
    // Sample member
    const m1 = DB.addMember({ id: uid(), name: 'Nguyễn Văn An', role: 'Trưởng nhóm', email: 'an@company.vn', color: '#6366f1', createdAt: Date.now() });
    const m2 = DB.addMember({ id: uid(), name: 'Trần Thị Bích', role: 'Designer',    email: 'bich@company.vn', color: '#ec4899', createdAt: Date.now() });
    const m3 = DB.addMember({ id: uid(), name: 'Lê Minh Cường', role: 'Developer',   email: 'cuong@company.vn', color: '#10b981', createdAt: Date.now() });

    // Sample projects
    const today = new Date();
    const fmtISO = (d) => d.toISOString().slice(0, 10);
    const inDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmtISO(d); };

    const p1 = DB.addProject({ id: uid(), name: 'Ra mắt sản phẩm mới', desc: 'Dự án ra mắt phiên bản 2.0', status: 'inprogress', priority: 'urgent-important', color: '#6366f1', startDate: fmtISO(today), endDate: inDays(14), memberIds: [m1.id, m2.id, m3.id], createdAt: Date.now() });
    const p2 = DB.addProject({ id: uid(), name: 'Cải thiện UX/UI',      desc: 'Nâng cấp giao diện người dùng', status: 'todo', priority: 'important', color: '#ec4899', startDate: inDays(7), endDate: inDays(30), memberIds: [m2.id], createdAt: Date.now() });
    const p3 = DB.addProject({ id: uid(), name: 'Tối ưu hiệu suất',     desc: 'Cải thiện tốc độ tải trang', status: 'todo', priority: 'important', color: '#10b981', startDate: inDays(14), endDate: inDays(45), memberIds: [m3.id], createdAt: Date.now() });
    const p4 = DB.addProject({ id: uid(), name: 'Họp đối tác Q3',       desc: 'Chuẩn bị tài liệu họp', status: 'todo', priority: 'urgent', color: '#f59e0b', startDate: fmtISO(today), endDate: inDays(3), memberIds: [m1.id], createdAt: Date.now() });

    // Sample tasks
    DB.addTask({ id: uid(), name: 'Thiết kế mockup landing page', projectId: p1.id, assigneeId: m2.id, status: 'done',       priority: 'urgent-important', dueDate: inDays(-2), estimate: 8,  createdAt: Date.now() - 86400000*3 });
    DB.addTask({ id: uid(), name: 'Viết copy nội dung trang chủ', projectId: p1.id, assigneeId: m1.id, status: 'inprogress', priority: 'urgent-important', dueDate: inDays(1),  estimate: 4,  createdAt: Date.now() - 86400000*2 });
    DB.addTask({ id: uid(), name: 'Tích hợp API thanh toán',      projectId: p1.id, assigneeId: m3.id, status: 'todo',       priority: 'urgent-important', dueDate: inDays(3),  estimate: 12, createdAt: Date.now() - 86400000*1 });
    DB.addTask({ id: uid(), name: 'Kiểm tra đa trình duyệt',      projectId: p1.id, assigneeId: m3.id, status: 'todo',       priority: 'important',       dueDate: inDays(5),  estimate: 6,  createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Nghiên cứu người dùng',        projectId: p2.id, assigneeId: m2.id, status: 'inprogress', priority: 'important',       dueDate: inDays(7),  estimate: 16, createdAt: Date.now() - 86400000*1 });
    DB.addTask({ id: uid(), name: 'Phân tích hiệu suất hiện tại', projectId: p3.id, assigneeId: m3.id, status: 'todo',       priority: 'important',       dueDate: inDays(10), estimate: 5,  createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Chuẩn bị slide họp',           projectId: p4.id, assigneeId: m1.id, status: 'inprogress', priority: 'urgent',          dueDate: inDays(2),  estimate: 3,  createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Gửi email xác nhận lịch họp',  projectId: p4.id, assigneeId: m1.id, status: 'done',       priority: 'urgent',          dueDate: inDays(-1), estimate: 0.5,createdAt: Date.now() - 86400000*2 });
  }

  return { init, switchView };
})();

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => App.init());
