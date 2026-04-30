/* ============================================
   وحدة الطلاب
   عمليات CRUD لإدارة الطلاب
   ============================================ */

let studentsData = [];

/** تحميل وعرض جميع الطلاب */
async function loadStudents() {
  const classFilter = document.getElementById('student-class-filter').value;
  const searchTerm = document.getElementById('student-search').value.toLowerCase();

  let endpoint = '/students';
  if (classFilter) endpoint += `?class_name=${encodeURIComponent(classFilter)}`;

  const data = await api(endpoint);
  if (!data) return;

  studentsData = data;

  const filtered = data.filter(s =>
    s.name.toLowerCase().includes(searchTerm) ||
    s.student_id.toLowerCase().includes(searchTerm)
  );

  const tbody = document.getElementById('students-table-body');

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="empty-table">
          <h4>لا يوجد طلاب</h4>
          <p>أضف أول طالب أو قم بتعديل الفلاتر.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((student, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(student.student_id)}</td>
      <td><span class="badge badge-primary">${escapeHtml(student.class_name)}</span></td>
      <td class="actions">
        <button class="btn btn-icon btn-sm edit" title="تعديل" onclick="openStudentModal(${student.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-sm delete" title="حذف" onclick="deleteStudent(${student.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/** فتح نافذة إضافة أو تعديل طالب */
function openStudentModal(id = null) {
  const student = id ? studentsData.find(s => s.id === id) : null;
  const isEdit = !!student;
  const title = isEdit ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد';

  const html = `
    <form id="student-form" onsubmit="saveStudent(event, ${id})">
      <div class="form-group">
        <label for="s-name">الاسم الكامل *</label>
        <input type="text" id="s-name" class="form-input" placeholder="أدخل اسم الطالب" required value="${isEdit ? escapeAttr(student.name) : ''}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="s-id">الرقم الدراسي *</label>
          <input type="text" id="s-id" class="form-input" placeholder="مثال: STU-001" required value="${isEdit ? escapeAttr(student.student_id) : ''}">
        </div>
        <div class="form-group">
          <label for="s-class">الشعبة *</label>
          <input type="text" id="s-class" class="form-input" placeholder="مثال: 10-أ" required value="${isEdit ? escapeAttr(student.class_name) : ''}" list="class-list">
          <datalist id="class-list">
            ${studentsData
              .map(s => s.class_name)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map(c => `<option value="${escapeAttr(c)}">`)
              .join('')}
          </datalist>
        </div>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'} الطالب</button>
      </div>
    </form>
  `;

  openModal(title, html);
}

/** حفظ الطالب (إضافة أو تحديث) */
async function saveStudent(e, id) {
  e.preventDefault();

  const name = document.getElementById('s-name').value.trim();
  const student_id = document.getElementById('s-id').value.trim();
  const class_name = document.getElementById('s-class').value.trim();

  if (!name || !student_id || !class_name) {
    showToast('جميع الحقول مطلوبة.', 'error');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/students/${id}` : '/students';

  const data = await api(endpoint, {
    method,
    body: JSON.stringify({ name, student_id, class_name })
  });

  if (data) {
    if (data._status === 409) {
      showToast(data.error, 'error');
      return;
    }
    showToast(id ? 'تم تحديث بيانات الطالب بنجاح.' : 'تم إضافة الطالب بنجاح.', 'success');
    closeModal();
    loadStudents();
    loadDashboardStats();
    loadClassFilters();
  }
}

/** حذف طالب مع التأكيد */
function deleteStudent(id) {
  const student = studentsData.find(s => s.id === id);
  if (!student) return;

  showConfirm(`هل أنت متأكد من حذف "${student.name}"؟`, async () => {
    const data = await api(`/students/${id}`, { method: 'DELETE' });
    if (data && data.success) {
      showToast('تم حذف الطالب.', 'success');
      loadStudents();
      loadDashboardStats();
      loadClassFilters();
    }
  });
}
