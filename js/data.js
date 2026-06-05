/* ===================================================
   DATA LAYER – localStorage helpers
   =================================================== */

const DB = {
  _keys: {
    projects: 'tf_projects',
    tasks:    'tf_tasks',
    members:  'tf_members',
    settings: 'tf_settings',
    tags:     'tf_tags',
  },

  load(key) {
    try {
      const raw = localStorage.getItem(this._keys[key]);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  save(key, data) {
    try {
      localStorage.setItem(this._keys[key], JSON.stringify(data));
    } catch(e) {
      console.error('Save error', e);
    }
  },

  // ---- Projects ----
  getProjects()      { return this.load('projects') || []; },
  saveProjects(list) { this.save('projects', list); },

  addProject(proj) {
    const list = this.getProjects();
    list.push(proj);
    this.saveProjects(list);
    return proj;
  },

  updateProject(id, changes) {
    const list = this.getProjects();
    const idx = list.findIndex(p => p.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes, updatedAt: Date.now() };
    this.saveProjects(list);
    return list[idx];
  },

  deleteProject(id) {
    let list = this.getProjects();
    list = list.filter(p => p.id !== id);
    this.saveProjects(list);
    // remove tasks of that project
    let tasks = this.getTasks();
    tasks = tasks.map(t => t.projectId === id ? { ...t, projectId: '' } : t);
    this.saveTasks(tasks);
  },

  // ---- Tasks ----
  getTasks()        { return this.load('tasks') || []; },
  saveTasks(list)   { this.save('tasks', list); },

  addTask(task) {
    const list = this.getTasks();
    list.push(task);
    this.saveTasks(list);
    return task;
  },

  updateTask(id, changes) {
    const list = this.getTasks();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes, updatedAt: Date.now() };
    this.saveTasks(list);
    return list[idx];
  },

  deleteTask(id) {
    let list = this.getTasks().filter(t => t.id !== id);
    this.saveTasks(list);
  },

  // ---- Members ----
  getMembers()        { return this.load('members') || []; },
  saveMembers(list)   { this.save('members', list); },

  addMember(m) {
    const list = this.getMembers();
    list.push(m);
    this.saveMembers(list);
    return m;
  },

  updateMember(id, changes) {
    const list = this.getMembers();
    const idx = list.findIndex(m => m.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes };
    this.saveMembers(list);
    return list[idx];
  },

  deleteMember(id) {
    let list = this.getMembers().filter(m => m.id !== id);
    this.saveMembers(list);
    // unassign tasks
    let tasks = this.getTasks();
    tasks = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: '' } : t);
    this.saveTasks(tasks);
    // remove from project members
    let projects = this.getProjects();
    projects = projects.map(p => ({
      ...p,
      memberIds: (p.memberIds || []).filter(mid => mid !== id)
    }));
    this.saveProjects(projects);
  },

  // ---- Tags ----
  getTags()        { return this.load('tags') || []; },
  saveTags(list)   { this.save('tags', list); },

  addTag(tag) {
    const list = this.getTags();
    list.push(tag);
    this.saveTags(list);
    return tag;
  },

  updateTag(id, changes) {
    const list = this.getTags();
    const idx = list.findIndex(t => t.id === id);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...changes };
    this.saveTags(list);
    return list[idx];
  },

  deleteTag(id) {
    let list = this.getTags().filter(t => t.id !== id);
    this.saveTags(list);
    // remove references from tasks
    let tasks = this.getTasks();
    tasks = tasks.map(t => ({
      ...t,
      tagIds: (t.tagIds || []).filter(tid => tid !== id)
    }));
    this.saveTasks(tasks);
    // remove references from projects
    let projects = this.getProjects();
    projects = projects.map(p => ({
      ...p,
      tagIds: (p.tagIds || []).filter(tid => tid !== id)
    }));
    this.saveProjects(projects);
  },

  // ---- Settings ----
  getSettings()      { return this.load('settings') || { theme: 'light' }; },
  saveSettings(s)    { this.save('settings', s); },
  getSetting(key, def = null) { return this.getSettings()[key] ?? def; },
  setSetting(key, val) {
    const s = this.getSettings();
    s[key] = val;
    this.saveSettings(s);
  },
};
