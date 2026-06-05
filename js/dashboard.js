/* ===================================================
   DASHBOARD MODULE
   =================================================== */

const Dashboard = (() => {

  function render() {
    const projects = DB.getProjects();
    const tasks    = DB.getTasks();
    const members  = DB.getMembers();
    const done     = tasks.filter(t => t.status === 'done').length;

    // Stats
    document.getElementById('stat-projects').textContent = projects.length;
    document.getElementById('stat-tasks').textContent    = tasks.length;
    document.getElementById('stat-done').textContent     = done;
    document.getElementById('stat-members').textContent  = members.length;

    renderRecentTasks(tasks);
    renderUpcomingTasks(tasks);
    renderProjectProgress(projects);
  }

  function renderRecentTasks(tasks) {
    const el = document.getElementById('recentTasksList');
    const recent = [...tasks]
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 6);

    if (!recent.length) {
      el.innerHTML = `<div class="empty-state-mini">Chưa có công việc nào</div>`;
      return;
    }

    el.innerHTML = recent.map(t => {
      const overdue = t.dueDate && isOverdue(t.dueDate) && t.status !== 'done';
      return `
      <div class="task-mini-item" data-id="${t.id}">
        <div class="task-mini-check ${t.status === 'done' ? 'done' : ''}"></div>
        <span class="task-mini-name ${t.status === 'done' ? 'done' : ''}">${t.name}</span>
        ${t.dueDate ? `<span class="task-mini-due ${overdue ? 'overdue' : ''}">${fmtDateShort(t.dueDate)}</span>` : ''}
        ${statusBadge(t.status || 'todo')}
      </div>`;
    }).join('');

    el.querySelectorAll('.task-mini-item').forEach(item => {
      item.addEventListener('click', () => {
        App.switchView('tasks');
        Tasks.render();
      });
    });
  }

  function renderUpcomingTasks(tasks) {
    const el = document.getElementById('upcomingTasksList');
    const upcoming = tasks
      .filter(t => t.dueDate && t.status !== 'done' && isDueSoon(t.dueDate, 7))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);

    if (!upcoming.length) {
      el.innerHTML = `<div class="empty-state-mini">Không có công việc sắp đến hạn</div>`;
      return;
    }

    el.innerHTML = upcoming.map(t => {
      const overdue = isOverdue(t.dueDate);
      return `
      <div class="task-mini-item" data-id="${t.id}">
        <div class="task-mini-check"></div>
        <span class="task-mini-name">${t.name}</span>
        <span class="task-mini-due ${overdue ? 'overdue' : ''}">${overdue ? '⚠ ' : ''}${fmtDate(t.dueDate)}</span>
      </div>`;
    }).join('');
  }

  function renderProjectProgress(projects) {
    const el = document.getElementById('projectProgressList');

    if (!projects.length) {
      el.innerHTML = `<div class="empty-state-mini">Chưa có dự án nào</div>`;
      return;
    }

    el.innerHTML = projects.slice(0, 6).map(p => {
      const pct = projectCompletion(p.id);
      return `
      <div class="project-progress-item">
        <div class="proj-prog-header">
          <span class="proj-prog-name" style="color:${p.color || 'var(--text-primary)'}">${p.name}</span>
          <span class="proj-prog-pct">${pct}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width:${pct}%;background:${p.color || '#6366f1'}"></div>
        </div>
      </div>`;
    }).join('');
  }

  function init() {
    // "View all" links
    document.querySelectorAll('.view-all[data-view]').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        App.switchView(link.dataset.view);
      });
    });
  }

  return { init, render };
})();
