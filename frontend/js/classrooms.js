/* ============================================
   وحدة الفصول الدراسية
   عمليات CRUD لإدارة الفصول
   ============================================ */

let classroomsData = [];

/** تحميل وعرض جميع الفصول */
async function loadClassrooms() {
  const data = await api('/classrooms');
  if (!data) return;

  classroomsData = data;
  const tbody = document.getElementById('classrooms-table-body');

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-table">
          <h4>لا توجد فصول دراسية</h4>
          <p>أضف أول فصل دراسي.</p>
        </td>
      </tr>`;
    return;
  }

  tbody.innerHTML = data.map((room, idx) => `
    <tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(room.name)}</strong></td>
      <td><span class="badge badge-success">${room.capacity} مقعد</span></td>
      <td class="actions">
        <button class="btn btn-icon btn-sm edit" title="تعديل" onclick="openClassroomModal(${room.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-sm delete" title="حذف" onclick="deleteClassroom(${room.id})">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
}

/** فتح نافذة إضافة أو تعديل فصل */
function openClassroomModal(id = null) {
  const room = id ? classroomsData.find(r => r.id === id) : null;
  const isEdit = !!room;
  const title = isEdit ? 'تعديل الفصل' : 'إضافة فصل جديد';

  const html = `
    <form id="classroom-form" onsubmit="saveClassroom(event, ${id})">
      <div class="form-group">
        <label for="cr-name">اسم الفصل *</label>
        <input type="text" id="cr-name" class="form-input" placeholder="مثال: قاعة 101" required value="${isEdit ? escapeAttr(room.name) : ''}">
      </div>
      <div class="form-group">
        <label for="cr-capacity">السعة</label>
        <input type="number" id="cr-capacity" class="form-input" min="1" max="200" placeholder="30" value="${isEdit ? room.capacity : 30}">
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">${isEdit ? 'تحديث' : 'إضافة'} الفصل</button>
      </div>
    </form>
  `;

  openModal(title, html);
}

/** حفظ الفصل (إضافة أو تحديث) */
async function saveClassroom(e, id) {
  e.preventDefault();

  const name = document.getElementById('cr-name').value.trim();
  const capacity = parseInt(document.getElementById('cr-capacity').value) || 30;

  if (!name) {
    showToast('اسم الفصل مطلوب.', 'error');
    return;
  }

  const method = id ? 'PUT' : 'POST';
  const endpoint = id ? `/classrooms/${id}` : '/classrooms';

  const data = await api(endpoint, {
    method,
    body: JSON.stringify({ name, capacity })
  });

  if (data) {
    showToast(id ? 'تم تحديث الفصل بنجاح.' : 'تم إضافة الفصل بنجاح.', 'success');
    closeModal();
    loadClassrooms();
    loadDashboardStats();
  }
}

/** حذف فصل مع التأكيد */
function deleteClassroom(id) {
  const room = classroomsData.find(r => r.id === id);
  if (!room) return;

  showConfirm(`هل أنت متأكد من حذف "${room.name}"؟`, async () => {
    const data = await api(`/classrooms/${id}`, { method: 'DELETE' });
    if (data) {
      showToast('تم حذف الفصل.', 'success');
      loadClassrooms();
      loadDashboardStats();
    }
  });
}
