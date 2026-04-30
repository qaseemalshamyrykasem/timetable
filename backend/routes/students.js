const express = require('express');
const db = require('../models/db');

const router = express.Router();

/**
 * GET /api/students
 * Lists all students. Optionally filters by class_name query param.
 * Query: ?class_name=X
 */
router.get('/', (req, res) => {
  try {
    const { class_name } = req.query;

    let students;
    if (class_name) {
      students = db.prepare('SELECT * FROM students WHERE class_name = ? ORDER BY id').all(class_name);
    } else {
      students = db.prepare('SELECT * FROM students ORDER BY id').all();
    }

    return res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/students
 * Creates a new student.
 * Body: { name, student_id, class_name } (all required)
 */
router.post('/', (req, res) => {
  try {
    const { name, student_id, class_name } = req.body;

    // Validate all required fields
    if (!name || !student_id || !class_name) {
      return res.status(400).json({ error: 'Name, student_id, and class_name are required' });
    }

    // Check for duplicate student_id
    const existing = db.prepare('SELECT id FROM students WHERE student_id = ?').get(student_id);
    if (existing) {
      return res.status(409).json({ error: 'Student ID already exists' });
    }

    const result = db.prepare('INSERT INTO students (name, student_id, class_name) VALUES (?, ?, ?)').run(
      name, student_id, class_name
    );

    const newStudent = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json(newStudent);
  } catch (err) {
    console.error('Error creating student:', err);
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Student ID already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/students/:id
 * Updates an existing student by ID.
 * Body: { name?, student_id?, class_name? }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, student_id, class_name } = req.body;

    // Check student exists
    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // If student_id is being changed, check for uniqueness
    if (student_id && student_id !== student.student_id) {
      const existing = db.prepare('SELECT id FROM students WHERE student_id = ? AND id != ?').get(student_id, id);
      if (existing) {
        return res.status(409).json({ error: 'Student ID already exists' });
      }
    }

    const updateName = name !== undefined ? name : student.name;
    const updateStudentId = student_id !== undefined ? student_id : student.student_id;
    const updateClassName = class_name !== undefined ? class_name : student.class_name;

    db.prepare('UPDATE students SET name = ?, student_id = ?, class_name = ? WHERE id = ?').run(
      updateName, updateStudentId, updateClassName, id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);

    return res.json(updated);
  } catch (err) {
    console.error('Error updating student:', err);
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Student ID already exists' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/students/:id
 * Deletes a student by ID.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.prepare('DELETE FROM students WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    console.error('Error deleting student:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
