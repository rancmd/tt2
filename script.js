const STORAGE_KEY = 'timelog_v3';
const DAILY_LIMIT = 240; // minutes (4 hours)

const CATEGORIES = {
  tv:       { icon: '📺', name: 'TV' },
  computer: { icon: '💻', name: 'Computer' },
  phone:    { icon: '📱', name: 'Phone' }
};

function todayKey() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function loadState() {
  let raw;
  try { raw = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch(e) { raw = null; }
  const key = todayKey();
  if (!raw || raw.day !== key) {
    raw = { day: key, entries: [] };
    saveState(raw);
  }
  return raw;
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state = loadState();
let activeCat = 'tv';

const totalCard = document.getElementById('totalCard');
const totalValue = document.getElementById('totalValue');
const totalSub = document.getElementById('totalSub');
const logList = document.getElementById('logList');
const dateLabel = document.getElementById('dateLabel');
const catRow = document.getElementById('catRow');
const historyPreview = document.getElementById('historyPreview');
const historyOverlay = document.getElementById('historyOverlay');

dateLabel.textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function render() {
  const used = state.entries.reduce((sum, e) => sum + e.minutes, 0);
  const remaining = Math.max(0, DAILY_LIMIT - used);

  totalValue.innerHTML = remaining + '<span>min</span>';
  totalSub.textContent = used + ' of ' + DAILY_LIMIT + ' min used today';
  totalCard.classList.toggle('limit-reached', remaining === 0);

  // history entry button preview
  if (!state.entries.length) {
    historyPreview.textContent = 'No activity yet';
  } else {
    historyPreview.textContent = state.entries.length + (state.entries.length === 1 ? ' entry' : ' entries') + ' · ' + used + ' min logged';
  }

  // full log list (inside overlay)
  if (!state.entries.length) {
    logList.innerHTML = '<div class="empty"><span class="glyph">○</span>No activity logged today.<br>Pick a category, then tap 15, 30, or 60.</div>';
    return;
  }

  logList.innerHTML = state.entries
    .slice()
    .reverse()
    .map(e => {
      const cat = CATEGORIES[e.category] || CATEGORIES.tv;
      return `
      <div class="log-item">
        <span class="left">
          <span class="cat-icon">${cat.icon}</span>
          <span>
            <span class="cat-name">${cat.name}</span>
            <span class="dur">${e.minutes} min</span>
          </span>
        </span>
        <span class="time">${formatTime(e.ts)}</span>
      </div>
    `;
    }).join('');
}

function logMinutes(min, btnEl) {
  state.entries.push({ minutes: min, category: activeCat, ts: Date.now() });
  saveState(state);
  render();
  btnEl.classList.add('flash');
  setTimeout(() => btnEl.classList.remove('flash'), 180);
  if (navigator.vibrate) navigator.vibrate(8);
}

document.querySelectorAll('.log-btn').forEach(btn => {
  btn.addEventListener('click', () => logMinutes(parseInt(btn.dataset.min, 10), btn));
});

catRow.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeCat = btn.dataset.cat;
    catRow.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (navigator.vibrate) navigator.vibrate(6);
  });
});

// history overlay open/close
document.getElementById('openHistory').addEventListener('click', () => {
  historyOverlay.classList.add('show');
});
document.getElementById('closeHistory').addEventListener('click', () => {
  historyOverlay.classList.remove('show');
});

// reset flow
const sheetBackdrop = document.getElementById('sheetBackdrop');
const sheetCount = document.getElementById('sheetCount');

document.getElementById('resetBtn').addEventListener('click', () => {
  const n = state.entries.length;
  sheetCount.textContent = n + (n === 1 ? ' entry' : ' entries');
  sheetBackdrop.classList.add('show');
});

document.getElementById('cancelReset').addEventListener('click', () => {
  sheetBackdrop.classList.remove('show');
});

sheetBackdrop.addEventListener('click', (e) => {
  if (e.target === sheetBackdrop) sheetBackdrop.classList.remove('show');
});

document.getElementById('confirmReset').addEventListener('click', () => {
  state.entries = [];
  saveState(state);
  render();
  sheetBackdrop.classList.remove('show');
});

// midnight rollover check while app stays open
setInterval(() => {
  const key = todayKey();
  if (state.day !== key) {
    state = { day: key, entries: [] };
    saveState(state);
    dateLabel.textContent = new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    render();
  }
}, 60000);

render();
