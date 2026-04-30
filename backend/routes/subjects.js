const express = require('express');
const db = require('../models/db');

const router = express.Router();

/**
 * GET /api/subjects
 * Lists all subjects with their assigned teacher name.
 * Joins with teachers table.
 */
router.get('/', (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT s.*, t.name AS teacher_name, t.specialty AS teacher_specialty
      FROM subjects s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      ORDER BY s.id
    `).all();

    return res.json(subjects);
  } catch (err) {
    console.error('Error fetching subjects:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/subjects
 * Creates a new subject.
 * Body: { name, teacher_id, weekly_sessions }
 * Validates that the referenced teacher exists.
 */
router.post('/', (req, res) => {
  try {
    const { name, teacher_id, weekly_sessions } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Subject name is required' });
    }

    // Validate teacher exists if teacher_id is provided
    if (teacher_id) {
      const teacher = db.prepare('SELECT id FROM teachers WHERE id = ?').get(teacher_id);
      if (!teacher) {
        return res.status(400).json({ error: 'Teacher not found' });
      }
    }

    const sessions = weekly_sessions !== undefined ? weekly_sessions : 4;

    const result = db.prepare(
      'INSERT INTO subjects (name, teacher_id, weekly_sessions) VALUES (?, ?, ?)'
    ).run(name, teacher_id || null, sessions);

    const newSubject = db.prepare(`
      SELECT s.*, t.name AS teacher_name
      FROM subjects s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE s.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(newSubject);
  } catch (err) {
    console.error('Error creating subject:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/subjects/:id
 * Updates an existing subject by ID.
 * Body: { name?, teacher_id?, weekly_sessions? }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, teacher_id, weekly_sessions } = req.body;

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Validate teacher exists if teacher_id is being set
    if (teacher_id !== undefined && teacher_id !== null) {
      const teacher = db.prepare('SELECT id FROM teachers WHERE id = ?').get(teacher_id);
      if (!teacher) {
        return res.status(400).json({ error: 'Teacher not found' });
      }
    }

    const updateName = name !== undefined ? name : subject.name;
    const updateTeacherId = teacher_id !== undefined ? teacher_id : subject.teacher_id;
    const updateSessions = weekly_sessions !== undefined ? weekly_sessions : subject.weekly_sessions;

    db.prepare('UPDATE subjects SET name = ?, teacher_id = ?, weekly_sessions = ? WHERE id = ?').run(
      updateName, updateTeacherId, updateSessions, id
    );

    const updated = db.prepare(`
      SELECT s.*, t.name AS teacher_name
      FROM subjects s
      LEFT JOIN teachers t ON s.teacher_id = t.id
      WHERE s.id = ?
    `).get(id);

    return res.json(updated);
  } catch (err) {
    console.error('Error updating subject:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/subjects/:id
 * Deletes a subject by ID.
 * Checks if the subject is used in any timetable entries before deleting.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!subject) {
      return res.status(404).json({ error: 'Subject not found' });
    }

    // Check if subject is used in timetable
    const timetableCount = db.prepare('SELECT COUNT(*) as count FROM timetable WHERE subject_id = ?').get(id);
    if (timetableCount.count > 0) {
      return res.status(409).json({
        error: `Cannot delete subject: used in ${timetableCount.count} timetable entry(ies). Remove timetable entries first.`
      });
    }

    db.prepare('DELETE FROM subjects WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Subject deleted' });
  } catch (err) {
    console.error('Error deleting subject:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
