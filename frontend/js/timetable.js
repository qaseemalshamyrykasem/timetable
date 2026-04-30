/* ============================================
   وحدة الجدول الأسبوعي
   عرض الجدول، الإنشاء، التعديل، وإعادة التعيين
   ============================================ */

const TIMETABLE_DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];

/** ترجمة أيام الأسبوع للعربية */
const DAY_NAMES_AR = {
  'Saturday': 'السبت',
  'Sunday': 'الأحد',
  'Monday': 'الاثنين',
  'Tuesday': 'الثلاثاء',
  'Wednesday': 'الأربعاء'
};

const TIME_SLOT_LABELS = {
  '1': '8:00 - 8:45',
  '2': '8:50 - 9:35',
  '3': '9:40 - 10:25',
  '4': '10:30 - 11:15',
  '5': '11:20 - 12:05'
};
const TIME_SLOT_SHORT = {
  '1': '8:00',
  '2': '8:50',
  '3': '9:40',
  '4': '10:30',
  '5': '11:20'
};

/** ألوان المواد المختلفة */
const SUBJECT_COLORS = [
  'cell-bg-0', 'cell-bg-1', 'cell-bg-2', 'cell-bg-3', 'cell-bg-4',
  'cell-bg-5', 'cell-bg-6', 'cell-bg-7', 'cell-bg-8', 'cell-bg-9'
];

let timetableData = [];
let availableClasses = [];

/** تحميل قائمة الشعب وملء القائمة المنسدلة */
async function loadClassSelect() {
  const select = document.getElementById('timetable-class-select');
  if (!select) return;

  const currentVal = select.value;

  try {
    const classes = await api('/timetable/classes');
    if (!classes || !Array.isArray(classes)) {
      console.warn('loadClassSelect: لم يتم العثور على شعب');
      select.innerHTML = '<option value="">لا توجد شعب</option>';
      return;
    }

    availableClasses = classes;
    select.innerHTML = '<option value="">-- اختر الشعبة --</option>';

    classes.forEach(cls => {
      const opt = document.createElement('option');
      opt.value = cls;
      opt.textContent = cls;
      select.appendChild(opt);
    });

    /* استعادة التحديد السابق أو تحديد أول شعبة تلقائياً */
    if (currentVal && classes.includes(currentVal)) {
      select.value = currentVal;
      loadTimetable();
    } else if (classes.length > 0) {
      /* إذا لم يكن هناك تحديد سابق ولا توجد بيانات جدول، لا نحدد تلقائياً */
      select.value = '';
      showEmptyClassPrompt();
    }
  } catch (err) {
    console.error('loadClassSelect error:', err);
    select.innerHTML = '<option value="">خطأ في التحميل</option>';
  }
}

/** عرض رسالة عند عدم اختيار شعبة */
function showEmptyClassPrompt() {
  const container = document.getElementById('timetable-container');
  if (!container) return;
  container.innerHTML = `
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <h3>اختر الشعبة</h3>
      <p>اختر شعبة من القائمة لعرض أو إنشاء جدولها الأسبوعي.</p>
    </div>`;
  hideExportButtons();
}

/** إخفاء أزرار التصدير */
function hideExportButtons() {
  const btnExcel = document.getElementById('btn-export-excel');
  const btnPdf = document.getElementById('btn-export-pdf');
  if (btnExcel) btnExcel.style.display = 'none';
  if (btnPdf) btnPdf.style.display = 'none';
}

/** تحميل وعرض الجدول للشعبة المحددة */
async function loadTimetable() {
  const select = document.getElementById('timetable-class-select');
  const className = select ? select.value : '';
  const container = document.getElementById('timetable-container');

  if (!className) {
    showEmptyClassPrompt();
    return;
  }

  try {
    const data = await api(`/timetable?class_name=${encodeURIComponent(className)}`);
    if (!data) {
      showEmptyClassPrompt();
      return;
    }

    timetableData = Array.isArray(data) ? data : [];

    if (timetableData.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <h3>لا يوجد جدول بعد</h3>
          <p>اضغط على "إنشاء" لتوليد الجدول الأسبوعي لشعبة ${escapeHtml(className)}.</p>
        </div>`;
      hideExportButtons();
      return;
    }

    renderTimetableGrid(timetableData, className);

    /* إظهار أزرار التصدير عند وجود بيانات */
    document.getElementById('btn-export-excel').style.display = 'inline-flex';
    document.getElementById('btn-export-pdf').style.display = 'inline-flex';
  } catch (err) {
    console.error('loadTimetable error:', err);
    showEmptyClassPrompt();
  }
}

/** عرض الجدول كشبكة */
function renderTimetableGrid(entries, className) {
  const container = document.getElementById('timetable-container');

  const map = {};
  entries.forEach(entry => {
    map[entry.day + '-' + entry.time_slot] = entry;
  });

  const subjectSet = new Set(entries.map(e => e.subject_name));
  const subjectColorMap = {};
  let colorIdx = 0;
  subjectSet.forEach(name => {
    subjectColorMap[name] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
    colorIdx++;
  });

  let html = `
    <table class="timetable-grid">
      <thead>
        <tr>
          <th>التوقيت</th>
          ${TIMETABLE_DAYS.map(d => `<th>${DAY_NAMES_AR[d]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>`;

  Object.keys(TIME_SLOT_LABELS).forEach(slot => {
    html += `<tr>`;
    html += `<td>
      <div style="font-weight:600;">الحصة ${slot}</div>
      <div style="font-size:11px;color:var(--gray-400);">${TIME_SLOT_SHORT[slot]}</div>
    </td>`;

    TIMETABLE_DAYS.forEach(day => {
      const entry = map[day + '-' + slot];
      if (entry) {
        const colorClass = subjectColorMap[entry.subject_name] || 'cell-bg-0';
        html += `
          <td>
            <div class="timetable-cell ${colorClass}" onclick="editTimetableCell(${entry.id})" title="اضغط للتعديل">
              <div class="cell-subject">${escapeHtml(entry.subject_name || 'غير محدد')}</div>
              <div class="cell-teacher">${escapeHtml(entry.teacher_name || '')}</div>
              <div class="cell-room">${escapeHtml(entry.classroom_name || '')}</div>
            </div>
          </td>`;
      } else {
        html += `
          <td>
            <div class="cell-empty" onclick="editTimetableCellEmpty('${day}', '${slot}')" title="اضغط للإضافة">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </div>
          </td>`;
      }
    });

    html += `</tr>`;
  });

  html += `</tbody></table>`;
  container.innerHTML = html;
}

/** إنشاء الجدول للشعبة المحددة */
async function generateTimetable() {
  const className = document.getElementById('timetable-class-select').value;
  const body = className ? { className } : {};

  showConfirm(
    className
      ? `هل تريد إنشاء جدول جديد لشعبة "${className}"؟ سيتم استبدال الجدول الحالي.`
      : 'هل تريد إنشاء جداول لجميع الشعب؟ سيتم استبدال جميع الجداول الحالية.',
    async () => {
      const data = await api('/timetable/generate', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      if (data && data.success) {
        showToast(data.message, 'success');

        const warningEl = document.getElementById('timetable-warnings');
        if (data.warnings && data.warnings.length > 0) {
          warningEl.style.display = 'block';
          warningEl.innerHTML = `
            <h4>تحذيرات الجدولة</h4>
            <ul>${data.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>
          `;
        } else {
          warningEl.style.display = 'none';
        }

        /* إعادة تحميل الشعب ثم عرض الجدول */
        await loadClassSelect();

        /* إذا تم إنشاء جدول لشعبة محددة، اعرضها */
        if (className) {
          document.getElementById('timetable-class-select').value = className;
          loadTimetable();
        } else if (availableClasses.length > 0) {
          /* إذا تم إنشاء لجميع الشعب، حدد الأولى واعرض جدولها */
          const select = document.getElementById('timetable-class-select');
          select.value = availableClasses[0];
          loadTimetable();
        }
      }
    }
  );
}

/** إعادة تعيين الجدول */
function resetTimetable() {
  const className = document.getElementById('timetable-class-select').value;
  if (!className) {
    showToast('يرجى اختيار شعبة أولاً.', 'warning');
    return;
  }

  showConfirm(
    `هل تريد إعادة تعيين جدول شعبة "${className}"؟ سيتم حذف جميع الحصص المجدولة.`,
    async () => {
      const data = await api(`/timetable/reset?class_name=${encodeURIComponent(className)}`, {
        method: 'DELETE'
      });

      if (data && data.success) {
        showToast(data.message, 'success');
        document.getElementById('timetable-warnings').style.display = 'none';
        loadTimetable();
      }
    }
  );
}

/** تعديل خلية في الجدول */
async function editTimetableCell(entryId) {
  const entry = timetableData.find(e => e.id === entryId);
  if (!entry) return;

  const [subjects, teachers, classrooms] = await Promise.all([
    api('/subjects'),
    api('/teachers'),
    api('/classrooms')
  ]);

  if (!subjects || !teachers || !classrooms) return;

  const subjectOptions = subjects.map(s =>
    `<option value="${s.id}" ${entry.subject_id === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
  ).join('');

  const teacherOptions = teachers.map(t =>
    `<option value="${t.id}" ${entry.teacher_id === t.id ? 'selected' : ''}>${escapeHtml(t.name)} (${escapeHtml(t.specialty)})</option>`
  ).join('');

  const roomOptions = classrooms.map(c =>
    `<option value="${c.id}" ${entry.classroom_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)} (${c.capacity} مقعد)</option>`
  ).join('');

  const dayAr = DAY_NAMES_AR[entry.day] || entry.day;

  const html = `
    <form id="edit-timetable-form" onsubmit="updateTimetableEntry(event, ${entryId})">
      <p style="font-size:13px;color:var(--gray-500);margin-bottom:16px;">
        تعديل: <strong>${dayAr}</strong>، الحصة <strong>${entry.time_slot}</strong>
      </p>
      <div class="form-group">
        <label for="et-subject">المادة</label>
        <select id="et-subject" class="form-select">${subjectOptions}</select>
      </div>
      <div class="form-group">
        <label for="et-teacher">المعلم</label>
        <select id="et-teacher" class="form-select">
          <option value="">-- بدون --</option>
          ${teacherOptions}
        </select>
      </div>
      <div class="form-group">
        <label for="et-room">الفصل</label>
        <select id="et-room" class="form-select">
          <option value="">-- بدون --</option>
          ${roomOptions}
        </select>
      </div>
      <div class="modal-actions">
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteTimetableEntry(${entryId})">إزالة</button>
        <div style="flex:1"></div>
        <button type="button" class="btn btn-outline" onclick="closeModal()">إلغاء</button>
        <button type="submit" class="btn btn-primary">حفظ التغييرات</button>
      </div>
    </form>
  `;

  openModal(`تعديل - ${dayAr} الحصة ${entry.time_slot}`, html);
}

/** تحديث خلية في الجدول */
async function updateTimetableEntry(e, entryId) {
  e.preventDefault();

  const subject_id = parseInt(document.getElementById('et-subject').value);
  const teacher_id = document.getElementById('et-teacher').value ? parseInt(document.getElementById('et-teacher').value) : null;
  const classroom_id = document.getElementById('et-room').value ? parseInt(document.getElementById('et-room').value) : null;

  const data = await api(`/timetable/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify({ subject_id, teacher_id, classroom_id })
  });

  if (data) {
    if (data._status === 409) {
      showToast(data.error, 'error');
      return;
    }
    showToast('تم تحديث الجدول.', 'success');
    closeModal();
    loadTimetable();
  }
}

/** إزالة خلية من الجدول */
function deleteTimetableEntry(entryId) {
  closeModal();
  showToast('استخدم "إعادة تعيين" لمسح الجدول بالكامل لهذه الشعبة.', 'info');
}

/** تعديل خلية فارغة */
function editTimetableCellEmpty(day, slot) {
  showToast('استخدم "إنشاء" لتعبئة الخلايا الفارغة، أو عدل حصة موجودة.', 'info');
}

/** تصدير الجدول إلى ملف Excel */
function exportToExcel() {
  const className = document.getElementById('timetable-class-select').value;
  if (!className) {
    showToast('يرجى اختيار شعبة أولاً.', 'warning');
    return;
  }
  if (timetableData.length === 0) {
    showToast('لا يوجد جدول لتصديره.', 'warning');
    return;
  }

  showToast('جارٍ تجهيز ملف Excel...', 'info');

  fetch(`/api/export/excel?class_name=${encodeURIComponent(className)}`, { credentials: 'same-origin' })
    .then(response => {
      if (!response.ok) throw new Error('فشل التصدير');
      return response.blob();
    })
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `جدول_${className}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast('تم تصدير ملف Excel بنجاح!', 'success');
    })
    .catch(() => {
      showToast('حدث خطأ أثناء تصدير Excel.', 'error');
    });
}

/** تصدير الجدول إلى PDF عبر صفحة طباعة */
function exportToPDF() {
  const className = document.getElementById('timetable-class-select').value;
  if (!className) {
    showToast('يرجى اختيار شعبة أولاً.', 'warning');
    return;
  }
  if (timetableData.length === 0) {
    showToast('لا يوجد جدول لتصديره.', 'warning');
    return;
  }

  showToast('جارٍ فتح نافذة التصدير...', 'info');
  window.open(`/api/export/pdf?class_name=${encodeURIComponent(className)}`, '_blank');
}
