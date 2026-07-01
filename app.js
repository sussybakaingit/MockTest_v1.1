// ===== MOCK TEST CBT APPLICATION =====
// JEE-Style Computer Based Test Engine

// ===== STATE =====
let state = {
  questions: [],           // Working copy (possibly shuffled)
  originalMap: [],         // Maps shuffled index -> original question id
  optionMaps: [],          // Maps shuffled option index -> original option index per question
  currentIndex: 0,
  answers: {},             // { questionIndex: selectedOptionIndex }
  statuses: {},            // { questionIndex: 'not-visited' | 'not-answered' | 'answered' | 'marked' | 'answered-marked' }
  bookmarks: new Set(),
  timePerQuestion: {},     // { questionIndex: seconds }
  questionStartTime: null,
  timerTotal: 120 * 60,    // seconds
  timerRemaining: 120 * 60,
  timerInterval: null,
  candidateName: 'Candidate',
  submitted: false,
  startTime: null,
};

const STORAGE_KEY = 'appsc_mock_test_progress';

// ===== INITIALIZATION =====
function startTest() {
  const nameInput = document.getElementById('candidate-name').value.trim();
  const minutes = parseInt(document.getElementById('timer-minutes').value) || 120;
  const randomizeQ = document.getElementById('randomize-questions').checked;
  const randomizeO = document.getElementById('randomize-options').checked;

  state.candidateName = nameInput || 'Candidate';
  state.timerTotal = minutes * 60;
  state.timerRemaining = minutes * 60;
  state.startTime = Date.now();

  // Prepare questions
  let questions = QUESTIONS_DATA.map((q, i) => ({ ...q, originalIndex: i }));

  if (randomizeQ) {
    questions = shuffleArray(questions);
  }

  if (randomizeO) {
    state.optionMaps = [];
    questions = questions.map((q, qi) => {
      const indices = [0, 1, 2, 3];
      const shuffled = shuffleArray([...indices]);
      state.optionMaps[qi] = shuffled;
      return {
        ...q,
        options: shuffled.map(i => q.options[i]),
        correct: shuffled.indexOf(q.correct),
      };
    });
  } else {
    state.optionMaps = questions.map(() => [0, 1, 2, 3]);
  }

  state.questions = questions;
  state.originalMap = questions.map(q => q.originalIndex);

  // Initialize statuses
  for (let i = 0; i < state.questions.length; i++) {
    state.statuses[i] = 'not-visited';
    state.timePerQuestion[i] = 0;
  }

  // Try restore progress
  restoreProgress();

  // Mark first question as visited
  if (state.statuses[0] === 'not-visited') {
    state.statuses[0] = 'not-answered';
  }
  state.questionStartTime = Date.now();

  // Update UI
  document.getElementById('header-candidate-name').textContent = state.candidateName;
  document.getElementById('total-q-num').textContent = state.questions.length;

  // Switch screens
  switchScreen('exam-screen');

  // Build palette
  buildPalette();
  renderQuestion(0);
  startTimer();
  saveProgress();
}

// ===== SCREEN MANAGEMENT =====
function switchScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ===== TIMER =====
function startTimer() {
  updateTimerDisplay();
  state.timerInterval = setInterval(() => {
    state.timerRemaining--;
    updateTimerDisplay();
    if (state.timerRemaining <= 0) {
      clearInterval(state.timerInterval);
      submitTest();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const t = Math.max(0, state.timerRemaining);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const display = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  document.getElementById('timer-display').textContent = display;

  const block = document.getElementById('timer-block');
  block.classList.remove('warning', 'danger');
  if (t <= 60) block.classList.add('danger');
  else if (t <= 300) block.classList.add('warning');
}

// ===== QUESTION RENDERING =====
function renderQuestion(index) {
  // Track time for previous question
  if (state.questionStartTime && state.currentIndex !== index) {
    const elapsed = (Date.now() - state.questionStartTime) / 1000;
    state.timePerQuestion[state.currentIndex] = (state.timePerQuestion[state.currentIndex] || 0) + elapsed;
  }
  state.questionStartTime = Date.now();
  state.currentIndex = index;

  const q = state.questions[index];

  // Update header
  document.getElementById('current-q-num').textContent = index + 1;
  document.getElementById('q-badge').textContent = `Q.${index + 1}`;

  // Update status tag
  updateStatusTag(index);

  // Question text
  document.getElementById('question-text').textContent = q.text;

  // Options
  const container = document.getElementById('options-container');
  container.innerHTML = '';
  const labels = ['A', 'B', 'C', 'D'];

  q.options.forEach((opt, oi) => {
    const div = document.createElement('div');
    div.className = 'option-item';
    if (state.answers[index] === oi) div.classList.add('selected');

    div.innerHTML = `
      <div class="option-radio"></div>
      <span class="option-label">${labels[oi]}.</span>
      <span class="option-text">${opt}</span>
    `;

    div.addEventListener('click', () => selectOption(index, oi));
    container.appendChild(div);
  });

  // Update palette highlight
  updatePaletteHighlight();
  saveProgress();
}

function selectOption(qIndex, optIndex) {
  state.answers[qIndex] = optIndex;

  if (state.statuses[qIndex] === 'marked' || state.statuses[qIndex] === 'answered-marked') {
    state.statuses[qIndex] = 'answered-marked';
  } else {
    state.statuses[qIndex] = 'answered';
  }

  // Re-render options
  const options = document.querySelectorAll('.option-item');
  options.forEach((o, i) => {
    o.classList.toggle('selected', i === optIndex);
  });

  updateStatusTag(qIndex);
  updatePaletteButton(qIndex);
  updatePaletteCounts();
  saveProgress();
}

function updateStatusTag(index) {
  const tag = document.getElementById('q-status-tag');
  const status = state.statuses[index];
  const statusLabels = {
    'not-visited': 'Not Visited',
    'not-answered': 'Not Answered',
    'answered': 'Answered',
    'marked': 'Marked for Review',
    'answered-marked': 'Answered & Marked',
  };
  const statusColors = {
    'not-visited': '#9ca3af',
    'not-answered': '#dc2626',
    'answered': '#16a34a',
    'marked': '#7c3aed',
    'answered-marked': '#7c3aed',
  };
  tag.textContent = statusLabels[status] || status;
  tag.style.background = statusColors[status] || '#9ca3af';
}

// ===== NAVIGATION =====
function saveAndNext() {
  if (state.currentIndex < state.questions.length - 1) {
    // If no answer selected, mark as not-answered
    if (state.answers[state.currentIndex] === undefined && state.statuses[state.currentIndex] !== 'marked') {
      state.statuses[state.currentIndex] = 'not-answered';
    }
    goToQuestion(state.currentIndex + 1);
  }
}

function prevQuestion() {
  if (state.currentIndex > 0) {
    goToQuestion(state.currentIndex - 1);
  }
}

function goToQuestion(index) {
  if (index < 0 || index >= state.questions.length) return;

  // Mark as visited
  if (state.statuses[index] === 'not-visited') {
    state.statuses[index] = 'not-answered';
  }

  updatePaletteButton(state.currentIndex);
  renderQuestion(index);
}

function clearResponse() {
  delete state.answers[state.currentIndex];
  if (state.statuses[state.currentIndex] === 'answered-marked') {
    state.statuses[state.currentIndex] = 'marked';
  } else {
    state.statuses[state.currentIndex] = 'not-answered';
  }
  renderQuestion(state.currentIndex);
  updatePaletteButton(state.currentIndex);
  updatePaletteCounts();
}

function markForReview() {
  const idx = state.currentIndex;
  if (state.answers[idx] !== undefined) {
    state.statuses[idx] = 'answered-marked';
  } else {
    state.statuses[idx] = 'marked';
  }
  updatePaletteButton(idx);
  updatePaletteCounts();

  // Move to next
  if (idx < state.questions.length - 1) {
    goToQuestion(idx + 1);
  } else {
    renderQuestion(idx);
  }
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  if (state.submitted) return;
  const examScreen = document.getElementById('exam-screen');
  if (!examScreen.classList.contains('active')) return;

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    saveAndNext();
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    prevQuestion();
  }
});

// ===== PALETTE =====
function buildPalette() {
  const grid = document.getElementById('palette-grid');
  grid.innerHTML = '';

  for (let i = 0; i < state.questions.length; i++) {
    const btn = document.createElement('button');
    btn.className = `pal-btn status-${state.statuses[i]}`;
    btn.textContent = i + 1;
    btn.id = `pal-${i}`;
    if (i === state.currentIndex) btn.classList.add('current');
    btn.addEventListener('click', () => goToQuestion(i));
    grid.appendChild(btn);
  }
  updatePaletteCounts();
}

function updatePaletteButton(index) {
  const btn = document.getElementById(`pal-${index}`);
  if (!btn) return;
  btn.className = `pal-btn status-${state.statuses[index]}`;
  if (index === state.currentIndex) btn.classList.add('current');
}

function updatePaletteHighlight() {
  document.querySelectorAll('.pal-btn').forEach((btn, i) => {
    btn.classList.toggle('current', i === state.currentIndex);
  });
}

function updatePaletteCounts() {
  let answered = 0, notAnswered = 0, marked = 0, answeredMarked = 0, notVisited = 0;
  for (let i = 0; i < state.questions.length; i++) {
    switch (state.statuses[i]) {
      case 'answered': answered++; break;
      case 'not-answered': notAnswered++; break;
      case 'marked': marked++; break;
      case 'answered-marked': answeredMarked++; break;
      default: notVisited++; break;
    }
  }
  document.getElementById('pal-answered').textContent = answered;
  document.getElementById('pal-not-answered').textContent = notAnswered;
  document.getElementById('pal-marked').textContent = marked;
  document.getElementById('pal-answered-marked').textContent = answeredMarked;
  document.getElementById('pal-not-visited').textContent = notVisited;
}

function togglePalette() {
  const sidebar = document.getElementById('palette-sidebar');
  sidebar.classList.toggle('collapsed');
  const btn = document.getElementById('toggle-palette');
  btn.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
}

// ===== SUBMIT =====
function showSubmitConfirm() {
  // Track final question time
  if (state.questionStartTime) {
    const elapsed = (Date.now() - state.questionStartTime) / 1000;
    state.timePerQuestion[state.currentIndex] = (state.timePerQuestion[state.currentIndex] || 0) + elapsed;
  }

  let answered = 0, notAnswered = 0, marked = 0, answeredMarked = 0, notVisited = 0;
  for (let i = 0; i < state.questions.length; i++) {
    switch (state.statuses[i]) {
      case 'answered': answered++; break;
      case 'not-answered': notAnswered++; break;
      case 'marked': marked++; break;
      case 'answered-marked': answeredMarked++; break;
      default: notVisited++; break;
    }
  }

  const summary = document.getElementById('submit-summary');
  summary.innerHTML = `
    <div class="ss-row"><span class="ss-label">✅ Answered</span><span class="ss-value" style="color:var(--answered)">${answered + answeredMarked}</span></div>
    <div class="ss-row"><span class="ss-label">❌ Not Answered</span><span class="ss-value" style="color:var(--not-answered)">${notAnswered}</span></div>
    <div class="ss-row"><span class="ss-label">🟣 Marked for Review</span><span class="ss-value" style="color:var(--marked)">${marked}</span></div>
    <div class="ss-row"><span class="ss-label">⬜ Not Visited</span><span class="ss-value">${notVisited}</span></div>
  `;

  document.getElementById('submit-modal').classList.add('active');
}

function closeSubmitModal() {
  document.getElementById('submit-modal').classList.remove('active');
}

function submitTest() {
  closeSubmitModal();
  clearInterval(state.timerInterval);
  state.submitted = true;

  // Track last question time
  if (state.questionStartTime) {
    const elapsed = (Date.now() - state.questionStartTime) / 1000;
    state.timePerQuestion[state.currentIndex] = (state.timePerQuestion[state.currentIndex] || 0) + elapsed;
    state.questionStartTime = null;
  }

  // Clear saved progress
  localStorage.removeItem(STORAGE_KEY);

  // Calculate results
  calculateResults();
  switchScreen('result-screen');
}

// ===== RESULTS =====
function calculateResults() {
  const total = state.questions.length;
  let correct = 0, wrong = 0, skipped = 0, attempted = 0;

  for (let i = 0; i < total; i++) {
    if (state.answers[i] !== undefined) {
      attempted++;
      if (state.answers[i] === state.questions[i].correct) {
        correct++;
      } else {
        wrong++;
      }
    } else {
      skipped++;
    }
  }

  const marks = correct; // +1 per correct, 0 for wrong (no negative)
  const maxMarks = total;
  const percentage = ((marks / maxMarks) * 100).toFixed(1);
  const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : '0.0';
  const timeTaken = state.timerTotal - state.timerRemaining;
  const timeStr = formatTime(timeTaken);

  // Header card
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('result-candidate-row').innerHTML = `
    <span>👤 ${state.candidateName}</span>
    <span>📅 ${date}</span>
    <span>⏱️ Time: ${timeStr}</span>
    <span>📊 Score: ${marks}/${maxMarks}</span>
  `;

  // Score overview
  const overview = document.getElementById('score-overview');
  overview.innerHTML = `
    <div class="score-card"><div class="sc-icon">📝</div><div class="sc-value">${total}</div><div class="sc-label">Total Questions</div></div>
    <div class="score-card"><div class="sc-icon">✍️</div><div class="sc-value">${attempted}</div><div class="sc-label">Attempted</div></div>
    <div class="score-card correct"><div class="sc-icon">✅</div><div class="sc-value">${correct}</div><div class="sc-label">Correct</div></div>
    <div class="score-card wrong"><div class="sc-icon">❌</div><div class="sc-value">${wrong}</div><div class="sc-label">Wrong</div></div>
    <div class="score-card skipped"><div class="sc-icon">⏭️</div><div class="sc-value">${skipped}</div><div class="sc-label">Skipped</div></div>
    <div class="score-card"><div class="sc-icon">🏆</div><div class="sc-value">${marks}</div><div class="sc-label">Marks Obtained</div></div>
    <div class="score-card"><div class="sc-icon">📊</div><div class="sc-value">${percentage}%</div><div class="sc-label">Percentage</div></div>
    <div class="score-card"><div class="sc-icon">🎯</div><div class="sc-value">${accuracy}%</div><div class="sc-label">Accuracy</div></div>
  `;

  // Draw charts
  drawPieChart(correct, wrong, skipped);
  drawBarChart(correct, wrong, skipped, attempted, total);

  // Analytics
  buildAnalytics(correct, wrong, skipped, timeTaken);
}

function formatTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}

// ===== CHARTS (vanilla Canvas) =====
function drawPieChart(correct, wrong, skipped) {
  const canvas = document.getElementById('pie-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 280 * dpr;
  canvas.height = 280 * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = '280px';
  canvas.style.height = '280px';

  const total = correct + wrong + skipped;
  if (total === 0) return;

  const data = [
    { value: correct, color: '#16a34a', label: 'Correct' },
    { value: wrong, color: '#dc2626', label: 'Wrong' },
    { value: skipped, color: '#9ca3af', label: 'Skipped' },
  ];

  const cx = 140, cy = 140, r = 110;
  let startAngle = -Math.PI / 2;

  data.forEach(d => {
    if (d.value === 0) return;
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = d.color;
    ctx.fill();

    // Label
    const midAngle = startAngle + sliceAngle / 2;
    const lx = cx + (r * 0.65) * Math.cos(midAngle);
    const ly = cy + (r * 0.65) * Math.sin(midAngle);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (d.value > 0) ctx.fillText(d.value, lx, ly);

    startAngle += sliceAngle;
  });

  // Center hole (donut)
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  const isDark = document.body.classList.contains('dark-mode');
  ctx.fillStyle = isDark ? '#1f2937' : '#ffffff';
  ctx.fill();

  // Center text
  ctx.fillStyle = isDark ? '#f9fafb' : '#1f2937';
  ctx.font = 'bold 20px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy - 6);
  ctx.font = '11px Inter, sans-serif';
  ctx.fillStyle = '#9ca3af';
  ctx.fillText('Total', cx, cy + 14);

  // Legend
  const legend = document.getElementById('pie-legend');
  legend.innerHTML = data.map(d =>
    `<div class="chart-legend-item"><span class="chart-legend-dot" style="background:${d.color}"></span>${d.label}: ${d.value}</div>`
  ).join('');
}

function drawBarChart(correct, wrong, skipped, attempted, total) {
  const canvas = document.getElementById('bar-chart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = 350 * dpr;
  canvas.height = 280 * dpr;
  ctx.scale(dpr, dpr);
  canvas.style.width = '350px';
  canvas.style.height = '280px';

  const isDark = document.body.classList.contains('dark-mode');
  const textColor = isDark ? '#d1d5db' : '#6b7280';

  const bars = [
    { label: 'Total', value: total, color: '#1a56db' },
    { label: 'Attempted', value: attempted, color: '#7c3aed' },
    { label: 'Correct', value: correct, color: '#16a34a' },
    { label: 'Wrong', value: wrong, color: '#dc2626' },
    { label: 'Skipped', value: skipped, color: '#9ca3af' },
  ];

  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const barWidth = 40;
  const gap = 24;
  const startX = 40;
  const startY = 240;
  const chartHeight = 200;

  bars.forEach((bar, i) => {
    const x = startX + i * (barWidth + gap);
    const barHeight = (bar.value / maxVal) * chartHeight;

    // Bar with rounded top
    ctx.beginPath();
    const radius = 6;
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY - barHeight + radius);
    ctx.quadraticCurveTo(x, startY - barHeight, x + radius, startY - barHeight);
    ctx.lineTo(x + barWidth - radius, startY - barHeight);
    ctx.quadraticCurveTo(x + barWidth, startY - barHeight, x + barWidth, startY - barHeight + radius);
    ctx.lineTo(x + barWidth, startY);
    ctx.closePath();
    ctx.fillStyle = bar.color;
    ctx.fill();

    // Value on top
    ctx.fillStyle = textColor;
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(bar.value, x + barWidth / 2, startY - barHeight - 8);

    // Label below
    ctx.font = '10px Inter, sans-serif';
    ctx.fillText(bar.label, x + barWidth / 2, startY + 16);
  });
}

function buildAnalytics(correct, wrong, skipped, timeTaken) {
  const section = document.getElementById('analytics-section');
  const total = state.questions.length;
  const attempted = correct + wrong;
  const avgTime = attempted > 0 ? (timeTaken / attempted) : 0;

  // Find fastest/slowest (only attempted questions)
  let fastest = Infinity, slowest = 0, fastestQ = '-', slowestQ = '-';
  for (let i = 0; i < total; i++) {
    if (state.answers[i] !== undefined && state.timePerQuestion[i] !== undefined) {
      const t = state.timePerQuestion[i];
      if (t < fastest) { fastest = t; fastestQ = `Q.${i + 1}`; }
      if (t > slowest) { slowest = t; slowestQ = `Q.${i + 1}`; }
    }
  }

  section.innerHTML = `
    <h3>📈 Performance Analytics</h3>
    <div class="analytics-grid">
      <div class="analytics-item"><div class="ai-label">⏱️ Total Time Taken</div><div class="ai-value">${formatTime(timeTaken)}</div></div>
      <div class="analytics-item"><div class="ai-label">⚡ Average Time/Question</div><div class="ai-value">${formatTime(avgTime)}</div></div>
      <div class="analytics-item"><div class="ai-label">🚀 Fastest Answer</div><div class="ai-value">${fastestQ} (${fastest === Infinity ? '-' : formatTime(fastest)})</div></div>
      <div class="analytics-item"><div class="ai-label">🐢 Slowest Answer</div><div class="ai-value">${slowestQ} (${slowest === 0 ? '-' : formatTime(slowest)})</div></div>
      <div class="analytics-item"><div class="ai-label">🎯 Accuracy Rate</div><div class="ai-value">${attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0}%</div></div>
      <div class="analytics-item"><div class="ai-label">📊 Attempt Rate</div><div class="ai-value">${((attempted / total) * 100).toFixed(1)}%</div></div>
      <div class="analytics-item"><div class="ai-label">✅ Correct Rate (Overall)</div><div class="ai-value">${((correct / total) * 100).toFixed(1)}%</div></div>
      <div class="analytics-item"><div class="ai-label">📉 Error Rate</div><div class="ai-value">${attempted > 0 ? ((wrong / attempted) * 100).toFixed(1) : 0}%</div></div>
    </div>
  `;
}

// ===== REVIEW MODE =====
function showReviewMode() {
  switchScreen('review-screen');
  const body = document.getElementById('review-body');
  body.innerHTML = '';

  const labels = ['A', 'B', 'C', 'D'];

  state.questions.forEach((q, i) => {
    const userAnswer = state.answers[i];
    const correctAnswer = q.correct;
    const isCorrect = userAnswer === correctAnswer;
    const isSkipped = userAnswer === undefined;

    let statusClass = 'skipped-q';
    let statusLabel = 'Skipped';
    let statusBadgeClass = 'skipped';

    if (!isSkipped) {
      if (isCorrect) {
        statusClass = 'correct-q';
        statusLabel = '✅ Correct';
        statusBadgeClass = 'correct';
      } else {
        statusClass = 'wrong-q';
        statusLabel = '❌ Wrong';
        statusBadgeClass = 'wrong';
      }
    }

    let optionsHTML = '';
    q.options.forEach((opt, oi) => {
      let optClass = '';
      if (oi === correctAnswer) optClass = 'correct-option';
      if (oi === userAnswer && oi !== correctAnswer) optClass = 'wrong-option';

      const marker = oi === correctAnswer ? '✅' : (oi === userAnswer && oi !== correctAnswer ? '❌' : labels[oi] + '.');
      optionsHTML += `<div class="rq-option ${optClass}"><span class="opt-marker">${marker}</span><span>${opt}</span></div>`;
    });

    const timeSpent = state.timePerQuestion[i] ? formatTime(state.timePerQuestion[i]) : '-';

    body.innerHTML += `
      <div class="review-question ${statusClass}" style="animation-delay: ${i * 0.03}s">
        <div class="rq-header">
          <span class="rq-num">Q.${i + 1}</span>
          <span class="rq-status ${statusBadgeClass}">${statusLabel}</span>
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text-secondary)">⏱️ ${timeSpent}</span>
        </div>
        <div class="rq-text">${q.text}</div>
        <div class="rq-options">${optionsHTML}</div>
        <div class="rq-explanation">
          <strong>Explanation:</strong> The correct answer is <strong>${labels[correctAnswer]}. ${q.options[correctAnswer]}</strong>.
          ${!isSkipped && !isCorrect ? `<br>You selected: <strong>${labels[userAnswer]}. ${q.options[userAnswer]}</strong>` : ''}
        </div>
      </div>
    `;
  });
}

function backToResults() {
  switchScreen('result-screen');
}

// ===== DARK MODE =====
function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const isDark = document.body.classList.contains('dark-mode');
  localStorage.setItem('darkMode', isDark);

  // Update toggle icons
  const icons = document.querySelectorAll('#dark-mode-toggle, #dark-mode-toggle-review');
  icons.forEach(el => el.textContent = isDark ? '☀️' : '🌙');

  // Redraw charts if on result screen
  if (document.getElementById('result-screen').classList.contains('active')) {
    const total = state.questions.length;
    let correct = 0, wrong = 0, skipped = 0, attempted = 0;
    for (let i = 0; i < total; i++) {
      if (state.answers[i] !== undefined) {
        attempted++;
        if (state.answers[i] === state.questions[i].correct) correct++;
        else wrong++;
      } else {
        skipped++;
      }
    }
    drawPieChart(correct, wrong, skipped);
    drawBarChart(correct, wrong, skipped, attempted, total);
  }
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
  document.body.classList.add('dark-mode');
  document.querySelectorAll('#dark-mode-toggle, #dark-mode-toggle-review').forEach(el => el.textContent = '☀️');
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen();
  }
}

// ===== AUTO SAVE / RESTORE =====
function saveProgress() {
  if (state.submitted) return;
  const data = {
    answers: state.answers,
    statuses: state.statuses,
    timePerQuestion: state.timePerQuestion,
    timerRemaining: state.timerRemaining,
    currentIndex: state.currentIndex,
    candidateName: state.candidateName,
    startTime: state.startTime,
    timestamp: Date.now(),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch(e) {}
}

function restoreProgress() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    const data = JSON.parse(saved);

    // Only restore if less than 24 hours old
    if (Date.now() - data.timestamp > 86400000) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    state.answers = data.answers || {};
    state.statuses = data.statuses || {};
    state.timePerQuestion = data.timePerQuestion || {};
    state.timerRemaining = data.timerRemaining || state.timerRemaining;
    state.currentIndex = data.currentIndex || 0;
    state.candidateName = data.candidateName || state.candidateName;
  } catch(e) {
    localStorage.removeItem(STORAGE_KEY);
  }
}

// ===== PRINT / DOWNLOAD =====
function printResult() {
  window.print();
}

function downloadPDF() {
  // Simple: trigger print as PDF
  window.print();
}

function restartTest() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ===== UTILITY =====
function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Auto-save every 10 seconds
setInterval(() => {
  if (!state.submitted && document.getElementById('exam-screen').classList.contains('active')) {
    saveProgress();
  }
}, 10000);
