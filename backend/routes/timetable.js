const express = require('express');
const db = require('../models/db');

const router = express.Router();

/** All school days in the week */
const DAYS = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday'];

/** All time slot periods */
const TIME_SLOTS = ['1', '2', '3', '4', '5'];

/**
 * GET /api/timetable
 * Gets timetable entries for a specific class.
 * Query: class_name (required)
 * Joins with subjects, teachers, and classrooms tables.
 */
router.get('/', (req, res) => {
  try {
    const { class_name } = req.query;

    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }

    const entries = db.prepare(`
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
    `).all(class_name);

    return res.json(entries);
  } catch (err) {
    console.error('Error fetching timetable:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/timetable/classes
 * Returns distinct class names from the students table.
 */
router.get('/classes', (req, res) => {
  try {
    const classes = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all();
    return res.json(classes.map(c => c.class_name));
  } catch (err) {
    console.error('Error fetching classes:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Checks whether a specific slot has a conflict for a given teacher.
 * @param {string} day - The day of the week
 * @param {string} timeSlot - The period number
 * @param {number} teacherId - The teacher's ID
 * @param {string} excludeClassName - Class name to exclude (the class being scheduled)
 * @returns {boolean} True if there is a conflict
 */
function hasTeacherConflict(day, timeSlot, teacherId, excludeClassName) {
  const conflict = db.prepare(`
    SELECT COUNT(*) as count FROM timetable
    WHERE day = ? AND time_slot = ? AND teacher_id = ? AND class_name != ?
  `).get(day, timeSlot, teacherId, excludeClassName);
  return conflict.count > 0;
}

/**
 * Checks whether a specific slot has a conflict for a given classroom.
 * @param {string} day - The day of the week
 * @param {string} timeSlot - The period number
 * @param {number} classroomId - The classroom's ID
 * @returns {boolean} True if there is a conflict
 */
function hasClassroomConflict(day, timeSlot, classroomId) {
  const conflict = db.prepare(`
    SELECT COUNT(*) as count FROM timetable
    WHERE day = ? AND time_slot = ? AND classroom_id = ?
  `).get(day, timeSlot, classroomId);
  return conflict.count > 0;
}

/**
 * Finds an available slot for a session placement.
 * Attempts to distribute sessions evenly across days before doubling up.
 * @param {string} className - The class being scheduled
 * @param {object} teacher - The teacher object with available_days and available_slots
 * @param {number} subjectId - The subject ID
 * @param {string} subjectName - The subject name (for error messages)
 * @returns {object|null} { day, time_slot } or null if no slot found
 */
function findAvailableSlot(className, teacher, subjectId, subjectName) {
  const teacherDays = JSON.parse(teacher.available_days);
  const teacherSlots = JSON.parse(teacher.available_slots);

  // Get already scheduled slots for this class (to avoid double-booking the class)
  const existingSlots = db.prepare(
    'SELECT day, time_slot FROM timetable WHERE class_name = ?'
  ).all(className);
  const existingSet = new Set(existingSlots.map(s => `${s.day}-${s.time_slot}`));

  // Get days that already have this subject for this class (for even distribution)
  const existingDaysForSubject = db.prepare(
    'SELECT day FROM timetable WHERE class_name = ? AND subject_id = ?'
  ).all(className, subjectId);
  const daysWithSubject = new Set(existingDaysForSubject.map(s => s.day));

  // Strategy: Try to place one session per day first (even distribution)
  // First pass: try days that don't have this subject yet
  for (const day of DAYS) {
    if (!teacherDays.includes(day)) continue;
    if (!daysWithSubject.has(day)) {
      for (const slot of TIME_SLOTS) {
        if (!teacherSlots.includes(slot)) continue;
        const key = `${day}-${slot}`;
        if (existingSet.has(key)) continue;
        if (hasClassroomConflict(day, slot)) continue;
        // Find an available classroom
        const classroom = findAvailableClassroom(day, slot);
        if (classroom) {
          return { day, time_slot: slot, classroom_id: classroom.id };
        }
      }
    }
  }

  // Second pass: try days that already have this subject (doubling up)
  for (const day of DAYS) {
    if (!teacherDays.includes(day)) continue;
    for (const slot of TIME_SLOTS) {
      if (!teacherSlots.includes(slot)) continue;
      const key = `${day}-${slot}`;
      if (existingSet.has(key)) continue;
      if (hasTeacherConflict(day, slot, teacher.id, className)) continue;
      const classroom = findAvailableClassroom(day, slot);
      if (classroom) {
        return { day, time_slot: slot, classroom_id: classroom.id };
      }
    }
  }

  return null;
}

/**
 * Finds the first available classroom for a given day and time slot,
 * sorted by capacity (smallest first to use space efficiently).
 * @param {string} day - The day of the week
 * @param {string} timeSlot - The period number
 * @returns {object|null} Classroom object or null if none available
 */
function findAvailableClassroom(day, timeSlot) {
  const classrooms = db.prepare(
    'SELECT * FROM classrooms ORDER BY capacity ASC'
  ).all();

  for (const classroom of classrooms) {
    if (!hasClassroomConflict(day, timeSlot, classroom.id)) {
      return classroom;
    }
  }
  return null;
}

/**
 * Generates the timetable for a single class.
 * @param {string} className - The class name to generate timetable for
 * @returns {object} { className, entries: [...], warnings: [...] }
 */
function generateTimetableForClass(className) {
  const warnings = [];

  // Get all subjects (each subject applies to all classes in this model)
  const subjects = db.prepare(`
    SELECT s.*, t.name AS teacher_name,
      t.available_days, t.available_slots
    FROM subjects s
    LEFT JOIN teachers t ON s.teacher_id = t.id
  `).all();

  if (subjects.length === 0) {
    warnings.push(`No subjects found. Please create subjects before generating timetable.`);
    return { className, entries: [], warnings };
  }

  // Delete existing timetable entries for this class
  db.prepare('DELETE FROM timetable WHERE class_name = ?').run(className);

  // Build a list of all sessions to schedule: { subject, teacher, dayPreference }
  const sessionsToSchedule = [];
  for (const subject of subjects) {
    if (!subject.teacher_id) {
      warnings.push(`Subject "${subject.name}" has no teacher assigned, skipping.`);
      continue;
    }
    for (let i = 0; i < subject.weekly_sessions; i++) {
      sessionsToSchedule.push({
        subjectId: subject.id,
        subjectName: subject.name,
        teacher: {
          id: subject.teacher_id,
          name: subject.teacher_name,
          available_days: subject.available_days,
          available_slots: subject.available_slots
        }
      });
    }
  }

  // Schedule each session
  const insertStmt = db.prepare(`
    INSERT INTO timetable (class_name, day, time_slot, subject_id, teacher_id, classroom_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  for (const session of sessionsToSchedule) {
    const slot = findAvailableSlot(
      className,
      session.teacher,
      session.subjectId,
      session.subjectName
    );

    if (slot) {
      insertStmt.run(
        className,
        slot.day,
        slot.time_slot,
        session.subjectId,
        session.teacher.id,
        slot.classroom_id
      );
    } else {
      warnings.push(
        `Could not find an available slot for "${session.subjectName}" (teacher: ${session.teacher.name})`
      );
    }
  }

  // Fetch the generated timetable
  const entries = db.prepare(`
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

  return { className, entries, warnings };
}

/**
 * POST /api/timetable/generate
 * Generates the timetable for a specific class or all classes.
 * Body: { className?: string }
 * If className is provided, generates for that class only.
 * If omitted, generates for all classes found in the students table.
 */
router.post('/generate', (req, res) => {
  try {
    const { className } = req.body;

    let classes;

    if (className) {
      // Verify the class exists
      const classCheck = db.prepare('SELECT DISTINCT class_name FROM students WHERE class_name = ?').get(className);
      if (!classCheck) {
        return res.status(404).json({ error: `Class "${className}" not found` });
      }
      classes = [className];
    } else {
      // Get all distinct classes
      const classRows = db.prepare('SELECT DISTINCT class_name FROM students ORDER BY class_name').all();
      classes = classRows.map(c => c.class_name);

      if (classes.length === 0) {
        return res.status(400).json({ error: 'No classes found. Add students first.' });
      }
    }

    // Use a transaction for atomicity
    const generateAll = db.transaction(() => {
      const results = [];
      for (const cls of classes) {
        const result = generateTimetableForClass(cls);
        results.push(result);
      }
      return results;
    });

    const results = generateAll();

    // Collect all warnings
    const allWarnings = [];
    for (const r of results) {
      allWarnings.push(...r.warnings);
    }

    return res.json({
      success: true,
      message: `Timetable generated for ${results.length} class(es)`,
      results,
      warnings: allWarnings
    });
  } catch (err) {
    console.error('Error generating timetable:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/timetable/:id
 * Updates a single timetable entry (change subject, teacher, or classroom).
 * Validates that there are no scheduling conflicts after the update.
 * Body: { subject_id?, teacher_id?, classroom_id? }
 */
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { subject_id, teacher_id, classroom_id } = req.body;

    const entry = db.prepare('SELECT * FROM timetable WHERE id = ?').get(id);
    if (!entry) {
      return res.status(404).json({ error: 'Timetable entry not found' });
    }

    const updateSubjectId = subject_id !== undefined ? subject_id : entry.subject_id;
    const updateTeacherId = teacher_id !== undefined ? teacher_id : entry.teacher_id;
    const updateClassroomId = classroom_id !== undefined ? classroom_id : entry.classroom_id;

    // Validate teacher availability if teacher_id is being changed
    if (teacher_id !== undefined && teacher_id !== null) {
      const teacher = db.prepare('SELECT * FROM teachers WHERE id = ?').get(teacher_id);
      if (!teacher) {
        return res.status(400).json({ error: 'Teacher not found' });
      }

      const teacherDays = JSON.parse(teacher.available_days);
      const teacherSlots = JSON.parse(teacher.available_slots);

      if (!teacherDays.includes(entry.day)) {
        return res.status(409).json({
          error: `Teacher "${teacher.name}" is not available on ${entry.day}`
        });
      }
      if (!teacherSlots.includes(entry.time_slot)) {
        return res.status(409).json({
          error: `Teacher "${teacher.name}" is not available at slot ${entry.time_slot}`
        });
      }

      // Check for teacher conflict (another class at same day+slot)
      const teacherConflict = db.prepare(`
        SELECT COUNT(*) as count FROM timetable
        WHERE day = ? AND time_slot = ? AND teacher_id = ? AND id != ? AND class_name != ?
      `).get(entry.day, entry.time_slot, teacher_id, id, entry.class_name);
      if (teacherConflict.count > 0) {
        return res.status(409).json({
          error: `Teacher conflict: already teaching another class at ${entry.day} slot ${entry.time_slot}`
        });
      }
    }

    // Check for classroom conflict if classroom_id is being changed
    if (classroom_id !== undefined && classroom_id !== null) {
      const classroomConflict = db.prepare(`
        SELECT COUNT(*) as count FROM timetable
        WHERE day = ? AND time_slot = ? AND classroom_id = ? AND id != ?
      `).get(entry.day, entry.time_slot, classroom_id, id);
      if (classroomConflict.count > 0) {
        return res.status(409).json({
          error: `Classroom conflict: already in use at ${entry.day} slot ${entry.time_slot}`
        });
      }
    }

    db.prepare(`
      UPDATE timetable SET subject_id = ?, teacher_id = ?, classroom_id = ? WHERE id = ?
    `).run(updateSubjectId, updateTeacherId, updateClassroomId, id);

    const updated = db.prepare(`
      SELECT t.id, t.class_name, t.day, t.time_slot,
        t.subject_id, t.teacher_id, t.classroom_id,
        s.name AS subject_name,
        te.name AS teacher_name,
        c.name AS classroom_name
      FROM timetable t
      LEFT JOIN subjects s ON t.subject_id = s.id
      LEFT JOIN teachers te ON t.teacher_id = te.id
      LEFT JOIN classrooms c ON t.classroom_id = c.id
      WHERE t.id = ?
    `).get(id);

    return res.json(updated);
  } catch (err) {
    console.error('Error updating timetable entry:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/timetable/reset
 * Resets (deletes) all timetable entries for a specific class.
 * Query: ?class_name=X (required)
 */
router.delete('/reset', (req, res) => {
  try {
    const { class_name } = req.query;

    if (!class_name) {
      return res.status(400).json({ error: 'class_name query parameter is required' });
    }

    const result = db.prepare('DELETE FROM timetable WHERE class_name = ?').run(class_name);

    return res.json({
      success: true,
      message: `Deleted ${result.changes} timetable entry(ies) for class "${class_name}"`
    });
  } catch (err) {
    console.error('Error resetting timetable:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
