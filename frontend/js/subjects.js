/* ============================================
   وحدة المواد الدراسية
   عمليات CRUD لإدارة المواد
   ============================================ */

let subjectsData = [];
let teachersForSubject = [];

/** تحميل وعرض جميع المواد */
async function loadSubjects() {
  const [subjects, teachers] = await Promise.all([
    api('/subjects'),
    api('/teachers')
  ]);

  if (!subjects) return;

  subjectsData = subjects;
  teachersForSubject = teachers || [];
  const tbody = document.getElementById('subjects-table-body');

  if (subjects.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          <h4>لا توجد مواد دراسية</h4>
          <p>أضف أول مادة دراسية.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = subjects.map((subject, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(subject.name)}</strong></td>
      <td>${subject.teacher_name ? escapeHtml(subject.teacher_name) : '<span class="text-muted">غير معين</span>'}</td>
      <td><span class="badge badge-success">${subject.weekly_sessions} حصص</span></td>
      <td class="actions">
        <button class="btn btn-icon btn-sm edit" title="تعديل" onclick="openSubjectModal(${subject.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-sm delete" title="حذف" onclick="deleteSubject(${subject.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/** فتح نافذة إضافة أو تعديل مادة */
function openSubjectModal(id = null) {
  const subject = id ? subjectsData.find(s => s.id === id) : null;
  const isEdit = !!subject;
  const title = isEdit ? 'تعديل المادة الدراسية' : 'إضافة مادة جديدة';

  const teacherOptions = teachersForSubject.map(t =>
    `<option value="${t.id}" ${isEdit && subject.teacher_id === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${escapeHtml(t.specialty)})</option>`
  ).join('');

  const html = `
    <form id="subject-form" onsubmit="saveSubject(event, ${id})">
      <div class="form-group">
        <label for="sub-name">اسم المادة *</label>
        <input type="text" id="sub-name" class="form-input" placeholder="مثال: الرياضيات" required value="${isEdit ? escapeAttr(subject.name) : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="sub-teacher">المعلم المسؤول</label>
          <select id="sub-teacher" class="form-select">
            <option value="">-- اختر المعلم --</option>
            ${teacherOptions}
          </select>
        </div>
        <div class="form-group">
          <label for="sub-sessions">الحصص الأسبوعية</label>
          <input type="number" id="sub-sessions" class="form-input" min="1" max="10" value="${isEdit ? subject.weekly_sessions : 4}">
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'} المادة</button>
      </div>
    </form>
  `;

  openModal(title, html);
}

/** حفظ المادة (إضافة أو تحديث) */
async function saveSubject(e, id) {
  e.preventDefault();

  const name = document.getElementById('sub-name').value.trim();
  const teacher_id = document.getElementById('sub-teacher').value;
  const weekly_sessions = parseInt(document.getElementById('sub-sessions').value) || 4;

  if (!name) {
    showToast('اسم المادة مطلوب.', 'error');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/subjects/${id}` : '/subjects';

  const data = await api(endpoint, {
    method,
    body: JSON.stringify({ name, teacher_id: teacher_id ? parseInt(teacher_id) : null, weekly_sessions })
  });

  if (data) {
    if (data._status === 409) {
      showToast(data.error, 'error');
      return;
    }
    showToast(id ? 'تم تحديث المادة بنجاح.' : 'تم إضافة المادة بنجاح.', 'success');
    closeModal();
    loadSubjects();
    loadDashboardStats();
  }
}

/** حذف مادة مع التأكيد */
function deleteSubject(id) {
  const subject = subjectsData.find(s => s.id === id);
  if (!subject) return;

  showConfirm(`هل أنت متأكد من حذف "${subject.name}"؟`, async () => {
    const data = await api(`/subjects/${id}`, { method: 'DELETE' });
    if (data) {
      if (data._status === 409) {
        showToast(data.error, 'warning');
        return;
      }
      showToast('تم حذف المادة.', 'success');
      loadSubjects();
      loadDashboardStats();
    }
  });
}
