# Online Learning Platform (Full-Stack)

A simplified online learning platform with two roles: Instructor and Student. Instructors can create courses and lectures (reading or quiz). Students can browse courses, view lectures sequentially, complete readings, take quizzes, and track progress. Implements end-to-end functionality per the assignment.

## Tech Choices
- Backend: Node.js (Express), SQLite (better-sqlite3), JWT auth (jsonwebtoken), bcrypt for password hashing.
  - Rationale: Fast to develop; SQLite is file-based and requires no external setup, while still supporting relational modeling and constraints.
- Frontend: Vite + Vanilla JS.
  - Rationale: Lightweight, no framework overhead, clear state and API handling to focus on required functionality.

## Data Model
- users: id, email, password_hash, role (instructor|student)
- courses: id, title, description, instructor_id
- lectures: id, course_id, order_index, type (reading|quiz), title, content (for reading)
- questions: id, lecture_id, text
- options: id, question_id, text, is_correct
- progress: user_id, course_id, lecture_id, status (completed|passed_quiz), score, total, passed

## API (REST) Overview
- POST /api/auth/register {email,password,role}
- POST /api/auth/login {email,password}
- GET /api/me (auth)
- POST /api/courses (auth: instructor)
- POST /api/courses/:courseId/lectures (auth: instructor)
- GET /api/courses
- GET /api/courses/:courseId
- GET /api/lectures/:lectureId
- POST /api/lectures/:lectureId/complete (auth) – mark reading lecture complete
- POST /api/lectures/:lectureId/submit (auth) – submit quiz answers, graded server-side
- GET /api/courses/:courseId/progress (auth)

## Setup and Run (macOS)

Prerequisites: Node.js 18+ (check with `node -v`)

1) Backend
```
cd "Online Learning Platform/server"
npm install
npm run dev
```
- API will start at http://localhost:4000
- Uses a local SQLite file at server/data/olp.sqlite
- Set JWT_SECRET in environment for production; a default is used for local dev.

2) Frontend
```
cd "Online Learning Platform/client"
npm install
npm run dev
```
- Vite dev server will open (default http://localhost:5173)
- The frontend expects the backend at http://localhost:4000. To change, create a `.env` in client:
```
VITE_API_URL=http://localhost:4000
```

## Instructor Flow
- Register with role "instructor".
- Create a course from Instructor page.
- Create lectures for the course:
  - Reading: Provide content (text or URL).
  - Quiz: Provide JSON for questions, each with options and at least one correct option.

## Student Flow
- Register with role "student".
- Browse Courses, open a course, and view lectures sequentially.
- Reading lecture: mark as complete.
- Quiz lecture: answer and submit; score is calculated server-side, pass with >=70%.
- View progress per course.

## Notes
- Error handling returns JSON with `error` message and appropriate HTTP codes.
- CORS enabled for local dev.
- Sequential enforcement is via the UI (open next lecture from course view), but can be strengthened by adding checks server-side if required.

## Bonus (Optional Extensions)
- Uploads: Added endpoint to receive file uploads for lecture content (e.g., images or PDFs) and serve them statically.
- Search: Added query filters to GET /api/courses (e.g., `?q=...`).
- Responsive: Frontend is responsive with simple CSS grid/cards; can be enhanced via a CSS framework.

## Submission
- Initialized a git repo in this directory and commit regularly.
- Pushed to a public Git repository (GitHub).
