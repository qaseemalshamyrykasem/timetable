const express = require('express');
const db = require('../models/db');
const ExcelJS = require('exceljs');

const router = express.Router();

const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];
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

/* ألوان المواد للتصدير */
const SUBJECT_COLORS = [
  { bg: 'DBEAFE', fg: '1E40AF' },
  { bg: 'FCE7F3', fg: '9D174D' },
  { bg: 'FEF3C7', fg: '92400E' },
  { bg: 'D1FAE5', fg: '065F46' },
  { bg: 'EDE9FE', fg: '5B21B6' },
  { bg: 'E0E7FF', fg: '3730A3' },
  { bg: 'FCE4EC', fg: '880E4F' },
  { bg: 'E8F5E9', fg: '1B5E20' },
  { bg: 'FFF3E0', fg: 'E65100' },
  { bg: 'F3E5F5', fg: '4A148C' }
];

/**
 * جلب بيانات الجدول لشعبة معينة
 */
function getTimetableData(className) {
  return db.prepare(`
    SELECT t.id, t.class_name, t.day, t.time_slot,
      t.subject_id, t.teacher_id, t.classroom_id,
      s.name AS subject_name,
      te.name AS teacher_name,
      c.name AS classroom_name
    FROM timetable t
    LEFT JOIN subjects s ON t.subject_id = s.id
    LEFT JOIN teachers te ON t.teacher_id = te.id
    LEFT JOIN classrooms c ON t.classroom_id = c.id
    WHERE t.class_name = ?
    ORDER BY
      CASE t.day
        WHEN 'Saturday' THEN 1
        WHEN 'Sunday' THEN 2
        WHEN 'Monday' THEN 3
        WHEN 'Tuesday' THEN 4
        WHEN 'Wednesday' THEN 5
      END,
      CAST(t.time_slot AS INTEGER)
  `).all(className);
}

/**
 * GET /api/export/excel
 * تصدير الجدول إلى ملف Excel منسق
 * Query: class_name (required)
 */
router.get('/excel', (req, res) => {
  try {
    const { class_name } = req.query;

    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }

    const entries = getTimetableData(class_name);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'لا يوجد جدول لهذه الشعبة' });
    }

    /* إنشاء ملف Excel */
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'نظام إدارة الجدول المدرسي';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(`جدول ${class_name}`, {
      properties: {
        defaultColWidth: 22,
        defaultRowHeight: 45
      },
      pageSetup: {
        orientation: 'landscape',
        paperSize: 3,
        fitToPage: true,
        fitToWidth: 1
      }
    });

    /* إعدادات اتجاه النص RTL */
    worksheet.views = [{ rightToLeft: true }];

    /* عنوان الصفحة */
    worksheet.mergeCells(1, 1, 1, 6);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `الجدول الأسبوعي - شعبة ${class_name}`;
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(1).height = 50;

    /* الصف الفرعي - التاريخ */
    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    worksheet.mergeCells(2, 1, 2, 6);
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `تاريخ التصدير: ${dateStr}`;
    dateCell.font = { name: 'Arial', size: 10, color: { argb: '6B7280' } };
    dateCell.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.getRow(2).height = 28;

    /* صف فارغ */
    worksheet.addRow([]);

    /* عنوان الجدول - الأيام */
    const headerRow = worksheet.addRow();
    headerRow.height = 35;
    const headerCell = headerRow.getCell(1);
    headerCell.value = 'التوقيت';
    headerCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
    headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
    headerCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerCell.border = {
      top: { style: 'thin', color: { argb: '3730A3' } },
      bottom: { style: 'thin', color: { argb: '3730A3' } },
      left: { style: 'thin', color: { argb: '3730A3' } },
      right: { style: 'thin', color: { argb: '3730A3' } }
    };

    DAYS.forEach((day, idx) => {
      const cell = headerRow.getCell(idx + 2);
      cell.value = DAY_NAMES_AR[day];
      cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin', color: { argb: '3730A3' } },
        bottom: { style: 'thin', color: { argb: '3730A3' } },
        left: { style: 'thin', color: { argb: '3730A3' } },
        right: { style: 'thin', color: { argb: '3730A3' } }
      };
    });

    /* بناء خريطة البيانات */
    const map = {};
    entries.forEach(entry => {
      map[entry.day + '-' + entry.time_slot] = entry;
    });

    /* تعيين ألوان للمواد */
    const subjectSet = new Set(entries.map(e => e.subject_name || ''));
    const subjectColorMap = {};
    let colorIdx = 0;
    subjectSet.forEach(name => {
      subjectColorMap[name] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    });

    /* كتابة صفوف الحصص */
    Object.keys(TIME_SLOT_LABELS).forEach(slot => {
      const row = worksheet.addRow();
      row.height = 55;

      /* خلية التوقيت */
      const slotCell = row.getCell(1);
      slotCell.value = `الحصة ${slot}\n${TIME_SLOT_SHORT[slot]}`;
      slotCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: '374151' } };
      slotCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };
      slotCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      slotCell.border = {
        top: { style: 'thin', color: { argb: 'D1D5DB' } },
        bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
        left: { style: 'thin', color: { argb: 'D1D5DB' } },
        right: { style: 'thin', color: { argb: 'D1D5DB' } }
      };

      /* خلايا الأيام */
      DAYS.forEach((day, idx) => {
        const cell = row.getCell(idx + 2);
        const entry = map[day + '-' + slot];

        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = {
          top: { style: 'thin', color: { argb: 'D1D5DB' } },
          bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
          left: { style: 'thin', color: { argb: 'D1D5DB' } },
          right: { style: 'thin', color: { argb: 'D1D5DB' } }
        };

        if (entry) {
          const colors = subjectColorMap[entry.subject_name] || SUBJECT_COLORS[0];
          cell.value = `${entry.subject_name || ''}\n${entry.teacher_name || ''}\n${entry.classroom_name || ''}`;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: colors.fg } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.bg } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'D1D5DB' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      });
    });

    /* صف الإحصائيات */
    worksheet.addRow([]);
    const statsRow = worksheet.addRow();
    const totalSessions = entries.length;
    const totalSubjects = subjectSet.size;
    const totalTeachers = new Set(entries.map(e => e.teacher_name).filter(Boolean)).size;

    worksheet.mergeCells(statsRow.number, 1, statsRow.number, 6);
    const statsCell = statsRow.getCell(1);
    statsCell.value = `إجمالي الحصص: ${totalSessions}  |  عدد المواد: ${totalSubjects}  |  عدد المعلمين: ${totalTeachers}`;
    statsCell.font = { name: 'Arial', size: 10, color: { argb: '6B7280' } };
    statsCell.alignment = { horizontal: 'center', vertical: 'middle' };

    /* تعيين عرض الأعمدة */
    worksheet.getColumn(1).width = 18;
    for (let i = 2; i <= 6; i++) {
      worksheet.getColumn(i).width = 28;
    }

    /* إرسال الملف */
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(`جدول_${class_name}.xlsx`)}`);

    workbook.xlsx.write(res).then(() => {
      res.end();
    }).catch(err => {
      console.error('Excel write error:', err);
      res.status(500).json({ error: 'خطأ في إنشاء ملف Excel' });
    });

  } catch (err) {
    console.error('Excel export error:', err);
    res.status(500).json({ error: 'خطأ في التصدير' });
  }
});

/**
 * GET /api/export/pdf
 * تصدير الجدول إلى صفحة HTML منسقة للطباعة كـ PDF
 * Query: class_name (required)
 */
router.get('/pdf', (req, res) => {
  try {
    const { class_name } = req.query;

    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }

    const entries = getTimetableData(class_name);

    if (entries.length === 0) {
      return res.status(404).json({ error: 'لا يوجد جدول لهذه الشعبة' });
    }

    /* بناء خريطة البيانات */
    const map = {};
    entries.forEach(entry => {
      map[entry.day + '-' + entry.time_slot] = entry;
    });

    /* تعيين ألوان للمواد */
    const subjectSet = new Set(entries.map(e => e.subject_name || ''));
    const subjectColorMap = {};
    let colorIdx = 0;
    subjectSet.forEach(name => {
      subjectColorMap[name] = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      colorIdx++;
    });

    /* بناء صفوف الجدول */
    let tableRows = '';
    Object.keys(TIME_SLOT_LABELS).forEach(slot => {
      tableRows += '<tr>';
      tableRows += `
        <td class="time-cell">
          <div class="period">الحصة ${slot}</div>
          <div class="time">${TIME_SLOT_SHORT[slot]}</div>
        </td>`;

      DAYS.forEach(day => {
        const entry = map[day + '-' + slot];
        if (entry) {
          const colors = subjectColorMap[entry.subject_name] || SUBJECT_COLORS[0];
          tableRows += `
            <td class="subject-cell" style="background-color: #${colors.bg}; color: #${colors.fg};">
              <div class="subject-name">${escapeHtml(entry.subject_name || '')}</div>
              <div class="teacher-name">${escapeHtml(entry.teacher_name || '')}</div>
              <div class="room-name">${escapeHtml(entry.classroom_name || '')}</div>
            </td>`;
        } else {
          tableRows += '<td class="empty-cell"></td>';
        }
      });
      tableRows += '</tr>';
    });

    /* بناء دليل الألوان */
    let legendHtml = '';
    colorIdx = 0;
    subjectSet.forEach(name => {
      const colors = SUBJECT_COLORS[colorIdx % SUBJECT_COLORS.length];
      legendHtml += `
        <div class="legend-item">
          <span class="legend-color" style="background-color: #${colors.bg}; border: 1px solid #${colors.fg};"></span>
          <span>${escapeHtml(name)}</span>
        </div>`;
      colorIdx++;
    });

    const today = new Date();
    const dateStr = today.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalSessions = entries.length;
    const totalSubjects = subjectSet.size;
    const totalTeachers = new Set(entries.map(e => e.teacher_name).filter(Boolean)).size;

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>الجدول الأسبوعي - ${escapeHtml(class_name)}</title>
  <style>
    @page {
      size: landscape;
      margin: 12mm;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      color: #1f2937;
      background: #fff;
      padding: 20px;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #4f46e5;
    }

    .header h1 {
      font-size: 26px;
      font-weight: 700;
      color: #4f46e5;
      margin-bottom: 6px;
    }

    .header .subtitle {
      font-size: 14px;
      color: #6b7280;
    }

    .header .date {
      font-size: 12px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .timetable-wrapper {
      margin: 0 auto;
      max-width: 100%;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }

    thead th {
      background-color: #4f46e5;
      color: #fff;
      padding: 14px 12px;
      font-size: 14px;
      font-weight: 600;
      text-align: center;
      border: 1px solid #3730a3;
    }

    thead th:first-child {
      background-color: #3730a3;
      width: 100px;
    }

    tbody td {
      border: 1px solid #d1d5db;
      vertical-align: middle;
      text-align: center;
      padding: 0;
      height: 70px;
    }

    .time-cell {
      background-color: #f3f4f6;
      padding: 8px !important;
      vertical-align: middle !important;
    }

    .time-cell .period {
      font-size: 13px;
      font-weight: 700;
      color: #374151;
    }

    .time-cell .time {
      font-size: 11px;
      color: #6b7280;
      margin-top: 2px;
    }

    .subject-cell {
      padding: 10px 8px !important;
      text-align: center;
    }

    .subject-cell .subject-name {
      font-size: 13px;
      font-weight: 700;
      margin-bottom: 3px;
    }

    .subject-cell .teacher-name {
      font-size: 11px;
      opacity: 0.8;
      margin-bottom: 2px;
    }

    .subject-cell .room-name {
      font-size: 10px;
      opacity: 0.65;
    }

    .empty-cell {
      background-color: #fafafa;
    }

    .footer {
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    .stats {
      display: flex;
      gap: 24px;
      font-size: 13px;
      color: #6b7280;
    }

    .stats span {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .stats strong {
      color: #374151;
    }

    .legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 12px;
      color: #6b7280;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-color {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      display: inline-block;
    }

    .watermark {
      text-align: center;
      margin-top: 30px;
      font-size: 10px;
      color: #d1d5db;
    }

    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
      .subject-cell, thead th {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    .print-btn {
      position: fixed;
      bottom: 24px;
      left: 24px;
      padding: 12px 28px;
      background: #4f46e5;
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79,70,229,0.35);
      transition: all 0.2s;
    }
    .print-btn:hover {
      background: #4338ca;
      box-shadow: 0 6px 16px rgba(79,70,229,0.45);
      transform: translateY(-1px);
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>الجدول الأسبوعي</h1>
    <div class="subtitle">شعبة: ${escapeHtml(class_name)}</div>
    <div class="date">تاريخ التصدير: ${dateStr}</div>
  </div>

  <div class="timetable-wrapper">
    <table>
      <thead>
        <tr>
          <th>التوقيت</th>
          ${DAYS.map(d => `<th>${DAY_NAMES_AR[d]}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
  </div>

  <div class="footer">
    <div class="stats">
      <span>إجمالي الحصص: <strong>${totalSessions}</strong></span>
      <span>عدد المواد: <strong>${totalSubjects}</strong></span>
      <span>عدد المعلمين: <strong>${totalTeachers}</strong></span>
    </div>
    <div class="legend">
      ${legendHtml}
    </div>
  </div>

  <div class="watermark">نظام إدارة الجدول المدرسي</div>

  <button class="print-btn no-print" onclick="window.print()">
    حفظ كـ PDF / طباعة
  </button>

  <script>
    window.onload = function() {
      setTimeout(function() { window.print(); }, 500);
    };
  </script>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

  } catch (err) {
    console.error('PDF export error:', err);
    res.status(500).json({ error: 'خطأ في التصدير' });
  }
});

/**
 * مساعد لتجنب حقن HTML
 */
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

module.exports = router;
