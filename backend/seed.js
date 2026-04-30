const bcrypt = require('bcryptjs');
const db = require('./models/db');

console.log('جارٍ تهيئة قاعدة البيانات...');

// Hash the admin password
const adminPassword = bcrypt.hashSync('admin123', 10);

// Seed admin user
db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', ?, 'admin')
`).run(adminPassword);
console.log('تم إنشاء المستخدم المسؤول (اسم المستخدم: admin، كلمة المرور: admin123)');

// Seed classrooms
const classrooms = [
  { id: 1, name: 'فصل أ', capacity: 30 },
  { id: 2, name: 'فصل ب', capacity: 25 },
  { id: 3, name: 'فصل ج', capacity: 20 }
];

const insertClassroom = db.prepare(
  'INSERT OR IGNORE INTO classrooms (id, name, capacity) VALUES (?, ?, ?)'
);
for (const c of classrooms) {
  insertClassroom.run(c.id, c.name, c.capacity);
}
console.log('تم إنشاء الفصول:', classrooms.map(c => c.name).join('، '));

// Seed teachers
const teachers = [
  { id: 1, name: 'أحمد الحسن', specialty: 'الرياضيات' },
  { id: 2, name: 'فاطمة الراشد', specialty: 'الفيزياء' },
  { id: 3, name: 'عمر السعيد', specialty: 'الكيمياء' },
  { id: 4, name: 'سارة المنصور', specialty: 'اللغة الإنجليزية' },
  { id: 5, name: 'خالد الفارسي', specialty: 'اللغة العربية' }
];

const insertTeacher = db.prepare(
  'INSERT OR IGNORE INTO teachers (id, name, specialty) VALUES (?, ?, ?)'
);
for (const t of teachers) {
  insertTeacher.run(t.id, t.name, t.specialty);
}
console.log('تم إنشاء المعلمين:', teachers.map(t => t.name).join('، '));

// Seed subjects
const subjects = [
  { id: 1, name: 'الرياضيات', teacher_id: 1, weekly_sessions: 5 },
  { id: 2, name: 'الفيزياء', teacher_id: 2, weekly_sessions: 4 },
  { id: 3, name: 'الكيمياء', teacher_id: 3, weekly_sessions: 3 },
  { id: 4, name: 'اللغة الإنجليزية', teacher_id: 4, weekly_sessions: 4 },
  { id: 5, name: 'اللغة العربية', teacher_id: 5, weekly_sessions: 3 }
];

const insertSubject = db.prepare(
  'INSERT OR IGNORE INTO subjects (id, name, teacher_id, weekly_sessions) VALUES (?, ?, ?, ?)'
);
for (const s of subjects) {
  insertSubject.run(s.id, s.name, s.teacher_id, s.weekly_sessions);
}
console.log('تم إنشاء المواد:', subjects.map(s => s.name).join('، '));

// Seed sample students
const students = [
  { name: 'علي العامري', student_id: 'STU-001', class_name: 'الشعبة أ' },
  { name: 'نور الدين', student_id: 'STU-002', class_name: 'الشعبة أ' },
  { name: 'مريم حسن', student_id: 'STU-003', class_name: 'الشعبة أ' },
  { name: 'يوسف خليل', student_id: 'STU-004', class_name: 'الشعبة أ' },
  { name: 'ليلى منصور', student_id: 'STU-005', class_name: 'الشعبة أ' },
  { name: 'عمر فاروق', student_id: 'STU-006', class_name: 'الشعبة ب' },
  { name: 'هدى ناصر', student_id: 'STU-007', class_name: 'الشعبة ب' },
  { name: 'كريم صالح', student_id: 'STU-008', class_name: 'الشعبة ب' },
  { name: 'أميرة يوسف', student_id: 'STU-009', class_name: 'الشعبة ب' },
  { name: 'طارق إسماعيل', student_id: 'STU-010', class_name: 'الشعبة ب' }
];

const insertStudent = db.prepare(
  'INSERT OR IGNORE INTO students (name, student_id, class_name) VALUES (?, ?, ?)'
);
for (const s of students) {
  insertStudent.run(s.name, s.student_id, s.class_name);
}
console.log('تم إنشاء الطلاب:', students.length, 'طالب في الشعبة أ والشعبة ب');

console.log('\nتمت تهيئة قاعدة البيانات بنجاح!');
console.log('قم بتشغيل "npm start" لبدء الخادم.');
