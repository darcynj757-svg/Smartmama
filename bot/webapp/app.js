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
  childDob: '',
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
  children: [],
  currentChildIndex: 0,
};

// ─── Multi-child support ─────────────────────────────────────────────────────
function saveChildrenCache() {
  try { localStorage.setItem('children_cache', JSON.stringify(state.children)); } catch(e) {}
}

function loadChildrenCache() {
  try {
    const raw = localStorage.getItem('children_cache');
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length > 0) return arr;
    }
  } catch(e) {}
  return null;
}

function applyChild(index) {
  if (!state.children.length) return;
  const c = state.children[index];
  if (!c) return;
  state.currentChildIndex = index;
  state.childName   = c.childName   || 'малыш';
  state.childAge    = c.childAge    || 0;
  state.childGender = c.childGender || '';
  state.childDob    = c.childDob    || '';
  state.region      = c.region      || state.region;
  // Load that child's photo
  const photoKey = index === 0 ? 'heroBabyPhoto' : `heroBabyPhoto_${index}`;
  const photo = localStorage.getItem(photoKey) || (index === 0 ? null : localStorage.getItem('heroBabyPhoto'));
  const fixed = document.getElementById('hero-photo-fixed');
  const placeholder = document.getElementById('hero-photo-placeholder');
  const wrap = document.getElementById('hero-photo-wrap');
  if (photo) {
    if (fixed) { fixed.src = photo; fixed.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
    if (wrap) { wrap.classList.add('has-photo'); }
  } else {
    if (fixed) { fixed.src = ''; fixed.style.display = 'none'; }
    if (placeholder) placeholder.style.display = '';
    if (wrap) { wrap.classList.remove('has-photo'); }
  }
  loadHomeStats();
}

function renderChildDots() {
  const el = document.getElementById('hero-child-dots');
  if (!el) return;
  const count = state.children.length;
  if (count <= 1) { el.innerHTML = ''; el.style.display = 'none'; return; }
  el.style.display = 'flex';
  el.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const d = document.createElement('span');
    d.className = 'hero-child-dot' + (i === state.currentChildIndex ? ' active' : '');
    d.onclick = (e) => { e.stopPropagation(); applyChild(i); };
    el.appendChild(d);
  }
}

function initChildSwipe() {
  const wrap = document.getElementById('hero-photo-wrap');
  if (!wrap) return;
  let startX = 0, startY = 0, moved = false;

  wrap.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    moved = false;
  }, { passive: true });

  wrap.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (Math.abs(dx) > 10) moved = true;
  }, { passive: true });

  wrap.addEventListener('touchend', e => {
    if (!moved) return;
    if (state.children.length <= 1) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
    // Animate wrap
    const dir = dx < 0 ? 1 : -1;
    let next = state.currentChildIndex + dir;
    if (next < 0) next = state.children.length - 1;
    if (next >= state.children.length) next = 0;
    // Slide animation
    wrap.style.transition = 'transform 0.2s ease';
    wrap.style.transform = `translateX(${dir * -60}px)`;
    setTimeout(() => {
      wrap.style.transition = 'none';
      wrap.style.transform = '';
      applyChild(next);
      renderChildDots();
    }, 180);
    // Prevent click from firing after swipe
    wrap.onclick = null;
    setTimeout(() => {
      wrap.onclick = () => document.getElementById('hero-photo-input').click();
    }, 300);
  }, { passive: true });
}

function getChildProfile() {
  return {
    childName:   state.childName  || 'малыш',
    ageMonths:   parseInt(state.childAge) || 0,
    gender:      state.childGender || '',
    region:      state.region      || '',
    mamaName:    state.mamaName    || '',
    bloodType:   state.profile?.blood_type   || '',
    allergies:   state.profile?.allergies    || '',
    doctor:      state.profile?.doctor       || '',
    healthNotes: state.profile?.health_notes || '',
    dob:         state.childDob || '',
  };
}

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
  // Back button: visible on all screens except home
  const backBtn = document.getElementById('topbar-back-btn');
  if (backBtn) backBtn.classList.toggle('visible', name !== 'home');

  // Bottom nav highlight
  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === name);
  });
  // AI FAB: hide on aichat screen
  const fab = document.getElementById('ai-fab');
  if (fab) fab.classList.toggle('hidden', name === 'aichat');
  // Diary FAB: only visible on diary screen
  const diaryFab = document.querySelector('.diary-fab');
  if (diaryFab) diaryFab.style.display = name === 'diary' ? '' : 'none';
  // Hero photo fixed: only visible on home screen
  const heroFixed = document.getElementById('hero-photo-fixed');
  if (heroFixed) heroFixed.style.display = name === 'home' ? 'block' : 'none';
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
  // Tint global background for themed screens
  document.body.classList.toggle('on-home',      name === 'home');
  document.body.classList.toggle('on-benefits',  name === 'benefits');
  document.body.classList.toggle('on-referral',  name === 'referral');
  document.body.classList.toggle('on-pricing',   name === 'pricing');
  document.body.classList.toggle('on-sounds',    name === 'sounds');
  document.body.classList.toggle('on-kbzhu',     name === 'kbzhu');
  document.body.classList.toggle('on-workout',   name === 'workout');
  document.body.classList.toggle('on-neuro',     name === 'neuro');
  document.body.classList.toggle('on-sleep',     name === 'sleep');
  document.body.classList.toggle('on-feed',      name === 'feed');
  document.body.classList.toggle('on-diary',     name === 'diary');

  screenHistory.push(name);
  if (name === 'home') loadHomeStats();
  if (name === 'sleep') loadSleepData();
  if (name === 'feed') loadFeedData();
  if (name === 'workout' || name === 'kbzhu') loadKbzhu();
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
const chatHistories = { aichat: [], speech: [], games: [], nutrition: [], health: [], workout: [] };
const chatEndpoints = {
  aichat: '/ai/chat',
  speech: '/ai/speech-exercise',
  games: '/ai/game-idea',
  nutrition: '/ai/chat',
  health: '/ai/health-advice',
  workout: '/ai/workout',
};

function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function chatKeydown(e, screen) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(screen); }
}

function renderMarkdown(text) {
  const lines = text.split('\n');
  const result = [];
  let inOl = false, inUl = false;

  const closeLists = () => {
    if (inOl) { result.push('</ol>'); inOl = false; }
    if (inUl) { result.push('</ul>'); inUl = false; }
  };

  const inlineFormat = (line) =>
    line
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const olMatch = line.match(/^(\d+)\.\s+(.+)/);
    const ulMatch = line.match(/^[-•]\s+(.+)/);

    if (olMatch) {
      if (!inOl) { closeLists(); result.push('<ol>'); inOl = true; }
      result.push(`<li>${inlineFormat(olMatch[2])}</li>`);
    } else if (ulMatch) {
      if (!inUl) { closeLists(); result.push('<ul>'); inUl = true; }
      result.push(`<li>${inlineFormat(ulMatch[1])}</li>`);
    } else {
      closeLists();
      const formatted = inlineFormat(line);
      if (formatted.trim() === '') {
        if (i < lines.length - 1) result.push('<br>');
      } else {
        result.push(`<p>${formatted}</p>`);
      }
    }
  }
  closeLists();
  return result.join('');
}

// ─── Voice recording ───────────────────────────────────────────────────────
let _voiceRecorder = null;
let _voiceChunks   = [];
let _voiceScreen   = null;

async function toggleVoice(screen) {
  if (_voiceRecorder && _voiceRecorder.state === 'recording') {
    _voiceRecorder.stop();
    const btn = document.getElementById(screen + '-mic-btn');
    if (btn) { btn.classList.remove('recording'); btn.textContent = '🎙️'; }
  } else {
    await _startVoiceRecording(screen);
  }
}

async function _startVoiceRecording(screen) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showToast('Голосовой ввод не поддерживается браузером');
    return;
  }
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    showToast('Нет доступа к микрофону');
    return;
  }

  _voiceChunks = [];
  _voiceScreen = screen;

  const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/ogg','audio/mp4']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';
  _voiceRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
  _voiceRecorder.ondataavailable = e => { if (e.data && e.data.size > 0) _voiceChunks.push(e.data); };
  _voiceRecorder.onstop = () => _handleVoiceStop(stream);
  _voiceRecorder.start();

  const btn = document.getElementById(screen + '-mic-btn');
  if (btn) { btn.classList.add('recording'); btn.textContent = '⏹'; }
}

async function _handleVoiceStop(stream) {
  stream.getTracks().forEach(t => t.stop());

  const chunks  = _voiceChunks;
  const screen  = _voiceScreen;
  _voiceChunks  = [];
  _voiceScreen  = null;
  _voiceRecorder = null;

  if (!chunks.length || !screen) return;

  const blob = new Blob(chunks, { type: chunks[0].type || 'audio/webm' });
  if (blob.size < 500) { showToast('Слишком короткая запись'); return; }

  const msgsId = screen + '-msgs';
  const typing = appendMsg(msgsId, '🎙️ распознаю речь...', 'ai typing');

  try {
    const fd = new FormData();
    fd.append('audio', blob, 'voice.webm');

    const BASE = window.API_BASE || '';
    const initData = window.Telegram?.WebApp?.initData || '';
    const resp = await fetch(BASE + '/api/ai/transcribe', {
      method: 'POST',
      headers: initData ? { 'X-Telegram-Init-Data': initData } : {},
      body: fd,
    });
    const data = await resp.json();
    typing?.remove();

    if (data.text && data.text.trim()) {
      const input = document.getElementById(screen + '-input');
      if (input) {
        input.value = data.text.trim();
        autoResize(input);
        sendChat(screen);
      }
    } else {
      showToast('Речь не распознана, попробуй ещё раз');
    }
  } catch {
    typing?.remove();
    showToast('Ошибка распознавания, попробуй ещё раз');
  }
}
// ──────────────────────────────────────────────────────────────────────────────

function appendMsg(msgsId, text, role) {
  const area = document.getElementById(msgsId);
  if (!area) return;
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  if (role === 'ai' && !role.includes('typing')) {
    div.innerHTML = renderMarkdown(text);
  } else {
    div.textContent = text;
  }
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
      profile: getChildProfile(),
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
    fd.append('profile', JSON.stringify(getChildProfile()));
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
      planTitle.textContent = 'Тарифы';
      if (planSub) planSub.textContent = 'Бесплатно · 290 ₽ · 490 ₽';
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
  const mid = (norm.min + norm.max) / 2;
  const pct = Math.min(100, Math.round((totalMins / mid) * 100));

  // Legacy element (hidden, used for compat)
  const valEl = document.getElementById('sleep-val');
  if (valEl) valEl.textContent = `${h}ч ${m}мин`;

  // New ring display
  const valH = document.getElementById('sleep-val-h');
  const valM = document.getElementById('sleep-val-m');
  if (valH) valH.textContent = `${h}ч`;
  if (valM) valM.textContent = `${m}мин`;

  const normEl = document.getElementById('sleep-norm-txt');
  const barEl  = document.getElementById('sleep-bar');
  const ringEl = document.getElementById('sleep-ring-fill');
  const hintEl = document.getElementById('sleep-hero-hint');

  if (normEl) normEl.textContent = norm.label;
  if (barEl)  barEl.style.width = pct + '%';

  // SVG ring (circ = 238.76)
  if (ringEl) ringEl.style.strokeDashoffset = 238.76 * (1 - pct / 100);

  // Hint text
  if (hintEl) {
    const remainMins = norm.min - totalMins;
    if (totalMins === 0)       hintEl.textContent = 'Сон ещё не записан';
    else if (remainMins > 0)   hintEl.textContent = `Ещё ${Math.ceil(remainMins/60)}ч до нормы`;
    else                       hintEl.textContent = '✅ Норма выполнена!';
  }

  const list = document.getElementById('sleep-list');
  if (list) {
    if (state.sleepToday.length === 0) {
      list.innerHTML = '<li style="text-align:center;padding:16px 0;color:var(--text-hint);font-size:13px">Сна пока нет — нажми «Уложила сейчас»</li>';
    } else {
      list.innerHTML = state.sleepToday.slice().reverse().map(s => `
        <li class="entry-item">
          <span class="entry-ico">💤</span>
          <div class="entry-text">
            <div class="entry-main">${s.start} — ${s.end || '...'}</div>
            <div class="entry-sub">${s.note ? s.note + ' · ' : ''}${Math.floor(s.minutes/60)}ч ${s.minutes%60}мин</div>
          </div>
        </li>
      `).join('');
    }
  }

  // Restore timer UI state on re-render
  initSleepTimerUI();
  updateHomeTrackerStats();
}

function initSleepTimerUI() {
  const timerStart = localStorage.getItem('sleep_timer_start');
  const startBtn   = document.getElementById('sleep-start-btn');
  const recBlock   = document.getElementById('sleep-recording');
  const recLabel   = document.getElementById('sleep-rec-start');
  if (!startBtn || !recBlock) return;
  if (timerStart) {
    startBtn.style.display = 'none';
    recBlock.style.display = 'flex';
    if (recLabel) recLabel.textContent = timerStart;
  } else {
    startBtn.style.display = 'flex';
    recBlock.style.display = 'none';
  }
}

function startSleepTimer() {
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  localStorage.setItem('sleep_timer_start', time);
  initSleepTimerUI();
  showToast('🌙 Таймер запущен — сладких снов!');
}

function wakeFromTimer() {
  const startTime = localStorage.getItem('sleep_timer_start');
  if (!startTime) return;
  const now = new Date();
  const endTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let minutes = (eh * 60 + em) - (sh * 60 + sm);
  if (minutes < 0) minutes += 24 * 60;

  if (minutes < 1) { showToast('Слишком маленький интервал'); return; }

  const today = now.toISOString().split('T')[0];
  const entry = { start: startTime, end: endTime, note: '', minutes, date: today };
  state.sleepToday.push(entry);
  localStorage.setItem('sleep_' + today, JSON.stringify(state.sleepToday));
  localStorage.removeItem('sleep_timer_start');

  renderSleepData();
  showToast(`☀️ Проснулся! Сон ${Math.floor(minutes/60)}ч ${minutes%60}мин записан ✅`);
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
  const pct = Math.min(100, Math.round((count / norm.max) * 100));

  const valEl  = document.getElementById('feed-val');
  const normEl = document.getElementById('feed-norm-txt');
  const barEl  = document.getElementById('feed-bar');
  const ringEl = document.getElementById('feed-ring-fill');
  const hintEl = document.getElementById('feed-hero-hint');

  if (valEl)  valEl.textContent  = count;
  if (normEl) normEl.textContent = norm.label;
  if (barEl)  barEl.style.width  = pct + '%';

  // Animate SVG ring (circumference = 2π×38 ≈ 238.76)
  if (ringEl) {
    const circ = 238.76;
    ringEl.style.strokeDashoffset = circ * (1 - pct / 100);
  }

  // Hint text
  if (hintEl) {
    const remaining = norm.max - count;
    if (count === 0)         hintEl.textContent = 'Ещё не кормили сегодня';
    else if (remaining > 0)  hintEl.textContent = `Ещё ${remaining} до нормы`;
    else                     hintEl.textContent = '✅ Норма выполнена!';
  }

  const list = document.getElementById('feed-list');
  if (list) {
    if (state.feedToday.length === 0) {
      list.innerHTML = '<li style="text-align:center;padding:16px 0;color:var(--text-hint);font-size:13px">Кормлений пока нет — нажми тип питания выше</li>';
    } else {
      list.innerHTML = state.feedToday.slice().reverse().map(f => `
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
  }
  updateHomeTrackerStats();
}

function quickLog(type) {
  const now = new Date();
  const time = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');
  const today = now.toISOString().split('T')[0];
  const entry = { time, type, amount: '', date: today };
  state.feedToday.push(entry);
  localStorage.setItem('feed_' + today, JSON.stringify(state.feedToday));
  renderFeedData();
  showToast(`${feedTypeEmoji[type]} ${feedTypeLabel[type]} записано ✅`);
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

// ─── КБЖУ ────────────────────────────────────────────────────────────────────
const KBZHU_GOALS_KEY = 'kbzhu_goals';
const kbzhuDefaultGoals = { kcal: 2300, p: 90, f: 75, c: 310 };
const mealEmojis = ['🍽','🥗','🥞','🍲','🥩','🐟','🥚','🧀','🫐','🍎','🥕','🥑','🫙','☕'];

function loadKbzhu() {
  const today = new Date().toISOString().slice(0, 10);
  state.kbzhuToday = JSON.parse(localStorage.getItem('kbzhu_' + today) || '[]');
  state.kbzhuGoals = JSON.parse(localStorage.getItem(KBZHU_GOALS_KEY) || 'null') || { ...kbzhuDefaultGoals };
  updateKbzhuTotals();
  renderKbzhuList();
  fillKbzhuGoalInputs();
}

function switchWorkoutTab(tab) {
  document.getElementById('workout-tab-chat').style.display = tab === 'chat' ? 'flex' : 'none';
  document.getElementById('workout-tab-kbzhu').style.display = tab === 'kbzhu' ? 'flex' : 'none';
  document.getElementById('wtab-chat').classList.toggle('active', tab === 'chat');
  document.getElementById('wtab-kbzhu').classList.toggle('active', tab === 'kbzhu');
}

function goWorkoutKbzhu() {
  go('kbzhu');
}

function updateKbzhuTotals() {
  const g = state.kbzhuGoals || kbzhuDefaultGoals;
  const meals = state.kbzhuToday || [];
  const totals = meals.reduce((acc, m) => {
    acc.kcal += m.kcal || 0;
    acc.p += m.p || 0;
    acc.f += m.f || 0;
    acc.c += m.c || 0;
    return acc;
  }, { kcal: 0, p: 0, f: 0, c: 0 });

  const pct = (val, goal) => Math.min(100, goal > 0 ? Math.round(val / goal * 100) : 0);

  document.getElementById('kbzhu-kcal-val').textContent = Math.round(totals.kcal);
  document.getElementById('kbzhu-kcal-goal').textContent = g.kcal;
  document.getElementById('kbzhu-kcal-bar').style.width = pct(totals.kcal, g.kcal) + '%';

  document.getElementById('kbzhu-p-val').textContent = Math.round(totals.p);
  document.getElementById('kbzhu-p-goal').textContent = g.p;
  document.getElementById('kbzhu-p-bar').style.width = pct(totals.p, g.p) + '%';

  document.getElementById('kbzhu-f-val').textContent = Math.round(totals.f);
  document.getElementById('kbzhu-f-goal').textContent = g.f;
  document.getElementById('kbzhu-f-bar').style.width = pct(totals.f, g.f) + '%';

  document.getElementById('kbzhu-c-val').textContent = Math.round(totals.c);
  document.getElementById('kbzhu-c-goal').textContent = g.c;
  document.getElementById('kbzhu-c-bar').style.width = pct(totals.c, g.c) + '%';
}

function renderKbzhuList() {
  const list = document.getElementById('kbzhu-list');
  if (!list) return;
  const meals = state.kbzhuToday || [];
  if (!meals.length) {
    list.innerHTML = '<li style="padding:14px 0;text-align:center;color:var(--text-secondary);font-size:13px">Нет приёмов пищи. Добавьте первый! 🥗</li>';
    return;
  }
  list.innerHTML = meals.map((m, i) => {
    const ico = mealEmojis[i % mealEmojis.length];
    return `<li class="kbzhu-meal-item">
      <span class="kbzhu-meal-ico">${ico}</span>
      <div class="kbzhu-meal-body">
        <div class="kbzhu-meal-name">${m.name}</div>
        <div class="kbzhu-meal-macros">
          <span class="km-kcal">${m.kcal} ккал</span>
          <span class="km-p">Б ${m.p}г</span>
          <span class="km-f">Ж ${m.f}г</span>
          <span class="km-c">У ${m.c}г</span>
        </div>
      </div>
      <button class="kbzhu-meal-del" onclick="deleteKbzhuEntry(${i})">×</button>
    </li>`;
  }).join('');
}

function saveKbzhuMeal() {
  const name = document.getElementById('kbzhu-name').value.trim();
  if (!name) { showToast('Введите название блюда'); return; }
  const kcal = parseFloat(document.getElementById('kbzhu-kcal-in').value) || 0;
  const p = parseFloat(document.getElementById('kbzhu-p-in').value) || 0;
  const f = parseFloat(document.getElementById('kbzhu-f-in').value) || 0;
  const c = parseFloat(document.getElementById('kbzhu-c-in').value) || 0;

  const today = new Date().toISOString().slice(0, 10);
  state.kbzhuToday = state.kbzhuToday || [];
  state.kbzhuToday.push({ name, kcal, p, f, c, time: new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' }) });
  localStorage.setItem('kbzhu_' + today, JSON.stringify(state.kbzhuToday));

  document.getElementById('kbzhu-name').value = '';
  document.getElementById('kbzhu-kcal-in').value = '';
  document.getElementById('kbzhu-p-in').value = '';
  document.getElementById('kbzhu-f-in').value = '';
  document.getElementById('kbzhu-c-in').value = '';

  toggleForm('kbzhu-form');
  updateKbzhuTotals();
  renderKbzhuList();
  showToast('Приём пищи добавлен ✅');
}

function deleteKbzhuEntry(idx) {
  const today = new Date().toISOString().slice(0, 10);
  state.kbzhuToday.splice(idx, 1);
  localStorage.setItem('kbzhu_' + today, JSON.stringify(state.kbzhuToday));
  updateKbzhuTotals();
  renderKbzhuList();
}

function fillKbzhuGoalInputs() {
  const g = state.kbzhuGoals || kbzhuDefaultGoals;
  const el = (id) => document.getElementById(id);
  if (el('kbzhu-goal-kcal')) el('kbzhu-goal-kcal').value = g.kcal;
  if (el('kbzhu-goal-p'))    el('kbzhu-goal-p').value = g.p;
  if (el('kbzhu-goal-f'))    el('kbzhu-goal-f').value = g.f;
  if (el('kbzhu-goal-c'))    el('kbzhu-goal-c').value = g.c;
}

function saveKbzhuGoals() {
  const kcal = parseFloat(document.getElementById('kbzhu-goal-kcal').value) || kbzhuDefaultGoals.kcal;
  const p    = parseFloat(document.getElementById('kbzhu-goal-p').value)    || kbzhuDefaultGoals.p;
  const f    = parseFloat(document.getElementById('kbzhu-goal-f').value)    || kbzhuDefaultGoals.f;
  const c    = parseFloat(document.getElementById('kbzhu-goal-c').value)    || kbzhuDefaultGoals.c;
  state.kbzhuGoals = { kcal, p, f, c };
  localStorage.setItem(KBZHU_GOALS_KEY, JSON.stringify(state.kbzhuGoals));
  toggleForm('kbzhu-goals-form');
  updateKbzhuTotals();
  showToast('Норма сохранена ✅');
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
  updateDiaryHero();
}

function updateDiaryHero() {
  const nameEl = document.getElementById('diary-hero-name');
  const ageEl  = document.getElementById('diary-hero-age');
  const statsEl = document.getElementById('diary-hero-stats');
  if (nameEl) nameEl.textContent = state.childName || 'Малыш';
  if (ageEl)  ageEl.textContent  = state.childAge ? `${state.childAge} мес` : '';
  if (statsEl) {
    const lastHW = state.diaryEntries.find(e => e.type === 'height');
    let pills = '';
    if (lastHW && lastHW.value) {
      const parts = lastHW.value.split(',');
      parts.forEach(p => {
        pills += `<span class="diary-stat-pill">${p.trim()}</span>`;
      });
    }
    statsEl.innerHTML = pills;
  }
}

function renderDiaryEntries() {
  const list  = document.getElementById('diary-list');
  const empty = document.getElementById('diary-empty');
  if (!list) return;
  let entries = state.diaryEntries;
  if (currentDiaryTab !== 'all') entries = entries.filter(e => e.type === currentDiaryTab);
  entries = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  if (entries.length === 0) {
    list.innerHTML = '';
    if (empty) empty.style.display = '';
  } else {
    if (empty) empty.style.display = 'none';
    list.innerHTML = entries.map(e => `
      <li class="diary-tl-item">
        <span class="diary-tl-ico">${diaryTypeEmoji[e.type] || '📝'}</span>
        <div class="diary-tl-body">
          <div class="diary-tl-type">${e.title || e.type}</div>
          <div class="diary-tl-val">${e.value || '—'}</div>
          <div class="diary-tl-date">${e.date || ''}</div>
        </div>
      </li>
    `).join('');
  }
}

function setDiaryPane(pane, btn) {
  document.querySelectorAll('.diary-seg').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('diary-pane-entries').style.display = pane === 'entries' ? '' : 'none';
  document.getElementById('diary-pane-docs').style.display    = pane === 'docs'    ? '' : 'none';
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
    fd.append('profile', JSON.stringify(getChildProfile()));
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
    const data = await apiCall('POST', '/ai/food-recipe', { dishName, profile: getChildProfile(), childName: state.childName, ageMonths: state.childAge });
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
    const chipRegion = c.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || '';
    c.classList.toggle('selected', chipRegion === region);
  });
  loadBenefits();
}

function renderBenefitsMarkdown(text) {
  const container = document.createElement('div');
  const lines = text.split('\n');
  let currentBlock = null;
  let listEl = null;

  function flushBlock() {
    if (currentBlock) {
      if (listEl) { currentBlock.querySelector('.ben-block-body').appendChild(listEl); listEl = null; }
      container.appendChild(currentBlock);
      currentBlock = null;
    }
  }

  lines.forEach(raw => {
    const line = raw.trim();
    if (!line) { if (listEl) { flushBlock(); } return; }

    // Heading: **Title** or ### Title or line ending with :
    const boldHeading = line.match(/^\*\*(.+?)\*\*:?\s*$/);
    const hashHeading = line.match(/^#{1,3}\s+(.+)/);
    if (boldHeading || hashHeading) {
      flushBlock();
      currentBlock = document.createElement('div');
      currentBlock.className = 'ben-block';
      const t = document.createElement('div');
      t.className = 'ben-block-title';
      t.textContent = (boldHeading?.[1] || hashHeading?.[1]).replace(/\*\*/g, '');
      currentBlock.appendChild(t);
      const b = document.createElement('div');
      b.className = 'ben-block-body';
      currentBlock.appendChild(b);
      listEl = null;
      return;
    }

    // List item: - or • or *
    const listMatch = line.match(/^[-•*]\s+(.+)/);
    if (listMatch) {
      if (!currentBlock) {
        currentBlock = document.createElement('div');
        currentBlock.className = 'ben-block';
        const b = document.createElement('div');
        b.className = 'ben-block-body';
        currentBlock.appendChild(b);
      }
      if (!listEl) { listEl = document.createElement('ul'); }
      const li = document.createElement('li');
      li.innerHTML = listMatch[1].replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      listEl.appendChild(li);
      return;
    }

    // Plain text
    if (listEl) { flushBlock(); currentBlock = null; }
    if (!currentBlock) {
      currentBlock = document.createElement('div');
      currentBlock.className = 'ben-block';
      const b = document.createElement('div');
      b.className = 'ben-block-body';
      currentBlock.appendChild(b);
    }
    const body = currentBlock.querySelector('.ben-block-body');
    const p = document.createElement('p');
    p.style.margin = '0 0 4px';
    p.innerHTML = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (listEl) { body.appendChild(listEl); listEl = null; }
    body.appendChild(p);
  });

  flushBlock();
  return container;
}

async function loadBenefits() {
  const region = document.getElementById('benefits-region-input')?.value?.trim();
  if (!region) { showToast('Введите название региона'); return; }

  const loader = document.getElementById('benefits-loader');
  const result = document.getElementById('benefits-result');
  const infoCards = document.getElementById('benefits-info-cards');

  loader.style.display = 'block';
  result.style.display = 'none';
  if (infoCards) infoCards.style.display = 'none';

  try {
    const data = await apiCall('POST', '/ai/benefits', { region, ageMonths: state.childAge, profile: getChildProfile() });
    document.getElementById('benefits-region-badge').textContent = '🗺 ' + region;
    const textEl = document.getElementById('benefits-text');
    textEl.innerHTML = '';
    textEl.appendChild(renderBenefitsMarkdown(data.text || ''));
    loader.style.display = 'none';
    result.style.display = 'block';
  } catch(e) {
    loader.style.display = 'none';
    if (infoCards) infoCards.style.display = 'block';
    showToast('Ошибка загрузки: ' + e.message);
  }
}

function resetBenefits() {
  document.getElementById('benefits-result').style.display = 'none';
  document.getElementById('benefits-loader').style.display = 'none';
  const infoCards = document.getElementById('benefits-info-cards');
  if (infoCards) infoCards.style.display = 'block';
  document.getElementById('benefits-region-input').value = '';
  document.querySelectorAll('.benefits-chip').forEach(c => c.classList.remove('selected'));
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
    const el = document.getElementById('neuro-upload');
    if (!el) return;
    el.innerHTML = `
      <img src="${e.target.result}" alt="preview"
        style="width:72px;height:72px;object-fit:cover;border-radius:14px;flex-shrink:0">
      <span class="neuro-upload-card-text">
        <span>Фото загружено ✅</span>
        <span>Нажми чтобы заменить</span>
      </span>`;
    el.style.borderStyle = 'solid';
    el.style.borderColor = 'rgba(200,140,200,0.55)';
    el.style.background = 'rgba(249,168,201,0.10)';
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
  const dobEl = document.getElementById('profile-dob');
  if (dobEl) dobEl.value = state.childDob || '';

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
  const childName  = document.getElementById('profile-child-name')?.value?.trim();
  const gender     = document.getElementById('profile-child-gender')?.value;
  const age        = parseInt(document.getElementById('profile-age')?.value) || 0;
  const region     = document.getElementById('profile-region')?.value?.trim();
  const dob        = document.getElementById('profile-dob')?.value || '';
  const bloodType  = document.getElementById('profile-blood')?.value;
  const allergies  = document.getElementById('profile-allergies')?.value;
  const doctor     = document.getElementById('profile-doctor')?.value;
  const healthNotes = document.getElementById('profile-health-notes')?.value;

  state.childName   = childName || state.childName;
  state.childAge    = age || state.childAge;
  state.childGender = gender || state.childGender;
  state.region      = region || state.region;
  state.childDob    = dob || state.childDob;

  const profileData = {
    ...state.profile,
    blood_type: bloodType,
    allergies,
    doctor,
    health_notes: healthNotes,
    child_name: childName,
    child_age_months: age,
    child_gender: gender,
    child_dob: dob,
    region,
  };
  state.profile = profileData;
  localStorage.setItem('profile_cache', JSON.stringify({ childName, childAge: age, childGender: gender, childDob: dob, region, plan: state.plan }));

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
    if (cached.childName)   state.childName   = cached.childName;
    if (cached.childAge)    state.childAge    = cached.childAge;
    if (cached.childGender) state.childGender = cached.childGender;
    if (cached.childDob)    state.childDob    = cached.childDob;
    if (cached.region)      state.region      = cached.region;
    if (cached.plan)        state.plan        = cached.plan;
  } catch(e) {}

  // Restore children list from cache
  const cachedChildren = loadChildrenCache();
  if (cachedChildren && cachedChildren.length > 0) {
    state.children = cachedChildren;
    state.currentChildIndex = 0;
    const c = state.children[0];
    state.childName   = c.childName   || state.childName;
    state.childAge    = c.childAge    || state.childAge;
    state.childGender = c.childGender || state.childGender;
    state.childDob    = c.childDob    || state.childDob;
    state.region      = c.region      || state.region;
  }

  loadHomeStats();
  renderChildDots();
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
    state.mamaName  = data.mama_name  || '';
    state.childDob  = data.child_dob  || state.childDob || '';
    state.profile   = data.profile    || {};

    // Merge API child (index 0) into children array
    if (state.children.length === 0) {
      state.children = [{
        childName:   state.childName,
        childAge:    state.childAge,
        childGender: state.childGender,
        childDob:    state.childDob,
        region:      state.region,
      }];
    } else {
      // Update first child with fresh API data
      state.children[0] = {
        ...state.children[0],
        childName:   state.childName,
        childAge:    state.childAge,
        childGender: state.childGender,
        childDob:    state.childDob,
        region:      state.region,
      };
    }
    saveChildrenCache();

    // Cache profile
    localStorage.setItem('profile_cache', JSON.stringify({
      childName:   state.childName,
      childAge:    state.childAge,
      childGender: state.childGender,
      childDob:    state.childDob,
      region:      state.region,
      plan:        state.plan,
    }));

    loadHomeStats();
    renderChildDots();

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
    // Build children array from state even if API failed
    if (state.children.length === 0 && state.childName) {
      state.children = [{
        childName:   state.childName,
        childAge:    state.childAge,
        childGender: state.childGender,
        childDob:    state.childDob,
        region:      state.region,
      }];
      saveChildrenCache();
      renderChildDots();
    }
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
    const idx = state.currentChildIndex;
    const key = idx === 0 ? 'heroBabyPhoto' : `heroBabyPhoto_${idx}`;
    try { localStorage.setItem(key, data); } catch(e) {}
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
  if (wrap) {
    wrap.classList.add('has-photo');
    // restore click handler (may have been cleared by swipe)
    wrap.onclick = () => document.getElementById('hero-photo-input').click();
  }
}

function initHeroPhoto() {
  // Restore saved photo for current child
  const idx = state.currentChildIndex;
  const key = idx === 0 ? 'heroBabyPhoto' : `heroBabyPhoto_${idx}`;
  const saved = localStorage.getItem(key) || (idx !== 0 ? localStorage.getItem('heroBabyPhoto') : null);
  if (saved) applyHeroBabyPhoto(saved);

  // Init swipe between children
  initChildSwipe();

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
