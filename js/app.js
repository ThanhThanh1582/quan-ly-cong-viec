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
    tags:      { title: 'Quản lý thẻ', render: () => TagsMng.render()   },
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
    if (!DB.getSetting('themeMigratedToLightDefault', false)) {
      DB.setSetting('theme', 'light');
      DB.setSetting('themeMigratedToLightDefault', true);
    }
    const theme = DB.getSetting('theme', 'light');
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

  // ---- Music Background Player ----
  function initMusic() {
    const audio = document.getElementById('bgAudio');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const trackSelect = document.getElementById('musicTrackSelect');
    const volumeSlider = document.getElementById('musicVolume');

    if (!audio || !playPauseBtn || !trackSelect || !volumeSlider) return;

    audio.src = trackSelect.value;
    audio.volume = parseFloat(volumeSlider.value);

    playPauseBtn.addEventListener('click', () => {
      if (audio.paused) {
        audio.play().then(() => {
          updatePlayPauseState(true);
        }).catch(err => {
          showToast('Click để tương tác với trang trước khi phát nhạc.', 'warning');
          console.error(err);
        });
      } else {
        audio.pause();
        updatePlayPauseState(false);
      }
    });

    trackSelect.addEventListener('change', () => {
      const wasPlaying = !audio.paused;
      audio.src = trackSelect.value;
      if (wasPlaying) {
        audio.play().then(() => {
          updatePlayPauseState(true);
        });
      }
    });

    volumeSlider.addEventListener('input', () => {
      audio.volume = parseFloat(volumeSlider.value);
    });

    function updatePlayPauseState(isPlaying) {
      const playIcon = playPauseBtn.querySelector('.icon-play');
      const pauseIcon = playPauseBtn.querySelector('.icon-pause');
      if (isPlaying) {
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
        playPauseBtn.classList.add('pulse');
      } else {
        playIcon.style.display = 'block';
        pauseIcon.style.display = 'none';
        playPauseBtn.classList.remove('pulse');
      }
    }
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
    initMusic();
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
    TagsMng.init();

    // Load seed data if first time
    if (!DB.getProjects().length && !DB.getTasks().length) {
      loadSeedData();
    }

    // Initial render
    switchView('dashboard');
  }

  // ---- Seed data ----
  function loadSeedData() {
    // Sample tags
    const tag1 = DB.addTag({ id: uid(), name: 'Quan trọng', color: '#ef4444' });
    const tag2 = DB.addTag({ id: uid(), name: 'Họp hành',   color: '#f59e0b' });
    const tag3 = DB.addTag({ id: uid(), name: 'Thiết kế',   color: '#ec4899' });
    const tag4 = DB.addTag({ id: uid(), name: 'Lập trình',  color: '#3b82f6' });

    // Sample members
    const m1 = DB.addMember({ id: uid(), name: 'Nguyễn Văn An', role: 'Trưởng nhóm', department: 'Ban Giám Đốc', email: 'an@company.vn', color: '#6366f1', createdAt: Date.now() });
    const m2 = DB.addMember({ id: uid(), name: 'Trần Thị Bích', role: 'Designer',    department: 'Thiết kế',     email: 'bich@company.vn', color: '#ec4899', createdAt: Date.now() });
    const m3 = DB.addMember({ id: uid(), name: 'Lê Minh Cường', role: 'Developer',   department: 'Kỹ thuật',     email: 'cuong@company.vn', color: '#10b981', createdAt: Date.now() });

    // Sample projects
    const today = new Date();
    const fmtISO = (d) => d.toISOString().slice(0, 10);
    const inDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return fmtISO(d); };

    const p1 = DB.addProject({ id: uid(), name: 'Ra mắt sản phẩm mới', desc: 'Dự án ra mắt phiên bản 2.0', department: 'Kỹ thuật', status: 'inprogress', priority: 'urgent-important', color: '#6366f1', startDate: fmtISO(today), endDate: inDays(14), memberIds: [m1.id, m2.id, m3.id], tagIds: [tag1.id], createdAt: Date.now() });
    const p2 = DB.addProject({ id: uid(), name: 'Cải thiện UX/UI',      desc: 'Nâng cấp giao diện người dùng', department: 'Thiết kế', status: 'todo', priority: 'important', color: '#ec4899', startDate: inDays(7), endDate: inDays(30), memberIds: [m2.id], tagIds: [tag3.id], createdAt: Date.now() });
    const p3 = DB.addProject({ id: uid(), name: 'Tối ưu hiệu suất',     desc: 'Cải thiện tốc độ tải trang', department: 'Kỹ thuật', status: 'todo', priority: 'important', color: '#10b981', startDate: inDays(14), endDate: inDays(45), memberIds: [m3.id], tagIds: [tag4.id], createdAt: Date.now() });
    const p4 = DB.addProject({ id: uid(), name: 'Họp đối tác Q3',       desc: 'Chuẩn bị tài liệu họp', department: 'Ban Giám Đốc', status: 'todo', priority: 'urgent', color: '#f59e0b', startDate: fmtISO(today), endDate: inDays(3), memberIds: [m1.id], tagIds: [tag2.id], createdAt: Date.now() });

    // Sample tasks
    DB.addTask({ id: uid(), name: 'Thiết kế mockup landing page', projectId: p1.id, assigneeId: m2.id, status: 'done',       priority: 'urgent-important', dueDate: inDays(-2), estimate: 8,   tagIds: [tag3.id], createdAt: Date.now() - 86400000*3 });
    DB.addTask({ id: uid(), name: 'Viết copy nội dung trang chủ', projectId: p1.id, assigneeId: m1.id, status: 'inprogress', priority: 'urgent-important', dueDate: inDays(1),  estimate: 4,   tagIds: [tag1.id], createdAt: Date.now() - 86400000*2 });
    DB.addTask({ id: uid(), name: 'Tích hợp API thanh toán',      projectId: p1.id, assigneeId: m3.id, status: 'todo',       priority: 'urgent-important', dueDate: inDays(3),  estimate: 12,  tagIds: [tag4.id], createdAt: Date.now() - 86400000*1 });
    DB.addTask({ id: uid(), name: 'Kiểm tra đa trình duyệt',      projectId: p1.id, assigneeId: m3.id, status: 'todo',       priority: 'important',       dueDate: inDays(5),  estimate: 6,   tagIds: [],        createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Nghiên cứu người dùng',        projectId: p2.id, assigneeId: m2.id, status: 'inprogress', priority: 'important',       dueDate: inDays(7),  estimate: 16,  tagIds: [tag3.id], createdAt: Date.now() - 86400000*1 });
    DB.addTask({ id: uid(), name: 'Phân tích hiệu suất hiện tại', projectId: p3.id, assigneeId: m3.id, status: 'todo',       priority: 'important',       dueDate: inDays(10), estimate: 5,   tagIds: [tag4.id], createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Chuẩn bị slide họp',           projectId: p4.id, assigneeId: m1.id, status: 'inprogress', priority: 'urgent',          dueDate: inDays(2),  estimate: 3,   tagIds: [tag2.id], createdAt: Date.now() });
    DB.addTask({ id: uid(), name: 'Gửi email xác nhận lịch họp',  projectId: p4.id, assigneeId: m1.id, status: 'done',       priority: 'urgent',          dueDate: inDays(-1), estimate: 0.5, tagIds: [tag2.id], createdAt: Date.now() - 86400000*2 });
  }

  return { init, switchView };
})();

// ---- Bootstrap ----
document.addEventListener('DOMContentLoaded', () => App.init());
