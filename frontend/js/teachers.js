/* ============================================
   وحدة المعلمين
   عمليات CRUD لإدارة المعلمين
   ============================================ */

let teachersData = [];
const ALL_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
const DAY_NAMES_AR = {
  'Saturday': 'السبت',
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء'
};
const ALL_SLOTS = ['1', '2', '3', '4', '5'];

/** تحميل وعرض جميع المعلمين */
async function loadTeachers() {
  const data = await api('/teachers');
  if (!data) return;

  teachersData = data;
  const tbody = document.getElementById('teachers-table-body');

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-table">
          <h4>لا يوجد معلمون</h4>
          <p>أضف أول معلم.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = data.map((teacher, idx) => {
    const daysAr = (teacher.available_days || []).map(d => DAY_NAMES_AR[d] || d).join('، ');
    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(teacher.name)}</strong></td>
        <td><span class="badge badge-primary">${escapeHtml(teacher.specialty)}</span></td>
        <td>${teacher.subject_count || 0}</td>
        <td>${daysAr}</td>
        <td class="actions">
          <button class="btn btn-icon btn-sm edit" title="تعديل" onclick="openTeacherModal(${teacher.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn btn-icon btn-sm delete" title="حذف" onclick="deleteTeacher(${teacher.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </td>
      </tr>`;
  }).join('');
}

/** فتح نافذة إضافة أو تعديل معلم */
function openTeacherModal(id = null) {
  const teacher = id ? teachersData.find(t => t.id === id) : null;
  const isEdit = !!teacher;
  const title = isEdit ? 'تعديل بيانات المعلم' : 'إضافة معلم جديد';

  const days = teacher ? teacher.available_days : [...ALL_DAYS];
  const slots = teacher ? teacher.available_slots : [...ALL_SLOTS];

  const html = `
    <form id="teacher-form" onsubmit="saveTeacher(event, ${id})">
      <div class="form-row">
        <div class="form-group">
          <label for="t-name">الاسم الكامل *</label>
          <input type="text" id="t-name" class="form-input" placeholder="أدخل اسم المعلم" required value="${isEdit ? escapeAttr(teacher.name) : ''}">
        </div>
        <div class="form-group">
          <label for="t-specialty">التخصص *</label>
          <input type="text" id="t-specialty" class="form-input" placeholder="مثال: الرياضيات" required value="${isEdit ? escapeAttr(teacher.specialty) : ''}">
        </div>
      </div>
      <div class="form-group">
        <label>الأيام المتاحة</label>
        <div class="form-check-group">
          ${ALL_DAYS.map(d => `
            <label class="form-check">
              <input type="checkbox" name="t-days" value="${d}" ${days.includes(d) ? 'checked' : ''}>
              ${DAY_NAMES_AR[d]}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>الفترات المتاحة</label>
        <div class="form-check-group">
          ${ALL_SLOTS.map(s => `
            <label class="form-check">
              <input type="checkbox" name="t-slots" value="${s}" ${slots.includes(s) ? 'checked' : ''}>
              الحصة ${s}
            </label>
          `).join('')}
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'} المعلم</button>
      </div>
    </form>
  `;

  openModal(title, html);
}

/** حفظ المعلم (إضافة أو تحديث) */
async function saveTeacher(e, id) {
  e.preventDefault();

  const name = document.getElementById('t-name').value.trim();
  const specialty = document.getElementById('t-specialty').value.trim();

  if (!name || !specialty) {
    showToast('الاسم والتخصص مطلوبان.', 'error');
    return;
  }

  const available_days = Array.from(document.querySelectorAll('input[name="t-days"]:checked')).map(cb => cb.value);
  const available_slots = Array.from(document.querySelectorAll('input[name="t-slots"]:checked')).map(cb => cb.value);

  if (available_days.length === 0) {
    showToast('يرجى اختيار يوم واحد على الأقل.', 'error');
    return;
  }

  if (available_slots.length === 0) {
    showToast('يرجى اختيار فترة واحدة على الأقل.', 'error');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/teachers/${id}` : '/teachers';

  const data = await api(endpoint, {
    method,
    body: JSON.stringify({ name, specialty, available_days, available_slots })
  });

  if (data) {
    if (data._status === 409) {
      showToast(data.error, 'error');
      return;
    }
    showToast(id ? 'تم تحديث بيانات المعلم بنجاح.' : 'تم إضافة المعلم بنجاح.', 'success');
    closeModal();
    loadTeachers();
    loadDashboardStats();
  }
}

/** حذف معلم مع التأكيد */
function deleteTeacher(id) {
  const teacher = teachersData.find(t => t.id === id);
  if (!teacher) return;

  showConfirm(`هل أنت متأكد من حذف "${teacher.name}"؟`, async () => {
    const data = await api(`/teachers/${id}`, { method: 'DELETE' });
    if (data) {
      if (data._status === 409) {
        showToast(data.error, 'warning');
        return;
      }
      showToast('تم حذف المعلم.', 'success');
      loadTeachers();
      loadDashboardStats();
    }
  });
}
