/* ============================================
   App.js - المنطق الرئيسي للتطبيق
   المصادقة، التنقل، الأدوات المساعدة، النوافذ
   ============================================ */

// ===== الإعدادات =====
const API_BASE = '/api';

// ===== أدوات مساعدة: حماية HTML =====
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ===== حالة التطبيق =====
let currentUser = null;
let currentPage = 'dashboard-overview';
let pendingConfirmCallback = null;

// ===== طلبات API =====
async function api(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    ...options
  };
  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (response.status === 401) {
      showLoginPage();
      return null;
    }

    data._status = response.status;
    return data;
  } catch (err) {
    console.error('API Error:', err);
    showToast('خطأ في الاتصال بالخادم. يرجى المحاولة مرة أخرى.', 'error');
    return null;
  }
}

// ===== المصادقة =====
async function checkAuth() {
  const data = await api('/auth/check');
  if (data && data.authenticated) {
    currentUser = data.user;
    showDashboard();
    return true;
  }
  showLoginPage();
  return false;
}

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    errorEl.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور.';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';

  const data = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });

  if (data && data.success) {
    currentUser = data.user;
    showDashboard();
    showToast('مرحباً بعودتك، ' + currentUser.username + '!', 'success');
  } else {
    const msg = data ? data.error : 'فشل تسجيل الدخول. يرجى المحاولة مرة أخرى.';
    errorEl.textContent = msg;
    errorEl.style.display = 'block';
  }
}

async function handleLogout() {
  await api('/auth/logout', { method: 'POST' });
  currentUser = null;
  showLoginPage();
  showToast('تم تسجيل الخروج بنجاح.', 'info');
}

// ===== عرض الصفحات =====
function showLoginPage() {
  document.getElementById('login-page').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('username').value = '';
  document.getElementById('password').value = '';
  document.getElementById('login-error').style.display = 'none';
}

function showDashboard() {
  document.getElementById('login-page').style.display = 'none';
  document.getElementById('dashboard').style.display = 'flex';

  if (currentUser) {
    document.getElementById('user-display-name').textContent = currentUser.username;
    document.getElementById('user-avatar').textContent = currentUser.username.charAt(0).toUpperCase();
  }

  const now = new Date();
  document.getElementById('current-date').textContent = now.toLocaleDateString('ar-SA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  loadDashboardStats();
  loadClassFilters();
  navigateTo('dashboard-overview');
}

// ===== التنقل =====
function navigateTo(pageId) {
  currentPage = pageId;

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === pageId);
  });

  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  const targetPage = document.getElementById('page-' + pageId);
  if (targetPage) targetPage.classList.add('active');

  const titles = {
    'dashboard-overview': 'لوحة التحكم',
    'students': 'إدارة الطلاب',
    'teachers': 'إدارة المعلمين',
    'subjects': 'إدارة المواد الدراسية',
    'classrooms': 'إدارة الفصول الدراسية',
    'timetable': 'الجدول الأسبوعي'
  };
  document.getElementById('page-title').textContent = titles[pageId] || 'لوحة التحكم';

  switch (pageId) {
    case 'dashboard-overview': loadDashboardStats(); break;
    case 'students': loadStudents(); break;
    case 'teachers': loadTeachers(); break;
    case 'subjects': loadSubjects(); break;
    case 'classrooms': loadClassrooms(); break;
    case 'timetable': loadClassSelect(); break;
  }

  closeSidebar();
}

// ===== إحصائيات لوحة التحكم =====
async function loadDashboardStats() {
  const [students, teachers, subjects, classrooms] = await Promise.all([
    api('/students'),
    api('/teachers'),
    api('/subjects'),
    api('/classrooms')
  ]);

  if (students) document.getElementById('stat-students').textContent = students.length;
  if (teachers) document.getElementById('stat-teachers').textContent = teachers.length;
  if (subjects) document.getElementById('stat-subjects').textContent = subjects.length;
  if (classrooms) document.getElementById('stat-classrooms').textContent = classrooms.length;
}

// ===== تحميل فلاتر الشعب =====
async function loadClassFilters() {
  const classes = await api('/timetable/classes');
  if (!classes) return;

  const studentFilter = document.getElementById('student-class-filter');
  const currentVal = studentFilter.value;
  studentFilter.innerHTML = '<option value="">جميع الشعب</option>';
  classes.forEach(cls => {
    studentFilter.innerHTML += `<option value="${cls}">${cls}</option>`;
  });
  studentFilter.value = currentVal;
}

// ===== النافذة المنبثقة =====
function openModal(title, bodyHTML) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-overlay').style.display = 'flex';
  setTimeout(() => {
    const firstInput = document.querySelector('#modal-body input, #modal-body select');
    if (firstInput) firstInput.focus();
  }, 100);
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

// ===== نافذة التأكيد =====
function showConfirm(message, callback) {
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').style.display = 'flex';
  pendingConfirmCallback = callback;
}

function closeConfirm() {
  document.getElementById('confirm-overlay').style.display = 'none';
  pendingConfirmCallback = null;
}

function confirmAction() {
  if (pendingConfirmCallback) {
    pendingConfirmCallback();
  }
  closeConfirm();
}

// ===== إشعارات التنبيه =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
  };

  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-30px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ===== تبديل الشريط الجانبي =====
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');

  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.addEventListener('click', closeSidebar);
    document.body.appendChild(overlay);
  }
  overlay.classList.toggle('active', sidebar.classList.contains('open'));
}

// ===== معالج مفتاح Escape =====
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeConfirm();
  }
});

// ===== النقر على غطاء النافذة =====
document.getElementById('modal-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('confirm-overlay').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeConfirm();
});

// ===== التهيئة =====
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('logout-btn').addEventListener('click', handleLogout);

  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(item.dataset.page);
    });
  });

  document.getElementById('sidebar-toggle').addEventListener('click', toggleSidebar);
  checkAuth();
});
