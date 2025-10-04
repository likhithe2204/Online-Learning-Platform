import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, init, getNextLectureOrderIndex, hasCompletedLecture } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const app = express();

// Init DB
init();
seedIfEmpty();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authRequired(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function roleRequired(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// --------- Auth Routes ---------
app.post('/api/auth/register', (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role || !['instructor', 'student'].includes(role)) {
    return res.status(400).json({ error: 'email, password and role (instructor|student) required' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) return res.status(409).json({ error: 'User already exists' });
  const password_hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (email,password_hash,role) VALUES (?,?,?)')
    .run(email.toLowerCase(), password_hash, role);
  const user = { id: info.lastInsertRowid, email: email.toLowerCase(), role };
  const token = signToken(user);
  res.json({ user, token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!row) return res.status(401).json({ error: 'Invalid credentials' });
  if (!bcrypt.compareSync(password, row.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
  const user = { id: row.id, email: row.email, role: row.role };
  const token = signToken(user);
  res.json({ user, token });
});

app.get('/api/me', authRequired, (req, res) => {
  res.json({ user: req.user });
});

// --------- Instructor: Courses & Lectures ---------
app.post('/api/courses', authRequired, roleRequired('instructor'), (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !description) return res.status(400).json({ error: 'title and description required' });
  const info = db.prepare('INSERT INTO courses (title,description,instructor_id) VALUES (?,?,?)')
    .run(title, description, req.user.id);
  res.status(201).json({ id: info.lastInsertRowid, title, description });
});

app.post('/api/courses/:courseId/lectures', authRequired, roleRequired('instructor'), (req, res) => {
  const courseId = Number(req.params.courseId);
  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  if (course.instructor_id !== req.user.id) return res.status(403).json({ error: 'Not your course' });

  const { type, title, content, questions } = req.body || {};
  if (!['reading', 'quiz'].includes(type)) return res.status(400).json({ error: 'type must be reading|quiz' });
  if (!title) return res.status(400).json({ error: 'title required' });

  const order_index = getNextLectureOrderIndex(courseId);
  const info = db.prepare('INSERT INTO lectures (course_id, order_index, type, title, content) VALUES (?,?,?,?,?)')
    .run(courseId, order_index, type, title, type === 'reading' ? (content || '') : null);
  const lectureId = info.lastInsertRowid;

  if (type === 'quiz') {
    if (!Array.isArray(questions) || questions.length === 0) return res.status(400).json({ error: 'questions required for quiz' });
    const insertQ = db.prepare('INSERT INTO questions (lecture_id, text) VALUES (?,?)');
    const insertOpt = db.prepare('INSERT INTO options (question_id, text, is_correct) VALUES (?,?,?)');
    for (const q of questions) {
      if (!q.text || !Array.isArray(q.options) || q.options.length < 2) return res.status(400).json({ error: 'invalid question' });
      const iq = insertQ.run(lectureId, q.text);
      for (const opt of q.options) {
        if (typeof opt.text !== 'string' || typeof opt.is_correct !== 'boolean') return res.status(400).json({ error: 'invalid option' });
        insertOpt.run(iq.lastInsertRowid, opt.text, opt.is_correct ? 1 : 0);
      }
      if (!q.options.some(o => o.is_correct)) return res.status(400).json({ error: 'at least one correct option required' });
    }
  }

  res.status(201).json({ id: lectureId, course_id: courseId, order_index, type, title });
});

// --------- Student: Browse / View / Attempt Quiz ---------
app.get('/api/courses', (req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.title, c.description, c.created_at, u.email AS instructor_email,
           (SELECT COUNT(*) FROM lectures l WHERE l.course_id = c.id) AS lectures
    FROM courses c JOIN users u ON u.id = c.instructor_id ORDER BY c.created_at DESC
  `).all();
  res.json(rows);
});

app.get('/api/courses/:courseId', (req, res) => {
  const id = Number(req.params.courseId);
  const course = db.prepare('SELECT id, title, description, instructor_id, created_at FROM courses WHERE id = ?').get(id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  const lectures = db.prepare('SELECT id, order_index, type, title, content FROM lectures WHERE course_id = ? ORDER BY order_index ASC').all(id);
  res.json({ ...course, lectures });
});

app.get('/api/lectures/:lectureId', (req, res) => {
  const lectureId = Number(req.params.lectureId);
  const lecture = db.prepare('SELECT id, course_id, order_index, type, title, content FROM lectures WHERE id = ?').get(lectureId);
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (lecture.type === 'quiz') {
    const questions = db.prepare('SELECT id, text FROM questions WHERE lecture_id = ?').all(lectureId);
    const options = db.prepare('SELECT id, question_id, text FROM options WHERE question_id IN (SELECT id FROM questions WHERE lecture_id = ?)').all(lectureId);
    const grouped = questions.map(q => ({
      id: q.id,
      text: q.text,
      options: options.filter(o => o.question_id === q.id).map(o => ({ id: o.id, text: o.text }))
    }));
    return res.json({ ...lecture, questions: grouped });
  }
  res.json(lecture);
});

// Progress: mark reading complete when viewed
app.post('/api/lectures/:lectureId/complete', authRequired, (req, res) => {
  const lectureId = Number(req.params.lectureId);
  const lecture = db.prepare('SELECT id, course_id, type FROM lectures WHERE id = ?').get(lectureId);
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (lecture.type !== 'reading') return res.status(400).json({ error: 'Only for reading lectures' });
  if (hasCompletedLecture(req.user.id, lectureId)) return res.json({ status: 'already_completed' });
  db.prepare('INSERT INTO progress (user_id, course_id, lecture_id, status) VALUES (?,?,?,?)')
    .run(req.user.id, lecture.course_id, lecture.id, 'completed');
  res.json({ status: 'completed' });
});

// Submit quiz: grade server-side, record pass/fail
app.post('/api/lectures/:lectureId/submit', authRequired, (req, res) => {
  const lectureId = Number(req.params.lectureId);
  const lecture = db.prepare('SELECT id, course_id, type FROM lectures WHERE id = ?').get(lectureId);
  if (!lecture) return res.status(404).json({ error: 'Lecture not found' });
  if (lecture.type !== 'quiz') return res.status(400).json({ error: 'Not a quiz lecture' });
  const { answers } = req.body || {};
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'answers object required' });

  const questions = db.prepare('SELECT id FROM questions WHERE lecture_id = ?').all(lectureId);
  let score = 0; const total = questions.length;
  for (const q of questions) {
    const selectedOptionId = Number(answers[q.id]);
    if (!selectedOptionId) continue;
    const opt = db.prepare('SELECT is_correct FROM options WHERE id = ? AND question_id = ?').get(selectedOptionId, q.id);
    if (opt && opt.is_correct) score++;
  }
  const passed = total > 0 ? (score / total) >= 0.7 : true;

  const existed = hasCompletedLecture(req.user.id, lectureId);
  if (!existed) {
    db.prepare('INSERT INTO progress (user_id, course_id, lecture_id, status, score, total, passed) VALUES (?,?,?,?,?,?,?)')
      .run(req.user.id, lecture.course_id, lecture.id, 'passed_quiz', score, total, passed ? 1 : 0);
  } else {
    db.prepare('UPDATE progress SET score=?, total=?, passed=? WHERE user_id=? AND lecture_id=?')
      .run(score, total, passed ? 1 : 0, req.user.id, lecture.id);
  }
  res.json({ score, total, passed });
});

// Progress summary per course for a user
app.get('/api/courses/:courseId/progress', authRequired, (req, res) => {
  const courseId = Number(req.params.courseId);
  const total = db.prepare('SELECT COUNT(*) AS cnt FROM lectures WHERE course_id = ?').get(courseId)?.cnt || 0;
  const completed = db.prepare('SELECT COUNT(*) AS cnt FROM progress WHERE user_id = ? AND course_id = ?').get(req.user.id, courseId)?.cnt || 0;
  res.json({ completed, total, ratio: total ? completed / total : 0 });
});

// Per-lecture completion for sequential gating
app.get('/api/courses/:courseId/progress/lectures', authRequired, (req, res) => {
  const courseId = Number(req.params.courseId);
  const rows = db.prepare('SELECT lecture_id FROM progress WHERE user_id = ? AND course_id = ?').all(req.user.id, courseId);
  res.json({ completedLectureIds: rows.map(r => r.lecture_id) });
});

// Error handler fallback
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

function seedIfEmpty() {
  try {
    const courseCount = db.prepare('SELECT COUNT(*) AS c FROM courses').get().c;
    if (courseCount >= 20) { console.log('Seed: sufficient courses already exist'); return; }

    // Ensure at least one instructor and one student
    let instr = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('instructor');
    if (!instr) {
      const hash = bcrypt.hashSync('password', 10);
      const info = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)')
        .run('instructor@example.com', hash, 'instructor');
      instr = { id: info.lastInsertRowid };
    }
    let studentRow = db.prepare('SELECT id FROM users WHERE role = ? LIMIT 1').get('student');
    if (!studentRow) {
      const shash = bcrypt.hashSync('password', 10);
      const sInfo = db.prepare('INSERT INTO users (email, password_hash, role) VALUES (?,?,?)')
        .run('student@example.com', shash, 'student');
      studentRow = { id: sInfo.lastInsertRowid };
    }

    const topics = [
      ['JavaScript Foundations','Learn JavaScript fundamentals: runtime, variables, types, functions, and control flow.'],
      ['HTML & CSS Essentials','Build semantic HTML with responsive, modern CSS layouts.'],
      ['Git & GitHub','Version control basics: commits, branches, merges, and pull requests.'],
      ['Linux Basics','Filesystem, permissions, processes, and essential CLI commands.'],
      ['Data Structures in JS','Arrays, objects, sets, maps; complexity and practical patterns.'],
      ['Algorithms Basics','Sorting, searching, recursion, and problem decomposition.'],
      ['HTTP & REST','Requests, responses, status codes, headers, and RESTful APIs.'],
      ['Node.js Fundamentals','Event loop, modules, npm, and building CLIs.'],
      ['Express.js Essentials','Routing, middleware, error handling, and APIs.'],
      ['SQL Basics','Relational modeling, SELECT/INSERT/UPDATE/DELETE, joins.'],
      ['SQLite Practical','File-based DB, schema design, indexes, transactions.'],
      ['NoSQL Basics','Documents vs key-value, modeling trade-offs, eventual consistency.'],
      ['TypeScript Basics','Types, interfaces, generics, and incremental adoption.'],
      ['Web Accessibility','ARIA, semantics, focus management, keyboard navigation.'],
      ['Testing Fundamentals','Unit, integration, E2E testing and test pyramids.'],
      ['Security Basics','OWASP Top 10, input validation, auth, and secrets handling.'],
      ['Cloud Basics','Compute, storage, networking, and shared responsibility model.'],
      ['Docker Basics','Images, containers, volumes, and Dockerfiles.'],
      ['CI/CD Essentials','Build pipelines, tests, artifact storage, and deployments.'],
      ['System Design Intro','Scalability, reliability, load balancers, and caching.']
    ];

    const insertCourse = db.prepare('INSERT INTO courses (title, description, instructor_id) VALUES (?,?,?)');
    const insertLecture = db.prepare('INSERT INTO lectures (course_id, order_index, type, title, content) VALUES (?,?,?,?,?)');
    const insertQ = db.prepare('INSERT INTO questions (lecture_id, text) VALUES (?,?)');
    const insertO = db.prepare('INSERT INTO options (question_id, text, is_correct) VALUES (?,?,?)');

    let orderIdx;
    for (const [title, desc] of topics) {
      const c = insertCourse.run(title, desc, instr.id);
      const cid = c.lastInsertRowid;
      orderIdx = 1;
      // Reading 1
      insertLecture.run(cid, orderIdx++, 'reading', `${title}: Overview`,
        `<p>${desc}</p><ul><li>Concepts and terminology</li><li>Use-cases and best practices</li><li>Common pitfalls</li></ul>`);
      // Reading 2
      insertLecture.run(cid, orderIdx++, 'reading', `${title}: Core Techniques`,
        `<p>Hands-on techniques and patterns:</p><ol><li>Setup and tooling</li><li>Core APIs/features</li><li>Performance tips</li></ol>`);
      // Quiz
      const qlec = insertLecture.run(cid, orderIdx++, 'quiz', `${title}: Quick Check`, null);
      const qlid = qlec.lastInsertRowid;
      // 3 generic but relevant questions
      const q1 = insertQ.run(qlid, `Which statement about ${title} is true?`).lastInsertRowid;
      insertO.run(q1, 'It solves every problem perfectly', 0);
      insertO.run(q1, 'It has trade-offs that must be understood', 1);
      insertO.run(q1, 'It eliminates the need for design', 0);
      insertO.run(q1, 'It is always the wrong choice', 0);

      const q2 = insertQ.run(qlid, `In practice, ${title} requires:`).lastInsertRowid;
      insertO.run(q2, 'Memorizing without context', 0);
      insertO.run(q2, 'Applying concepts to real problems', 1);
      insertO.run(q2, 'Ignoring performance and users', 0);
      insertO.run(q2, 'Copying code blindly', 0);

      const q3 = insertQ.run(qlid, `A key best practice in ${title} is:`).lastInsertRowid;
      insertO.run(q3, 'Avoid testing or validation', 0);
      insertO.run(q3, 'Use clear structure and iterate', 1);
      insertO.run(q3, 'Never document anything', 0);
      insertO.run(q3, 'Prefer magic over clarity', 0);
    }

    console.log(`Seeded ${topics.length} courses with readings and quizzes.`);
  } catch (e) {
    console.warn('Seed failed:', e);
  }
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
