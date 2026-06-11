'use strict';

// ─── Telegram WebApp init ───────────────────────────────────────────────────
let tg = null;
try {
  tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
  if (tg) {
    tg.ready();
    tg.expand();
  }
} catch(e) { console.warn('TG WebApp init failed:', e); }

// ─── Mobile keyboard handling via visualViewport ─────────────────────────────
(function initKeyboardHandler() {
  if (!window.visualViewport) return;
  const app = document.getElementById('app');
  const bottomNav = document.getElementById('bottom-nav');
  let ticking = false;

  function onViewportResize() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const vv = window.visualViewport;
      const windowH = window.innerHeight;
      const vvH = vv.height;
      const kbH = Math.max(0, windowH - vvH - vv.offsetTop);
      const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom') || '16', 10) || 16;
      const navH = 60 + safeBottom;

      if (kbH > 60) {
        // Keyboard is open — shrink app, hide nav
        app.style.bottom = kbH + 'px';
        bottomNav.style.transform = `translateY(${navH}px)`;
      } else {
        // Keyboard closed — restore
        app.style.bottom = '';
        bottomNav.style.transform = '';
      }
    });
  }

  window.visualViewport.addEventListener('resize', onViewportResize, { passive: true });
  window.visualViewport.addEventListener('scroll', onViewportResize, { passive: true });
})();

function getTgInitData() {
  try { return tg ? tg.initData : ''; } catch(e) { return ''; }
}

// ─── API base ───────────────────────────────────────────────────────────────
const API_BASE = '/api';

async function apiCall(method, path, body, isFormData) {
  const headers = {};
  const initData = getTgInitData() || 'dev_test';
  headers['X-Telegram-Init-Data'] = initData;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const opts = { method, headers };
  if (body) opts.body = isFormData ? body : JSON.stringify(body);

  try {
    const r = await fetch(API_BASE + path, opts);
    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: r.statusText }));
      throw new Error(err.error || r.statusText);
    }
    return r.json();
  } catch(e) {
    console.error('API error:', path, e);
    throw e;
  }
}

// ─── State ──────────────────────────────────────────────────────────────────
let state = {
  plan: 'free',
  userId: null,
  childName: 'малыш',
  childAge: 0,
  childGender: '',
  region: '',
  mamaName: '',
  premiumUntil: null,
  profile: {},
  sleepToday: [],
  feedToday: [],
  diaryEntries: [],
  currentPeriod: 1,
  selectedNeuroStyle: null,
  neuroPhotoFile: null,
  docModalCategory: null,
  selectedDiaryType: null,
  historyScreen: null,
};

// ─── Screen navigation ──────────────────────────────────────────────────────
const screenHistory = [];
function go(name) {
  const all = document.querySelectorAll('.screen');
  all.forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + name);
  if (target) {
    target.classList.add('active');
    target.scrollTop = 0;
  }
  // Bottom nav highlight
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  // AI FAB: hide on aichat screen
  const fab = document.getElementById('ai-fab');
  if (fab) fab.classList.toggle('hidden', name === 'aichat');
  // Topbar: hero-mode only on home when scrolled to top
  const topbar = document.getElementById('topbar');
  if (topbar) {
    if (name === 'home') {
      const homeScreen = document.getElementById('screen-home');
      topbar.classList.toggle('hero-mode', !homeScreen || homeScreen.scrollTop < 60);
    } else {
      topbar.classList.remove('hero-mode');
    }
  }
  screenHistory.push(name);
  if (name === 'home') loadHomeStats();
  if (name === 'sleep') loadSleepData();
  if (name === 'feed') loadFeedData();
  if (name === 'diary') loadDiaryData();
  if (name === 'profile') fillProfile();
  if (name === 'referral') loadReferral();
  if (name === 'pricing') updatePricing();
  if (name === 'sounds') initSoundsScreen();
}

function goBack() {
  if (screenHistory.length > 1) {
    screenHistory.pop();
    go(screenHistory[screenHistory.length - 1] || 'home');
    screenHistory.pop(); // go() pushes again
  } else {
    go('home');
  }
}

function openChatWith(screen, question) {
  go(screen);
  const input = document.getElementById(screen + '-input');
  if (input) { input.value = question; autoResize(input); }
}

function sendChip(screen, text) {
  const input = document.getElementById(screen + '-input');
  if (input) { input.value = text; autoResize(input); sendChat(screen); }
}

// ─── Chat histories per screen ──────────────────────────────────────────────
const chatHistories = { aichat: [], speech: [], games: [], nutrition: [], health: [] };
const chatEndpoints = {
  aichat: '/ai/chat',
  speech: '/ai/speech-exercise',
  games: '/ai/game-idea',
  nutrition: '/ai/chat',
  health: '/ai/health-advice',
};

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function chatKeydown(e, screen) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(screen); }
}

function appendMsg(msgsId, text, role) {
  const area = document.getElementById(msgsId);
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = text.replace(/\n/g, '<br>').replace(/<(?!br\s*\/?)[^>]+>/g, s => s);
  area.appendChild(div);
  area.scrollTop = area.scrollHeight;
  return div;
}

async function sendChat(screen) {
  const input = document.getElementById(screen + '-input');
  const text = (input?.value || '').trim();
  if (!text) return;
  input.value = '';
  autoResize(input);

  const msgsId = screen + '-msgs';
  appendMsg(msgsId, text, 'user');

  chatHistories[screen] = chatHistories[screen] || [];
  chatHistories[screen].push({ role: 'user', content: text });

  const typingDiv = appendMsg(msgsId, '✦ печатает...', 'ai typing');

  try {
    const endpoint = chatEndpoints[screen] || '/ai/chat';
    const payload = {
      messages: chatHistories[screen].slice(-10),
      question: text,
      childName: state.childName,
      ageMonths: state.childAge,
    };
    const data = await apiCall('POST', endpoint, payload);
    typingDiv.remove();
    const aiText = data.text || 'Что-то пошло не так, попробуй ещё раз 🌸';
    chatHistories[screen].push({ role: 'assistant', content: aiText });
    appendMsg(msgsId, aiText, 'ai');

    // Обновляем счётчик AI
    const counter = document.getElementById('aichat-ai-counter');
    if (counter && screen === 'aichat') {
      const used = (chatHistories[screen].filter(m => m.role === 'user').length);
      const limit = state.plan === 'free' ? 10 : state.plan === 'starter' ? 20 : 999;
      if (used >= limit - 3) {
        counter.style.display = 'block';
        counter.textContent = `Использовано ${used}/${limit} AI-ответов сегодня`;
      }
    }
  } catch(e) {
    typingDiv.remove();
    appendMsg(msgsId, `Ошибка: ${e.message}. Попробуй снова.`, 'ai');
  }
}

async function sendPhotoChat(screen, input) {
  const file = input.files[0];
  if (!file) return;
  const msgsId = screen + '-msgs';
  appendMsg(msgsId, '📷 Фото отправлено', 'user');
  const typingDiv = appendMsg(msgsId, '✦ анализирую фото...', 'ai typing');

  try {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('question', 'Что ты видишь? Дай совет маме.');
    fd.append('childName', state.childName);
    fd.append('ageMonths', state.childAge);
    const data = await apiCall('POST', '/ai/chat-vision', fd, true);
    typingDiv.remove();
    appendMsg(msgsId, data.text || 'Анализ завершён', 'ai');
  } catch(e) {
    typingDiv.remove();
    appendMsg(msgsId, `Ошибка анализа фото: ${e.message}`, 'ai');
  }
  input.value = '';
}

// ─── Home ───────────────────────────────────────────────────────────────────
function loadHomeStats() {
  // Update hero baby name + age
  const heroName = document.getElementById('hero-baby-name');
  const heroAge = document.getElementById('hero-baby-age');
  if (heroName) heroName.textContent = state.childName || 'Малыш';
  if (heroAge) {
    const months = parseInt(state.childAge) || 0;
    if (months >= 12) {
      const y = Math.floor(months / 12);
      const m = months % 12;
      heroAge.textContent = y + (y === 1 ? ' год' : y < 5 ? ' года' : ' лет') + (m > 0 ? ' ' + m + ' мес' : '');
    } else if (months > 0) {
      heroAge.textContent = months + ' мес';
    } else {
      heroAge.textContent = '';
    }
  }
  // Update plan banner
  const planTitle = document.getElementById('home-plan-title');
  const planSub = document.getElementById('home-plan-sub');
  if (planTitle) {
    if (state.plan === 'premium') {
      planTitle.textContent = 'Твой тариф: Премиум 💎 ✅';
      if (planSub) planSub.textContent = `Активен до ${state.premiumUntil || ''}`;
    } else if (state.plan === 'starter') {
      planTitle.textContent = 'Твой тариф: Стартер 🌸 ✅';
      if (planSub) planSub.textContent = `Активен до ${state.premiumUntil || ''}`;
    } else {
      planTitle.textContent = 'Стартер 290 ₽/мес · Премиум 490 ₽/мес';
      if (planSub) planSub.textContent = 'Попробуй бесплатно';
    }
  }
  // Sync tracker stats on home
  updateHomeTrackerStats();
}

function updateHomeTrackerStats() {
  const feedStat = document.getElementById('tile-feed-stat');
  const sleepStat = document.getElementById('tile-sleep-stat');
  if (feedStat) feedStat.textContent = state.feedToday.length || '';
  if (sleepStat) {
    const mins = state.sleepToday.reduce((acc, s) => acc + (s.minutes || 0), 0);
    if (mins > 0) sleepStat.textContent = `${Math.floor(mins/60)}ч`;
  }
}

// ─── Sleep tracker ──────────────────────────────────────────────────────────
function getSleepNorm(ageMonths) {
  if (ageMonths <= 3) return { min: 840, max: 1020, label: '14–17 ч' };
  if (ageMonths <= 6) return { min: 720, max: 960, label: '12–16 ч' };
  if (ageMonths <= 12) return { min: 720, max: 900, label: '12–15 ч' };
  if (ageMonths <= 24) return { min: 660, max: 840, label: '11–14 ч' };
  return { min: 600, max: 780, label: '10–13 ч' };
}

function loadSleepData() {
  const today = new Date().toISOString().split('T')[0];
  const entries = JSON.parse(localStorage.getItem('sleep_' + today) || '[]');
  state.sleepToday = entries;
  renderSleepData();
}

function renderSleepData() {
  const totalMins = state.sleepToday.reduce((acc, s) => acc + (s.minutes || 0), 0);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const norm = getSleepNorm(state.childAge);

  const valEl = document.getElementById('sleep-val');
  const normEl = document.getElementById('sleep-norm-txt');
  const barEl = document.getElementById('sleep-bar');
  if (valEl) valEl.textContent = `${h}ч ${m}мин`;
  if (normEl) normEl.textContent = `Норма: ${norm.label}`;
  if (barEl) {
    const mid = (norm.min + norm.max) / 2;
    const pct = Math.min(100, Math.round((totalMins / mid) * 100));
    barEl.style.width = pct + '%';
  }

  const list = document.getElementById('sleep-list');
  if (list) {
    list.innerHTML = state.sleepToday.map(s => `
      <li class="entry-item">
        <span class="entry-ico">💤</span>
        <div class="entry-text">
          <div class="entry-main">${s.start} — ${s.end}</div>
          <div class="entry-sub">${s.note || ''} · ${Math.floor(s.minutes/60)}ч ${s.minutes%60}мин</div>
        </div>
      </li>
    `).join('');
  }
  updateHomeTrackerStats();
}

function toggleForm(id) {
  const el = document.getElementById(id);
  const arrow = document.getElementById(id + '-arrow');
  if (!el) return;
  const shown = el.style.display !== 'none';
  el.style.display = shown ? 'none' : 'block';
  if (arrow) arrow.textContent = shown ? '▼' : '▲';
}

function toggleCollapse(bodyId, arrowId) {
  const body = document.getElementById(bodyId);
  const arrow = document.getElementById(arrowId);
  if (!body) return;
  const shown = body.style.display !== 'none';
  body.style.display = shown ? 'none' : 'block';
  if (arrow) arrow.textContent = shown ? '▼' : '▲';
}

function saveSleep() {
  const start = document.getElementById('sleep-start')?.value;
  const end = document.getElementById('sleep-end')?.value;
  const note = document.getElementById('sleep-note')?.value || '';
  if (!start || !end) { showToast('Укажи время начала и конца сна'); return; }

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;
  if (minutes === 0) { showToast('Укажи разное время начала и конца'); return; }

  const today = new Date().toISOString().split('T')[0];
  const entry = { start, end, note, minutes, date: today };
  state.sleepToday.push(entry);
  localStorage.setItem('sleep_' + today, JSON.stringify(state.sleepToday));

  toggleForm('sleep-form');
  document.getElementById('sleep-start').value = '';
  document.getElementById('sleep-end').value = '';
  document.getElementById('sleep-note').value = '';
  renderSleepData();
  showToast('Сон записан ✅');
}

// ─── Feed tracker ────────────────────────────────────────────────────────────
const feedTypeEmoji = { breast:'🤱', formula:'🍼', puree:'🥄', porridge:'🥣', soup:'🍲', fruit:'🍎', water:'💧', other:'🍽' };
const feedTypeLabel = { breast:'Грудь', formula:'Смесь', puree:'Пюре', porridge:'Каша', soup:'Суп', fruit:'Фрукт', water:'Вода', other:'Другое' };

function getFeedNorm(ageMonths) {
  if (ageMonths < 6) return { min: 8, max: 12, label: 'ГВ/смесь 8–12 раз/сут' };
  if (ageMonths < 9) return { min: 6, max: 8, label: 'ГВ + прикорм 6–8 раз/сут' };
  if (ageMonths < 12) return { min: 4, max: 5, label: '4–5 кормлений/сут' };
  return { min: 4, max: 5, label: '4–5 приёмов пищи/сут' };
}

function loadFeedData() {
  const today = new Date().toISOString().split('T')[0];
  state.feedToday = JSON.parse(localStorage.getItem('feed_' + today) || '[]');
  renderFeedData();
}

function renderFeedData() {
  const count = state.feedToday.length;
  const norm = getFeedNorm(state.childAge);
  const valEl = document.getElementById('feed-val');
  const normEl = document.getElementById('feed-norm-txt');
  const barEl = document.getElementById('feed-bar');
  if (valEl) valEl.textContent = count;
  if (normEl) normEl.textContent = `Норма: ${norm.label}`;
  if (barEl) {
    const pct = Math.min(100, Math.round((count / norm.max) * 100));
    barEl.style.width = pct + '%';
  }

  const list = document.getElementById('feed-list');
  if (list) {
    list.innerHTML = state.feedToday.map(f => `
      <li class="entry-item">
        <span class="entry-ico">${feedTypeEmoji[f.type] || '🍽'}</span>
        <div class="entry-text">
          <div class="entry-main">${feedTypeLabel[f.type] || f.type}</div>
          <div class="entry-sub">${f.amount || ''}</div>
        </div>
        <span class="entry-time">${f.time}</span>
      </li>
    `).join('');
  }
  updateHomeTrackerStats();
}

function saveFeed() {
  const time = document.getElementById('feed-time')?.value;
  const type = document.getElementById('feed-type')?.value;
  const amount = document.getElementById('feed-amount')?.value || '';
  if (!time) { showToast('Укажи время кормления'); return; }

  const today = new Date().toISOString().split('T')[0];
  const entry = { time, type, amount, date: today };
  state.feedToday.push(entry);
  localStorage.setItem('feed_' + today, JSON.stringify(state.feedToday));

  toggleForm('feed-form');
  document.getElementById('feed-amount').value = '';
  renderFeedData();
  showToast('Кормление записано ✅');
}

// ─── Diary ───────────────────────────────────────────────────────────────────
const diaryTypeEmoji = {
  height:'📏', vaccine:'💉', illness:'😷', temp:'🌡', first:'🌟',
  mood:'😊', medicine:'💊', doctor:'👨‍⚕️', funny:'😂', event:'🎉'
};
let currentDiaryTab = 'all';

function loadDiaryData() {
  state.diaryEntries = JSON.parse(localStorage.getItem('diary') || '[]');
  renderDiaryEntries();
  updateDiaryChildCard();
}

function updateDiaryChildCard() {
  const nameEl = document.getElementById('diary-child-name');
  const infoEl = document.getElementById('diary-child-info');
  if (nameEl) nameEl.textContent = state.childName || 'Малыш';
  if (infoEl) {
    const lastHW = state.diaryEntries.find(e => e.type === 'height');
    const ageStr = state.childAge ? `${state.childAge} мес` : '';
    const hwStr = lastHW ? `· ${lastHW.value}` : '';
    infoEl.textContent = [state.region, ageStr, hwStr].filter(Boolean).join(' ');
  }
}

function renderDiaryEntries() {
  const list = document.getElementById('diary-list');
  if (!list) return;
  let entries = state.diaryEntries;
  if (currentDiaryTab !== 'all') entries = entries.filter(e => e.type === currentDiaryTab);
  entries = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  list.innerHTML = entries.map(e => `
    <li class="entry-item">
      <span class="entry-ico">${diaryTypeEmoji[e.type] || '📝'}</span>
      <div class="entry-text">
        <div class="entry-main">${e.title || e.type}</div>
        <div class="entry-sub">${e.value || ''}</div>
      </div>
      <span class="entry-time">${e.date || ''}</span>
    </li>
  `).join('') || '<li style="padding:20px;text-align:center;color:var(--text-secondary)">Записей пока нет</li>';
}

function setDiaryTab(tab, btn) {
  currentDiaryTab = tab;
  document.querySelectorAll('.diary-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDiaryEntries();
}

function openAddDiaryModal() {
  document.getElementById('add-diary-modal').classList.add('open');
  document.getElementById('diary-date').value = new Date().toISOString().split('T')[0];
  state.selectedDiaryType = null;
  document.getElementById('diary-form-height').style.display = 'none';
  document.getElementById('diary-form-text').style.display = 'none';
  document.querySelectorAll('#diary-type-chips .chip').forEach(c => c.classList.remove('active'));
}

function closeDiaryModal() {
  document.getElementById('add-diary-modal').classList.remove('open');
}

function selectDiaryType(type, label, btn) {
  state.selectedDiaryType = { type, label };
  document.querySelectorAll('#diary-type-chips .chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  if (type === 'height') {
    document.getElementById('diary-form-height').style.display = 'block';
    document.getElementById('diary-form-text').style.display = 'none';
  } else {
    document.getElementById('diary-form-height').style.display = 'none';
    document.getElementById('diary-form-text').style.display = 'block';
  }
}

function saveDiaryEntry() {
  if (!state.selectedDiaryType) { showToast('Выбери тип записи'); return; }
  const { type, label } = state.selectedDiaryType;
  const date = document.getElementById('diary-date').value;

  let value = '';
  if (type === 'height') {
    const h = document.getElementById('diary-height')?.value;
    const w = document.getElementById('diary-weight')?.value;
    value = [h ? `Рост: ${h} см` : '', w ? `Вес: ${w} кг` : ''].filter(Boolean).join(', ');
  } else {
    value = document.getElementById('diary-text')?.value || '';
  }

  const entry = { type, title: label, value, date, id: Date.now() };
  state.diaryEntries.unshift(entry);
  localStorage.setItem('diary', JSON.stringify(state.diaryEntries));
  closeDiaryModal();
  renderDiaryEntries();
  showToast('Запись добавлена ✅');
}

// ─── Document modal ──────────────────────────────────────────────────────────
function openDocModal(name, ico) {
  state.docModalCategory = name;
  document.getElementById('doc-modal-title').textContent = ico + ' ' + name;
  document.getElementById('doc-modal').classList.add('open');
  document.getElementById('doc-upload-area').innerHTML = `<p style="font-size:13px;color:var(--text-secondary)">📷 Загрузить фото документа</p>`;
}

function closeDocModal() {
  document.getElementById('doc-modal').classList.remove('open');
  document.getElementById('doc-photo-input').value = '';
}

function previewDoc(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('doc-upload-area').innerHTML = `<img src="${e.target.result}" class="upload-preview" alt="doc">`;
  };
  reader.readAsDataURL(file);
}

function saveDoc() {
  const input = document.getElementById('doc-photo-input');
  const file = input.files[0];
  if (!file) { showToast('Загрузи фото документа'); return; }
  showToast(`${state.docModalCategory} сохранён ✅`);
  closeDocModal();
}

// ─── Fridge analysis ──────────────────────────────────────────────────────────
async function analyzeFridge(input) {
  const file = input.files[0];
  if (!file) return;

  const dishesSection = document.getElementById('fridge-dishes');
  const dishList = document.getElementById('dish-list');
  dishesSection.style.display = 'none';
  dishList.innerHTML = '<li style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto"></div></li>';
  dishesSection.style.display = 'block';

  try {
    const fd = new FormData();
    fd.append('photo', file);
    fd.append('childName', state.childName);
    fd.append('ageMonths', state.childAge);
    const data = await apiCall('POST', '/ai/fridge', fd, true);
    const dishes = data.dishes || [];
    dishList.innerHTML = dishes.map(d => `
      <li class="dish-item" onclick="getDishRecipe('${d.name.replace(/'/g, "\\'")}')">
        <span style="font-size:22px">🍽</span>
        <div>
          <div class="dish-item-name">${d.name}</div>
          <div class="dish-item-desc">${d.description || ''}</div>
        </div>
      </li>
    `).join('') || '<li style="padding:14px;color:var(--text-secondary)">Блюда не определены</li>';
  } catch(e) {
    dishList.innerHTML = `<li style="padding:14px;color:var(--text-secondary)">Ошибка анализа: ${e.message}</li>`;
  }
  input.value = '';
}

async function getDishRecipe(dishName) {
  const msgsId = 'nutrition-msgs';
  appendMsg(msgsId, `Покажи рецепт: ${dishName}`, 'user');
  const typingDiv = appendMsg(msgsId, '✦ готовлю рецепт...', 'ai typing');
  try {
    const data = await apiCall('POST', '/ai/food-recipe', { dishName, childName: state.childName, ageMonths: state.childAge });
    typingDiv.remove();
    appendMsg(msgsId, data.text || 'Рецепт загружен', 'ai');
    document.getElementById('nutrition-msgs').scrollTop = 99999;
  } catch(e) {
    typingDiv.remove();
    appendMsg(msgsId, `Ошибка: ${e.message}`, 'ai');
  }
}

// ─── Benefits ─────────────────────────────────────────────────────────────────
function setBenefitsRegion(region) {
  document.getElementById('benefits-region-input').value = region;
  document.querySelectorAll('.benefits-chip').forEach(c => {
    c.classList.toggle('selected', c.textContent === region || c.onclick?.toString().includes(region));
  });
  loadBenefits();
}

async function loadBenefits() {
  const region = document.getElementById('benefits-region-input')?.value?.trim();
  if (!region) { showToast('Введи название региона'); return; }

  const loader = document.getElementById('benefits-loader');
  const result = document.getElementById('benefits-result');
  loader.style.display = 'block';
  result.style.display = 'none';

  try {
    const data = await apiCall('POST', '/ai/benefits', { region, ageMonths: state.childAge });
    document.getElementById('benefits-region-badge').textContent = '🗺 ' + region;
    document.getElementById('benefits-text').textContent = data.text || '';
    loader.style.display = 'none';
    result.style.display = 'block';
  } catch(e) {
    loader.style.display = 'none';
    showToast('Ошибка загрузки: ' + e.message);
  }
}

// ─── Neuro photo ──────────────────────────────────────────────────────────────
function selectNeuroStyle(btn, style) {
  document.querySelectorAll('.neuro-style-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedNeuroStyle = style === 'custom' ? null : style;
  document.getElementById('neuro-custom-style').style.display = style === 'custom' ? 'block' : 'none';
  updateNeuroBtn();
}

function previewNeuroPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  state.neuroPhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('neuro-upload').innerHTML = `<img src="${e.target.result}" class="upload-preview" alt="preview">`;
  };
  reader.readAsDataURL(file);
  updateNeuroBtn();
}

function updateNeuroBtn() {
  const btn = document.getElementById('neuro-create-btn');
  if (btn) btn.disabled = !(state.neuroPhotoFile && (state.selectedNeuroStyle || document.getElementById('neuro-custom-input')?.value));
}

async function createNeuroPhoto() {
  if (!state.neuroPhotoFile) return;
  const style = state.selectedNeuroStyle || document.getElementById('neuro-custom-input')?.value?.trim();
  if (!style) { showToast('Выбери или опиши стиль'); return; }

  document.getElementById('neuro-result').style.display = 'none';
  document.getElementById('neuro-loader').style.display = 'block';

  try {
    const fd = new FormData();
    fd.append('photo', state.neuroPhotoFile);
    fd.append('style', style);
    fd.append('childName', state.childName);
    fd.append('ageMonths', state.childAge);
    const data = await apiCall('POST', '/ai/neuro-photo', fd, true);
    document.getElementById('neuro-loader').style.display = 'none';
    if (data.b64_json) {
      const img = document.getElementById('neuro-result-img');
      img.src = `data:${data.mimeType || 'image/png'};base64,${data.b64_json}`;
      document.getElementById('neuro-result').style.display = 'block';
    }
  } catch(e) {
    document.getElementById('neuro-loader').style.display = 'none';
    showToast('Ошибка создания портрета: ' + e.message);
  }
}

function downloadNeuroPhoto() {
  const img = document.getElementById('neuro-result-img');
  if (!img.src) return;
  const a = document.createElement('a');
  a.href = img.src;
  a.download = 'smart_mama_neuro.png';
  a.click();
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
const PRICES = {
  starter: { 1: 290, 3: 826, 6: 1566, 12: 2958 },
  premium: { 1: 490, 3: 1396, 6: 2646, 12: 4998 },
};

function setPeriod(months, btn) {
  state.currentPeriod = months;
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  updatePricing();
}

function updatePricing() {
  const p = state.currentPeriod || 1;
  const sPrice = PRICES.starter[p];
  const pPrice = PRICES.premium[p];
  const sMonthly = Math.round(sPrice / p);
  const pMonthly = Math.round(pPrice / p);

  const sPriceEl = document.getElementById('starter-price');
  const pPriceEl = document.getElementById('premium-price');
  const sTotalEl = document.getElementById('starter-total');
  const pTotalEl = document.getElementById('premium-total');

  if (sPriceEl) sPriceEl.innerHTML = `${sMonthly} ₽<span>/мес</span>`;
  if (pPriceEl) pPriceEl.innerHTML = `${pMonthly} ₽<span>/мес</span>`;
  if (sTotalEl) sTotalEl.textContent = p > 1 ? `Итого ${sPrice} ₽ за ${p} мес` : '';
  if (pTotalEl) pTotalEl.textContent = p > 1 ? `Итого ${pPrice} ₽ за ${p} мес` : '';

  // Mark current plan
  document.querySelectorAll('.price-btn').forEach(b => b.classList.remove('current'));
  if (state.plan === 'free') {
    const freeBtns = document.querySelectorAll('.price-card.free-c .price-btn');
    freeBtns.forEach(b => { b.classList.add('current'); b.textContent = 'Текущий тариф'; });
  } else if (state.plan === 'starter') {
    const sBtns = document.querySelectorAll('.price-card.start-c .price-btn');
    sBtns.forEach(b => { b.classList.add('current'); b.textContent = 'Текущий тариф ✅'; });
  } else if (state.plan === 'premium') {
    const pBtns = document.querySelectorAll('.price-card.prem-c .price-btn');
    pBtns.forEach(b => { b.classList.add('current'); b.textContent = 'Текущий тариф ✅'; });
  }
}

async function buyPlan(plan) {
  try {
    const data = await apiCall('POST', '/payment/create', {
      plan, period: state.currentPeriod,
      user_id: state.userId,
      return_url: 'https://t.me',
    });
    if (data.confirmation_url) {
      try { tg?.openLink(data.confirmation_url); }
      catch(e) { window.open(data.confirmation_url, '_blank'); }
    }
  } catch(e) {
    showToast('Платёж временно недоступен: ' + e.message);
  }
}

// ─── Referral ──────────────────────────────────────────────────────────────────
function loadReferral() {
  const invited = state.profile?.referral_count || 0;
  document.getElementById('ref-invited-count').textContent = invited;
  let level = 'Нет статуса';
  if (invited >= 10) level = 'Смарт Мама Амбассадор 💎';
  else if (invited >= 5) level = 'Мама-Звезда ⭐';
  else if (invited >= 2) level = 'Мама-Помощница 🌸';
  document.getElementById('ref-level-label').textContent = level;
}

function getRefLink() {
  const botUsername = 'smart_mama_ai_bot';
  return `https://t.me/${botUsername}?start=ref_${state.userId || ''}`;
}

function shareRef() {
  const link = getRefLink();
  const text = 'Присоединяйся к Смарт Маме — лучшему AI-помощнику для мам! 🌸';
  try {
    tg?.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`);
  } catch(e) {
    copyRef();
  }
}

function copyRef() {
  const link = getRefLink();
  navigator.clipboard?.writeText(link).then(() => showToast('Ссылка скопирована ✅'))
    .catch(() => showToast('Не удалось скопировать'));
}

function openTgLink(url) {
  try { tg?.openTelegramLink(url); }
  catch(e) { window.open(url, '_blank'); }
}

// ─── Profile ──────────────────────────────────────────────────────────────────
function fillProfile() {
  document.getElementById('profile-child-name').value = state.childName || '';
  document.getElementById('profile-child-gender').value = state.childGender || '';
  document.getElementById('profile-age').value = state.childAge || '';
  document.getElementById('profile-region').value = state.region || '';

  const planNameEl = document.getElementById('profile-plan-name');
  if (planNameEl) {
    if (state.plan === 'premium') planNameEl.textContent = '💎 Премиум';
    else if (state.plan === 'starter') planNameEl.textContent = '🌸 Стартер';
    else planNameEl.textContent = '🆓 Бесплатно';
  }

  const untilEl = document.getElementById('profile-plan-until');
  if (untilEl && state.premiumUntil) untilEl.textContent = `До ${state.premiumUntil}`;

  const extra = state.profile || {};
  if (extra.blood_type) document.getElementById('profile-blood').value = extra.blood_type || '';
  if (extra.allergies) document.getElementById('profile-allergies').value = extra.allergies || '';
  if (extra.doctor) document.getElementById('profile-doctor').value = extra.doctor || '';
  if (extra.health_notes) document.getElementById('profile-health-notes').value = extra.health_notes || '';

  // Children bar
  const bar = document.getElementById('profile-children-bar');
  const chipEl = document.getElementById('profile-child-chip-0');
  if (chipEl) chipEl.textContent = state.childName || 'Малыш';
}

async function saveProfile() {
  const childName = document.getElementById('profile-child-name')?.value?.trim();
  const gender = document.getElementById('profile-child-gender')?.value;
  const age = parseInt(document.getElementById('profile-age')?.value) || 0;
  const region = document.getElementById('profile-region')?.value?.trim();
  const bloodType = document.getElementById('profile-blood')?.value;
  const allergies = document.getElementById('profile-allergies')?.value;
  const doctor = document.getElementById('profile-doctor')?.value;
  const healthNotes = document.getElementById('profile-health-notes')?.value;

  state.childName = childName || state.childName;
  state.childAge = age || state.childAge;
  state.childGender = gender || state.childGender;
  state.region = region || state.region;

  const profileData = {
    ...state.profile,
    blood_type: bloodType,
    allergies,
    doctor,
    health_notes: healthNotes,
    child_name: childName,
    child_age_months: age,
    child_gender: gender,
    region,
  };
  state.profile = profileData;
  localStorage.setItem('profile_cache', JSON.stringify({ childName, childAge: age, childGender: gender, region, plan: state.plan }));

  try {
    await apiCall('POST', '/user/save', profileData);
    showToast('Профиль сохранён ✅');
  } catch(e) {
    showToast('Ошибка сохранения: ' + e.message);
  }
}

function addChild() {
  showToast('Несколько детей — в разработке 🌸');
}

// ─── Sounds / Player ──────────────────────────────────────────────────────────
const SOUNDS_DATA = {
  lullabies: [
    { id: 'lull1', ico: '🌙', name: 'Спи, моя радость', desc: 'Классическая', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { id: 'lull2', ico: '⭐', name: 'Баю-баюшки-баю', desc: 'Русская', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { id: 'lull3', ico: '🌸', name: 'Колыбельная медведицы', desc: 'Из мультфильма', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { id: 'lull4', ico: '🦋', name: 'Тихая ночь', desc: 'Нежная', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
  ],
  noise: [
    { id: 'noise1', ico: '🤍', name: 'Белый шум', desc: 'Успокаивает', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', loop: true },
    { id: 'noise2', ico: '🩷', name: 'Розовый шум', desc: 'Мягче белого', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', loop: true },
    { id: 'noise3', ico: '🌊', name: 'Шум моря', desc: 'Волны', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', loop: true },
    { id: 'noise4', ico: '🌧', name: 'Дождь', desc: 'Монотонный', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', loop: true },
    { id: 'noise5', ico: '🌬', name: 'Фен / Пылесос', desc: 'Любимый малышами', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', loop: true },
    { id: 'noise6', ico: '🔥', name: 'Потрескивание огня', desc: 'Тепло и уют', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', loop: true },
  ],
  nature: [
    { id: 'nat1', ico: '🐦', name: 'Пение птиц', desc: 'Утренний лес', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', loop: true },
    { id: 'nat2', ico: '🌿', name: 'Ручей', desc: 'Журчание воды', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', loop: true },
    { id: 'nat3', ico: '🌙', name: 'Ночной лес', desc: 'Сверчки', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', loop: true },
    { id: 'nat4', ico: '⛈', name: 'Гроза вдали', desc: 'Дождь + гром', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', loop: true },
  ],
  classic: [
    { id: 'cl1', ico: '🎹', name: 'Моцарт для малышей', desc: 'Развитие мозга', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3' },
    { id: 'cl2', ico: '🎻', name: 'Дебюсси — Лунный свет', desc: 'Нежно', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3' },
    { id: 'cl3', ico: '🎼', name: 'Брамс — Колыбельная', desc: 'Классика', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3' },
    { id: 'cl4', ico: '🎵', name: 'Шопен — Ноктюрн', desc: 'Спокойно', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  ],
};

let soundPlayer = {
  audio: null,
  current: null,   // { id, ico, name, url, loop }
  isPlaying: false,
  timerMin: 0,      // 0 = бесконечно
  timerLeft: 0,     // секунды
  timerInterval: null,
  elapsedSec: 0,
  elapsedInterval: null,
};

function initSoundsScreen() {
  const cats = [
    { key: 'lullabies', elId: 'sounds-lullabies' },
    { key: 'noise',     elId: 'sounds-noise' },
    { key: 'nature',    elId: 'sounds-nature' },
    { key: 'classic',   elId: 'sounds-classic' },
  ];
  cats.forEach(({ key, elId }) => {
    const el = document.getElementById(elId);
    if (!el || el.children.length > 0) return;
    el.innerHTML = SOUNDS_DATA[key].map(s => `
      <div class="sound-card" id="scard-${s.id}" onclick="playSound('${s.id}','${key}')">
        <span class="sound-ico">${s.ico}</span>
        <div class="sound-name">${s.name}</div>
        <div class="sound-desc">${s.desc}</div>
        <div class="sound-wave" style="display:none">
          <div class="sound-wave-bar"></div><div class="sound-wave-bar"></div>
          <div class="sound-wave-bar"></div><div class="sound-wave-bar"></div>
          <div class="sound-wave-bar"></div>
        </div>
      </div>
    `).join('');
  });
}

function playSound(id, catKey) {
  const track = SOUNDS_DATA[catKey].find(s => s.id === id);
  if (!track) return;

  // Уже играет эта же — ставим паузу/продолжаем
  if (soundPlayer.current && soundPlayer.current.id === id) {
    togglePlay();
    return;
  }

  // Останавливаем предыдущий
  _stopAudio();

  // Создаём новый
  const audio = new Audio(track.url);
  audio.loop = !!track.loop;
  audio.volume = 0.8;
  audio.play().catch(() => {});

  soundPlayer.audio = audio;
  soundPlayer.current = track;
  soundPlayer.isPlaying = true;
  soundPlayer.elapsedSec = 0;

  // Обновляем UI карточек
  document.querySelectorAll('.sound-card').forEach(c => {
    c.classList.remove('playing');
    const wave = c.querySelector('.sound-wave');
    if (wave) wave.style.display = 'none';
  });
  const card = document.getElementById('scard-' + id);
  if (card) {
    card.classList.add('playing');
    const wave = card.querySelector('.sound-wave');
    if (wave) wave.style.display = 'flex';
  }

  // Мини-плеер
  const miniPlayer = document.getElementById('sounds-mini-player');
  if (miniPlayer) miniPlayer.style.display = 'block';
  const miniIco = document.getElementById('sounds-mini-ico');
  if (miniIco) miniIco.textContent = track.ico;
  const miniTitle = document.getElementById('sounds-mini-title');
  if (miniTitle) miniTitle.textContent = track.name;

  _updatePlayBtn();
  _startElapsed();

  // По окончании (для нелупающихся)
  audio.addEventListener('ended', () => {
    if (!audio.loop) stopSound();
  });
}

function togglePlay() {
  if (!soundPlayer.audio) return;
  if (soundPlayer.isPlaying) {
    soundPlayer.audio.pause();
    soundPlayer.isPlaying = false;
    _stopElapsed();
  } else {
    soundPlayer.audio.play().catch(() => {});
    soundPlayer.isPlaying = true;
    _startElapsed();
  }
  _updatePlayBtn();
  // Анимация волны
  const card = soundPlayer.current ? document.getElementById('scard-' + soundPlayer.current.id) : null;
  if (card) {
    const wave = card.querySelector('.sound-wave');
    if (wave) wave.style.display = soundPlayer.isPlaying ? 'flex' : 'none';
  }
}

function stopSound() {
  _stopAudio();
  soundPlayer.current = null;
  soundPlayer.isPlaying = false;
  document.querySelectorAll('.sound-card').forEach(c => {
    c.classList.remove('playing');
    const wave = c.querySelector('.sound-wave');
    if (wave) wave.style.display = 'none';
  });
  const miniPlayer = document.getElementById('sounds-mini-player');
  if (miniPlayer) miniPlayer.style.display = 'none';
  _clearTimer();
}

function _stopAudio() {
  if (soundPlayer.audio) {
    soundPlayer.audio.pause();
    soundPlayer.audio.src = '';
    soundPlayer.audio = null;
  }
  _stopElapsed();
}

function _updatePlayBtn() {
  const btn = document.getElementById('sounds-play-btn');
  if (!btn) return;
  btn.textContent = soundPlayer.isPlaying ? '⏸' : '▶';
}

function _startElapsed() {
  _stopElapsed();
  soundPlayer.elapsedInterval = setInterval(() => {
    soundPlayer.elapsedSec++;
    _updateTimerDisplay();
    // Проверка таймера сна
    if (soundPlayer.timerMin > 0) {
      soundPlayer.timerLeft--;
      if (soundPlayer.timerLeft <= 0) {
        stopSound();
        showToast('Таймер сна сработал 🌙');
      }
    }
  }, 1000);
}

function _stopElapsed() {
  if (soundPlayer.elapsedInterval) {
    clearInterval(soundPlayer.elapsedInterval);
    soundPlayer.elapsedInterval = null;
  }
}

function _updateTimerDisplay() {
  const el = document.getElementById('sounds-mini-timer');
  if (!el) return;
  if (soundPlayer.timerMin > 0 && soundPlayer.timerLeft > 0) {
    const m = Math.floor(soundPlayer.timerLeft / 60);
    const s = soundPlayer.timerLeft % 60;
    el.textContent = `⏱ ${m}:${String(s).padStart(2,'0')} осталось`;
  } else {
    const m = Math.floor(soundPlayer.elapsedSec / 60);
    const s = soundPlayer.elapsedSec % 60;
    el.textContent = `${m}:${String(s).padStart(2,'0')}`;
  }
}

function _clearTimer() {
  soundPlayer.timerMin = 0;
  soundPlayer.timerLeft = 0;
  document.querySelectorAll('.sounds-timer-chip').forEach(c => c.classList.remove('active'));
  const inf = document.getElementById('timer-0');
  if (inf) inf.classList.add('active');
}

function setTimer(minutes) {
  soundPlayer.timerMin = minutes;
  soundPlayer.timerLeft = minutes * 60;
  // Подсвечиваем активный чип
  document.querySelectorAll('.sounds-timer-chip').forEach(c => c.classList.remove('active'));
  if (minutes === 0) {
    const inf = document.getElementById('timer-0');
    if (inf) inf.classList.add('active');
  } else {
    // находим кнопку по onclick
    document.querySelectorAll('.sounds-timer-chip').forEach(c => {
      if (c.getAttribute('onclick') === `setTimer(${minutes})`) c.classList.add('active');
    });
  }
  if (minutes > 0) showToast(`Таймер: ${minutes} мин 🌙`);
  else showToast('Таймер выключен');
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  // Restore cached profile first for instant display
  try {
    const cached = JSON.parse(localStorage.getItem('profile_cache') || '{}');
    if (cached.childName) state.childName = cached.childName;
    if (cached.childAge) state.childAge = cached.childAge;
    if (cached.childGender) state.childGender = cached.childGender;
    if (cached.region) state.region = cached.region;
    if (cached.plan) state.plan = cached.plan;
  } catch(e) {}

  loadHomeStats();
  initHeroPhoto();

  // Try to sync from API
  try {
    const data = await apiCall('GET', '/user/sync');
    state.userId = data.user_id;
    state.plan = data.plan || 'free';
    state.premiumUntil = data.premium_until;
    state.childName = data.child_name || state.childName;
    state.childAge = data.child_age_months || state.childAge;
    state.childGender = data.child_gender || state.childGender;
    state.region = data.region || state.region;
    state.mamaName = data.mama_name || '';
    state.profile = data.profile || {};

    // Cache
    localStorage.setItem('profile_cache', JSON.stringify({
      childName: state.childName,
      childAge: state.childAge,
      childGender: state.childGender,
      region: state.region,
      plan: state.plan,
    }));

    loadHomeStats();

    // Pre-fill benefits region
    const benefitsInput = document.getElementById('benefits-region-input');
    if (benefitsInput && state.region && !benefitsInput.value) benefitsInput.value = state.region;

    // Neuro usage badge
    const neurobadge = document.getElementById('neuro-usage-badge');
    if (neurobadge) {
      if (state.plan === 'premium') neurobadge.textContent = '20 нейрофото в месяц';
      else if (state.plan === 'starter') neurobadge.textContent = '2 нейрофото в месяц';
      else neurobadge.textContent = '1 бесплатно';
    }
  } catch(e) {
    console.warn('Sync failed (offline or dev mode):', e.message);
  }
}

// ─── Hero baby photo ────────────────────────────────────────────────────────
function uploadHeroBabyPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const data = e.target.result;
    try { localStorage.setItem('heroBabyPhoto', data); } catch(e) {}
    applyHeroBabyPhoto(data);
  };
  reader.readAsDataURL(file);
  input.value = '';
}

function applyHeroBabyPhoto(src) {
  const fixed = document.getElementById('hero-photo-fixed');
  const placeholder = document.getElementById('hero-photo-placeholder');
  const wrap = document.getElementById('hero-photo-wrap');
  if (fixed) { fixed.src = src; fixed.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
  if (wrap) { wrap.onclick = null; wrap.classList.add('has-photo'); }
}

function initHeroPhoto() {
  // Restore saved photo
  const saved = localStorage.getItem('heroBabyPhoto');
  if (saved) applyHeroBabyPhoto(saved);

  // Topbar scroll effect + parallax on home screen
  const homeScreen = document.getElementById('screen-home');
  const topbar     = document.getElementById('topbar');
  const bgAnim     = document.getElementById('bg-anim');
  const heroBaby   = document.getElementById('hero-baby-info');
  const heroCam    = document.getElementById('hero-cam-btn');

  if (homeScreen && topbar) {
    homeScreen.addEventListener('scroll', () => {
      const sy = homeScreen.scrollTop;

      // Topbar hero mode
      topbar.classList.toggle('hero-mode', sy < 60);

      // Hero overlay elements: counteract scroll so they stay over the fixed photo
      const fix = `translateY(${sy}px)`;
      if (heroBaby) heroBaby.style.transform = fix;
      if (heroCam)  heroCam.style.transform  = fix;

      // Background blobs: drift at 20% speed → parallax depth
      if (bgAnim) bgAnim.style.transform = `translateY(${sy * 0.20}px)`;
    }, { passive: true });
  }
}

// Startup
document.addEventListener('DOMContentLoaded', init);
