const bcrypt = require('bcryptjs');
const db = require('./models/db');

/**
 * Seed script for the School Timetable Management System.
 * Populates the database with initial data:
 * - Admin user
 * - Classrooms
 * - Teachers
 * - Subjects
 * - Sample students
 *
 * Uses INSERT OR IGNORE to safely handle re-runs without duplicate errors.
 */

console.log('Seeding database...');

// Hash the admin password
const adminPassword = bcrypt.hashSync('admin123', 10);

// Seed admin user
db.prepare(`
  INSERT OR IGNORE INTO users (id, username, password, role) VALUES (1, 'admin', ?, 'admin')
`).run(adminPassword);
console.log('✓ Admin user created (username: admin, password: admin123)');

// Seed classrooms
const classrooms = [
  { id: 1, name: 'Room 101', capacity: 30 },
  { id: 2, name: 'Room 102', capacity: 25 },
  { id: 3, name: 'Lab A', capacity: 20 }
];

const insertClassroom = db.prepare(
  'INSERT OR IGNORE INTO classrooms (id, name, capacity) VALUES (?, ?, ?)'
);
for (const c of classrooms) {
  insertClassroom.run(c.id, c.name, c.capacity);
}
console.log('✓ Classrooms created:', classrooms.map(c => c.name).join(', '));

// Seed teachers
const teachers = [
  { id: 1, name: 'Ahmed Al-Hassan', specialty: 'Mathematics' },
  { id: 2, name: 'Fatima Al-Rashid', specialty: 'Physics' },
  { id: 3, name: 'Omar Al-Said', specialty: 'Chemistry' },
  { id: 4, name: 'Sara Al-Mansour', specialty: 'English' },
  { id: 5, name: 'Khalid Al-Farsi', specialty: 'Arabic' }
];

const insertTeacher = db.prepare(
  'INSERT OR IGNORE INTO teachers (id, name, specialty) VALUES (?, ?, ?)'
);
for (const t of teachers) {
  insertTeacher.run(t.id, t.name, t.specialty);
}
console.log('✓ Teachers created:', teachers.map(t => t.name).join(', '));

// Seed subjects (each assigned to a teacher)
const subjects = [
  { id: 1, name: 'Mathematics', teacher_id: 1, weekly_sessions: 5 },
  { id: 2, name: 'Physics', teacher_id: 2, weekly_sessions: 4 },
  { id: 3, name: 'Chemistry', teacher_id: 3, weekly_sessions: 3 },
  { id: 4, name: 'English', teacher_id: 4, weekly_sessions: 4 },
  { id: 5, name: 'Arabic', teacher_id: 5, weekly_sessions: 3 }
];

const insertSubject = db.prepare(
  'INSERT OR IGNORE INTO subjects (id, name, teacher_id, weekly_sessions) VALUES (?, ?, ?, ?)'
);
for (const s of subjects) {
  insertSubject.run(s.id, s.name, s.teacher_id, s.weekly_sessions);
}
console.log('✓ Subjects created:', subjects.map(s => s.name).join(', '));

// Seed sample students across 2 classes
const students = [
  // Class 10-A (5 students)
  { name: 'Ali Al-Amiri', student_id: 'STU-001', class_name: 'Class 10-A' },
  { name: 'Noor Al-Din', student_id: 'STU-002', class_name: 'Class 10-A' },
  { name: 'Maryam Hassan', student_id: 'STU-003', class_name: 'Class 10-A' },
  { name: 'Youssef Khalil', student_id: 'STU-004', class_name: 'Class 10-A' },
  { name: 'Layla Mansour', student_id: 'STU-005', class_name: 'Class 10-A' },
  // Class 10-B (5 students)
  { name: 'Omar Farouk', student_id: 'STU-006', class_name: 'Class 10-B' },
  { name: 'Huda Nasser', student_id: 'STU-007', class_name: 'Class 10-B' },
  { name: 'Karim Saleh', student_id: 'STU-008', class_name: 'Class 10-B' },
  { name: 'Amira Yusuf', student_id: 'STU-009', class_name: 'Class 10-B' },
  { name: 'Tariq Ismail', student_id: 'STU-010', class_name: 'Class 10-B' }
];

const insertStudent = db.prepare(
  'INSERT OR IGNORE INTO students (name, student_id, class_name) VALUES (?, ?, ?)'
);
for (const s of students) {
  insertStudent.run(s.name, s.student_id, s.class_name);
}
console.log('✓ Students created:', students.length, 'students across Class 10-A and Class 10-B');

console.log('\nDatabase seeding complete!');
console.log('Run "npm start" to start the server.');
