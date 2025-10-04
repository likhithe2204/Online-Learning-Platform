import './styles.css';

// Surface silent errors to help debug blank screen issues
window.onerror = function (msg, src, lineno, colno, error) {
  // Use alert for high visibility during local dev
  alert(`Error: ${msg}\n${src}:${lineno}:${colno}`);
};
window.onunhandledrejection = function (event) {
  const reason = event?.reason;
  const message = reason?.message || String(reason || 'Unknown error');
  alert(`Unhandled Rejection: ${message}`);
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));
const ellipsize = (str, max=140) => (str?.length > max ? str.slice(0, max-1) + '…' : (str || ''));
const thumbFor = (title) => `https://source.unsplash.com/featured/600x360/?${encodeURIComponent(title.replace(/\s+/g, ','))}`;

// 400x400 premium SVG thumbnails per course topic (no external deps)
const normalize = (t) => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const courseImageConfig = {
  'javascript-foundations': { label: 'JS', c1: '#0EA5E9', c2: '#22C55E' },
  'html-css-essentials': { label: 'HTML/CSS', c1: '#F97316', c2: '#0EA5E9' },
  'git-github': { label: 'Git', c1: '#EF4444', c2: '#64748B' },
  'linux-basics': { label: 'Linux', c1: '#22C55E', c2: '#64748B' },
  'data-structures-in-js': { label: 'DS', c1: '#8B5CF6', c2: '#06B6D4' },
  'algorithms-basics': { label: 'Algo', c1: '#06B6D4', c2: '#22C55E' },
  'http-rest': { label: 'HTTP', c1: '#F59E0B', c2: '#0EA5E9' },
  'node-js-fundamentals': { label: 'Node', c1: '#22C55E', c2: '#0EA5E9' },
  'express-js-essentials': { label: 'Express', c1: '#64748B', c2: '#0EA5E9' },
  'sql-basics': { label: 'SQL', c1: '#0EA5E9', c2: '#8B5CF6' },
  'sqlite-practical': { label: 'SQLite', c1: '#14B8A6', c2: '#0EA5E9' },
  'nosql-basics': { label: 'NoSQL', c1: '#F97316', c2: '#22C55E' },
  'typescript-basics': { label: 'TS', c1: '#3B82F6', c2: '#9333EA' },
  'web-accessibility': { label: 'a11y', c1: '#22C55E', c2: '#F59E0B' },
  'testing-fundamentals': { label: 'Test', c1: '#10B981', c2: '#8B5CF6' },
  'security-basics': { label: 'Sec', c1: '#EF4444', c2: '#0EA5E9' },
  'cloud-basics': { label: 'Cloud', c1: '#60A5FA', c2: '#A78BFA' },
  'docker-basics': { label: 'Docker', c1: '#0EA5E9', c2: '#2563EB' },
  'ci-cd-essentials': { label: 'CI/CD', c1: '#22C55E', c2: '#3B82F6' },
  'system-design-intro': { label: 'SD', c1: '#F59E0B', c2: '#EF4444' },
};

// Map to real images in client/src/assets/course-images (400x400px)
const IMG_MAP = {
  'javascript-foundations': new URL('./assets/course-images/javascript-foundations.jpg', import.meta.url).href,
  'html-css-essentials': new URL('./assets/course-images/html-css-essentials.jpg', import.meta.url).href,
  'git-github': new URL('./assets/course-images/git-github.jpg', import.meta.url).href,
  'linux-basics': new URL('./assets/course-images/linux-basics.jpg', import.meta.url).href,
  'data-structures-in-js': new URL('./assets/course-images/data-structures-in-js.jpg', import.meta.url).href,
  'algorithms-basics': new URL('./assets/course-images/algorithms-basics.jpg', import.meta.url).href,
  'http-rest': new URL('./assets/course-images/http-rest.jpg', import.meta.url).href,
  'node-js-fundamentals': new URL('./assets/course-images/node-js-fundamentals.jpg', import.meta.url).href,
  'express-js-essentials': new URL('./assets/course-images/express-js-essentials.jpg', import.meta.url).href,
  'sql-basics': new URL('./assets/course-images/sql-basics.jpg', import.meta.url).href,
  'sqlite-practical': new URL('./assets/course-images/sqlite-practical.jpg', import.meta.url).href,
  'nosql-basics': new URL('./assets/course-images/nosql-basics.jpg', import.meta.url).href,
  'typescript-basics': new URL('./assets/course-images/typescript-basics.jpg', import.meta.url).href,
  'web-accessibility': new URL('./assets/course-images/web-accessibility.jpg', import.meta.url).href,
  'testing-fundamentals': new URL('./assets/course-images/testing-fundamentals.jpg', import.meta.url).href,
  'security-basics': new URL('./assets/course-images/security-basics.jpg', import.meta.url).href,
  'cloud-basics': new URL('./assets/course-images/cloud-basics.jpg', import.meta.url).href,
  'docker-basics': new URL('./assets/course-images/docker-basics.jpg', import.meta.url).href,
  'ci-cd-essentials': new URL('./assets/course-images/ci-cd-essentials.jpg', import.meta.url).href,
  'system-design-intro': new URL('./assets/course-images/system-design-intro.jpg', import.meta.url).href,
};

function svgData(label, title, c1, c2) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="rgba(0,0,0,0.35)"/>
      </filter>
    </defs>
    <rect width="400" height="400" rx="28" fill="url(#g)"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Inter, system-ui, -apple-system" font-size="72" font-weight="800" filter="url(#s)">${label}</text>
    <text x="50%" y="365" dominant-baseline="middle" text-anchor="middle" fill="rgba(255,255,255,.9)" font-family="Inter, system-ui, -apple-system" font-size="18" font-weight="600">${title}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}
function imageForTitle(title) {
  const key = normalize(title);
  if (IMG_MAP[key]) return IMG_MAP[key];
  const cfg = courseImageConfig[key] || { label: (title || '').split(' ').map(w => w[0]).join('').slice(0,3).toUpperCase(), c1: '#0EA5E9', c2: '#22C55E' };
  return svgData(cfg.label, title, cfg.c1, cfg.c2);
}

const h = (strings, ...values) => {
  // Combine template strings and values into a single HTML string
  let out = '';
  for (let i = 0; i < strings.length; i++) {
    out += strings[i] + (i < values.length ? values[i] : '');
  }
  return out;
};

const store = {
  get token() { return localStorage.getItem('token'); },
  set token(v) { v ? localStorage.setItem('token', v) : localStorage.removeItem('token'); },
  get user() { const s = localStorage.getItem('user'); return s ? JSON.parse(s) : null; },
  set user(v) { v ? localStorage.setItem('user', JSON.stringify(v)) : localStorage.removeItem('user'); },
};

function headers() {
  const h = { 'Content-Type': 'application/json' };
  if (store.token) h['Authorization'] = 'Bearer ' + store.token;
  return h;
}

async function api(path, opts={}) {
  const res = await fetch(API_URL + path, { ...opts, headers: { ...headers(), ...(opts.headers||{}) } });
  if (!res.ok) throw new Error((await res.json()).error || res.statusText);
  return res.json();
}

function nav() {
  const u = store.user;
  return h`
    <header class="nav">
      <div class="container">
        <a href="#/" class="logo">OLP</a>
        <nav>
          <a href="#/courses">Courses</a>
          ${u?.role === 'instructor' ? '<a href="#/instructor">Instructor</a>' : ''}
          ${u ? '<a href="#/mylearning">My Learning</a>' : ''}
          ${u ? '<button id="logout">Logout</button>' : '<a href="#/login">Login</a>'}
        </nav>
      </div>
    </header>
  `;
}

function layout(content) {
  return h`
    ${nav()}
    <main class="container" id="view">${content}</main>
  `;
}

function viewHome() {
  return h`
    <section>
      <h1>Welcome to Online Learning Platform</h1>
      <p>Browse courses, complete lectures, and track your progress.</p>
    </section>
  `;
}

async function viewCourses() {
  const u = store.user;
  const courses = await api('/api/courses');
  if (!courses.length) {
    return h`
      <section class="hero">
        <h1>Courses</h1>
        <p class="muted">No courses yet.</p>
        ${u?.role === 'instructor'
          ? '<a class="btn" href="#/instructor">Create your first course</a>'
          : '<a class="btn" href="#/">Back Home</a>'}
      </section>
    `;
  }
  return h`
    <section>
      <h1>Courses</h1>
      <div class="grid">
        ${courses.map(c => `
          <article class="card course-card">
            <div class="course-thumb"><img src="${imageForTitle(c.title)}" alt="${c.title}" style="width:100%;aspect-ratio:1/1;height:auto;object-fit:cover;border-radius:12px"></div>
            <div class="course-body">
              <h3>${c.title}</h3>
              <p class="muted">${ellipsize(c.description, 160)}</p>
              <div class="meta"><small class="muted">${c.lectures} lectures</small><small class="muted">by ${c.instructor_email}</small></div>
              <a class="btn" href="#/course/${c.id}">View</a>
            </div>
          </article>
        `).join('')}
      </div>
    </section>
  `;
}

async function viewCourse(id) {
  const course = await api(`/api/courses/${id}`);
  const u = store.user;
  let completed = [];
  if (u) {
    try { const res = await api(`/api/courses/${id}/progress/lectures`); completed = res.completedLectureIds || []; } catch (_) {}
  }
  return h`
    <section>
      <a class="btn" href="#/courses">Back</a>
      <h1>${course.title}</h1>
      <p class="muted">${course.description}</p>
      <ol>
        ${course.lectures.map((l, idx) => {
          const prevId = course.lectures[idx-1]?.id;
          const unlocked = idx === 0 || completed.includes(prevId);
          const lockBadge = unlocked ? '' : '<span class="badge">Locked</span> ';
          const action = unlocked ? `<a class="btn" href="#/lecture/${l.id}">Open</a>` : '<button class="btn" disabled>Complete previous</button>';
          return `
            <li>
              <span>${lockBadge}<strong>${l.title}</strong> — <small class="muted">${l.type}</small></span>
              <span style="display:inline-block; margin-left: 10px;">${action}</span>
            </li>
          `;
        }).join('')}
      </ol>
      ${u ? `<a class="btn" href="#/progress/${course.id}">View Progress</a>` : '<p>Login to track progress.</p>'}
    </section>
  `;
}

async function viewLecture(id) {
  const lecture = await api(`/api/lectures/${id}`);
  // Sequential gating
  let unlocked = true;
  if (store.user) {
    try {
      const course = await api(`/api/courses/${lecture.course_id}`);
      const idx = course.lectures.findIndex(l => l.id === lecture.id);
      if (idx > 0) {
        const prevId = course.lectures[idx-1].id;
        const res = await api(`/api/courses/${lecture.course_id}/progress/lectures`);
        unlocked = (res.completedLectureIds || []).includes(prevId);
      }
    } catch (_) {}
  }
  if (!unlocked) {
    return h`
      <section>
        <a class="btn" href="#/course/${lecture.course_id}">Back to Course</a>
        <div class="card"><strong>Locked</strong><p class="muted">Complete the previous lecture to unlock this one.</p></div>
      </section>
    `;
  }

  if (lecture.type === 'reading') {
    if (store.user) { try { await api(`/api/lectures/${lecture.id}/complete`, { method: 'POST' }); } catch (_) {} }
    return h`
      <section>
        <a class="btn" href="#/course/${lecture.course_id}">Back to Course</a>
        <h1>${lecture.title}</h1>
        ${lecture.content?.startsWith('http') ? `<p><a href="${lecture.content}" target="_blank">Open resource</a></p>` : `<div class="card">${lecture.content||''}</div>`}
        ${store.user ? `<button class="btn" id="mark-complete" data-id="${lecture.id}">Mark as Read</button>` : '<p>Login to mark complete.</p>'}
      </section>
    `;
  } else {
    const questions = lecture.questions;
    return h`
      <section>
        <a class="btn" href="#/course/${lecture.course_id}">Back to Course</a>
        <h1>${lecture.title}</h1>
        <form id="quiz-form" data-id="${lecture.id}" data-course="${lecture.course_id}">
          ${questions.map(q => `
            <fieldset class="card" style="transition:transform .15s ease, box-shadow .2s ease"><legend>${q.text}</legend>
              ${q.options.map(o => `
                <label style="display:block;margin:6px 0"><input type="radio" name="q${q.id}" value="${o.id}" required> ${o.text}</label>
              `).join('')}
            </fieldset>
          `).join('')}
          ${store.user ? '<button class="btn" type="submit">Submit</button>' : '<p>Login to submit.</p>'}
        </form>
        <div id="quiz-result"></div>
      </section>
    `;
  }
}

async function viewProgress(courseId) {
  const data = await api(`/api/courses/${courseId}/progress`, { headers: headers() });
  return h`
    <section>
      <a class="btn" href="#/course/${courseId}">Back</a>
      <h1>Progress</h1>
      <p>${data.completed}/${data.total} completed (${Math.round(data.ratio*100)}%)</p>
    </section>
  `;
}

function viewLogin() {
  return h`
    <section class="auth">
      <h1>Login</h1>
      <form id="login">
        <input class="input" name="email" type="email" placeholder="Email" required>
        <input class="input" name="password" type="password" placeholder="Password" required>
        <button class="btn" type="submit">Login</button>
      </form>
      <p>No account? <a href="#/register">Register</a></p>
    </section>
  `;
}

function viewRegister() {
  return h`
    <section class="auth">
      <h1>Register</h1>
      <form id="register">
        <input class="input" name="email" type="email" placeholder="Email" required>
        <input class="input" name="password" type="password" placeholder="Password" required>
        <select class="input" name="role" required>
          <option value="student">Student</option>
          <option value="instructor">Instructor</option>
        </select>
        <button class="btn" type="submit">Create account</button>
      </form>
      <p>Have an account? <a href="#/login">Login</a></p>
    </section>
  `;
}

function viewInstructor() {
  return h`
    <section>
      <h1>Instructor</h1>
      <form id="create-course" class="card">
        <h3>Create Course</h3>
        <input class="input" name="title" placeholder="Course title" required>
        <textarea class="input" name="description" placeholder="Description" required></textarea>
        <button class="btn" type="submit">Create</button>
      </form>

      <form id="create-lecture" class="card">
        <h3>Create Lecture</h3>
        <input class="input" name="courseId" placeholder="Course ID" required>
        <select class="input" name="type" required>
          <option value="reading">Reading</option>
          <option value="quiz">Quiz</option>
        </select>
        <input class="input" name="title" placeholder="Lecture title" required>
        <textarea class="input" name="content" placeholder="Reading content or leave empty for quiz"></textarea>
        <textarea class="input" name="questions" placeholder='Quiz JSON e.g. [{"text":"Q1","options":[{"text":"A","is_correct":true},{"text":"B","is_correct":false}]}]'></textarea>
        <button class="btn" type="submit">Add Lecture</button>
      </form>
    </section>
  `;
}

async function viewMyLearning() {
  const u = store.user;
  if (!u) return h`<section class="hero"><h1>My Learning</h1><p class="muted">Please <a href="#/login">login</a> to view your learning.</p></section>`;
  const courses = await api('/api/courses');
  if (!courses.length) return h`<section class="hero"><h1>My Learning</h1><p class="muted">No courses available yet.</p><a class="btn" href="#/courses">Browse</a></section>`;

  // Fetch progress per course (N small requests)
  const prog = {};
  await Promise.all(courses.map(async (c) => {
    try { prog[c.id] = await api(`/api/courses/${c.id}/progress`); } catch (_) { prog[c.id] = { completed: 0, total: c.lectures, ratio: 0 }; }
  }));

  return h`
    <section>
      <h1>My Learning</h1>
      <div class="grid">
        ${courses.map(c => {
          const p = prog[c.id] || { completed: 0, total: c.lectures, ratio: 0 };
          return `
            <article class="card">
              <h3>${c.title}</h3>
              <p class="muted">${c.description}</p>
              <div class="progress" style="margin:10px 0;"><span style="width:${Math.round((p.ratio||0)*100)}%"></span></div>
              <small class="muted">${p.completed||0}/${p.total||c.lectures} completed</small><br/>
              <a class="btn" href="#/course/${c.id}">Continue</a>
            </article>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

function router() {
  const hash = location.hash.slice(1) || '/';
  const [_, route, param] = hash.split('/');
  const app = $('#app');

  const u = store.user;
  const content = (async () => {
    switch (route) {
      case '':
        return viewHome();
      case 'courses':
        return await viewCourses();
      case 'course':
        return await viewCourse(param);
      case 'lecture':
        return await viewLecture(param);
      case 'progress':
        return await viewProgress(param);
      case 'login':
        return viewLogin();
      case 'register':
        return viewRegister();
      case 'instructor':
        return u?.role === 'instructor' ? viewInstructor() : '<p>Forbidden</p>';
      case 'mylearning':
        return await viewMyLearning();
      default:
        return '<p>Not found</p>';
    }
  })();

  Promise.resolve(content).then(html => {
    app.innerHTML = layout(html);
    bindEvents();
  }).catch(err => {
    app.innerHTML = layout(`<div class="error"><strong>Error:</strong> ${err.message}</div>`);
    bindEvents();
  });
}

function bindEvents() {
  $('#logout')?.addEventListener('click', () => { store.user = null; store.token = null; location.hash = '/'; });

  $('#login')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
      store.user = res.user; store.token = res.token; location.hash = '/courses';
    } catch (e2) { alert(e2.message); }
  });

  $('#register')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api('/api/auth/register', { method: 'POST', body: JSON.stringify(Object.fromEntries(fd)) });
      store.user = res.user; store.token = res.token; location.hash = '/courses';
    } catch (e2) { alert(e2.message); }
  });

  $('#create-course')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const res = await api('/api/courses', { method: 'POST', body: JSON.stringify({ title: fd.get('title'), description: fd.get('description') }) });
      alert('Course created with id ' + res.id);
    } catch (e2) { alert(e2.message); }
  });

  $('#create-lecture')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const type = fd.get('type');
      const payload = { type, title: fd.get('title') };
      if (type === 'reading') payload.content = fd.get('content');
      if (type === 'quiz') payload.questions = JSON.parse(fd.get('questions') || '[]');
      const courseId = fd.get('courseId');
      const res = await api(`/api/courses/${courseId}/lectures`, { method: 'POST', body: JSON.stringify(payload) });
      alert('Lecture created with id ' + res.id);
    } catch (e2) { alert('Failed: ' + e2.message); }
  });

  $('#mark-complete')?.addEventListener('click', async (e) => {
    const id = e.currentTarget.getAttribute('data-id');
    try { await api(`/api/lectures/${id}/complete`, { method: 'POST' }); alert('Marked complete'); }
    catch (e2) { alert(e2.message); }
  });

  $('#quiz-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lectureId = e.currentTarget.getAttribute('data-id');
    const courseId = e.currentTarget.getAttribute('data-course');
    const fd = new FormData(e.currentTarget);
    const answers = {};
    for (const [k, v] of fd.entries()) {
      if (k.startsWith('q')) answers[k.slice(1)] = Number(v);
    }
    try {
      const res = await api(`/api/lectures/${lectureId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
      const box = document.getElementById('quiz-result');
      if (box) {
        box.innerHTML = `<div class="card"><strong>Result:</strong> ${res.score}/${res.total} ${res.passed ? '(passed)' : '(failed)'}<div style=\"margin-top:10px\"><a class=\"btn\" href=\"#/course/${courseId}\">Back to Course</a></div></div>`;
      } else {
        alert(`Score: ${res.score}/${res.total} ${res.passed ? '(passed)' : '(failed)'}`);
      }
      location.hash = `#/course/${courseId}`;
    } catch (e2) { alert('Failed: ' + e2.message); }
  });
}

window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);
