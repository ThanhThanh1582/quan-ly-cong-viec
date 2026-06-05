/* ===================================================
   CALENDAR MODULE
   =================================================== */

const Calendar = (() => {
  let currentYear  = new Date().getFullYear();
  let currentMonth = new Date().getMonth(); // 0-indexed
  let selectedDate = null;

  const MONTH_NAMES = [
    'Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6',
    'Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12'
  ];

  function render() {
    renderGrid();
    if (selectedDate) renderDayDetail(selectedDate);
  }

  function renderGrid() {
    const daysEl = document.getElementById('calendarDays');
    document.getElementById('calMonthYear').textContent =
      `${MONTH_NAMES[currentMonth]} ${currentYear}`;

    const today    = new Date();
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay  = new Date(currentYear, currentMonth + 1, 0);

    // Start from Sunday
    let startDow = firstDay.getDay(); // 0=Sun

    // Tasks indexed by date string
    const tasks = DB.getTasks();
    const tasksByDate = {};
    tasks.forEach(t => {
      if (t.dueDate) {
        if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = [];
        tasksByDate[t.dueDate].push(t);
      }
    });

    const cells = [];

    // Prev month padding
    const prevLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLastDay - i;
      cells.push({ day: d, month: currentMonth - 1, year: currentMonth === 0 ? currentYear - 1 : currentYear, otherMonth: true });
    }

    // Current month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push({ day: d, month: currentMonth, year: currentYear, otherMonth: false });
    }

    // Next month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, month: currentMonth + 1, year: currentMonth === 11 ? currentYear + 1 : currentYear, otherMonth: true });
    }

    daysEl.innerHTML = cells.map(cell => {
      const dateStr = toDateString(cell.year, cell.month, cell.day);
      const isToday = cell.year === today.getFullYear() &&
                      cell.month === today.getMonth() &&
                      cell.day === today.getDate();
      const isSelected = dateStr === selectedDate;
      const cellTasks  = tasksByDate[dateStr] || [];

      // Get up to 3 color dots
      const dots = cellTasks.slice(0, 3).map(t => {
        const proj = t.projectId ? getProjectById(t.projectId) : null;
        const color = proj ? proj.color : '#6366f1';
        return `<div class="cal-dot" style="background:${color}"></div>`;
      }).join('');

      return `
      <div class="cal-day ${cell.otherMonth ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           data-date="${dateStr}" data-day="${cell.day}" data-month="${cell.month}" data-year="${cell.year}">
        <span class="cal-day-num">${cell.day}</span>
        ${dots ? `<div class="cal-day-dots">${dots}</div>` : ''}
      </div>`;
    }).join('');

    // Click handlers
    daysEl.querySelectorAll('.cal-day').forEach(el => {
      el.addEventListener('click', () => {
        // Deselect previous
        daysEl.querySelectorAll('.cal-day.selected').forEach(d => d.classList.remove('selected'));
        el.classList.add('selected');
        selectedDate = el.dataset.date;
        renderDayDetail(selectedDate);
      });
    });
  }

  function renderDayDetail(dateStr) {
    const titleEl = document.getElementById('calDetailTitle');
    const tasksEl = document.getElementById('calDetailTasks');

    const d = new Date(dateStr + 'T00:00:00');
    titleEl.textContent = d.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

    const tasks = DB.getTasks().filter(t => t.dueDate === dateStr);

    if (!tasks.length) {
      tasksEl.innerHTML = `<div class="empty-state-mini">Không có công việc</div>`;
      return;
    }

    tasksEl.innerHTML = tasks.map(t => {
      const proj = t.projectId ? getProjectById(t.projectId) : null;
      const color = proj ? proj.color : '#6366f1';
      return `
      <div class="cal-task-item" data-id="${t.id}">
        <div class="cal-task-color" style="background:${color}"></div>
        <div class="cal-task-info">
          <div class="cal-task-name">${t.name}</div>
          ${proj ? `<div class="cal-task-project">${proj.name}</div>` : ''}
        </div>
        ${statusBadge(t.status || 'todo')}
      </div>`;
    }).join('');

    tasksEl.querySelectorAll('.cal-task-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        App.switchView('tasks');
        setTimeout(() => {
          // Find and open the task for editing
          const t = DB.getTasks().find(t => t.id === id);
          if (t) Tasks.openEditById(id);
        }, 50);
      });
    });
  }

  function toDateString(year, month, day) {
    // month is 0-indexed here
    const m = ((month % 12) + 12) % 12;
    let y = year;
    if (month < 0) y--;
    if (month > 11) y++;
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function init() {
    document.getElementById('calPrev').addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
      renderGrid();
    });

    document.getElementById('calNext').addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
      renderGrid();
    });

    document.getElementById('calToday').addEventListener('click', () => {
      const now = new Date();
      currentYear  = now.getFullYear();
      currentMonth = now.getMonth();
      selectedDate = null;
      renderGrid();
    });
  }

  return { init, render };
})();
