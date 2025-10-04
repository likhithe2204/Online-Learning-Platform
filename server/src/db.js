import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'olp.sqlite');

export const db = new Database(DB_PATH);
console.log('[DB]', DB_PATH);
db.pragma('foreign_keys = ON');

export function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('instructor','student')),
      created_at TEXT NOT NULL DEFAULT (DATETIME('now'))
    );

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      instructor_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
      FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lectures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('reading','quiz')),
      title TEXT NOT NULL,
      content TEXT, -- for reading (text or URL)
      created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      UNIQUE(course_id, order_index)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lecture_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_correct INTEGER NOT NULL CHECK(is_correct IN (0,1)),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      course_id INTEGER NOT NULL,
      lecture_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('completed','passed_quiz')),
      score INTEGER,
      total INTEGER,
      passed INTEGER CHECK(passed IN (0,1)),
      created_at TEXT NOT NULL DEFAULT (DATETIME('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
      FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE,
      UNIQUE(user_id, lecture_id)
    );

    CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
    CREATE INDEX IF NOT EXISTS idx_lectures_course ON lectures(course_id);
    CREATE INDEX IF NOT EXISTS idx_questions_lecture ON questions(lecture_id);
    CREATE INDEX IF NOT EXISTS idx_options_question ON options(question_id);
    CREATE INDEX IF NOT EXISTS idx_progress_user_course ON progress(user_id, course_id);
  `);
}

export function getNextLectureOrderIndex(courseId) {
  const row = db.prepare('SELECT COALESCE(MAX(order_index), 0) AS maxIdx FROM lectures WHERE course_id = ?').get(courseId);
  return (row?.maxIdx || 0) + 1;
}

export function getCourseLectureCount(courseId) {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM lectures WHERE course_id = ?').get(courseId);
  return row.cnt;
}

export function getUserProgressCount(userId, courseId) {
  const row = db.prepare('SELECT COUNT(*) AS cnt FROM progress WHERE user_id = ? AND course_id = ?').get(userId, courseId);
  return row.cnt;
}

export function hasCompletedLecture(userId, lectureId) {
  const row = db.prepare('SELECT 1 FROM progress WHERE user_id = ? AND lecture_id = ?').get(userId, lectureId);
  return !!row;
}
