const express = require('express');
const db = require('../models/db');

const router = express.Router();

/**
 * GET /api/classrooms
 * Lists all classrooms ordered by id.
 */
router.get('/', (req, res) => {
  try {
    const classrooms = db.prepare('SELECT * FROM classrooms ORDER BY id').all();
    return res.json(classrooms);
  } catch (err) {
    console.error('Error fetching classrooms:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/classrooms
 * Creates a new classroom.
 * Body: { name, capacity? }
 */
router.post('/', (req, res) => {
  try {
    const { name, capacity } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Classroom name is required' });
    }

    const cap = capacity !== undefined ? capacity : 30;

    const result = db.prepare('INSERT INTO classrooms (name, capacity) VALUES (?, ?)').run(name, cap);

    const newClassroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json(newClassroom);
  } catch (err) {
    console.error('Error creating classroom:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/classrooms/:id
 * Updates an existing classroom by ID.
 * Body: { name?, capacity? }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, capacity } = req.body;

    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    const updateName = name !== undefined ? name : classroom.name;
    const updateCapacity = capacity !== undefined ? capacity : classroom.capacity;

    db.prepare('UPDATE classrooms SET name = ?, capacity = ? WHERE id = ?').run(updateName, updateCapacity, id);

    const updated = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id);

    return res.json(updated);
  } catch (err) {
    console.error('Error updating classroom:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/classrooms/:id
 * Deletes a classroom by ID.
 */
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const classroom = db.prepare('SELECT * FROM classrooms WHERE id = ?').get(id);
    if (!classroom) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    db.prepare('DELETE FROM classrooms WHERE id = ?').run(id);

    return res.json({ success: true, message: 'Classroom deleted' });
  } catch (err) {
    console.error('Error deleting classroom:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
