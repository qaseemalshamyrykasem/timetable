const express = require('express');
const db = require('../models/db');

const router = express.Router();

/**
 * GET /api/teachers
 * Lists all teachers with their subject count.
 * Joins with subjects table to count assigned subjects.
 */
router.get('/', (req, res) => {
  try {
    const teachers = db.prepare(`
      SELECT t.*,
        COALESCE(sc.subject_count, 0) AS subject_count
      FROM teachers t
      LEFT JOIN (
        SELECT teacher_id, COUNT(*) AS subject_count
        FROM subjects
        GROUP BY teacher_id
      ) sc ON t.id = sc.teacher_id
      ORDER BY t.id
    `).all();

    // Parse JSON strings for available_days and available_slots
    const parsedTeachers = teachers.map(teacher => ({
      ...teacher,
      available_days: JSON.parse(teacher.available_days),
      available_slots: JSON.parse(teacher.available_slots)
    }));

    return res.json(parsedTeachers);
  } catch (err) {
    console.error('Error fetching teachers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/teachers
 * Creates a new teacher.
 * Body: { name, specialty, available_days?, available_slots? }
 */
router.post('/', (req, res) => {
  try {
    const { name, specialty, available_days, available_slots } = req.body;

    if (!name || !specialty) {
      return res.status(400).json({ error: 'Name and specialty are required' });
    }

    const days = available_days ? JSON.stringify(available_days) : '["Saturday","Sunday","Monday","Tuesday","Wednesday"]';
    const slots = available_slots ? JSON.stringify(available_slots) : '["1","2","3","4","5"]';

    const result = db.prepare(
      'INSERT INTO teachers (name, specialty, available_days, available_slots) VALUES (?, ?, ?, ?)'
    ).run(name, specialty, days, slots);

    const newTeacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(result.lastInsertRowid);

    // Parse JSON fields for response
    newTeacher.available_days = JSON.parse(newTeacher.available_days);
    newTeacher.available_slots = JSON.parse(newTeacher.available_slots);

    return res.status(201).json(newTeacher);
  } catch (err) {
    console.error('Error creating teacher:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/teachers/:id
 * Updates an existing teacher by ID.
 * Body: { name?, specialty?, available_days?, available_slots? }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, specialty, available_days, available_slots } = req.body;

    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updateName = name !== undefined ? name : teacher.name;
    const updateSpecialty = specialty !== undefined ? specialty : teacher.specialty;
    const updateDays = available_days !== undefined ? JSON.stringify(available_days) : teacher.available_days;
    const updateSlots = available_slots !== undefined ? JSON.stringify(available_slots) : teacher.available_slots;

    db.prepare(
      'UPDATE teachers SET name = ?, specialty = ?, available_days = ?, available_slots = ? WHERE id = ?'
    ).run(updateName, updateSpecialty, updateDays, updateSlots, id);

    const updated = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    updated.available_days = JSON.parse(updated.available_days);
    updated.available_slots = JSON.parse(updated.available_slots);

    return res.json(updated);
  } catch (err) {
    console.error('Error updating teacher:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/teachers/:id
 * Deletes a teacher by ID.
 * Checks if the teacher is assigned to any subjects before deleting.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(id);
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    // Check if teacher is assigned to any subjects
    const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects WHERE teacher_id = ?').get(id);
    if (subjectCount.count > 0) {
      return res.status(409).json({
        error: `Cannot delete teacher: assigned to ${subjectCount.count} subject(s). Remove assignments first.`
      });
    }

    db.prepare('DELETE FROM teachers WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Teacher deleted' });
  } catch (err) {
    console.error('Error deleting teacher:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
