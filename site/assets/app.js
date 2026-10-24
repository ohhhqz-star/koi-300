'use strict';

(() => {
  const CATEGORIES = ['Fund (OTC)', 'Fund (ETF)', 'Stock', 'Pension', 'Gold', 'Cash'];
  const ACTIONS = ['Buy', 'Sell', 'DCA', 'Switch', 'Dividend'];
  const FREQUENCIES = ['Monthly', 'Weekly', 'Daily', 'Every trading day', 'One-off'];
  const PLAN_STATUSES = ['Active', 'Paused', 'Cash pool', 'Finished'];
  const DATA_STATUSES = ['Manual', 'From screenshot', 'Broker screenshot', 'Estimate', 'Needs update'];
  const MOODS = [
    { value: 1, label: 'Rough' },
    { value: 2, label: 'Low' },
    { value: 3, label: 'Neutral' },
    { value: 4, label: 'Good' },
    { value: 5, label: 'Great' }
  ];
  const THEMES = [
    { id: 'warm', label: 'Warm rice', page: '#F6F2EA', accent: '#1F4E4A' },
    { id: 'blush', label: 'Blush', page: '#FBF4F2', accent: '#8A5A63' },
    { id: 'mist', label: 'Mist', page: '#F2F6F8', accent: '#346074' },
    { id: 'snow', label: 'Snow', page: '#FAFAF9', accent: '#3E3E3A' },
    { id: 'night', label: 'Night', page: '#0F1315', accent: '#9DC9C1' }
  ];
  const CHART_COLORS = ['#2C5D57', '#B08D50', '#5B7C99', '#8C6B8E', '#B06A4F', '#7E8B76', '#D3B38C'];
  const LS_DATA = 'koi300.data.v1';
  const LS_THEME = 'koi300.theme';
  const GOAL = 300;
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const state = {
    section: 'overview',
    data: emptyData(),
    mode: 'browser',
    dataFile: '',
    dataDir: '',
    port: 4877,
    mtimeMs: 0,
    storageBroken: false,
    saving: false,
    saveSeq: 0,
    filters: {
      holdings: { q: '', category: 'All', account: 'All' },
      trades: { q: '', action: 'All', month: 'All' },
      reviews: { q: '' }
    },
    lastExternalToast: 0
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const icon = (name, className = 'icon') =>
    `<svg class="${className}" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const esc = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[char]);

  const numberFormat = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const shortNumberFormat = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  // ---------- formatting ----------

  function money(value, signed = false) {
    const number = Number(value) || 0;
    const clean = Math.abs(number) < 0.005 ? 0 : number;
    const body = numberFormat.format(Math.abs(clean));
    if (clean < 0) return '-¥' + body;
    if (signed && clean > 0) return '+¥' + body;
    return '¥' + body;
  }

  function percent(value, signed = true) {
    const number = (Number(value) || 0) * 100;
    const clean = Math.abs(number) < 0.005 ? 0 : number;
    const body = numberFormat.format(Math.abs(clean)) + '%';
    if (clean < 0) return '-' + body;
    if (signed && clean > 0) return '+' + body;
    return body;
  }

  function numberText(value, digits = 2) {
    if (value === null || value === undefined || value === '') return '—';
    if (!Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(Number(value));
  }

  function pad(value) { return String(value).padStart(2, '0'); }
  function today() {
    const date = new Date();
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function isoNow() {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  function parseDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  function shortDate(value) {
    const date = parseDate(value);
    return date ? `${MONTHS[date.getMonth()]} ${date.getDate()}` : '—';
  }
  function fullDate(value) {
    const date = parseDate(value);
    if (!date) return value || '—';
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} · ${WEEKDAYS[date.getDay()]}`;
  }
  function chineseToday() {
    const date = new Date();
    return `${WEEKDAYS_LONG[date.getDay()]}, ${MONTHS_LONG[date.getMonth()]} ${date.getDate()}`;
  }
  function timeText(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function dateTimeText(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function fileStamp() {
    const date = new Date();
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  }
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
      const random = (Math.random() * 16) | 0;
      return (char === 'x' ? random : (random & 0x3) | 0x8).toString(16);
    });
  }

  function moodLabel(value) {
    return (MOODS.find((item) => item.value === Number(value)) || MOODS[2]).label;
  }

  function actionTone(action) {
    if (action === 'Buy' || action === 'DCA') return 'gain';
    if (action === 'Sell') return 'loss';
    if (action === 'Dividend') return 'gold';
    return '';
  }

  function stage(count) {
    if (count <= 0) return 'The first entry starts today';
    if (count < 30) return 'Watch yourself first';
    if (count < 100) return 'A rhythm is forming';
    if (count < 200) return 'Discipline takes shape';
    if (count < GOAL) return 'Your style is close';
    return 'Your style stands on its own';
  }

  // ---------- data ----------

  function emptyData() {
    return {
      schemaVersion: 1,
      assets: [],
      trades: [],
      reviews: [],
      plans: [],
      snapshots: [],
      lastModified: isoNow()
    };
  }

  function finite(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function optionalNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  // Data written by the Chinese desktop app is accepted and mapped to the
  // English vocabulary so imports never collapse to the fallback value.
  const ENUM_ALIASES = {
    '场外基金': 'Fund (OTC)', '场内基金': 'Fund (ETF)', '股票': 'Stock',
    '养老金': 'Pension', '黄金': 'Gold', '现金': 'Cash',
    '买入': 'Buy', '卖出': 'Sell', '定投': 'DCA', '转换': 'Switch', '分红': 'Dividend',
    '每月': 'Monthly', '每周': 'Weekly', '每日': 'Daily', '每交易日': 'Every trading day', '一次性': 'One-off',
    '进行中': 'Active', '已暂停': 'Paused', '资金归集': 'Cash pool', '已结束': 'Finished',
    '手工填写': 'Manual', '截图录入': 'From screenshot', '券商截图': 'Broker screenshot',
    '估算': 'Estimate', '待更新': 'Needs update',
    '待复盘': 'Not reviewed', '是': 'Yes', '否': 'No', '部分按计划': 'Partly'
  };

  function alias(value) {
    return ENUM_ALIASES[value] || value;
  }

  function oneOf(value, list, fallback) {
    const normalized = alias(value);
    return list.includes(normalized) ? normalized : fallback;
  }

  function normalizeData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      throw new Error('This is not a valid Koi 300 data file.');
    }
    for (const key of ['assets', 'trades', 'reviews', 'plans', 'snapshots']) {
      if (raw[key] != null && !Array.isArray(raw[key])) {
        throw new Error(`Field "${key}" has the wrong format.`);
      }
    }
    const assets = (raw.assets || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      account: String(item.account || 'Unassigned'),
      category: oneOf(item.category, CATEGORIES, 'Fund (OTC)'),
      code: String(item.code || ''),
      name: String(item.name || 'Untitled holding'),
      cost: finite(item.cost),
      value: finite(item.value),
      units: optionalNumber(item.units),
      costPrice: optionalNumber(item.costPrice),
      price: optionalNumber(item.price),
      note: String(item.note || ''),
      nextStep: String(item.nextStep || ''),
      dataStatus: oneOf(item.dataStatus, DATA_STATUSES, 'Manual'),
      updatedAt: String(item.updatedAt || isoNow())
    }));

    const trades = (raw.trades || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      date: String(item.date || today()),
      account: String(item.account || ''),
      category: oneOf(item.category, CATEGORIES, 'Fund (OTC)'),
      code: String(item.code || ''),
      name: String(item.name || 'Untitled trade'),
      action: oneOf(item.action, ACTIONS, 'Buy'),
      amount: optionalNumber(item.amount),
      shares: optionalNumber(item.shares),
      price: optionalNumber(item.price),
      fee: optionalNumber(item.fee),
      realizedPnL: optionalNumber(item.realizedPnL),
      reason: String(item.reason || ''),
      mood: String(item.mood || ''),
      market: String(item.market || ''),
      review: String(item.review || ''),
      followedPlan: String(alias(item.followedPlan) || 'Not reviewed'),
      lesson: String(item.lesson || ''),
      createdAt: String(item.createdAt || isoNow())
    }));

    const reviews = (raw.reviews || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      date: String(item.date || today()),
      mood: Math.min(5, Math.max(1, Math.round(finite(item.mood, 3)))),
      trigger: String(item.trigger || ''),
      operations: String(item.operations || ''),
      market: String(item.market || ''),
      didRight: String(item.didRight || ''),
      didWrong: String(item.didWrong || ''),
      nextPlan: String(item.nextPlan || ''),
      createdAt: String(item.createdAt || isoNow()),
      updatedAt: String(item.updatedAt || isoNow())
    }));

    const plans = (raw.plans || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      platform: String(item.platform || 'No platform'),
      code: String(item.code || '—'),
      name: String(item.name || 'Untitled plan'),
      category: oneOf(item.category, CATEGORIES, 'Fund (OTC)'),
      frequency: oneOf(item.frequency, FREQUENCIES, 'Monthly'),
      amount: optionalNumber(item.amount),
      debitDay: String(item.debitDay || ''),
      startDate: String(item.startDate || ''),
      status: oneOf(item.status, PLAN_STATUSES, 'Active'),
      note: String(item.note || '')
    }));

    const snapshots = (raw.snapshots || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      date: String(item.date || today()),
      cost: finite(item.cost),
      value: finite(item.value),
      cash: finite(item.cash)
    }));

    return {
      schemaVersion: Math.max(1, Math.round(finite(raw.schemaVersion, 1))),
      assets,
      trades,
      reviews,
      plans,
      snapshots,
      lastModified: String(raw.lastModified || isoNow())
    };
  }

  function cloneData(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function totals(data = state.data) {
    const cost = data.assets.reduce((sum, item) => sum + finite(item.cost), 0);
    const value = data.assets.reduce((sum, item) => sum + finite(item.value), 0);
    const cash = data.assets
      .filter((item) => item.category === 'Cash')
      .reduce((sum, item) => sum + finite(item.value), 0);
    const pnl = value - cost;
    return {
      cost,
      value,
      cash,
      holdings: value - cash,
      pnl,
      rate: cost === 0 ? 0 : pnl / cost,
      cashShare: value === 0 ? 0 : cash / value
    };
  }

  function accountSummaries() {
    const map = new Map();
    for (const asset of state.data.assets) {
      const key = asset.account || 'Unassigned';
      if (!map.has(key)) map.set(key, { name: key, cost: 0, value: 0 });
      const row = map.get(key);
      row.cost += finite(asset.cost);
      row.value += finite(asset.value);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }

  function categorySummaries() {
    return CATEGORIES.map((name) => {
      const items = state.data.assets.filter((asset) => asset.category === name);
      if (!items.length) return null;
      return {
        name,
        cost: items.reduce((sum, asset) => sum + finite(asset.cost), 0),
        value: items.reduce((sum, asset) => sum + finite(asset.value), 0)
      };
    }).filter(Boolean);
  }

  function sortedTrades() {
    return state.data.trades.slice().sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  function sortedReviews() {
    return state.data.reviews.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }

  function sortedSnapshots() {
    return state.data.snapshots.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  }

  function recordCount() {
    return state.data.trades.length + state.data.reviews.length;
  }

  function progress300() {
    return Math.min(1, recordCount() / GOAL);
  }

  function isCashPool(plan) {
    return plan.status === 'Cash pool' || plan.category === 'Cash';
  }

  function monthlyEstimate(plan) {
    if (plan.status !== 'Active' || plan.amount == null) return 0;
    const amount = finite(plan.amount);
    switch (plan.frequency) {
      case 'Monthly': return amount;
      case 'Weekly': return amount * 52 / 12;
      case 'Daily': return amount * 30;
      case 'Every trading day': return amount * 21.75;
      default: return 0;
    }
  }

  function activePlans() {
    return state.data.plans.filter((plan) => plan.status === 'Active');
  }

  function monthlyInvesting() {
    return state.data.plans.reduce((sum, plan) => sum + monthlyEstimate(plan), 0);
  }

  function topHolding() {
    return state.data.assets.slice().sort((a, b) => finite(b.value) - finite(a.value))[0] || null;
  }

  function biggestLoss() {
    return state.data.assets.slice().sort((a, b) => (finite(a.value) - finite(a.cost)) - (finite(b.value) - finite(b.cost)))[0] || null;
  }

  function todayReview() {
    return state.data.reviews.find((review) => review.date === today()) || null;
  }

  function refreshTodaySnapshot() {
    const total = totals();
    const date = today();
    const existing = state.data.snapshots.find((snapshot) => snapshot.date === date);
    const next = {
      id: existing ? existing.id : uuid(),
      date,
      cost: total.cost,
      value: total.value,
      cash: total.cash
    };
    if (existing) {
      Object.assign(existing, next);
    } else {
      state.data.snapshots.push(next);
    }
    state.data.snapshots.sort((a, b) => (a.date < b.date ? -1 : 1));
  }

  function recordBadge(number) {
    return number > 0 ? String(number) : '';
  }

  function plural(count, one, many) {
    return `${count} ${count === 1 ? one : many}`;
  }

  // ---------- storage / local server ----------

  let memoryTheme = 'warm';

  function readTheme() {
    try {
      return localStorage.getItem(LS_THEME) || memoryTheme;
    } catch {
      return memoryTheme;
    }
  }

  function storeTheme(theme) {
    memoryTheme = theme;
    try { localStorage.setItem(LS_THEME, theme); } catch { /* file:// may deny storage */ }
  }

  function loadLocalData() {
    let raw;
    try { raw = localStorage.getItem(LS_DATA); } catch {
      state.storageBroken = true;
      return emptyData();
    }
    if (!raw) return emptyData();
    try {
      return normalizeData(JSON.parse(raw));
    } catch (error) {
      try { localStorage.setItem(`koi300.corrupt.${Date.now()}`, raw); } catch { /* ignore */ }
      toast('Local data could not be read', 'Started with empty data. The original text is still in this browser if you want to import a backup.', 'error');
      return emptyData();
    }
  }

  let saveChain = Promise.resolve();

  function persist() {
    state.data.lastModified = isoNow();
    if (state.mode === 'file') {
      const body = JSON.stringify(state.data, null, 2);
      const seq = ++state.saveSeq;
      state.saving = true;
      saveChain = saveChain.then(async () => {
        try {
          const response = await fetch('api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || `Save failed (${response.status})`);
          if (seq === state.saveSeq && result.mtimeMs) {
            state.mtimeMs = result.mtimeMs;
            state.dataFile = result.dataFile || state.dataFile;
          }
          updateChrome();
        } catch (error) {
          toast('Save failed', error.message || 'Could not write the local file.', 'error');
        } finally {
          if (seq === state.saveSeq) state.saving = false;
        }
      });
      return saveChain;
    }

    try {
      localStorage.setItem(LS_DATA, JSON.stringify(state.data));
      updateChrome();
    } catch (error) {
      state.storageBroken = true;
      toast('Browser storage is unavailable', 'Use the desktop app for local-file mode, or export a JSON backup first.', 'error');
    }
    return Promise.resolve();
  }

  async function tryFileMode() {
    if (location.protocol === 'file:') return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const response = await fetch('api/status', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) return false;
      if (!(response.headers.get('content-type') || '').includes('application/json')) return false;
      const status = await response.json();
      if (!['fupan-300', 'koi-300'].includes(status.app)) return false;
      state.mode = 'file';
      state.dataFile = status.dataFile || '';
      state.dataDir = status.dataDir || '';
      state.port = status.port || 4877;
      state.mtimeMs = status.mtimeMs || 0;
      const dataResponse = await fetch('api/data', { cache: 'no-store' });
      if (!dataResponse.ok) throw new Error('Could not read the local data file.');
      state.data = normalizeData(await dataResponse.json());
      const refreshed = await fetch('api/status', { cache: 'no-store' }).then((res) => res.json()).catch(() => null);
      if (refreshed && refreshed.mtimeMs) state.mtimeMs = refreshed.mtimeMs;
      return true;
    } catch {
      return false;
    }
  }

  async function retryFileMode() {
    const previous = state.mode;
    if (await tryFileMode()) {
      render();
      toast('Connected to local file', 'Data comes from data/portfolio.json and can be edited by an agent.');
    } else if (previous === 'browser') {
      toast('Local service not found', 'Run the desktop app and open local-file mode to edit data/portfolio.json.', 'error');
    }
  }

  // ---------- chrome ----------

  function applyTheme(id, persist = true) {
    const theme = THEMES.find((item) => item.id === id) || THEMES[0];
    document.documentElement.dataset.theme = theme.id;
    if (persist) storeTheme(theme.id);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.page);
    $$('[data-theme-name]').forEach((node) => { node.textContent = theme.label; });
    $$('.theme-dot').forEach((dot) => {
      dot.classList.toggle('active', dot.dataset.themeChoice === theme.id);
    });
  }

  function renderThemeDots() {
    const holder = $('[data-theme-dots]');
    if (!holder) return;
    holder.innerHTML = THEMES.map((theme) => `
      <button class="theme-dot" style="--dot-page:${theme.page};--dot-accent:${theme.accent}"
        data-theme-choice="${theme.id}" title="${theme.label}" aria-label="Switch to ${theme.label}"></button>
    `).join('');
    applyTheme(readTheme(), false);
  }

  function updateChrome() {
    $$('.nav-item').forEach((item) => {
      item.classList.toggle('active', item.dataset.section === state.section);
    });
    const badges = {
      holdings: recordBadge(state.data.assets.length),
      trades: recordBadge(state.data.trades.length),
      reviews: recordBadge(state.data.reviews.length),
      plans: recordBadge(activePlans().length)
    };
    for (const [key, value] of Object.entries(badges)) {
      const holder = $(`[data-badge="${key}"]`);
      if (holder) holder.textContent = value;
    }
    const count = recordCount();
    $$('[data-count-300]').forEach((holder) => { holder.textContent = String(count); });
    $$('[data-bar-300]').forEach((bar) => { bar.style.width = `${Math.max(count > 0 ? 1.5 : 0, progress300() * 100)}%`; });
    document.body.classList.toggle('mode-file', state.mode === 'file');
    const modeLabel = state.mode === 'file' ? 'Local file · auto-save' : (state.storageBroken ? 'Browser storage blocked' : 'Browser storage');
    $$('[data-storage-label]').forEach((holder) => { holder.textContent = modeLabel; });
    $$('[data-save-time]').forEach((holder) => {
      holder.textContent = state.data.lastModified ? timeText(state.data.lastModified) : '';
    });
  }

  // ---------- shared view helpers ----------

  function pageHead({ eyebrow, title, subtitle, actions = '' }) {
    return `
      <header class="page-head">
        <div>
          <p class="eyebrow">${esc(eyebrow || chineseToday())}</p>
          <h1>${esc(title)}</h1>
          ${subtitle ? `<p class="page-sub">${subtitle}</p>` : ''}
        </div>
        ${actions ? `<div class="head-actions">${actions}</div>` : ''}
      </header>
    `;
  }

  function emptyCard({ iconName = 'info', title, message, action = '', cta = '', hint = '' }) {
    return `
      <section class="card">
        <div class="empty-state">
          <span class="empty-icon">${icon(iconName)}</span>
          <h3>${esc(title)}</h3>
          <p>${esc(message)}</p>
          ${hint ? `<span class="empty-quote">${esc(hint)}</span>` : ''}
          ${action && cta ? `<button class="btn btn-primary" data-action="${action}">${esc(cta)}</button>` : ''}
        </div>
      </section>
    `;
  }

  function pill(text, tone = '') {
    return `<span class="pill ${tone}">${esc(text)}</span>`;
  }

  function options(list, selected, { all = null } = {}) {
    const items = all ? [all, ...list] : list;
    return items.map((item) => `<option value="${esc(item)}" ${item === selected ? 'selected' : ''}>${esc(item)}</option>`).join('');
  }

  function fieldInput({ label, name, value = '', type = 'text', placeholder = '', required = false, span = false, min, max, step, help = '', list }) {
    return `
      <div class="field ${span ? 'span2' : ''}">
        <label for="f-${name}">${esc(label)}${required ? '<em>*</em>' : ''}</label>
        <input id="f-${name}" name="${name}" type="${type}" value="${esc(value ?? '')}" placeholder="${esc(placeholder)}"
          ${required ? 'required' : ''} ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''}
          ${step !== undefined ? `step="${step}"` : ''} ${list ? `list="${list}"` : ''}>
        ${help ? `<span class="help">${esc(help)}</span>` : ''}
      </div>
    `;
  }

  function fieldSelect({ label, name, value, choices, span = false, help = '' }) {
    return `
      <div class="field ${span ? 'span2' : ''}">
        <label for="f-${name}">${esc(label)}</label>
        <select id="f-${name}" name="${name}">${choices.map((choice) =>
          `<option value="${esc(choice)}" ${choice === value ? 'selected' : ''}>${esc(choice)}</option>`
        ).join('')}</select>
        ${help ? `<span class="help">${esc(help)}</span>` : ''}
      </div>
    `;
  }

  function fieldTextarea({ label, name, value = '', placeholder = '', span = false, rows = 3 }) {
    return `
      <div class="field ${span ? 'span2' : ''}">
        <label for="f-${name}">${esc(label)}</label>
        <textarea id="f-${name}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}">${esc(value)}</textarea>
      </div>
    `;
  }

  function emptyStateInline(title, message, action = '', cta = '') {
    return `
      <div class="empty-state" style="padding:30px 20px 18px">
        <h3>${esc(title)}</h3>
        <p>${esc(message)}</p>
        ${action ? `<button class="btn btn-secondary sm" data-action="${action}">${esc(cta)}</button>` : ''}
      </div>
    `;
  }

  // ---------- overview ----------

  function koiSvg() {
    return `
      <svg class="hero-koi" viewBox="0 0 1000 1000" aria-hidden="true">
        <path d="M910 480 C830 350 690 290 580 290 C490 300 380 340 300 420 C260 450 260 530 310 560 C380 610 480 650 580 660 C730 680 840 610 910 480 Z"/>
        <path d="M300 420 C220 380 120 290 30 240 C50 360 60 440 90 480 C60 540 60 610 30 700 C130 670 230 610 310 560 Z"/>
        <path d="M460 320 C530 230 590 170 630 170 C640 240 630 280 610 330 Z"/>
        <path d="M490 580 C450 660 400 730 400 780 C500 720 550 680 580 640 Z"/>
      </svg>
    `;
  }

  function sparkline(snapshots) {
    const values = snapshots.map((item) => finite(item.value));
    const width = 280;
    const height = 76;
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 0;
    const span = Math.max(max - min, 1);
    let path = '';
    let area = '';
    let last = null;
    if (values.length > 1) {
      const points = values.map((value, index) => {
        const x = 4 + (index / (values.length - 1)) * (width - 8);
        const y = height - 6 - ((value - min) / span) * (height - 12);
        return [x, y];
      });
      path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point[0].toFixed(1)},${point[1].toFixed(1)}`).join(' ');
      area = `${path} L${points[points.length - 1][0].toFixed(1)},${height} L${points[0][0].toFixed(1)},${height} Z`;
      last = points[points.length - 1];
    }
    const lineColor = 'var(--chart)';
    return `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.13"/>
            <stop offset="100%" stop-color="${lineColor}" stop-opacity="0"/>
          </linearGradient>
        </defs>
        ${area ? `<path d="${area}" fill="url(#spark-fill)"/>` : ''}
        ${path
          ? `<path d="${path}" style="fill:none;stroke:${lineColor};stroke-opacity:.74;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round" vector-effect="non-scaling-stroke"/>`
          : `<path d="M0 ${height / 2} L${width} ${height / 2}" style="stroke:rgba(255,255,255,.13);stroke-width:1;stroke-dasharray:3 4"/>`}
        ${last ? `<circle cx="${last[0]}" cy="${last[1]}" r="3" style="fill:${lineColor}"/>` : ''}
      </svg>
    `;
  }

  function donutSvg(summaries, total) {
    const size = 142;
    const radius = 52;
    const circumference = 2 * Math.PI * radius;
    if (!summaries.length || total <= 0) {
      return `
        <div class="donut">
          <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
            <circle cx="71" cy="71" r="${radius}" fill="none" stroke="currentColor" stroke-opacity=".055" stroke-width="15"/>
          </svg>
          <div class="donut-center"><strong>—</strong><span>invested</span></div>
        </div>
      `;
    }
    let offset = 0;
    const circles = summaries.map((summary, index) => {
      const share = Math.max(0, summary.value / total);
      const length = share * circumference;
      const segment = `<circle cx="71" cy="71" r="${radius}" fill="none"
        stroke="${CHART_COLORS[index % CHART_COLORS.length]}" stroke-width="15"
        stroke-dasharray="${Math.max(length - 1.5, 0)} ${Math.max(circumference - length + 1.5, 0)}"
        stroke-dashoffset="${-offset}"/>`;
      offset += length;
      return segment;
    }).join('');
    const holdingsShare = total === 0
      ? 0
      : summaries.filter((item) => item.name !== 'Cash').reduce((sum, item) => sum + item.value, 0) / total;
    return `
      <div class="donut">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>
        <div class="donut-center"><strong>${percent(holdingsShare, false)}</strong><span>invested</span></div>
      </div>
    `;
  }

  function recordStrip() {
    const count = recordCount();
    return `
      <section class="card strip300">
        <div class="count300"><strong>${count}</strong><span>/ 300</span></div>
        <div class="strip-main">
          <div class="strip-title"><strong>The 300-entry practice</strong><span>${esc(stage(count))}</span></div>
          <div class="bar"><i style="width:${Math.max(count > 0 ? 1.5 : 0, progress300() * 100)}%"></i></div>
          <span class="strip-note">Trades and daily reviews both count · write honestly, not perfectly</span>
        </div>
        <div class="strip-quote">
          <strong>Write 300 entries before you buy.</strong>
          <span>Style isn't imagined. It's recorded.</span>
        </div>
      </section>
    `;
  }

  function renderOverview() {
    const total = totals();
    const accounts = accountSummaries();
    const categories = categorySummaries();
    const snapshots = sortedSnapshots();
    const reviews = sortedReviews().slice(0, 2);
    const active = activePlans();
    const cashPool = state.data.plans.find(isCashPool);
    const top = topHolding();
    const loss = biggestLoss();
    const lossPnl = loss ? finite(loss.value) - finite(loss.cost) : 0;
    const up = total.pnl >= 0;

    const accountRows = accounts.length
      ? accounts.map((account, index) => {
          const share = total.value === 0 ? 0 : account.value / total.value;
          const pnl = account.value - account.cost;
          const rate = account.cost === 0 ? 0 : pnl / account.cost;
          return `
            <div class="account-row">
              <div class="account-line">
                <span class="account-dot" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
                <span class="account-name">${esc(account.name)}</span>
                <span class="account-val">${money(account.value)}</span>
                <span class="account-share">${percent(share, false)}</span>
                <span class="account-rate ${pnl >= 0 ? 'gain' : 'loss'}">${percent(rate)}</span>
              </div>
              <div class="account-bar"><i style="width:${share * 100}%;background:${CHART_COLORS[index % CHART_COLORS.length]}"></i></div>
            </div>
          `;
        }).join('')
      : emptyStateInline('No accounts yet', 'Add a holding and accounts will appear here with their share of the total.', 'new-asset', 'Add holding');

    const legend = categories.length
      ? categories.map((category, index) => `
          <div class="legend-row">
            <span class="legend-swatch" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
            <span>${esc(category.name)}</span>
            <b>${percent(total.value === 0 ? 0 : category.value / total.value, false)}</b>
          </div>
        `).join('')
      : '<div class="filter-empty" style="padding:20px 0">No category data yet.</div>';

    const recent = reviews.length
      ? reviews.map((review) => {
          const day = parseDate(review.date);
          const title = review.trigger || review.operations || review.nextPlan || 'Daily note';
          const summary = review.nextPlan
            ? `Next: ${review.nextPlan}`
            : (review.market || review.didRight || review.didWrong || 'Only the mood was recorded.');
          const tone = 'gold';
          return `
            <button class="review-line" data-action="edit-review" data-id="${esc(review.id)}">
              <span class="review-date"><strong>${day ? day.getDate() : '—'}</strong><span>${day ? MONTHS[day.getMonth()] : ''}</span></span>
              <span class="review-copy">
                <span class="review-copy-top">${pill(moodLabel(review.mood), tone)}<b>${esc(title)}</b></span>
                <p>${esc(summary)}</p>
              </span>
              <span class="chev">${icon('arrow-right')}</span>
            </button>
          `;
        }).join('')
      : `<div class="empty-state" style="padding:18px 0 8px;align-items:flex-start;text-align:left">
          <h3 style="font-size:14px">One sentence today is enough.</h3>
          <p>What the market did, what you did, the one next step. 3–5 lines.</p>
          <button class="btn btn-primary sm" data-action="review-today" style="margin-top:3px">Write today's review</button>
        </div>`;

    const dca = active.length
      ? active.slice(0, 3).map((plan) => `
          <div class="dca-item">
            <span class="dot"></span>
            <span>${esc(plan.name)}</span>
            <b>${money(plan.amount)}</b>
            <small>/ ${esc(plan.frequency)}</small>
          </div>
        `).join('')
      : '<div class="filter-empty" style="padding:12px 0">No active DCA plans yet.</div>';

    return `
      ${pageHead({
        title: 'Overview',
        subtitle: `${plural(state.data.assets.length, 'holding', 'holdings')} · updated ${timeText(state.data.lastModified) || 'just now'}`,
        actions: `
          <button class="btn btn-secondary" data-action="new-trade">Log a trade</button>
          <button class="btn btn-primary" data-action="review-today">Write today's review</button>
        `
      })}

      <section class="hero">
        ${koiSvg()}
        <div class="hero-copy">
          <div class="hero-label">Total assets<small>CNY</small></div>
          <div class="hero-main">
            <span class="hero-value">${money(total.value)}</span>
            <span class="hero-pnl ${up ? 'up' : 'down'}">
              ${icon(up ? 'arrow-right' : 'arrow-right', 'icon')}
              ${money(total.pnl, true)}
              <span class="pct">${percent(total.rate)}</span>
            </span>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><small>Total cost</small><strong>${money(total.cost)}</strong></div>
            <div class="hero-stat"><small>Holdings value</small><strong>${money(total.holdings)}</strong></div>
            <div class="hero-stat"><small>Cash</small><strong>${money(total.cash)}</strong></div>
          </div>
        </div>
        <div class="hero-chart">
          <div class="hero-chart-head"><span>Value trend</span><span>${snapshots.length} snapshot days</span></div>
          ${sparkline(snapshots)}
          <div class="hero-chart-foot">
            <span>${snapshots.length ? shortDate(snapshots[0].date) : 'Starts today'}</span>
            <span>${snapshots.length ? shortDate(snapshots[snapshots.length - 1].date) : shortDate(today())}</span>
          </div>
        </div>
      </section>

      ${recordStrip()}

      <section class="insight-grid">
        <div class="card insight">
          <span class="insight-icon loss">${icon('chart')}</span>
          <div class="insight-copy">
            <small>Largest drawdown</small>
            <strong class="${lossPnl < 0 ? 'loss' : ''}">${loss ? money(lossPnl, true) : '—'}</strong>
            <span>${loss ? `${esc(loss.name)} ${percent(finite(loss.cost) === 0 ? 0 : lossPnl / finite(loss.cost))}` : 'No holdings yet'}</span>
          </div>
        </div>
        <div class="card insight">
          <span class="insight-icon">${icon('grid')}</span>
          <div class="insight-copy">
            <small>Largest position</small>
            <strong>${top ? money(top.value) : '—'}</strong>
            <span>${top ? `${esc(top.name)} ${percent(total.value === 0 ? 0 : finite(top.value) / total.value, false)}` : 'No holdings yet'}</span>
          </div>
        </div>
        <div class="card insight">
          <span class="insight-icon gold">${icon('wallet')}</span>
          <div class="insight-copy">
            <small>Cash share</small>
            <strong>${percent(total.cashShare, false)}</strong>
            <span>Cash ${money(total.cash)} · ${plural(state.data.assets.filter((item) => item.category === 'Cash').length, 'entry', 'entries')}</span>
          </div>
        </div>
      </section>

      <section class="grid-main-side">
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('grid')}Accounts<small>By current value</small></div>
          </div>
          <div class="accounts">${accountRows}</div>
          ${accounts.length ? `<div class="divider"></div>
          <div class="category-foot"><span>Total</span><span><b class="num" style="color:var(--ink)">${money(total.value)}</b> <span class="${total.pnl >= 0 ? 'gain' : 'loss'}">${percent(total.rate)}</span></span></div>` : ''}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${icon('chart')}Asset mix<small>Including cash</small></div></div>
          <div class="donut-wrap">
            ${donutSvg(categories, total.value)}
            <div class="legend">${legend}</div>
          </div>
          <div class="divider"></div>
          <div class="category-foot"><span>Holdings ${money(total.holdings)}</span><span>Cash ${money(total.cash)}</span></div>
        </div>
      </section>

      <section class="grid-main-side">
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('book')}Recent reviews<small>Facts first, feelings second</small></div>
            ${state.data.reviews.length ? '<button class="card-link" data-section="reviews">View all</button>' : ''}
          </div>
          <div class="review-preview">${recent}</div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('calendar')}DCA rhythm<small>Based on current plans</small></div>
            <button class="card-link" data-section="plans">Manage</button>
          </div>
          <div class="dca-total">
            <strong>${money(monthlyInvesting())}</strong><span>/ month</span>
            <span class="side-note faint" style="font-size:10.5px">${plural(active.length, 'active plan', 'active plans')}</span>
          </div>
          <div class="divider"></div>
          <div class="dca-list">${dca}</div>
          <div class="divider"></div>
          <div class="dca-foot">
            <div><small>Monthly reserve</small><strong>${cashPool && cashPool.amount != null ? money(cashPool.amount) : '—'}</strong></div>
            <span class="faint">Actual debit may differ</span>
          </div>
        </div>
      </section>
    `;
  }

  // ---------- holdings ----------

  function renderHoldings() {
    const assets = state.data.assets.slice().sort((a, b) => finite(b.value) - finite(a.value));
    const filters = state.filters.holdings;
    const accounts = accountSummaries().map((item) => item.name);
    const categoriesPresent = CATEGORIES.filter((category) =>
      state.data.assets.some((asset) => asset.category === category)
    );
    const head = pageHead({
      title: 'Holdings',
      subtitle: `${plural(state.data.assets.length, 'asset', 'assets')} · total value ${money(totals().value)} · everything stays on this device`,
      actions: `
        <button class="btn btn-secondary" data-action="export-holdings">${icon('download')}Export CSV</button>
        <button class="btn btn-primary" data-action="new-asset">${icon('plus')}Add holding</button>
      `
    });

    if (!assets.length) {
      return head + emptyCard({
        iconName: 'wallet',
        title: 'No holdings yet',
        message: 'Start with one real position. Name, account, cost and current value are enough — the rest can wait.',
        action: 'new-asset',
        cta: 'Add your first holding'
      });
    }

    const rows = assets.map((asset) => {
      const pnl = finite(asset.value) - finite(asset.cost);
      const rate = finite(asset.cost) === 0 ? 0 : pnl / finite(asset.cost);
      const share = totals().value === 0 ? 0 : finite(asset.value) / totals().value;
      const search = [asset.name, asset.code, asset.account, asset.category].join(' ').toLowerCase();
      const statusTone = asset.dataStatus === 'Needs update' ? 'gold' : 'neutral';
      return `
        <tr data-search="${esc(search)}" data-category="${esc(asset.category)}" data-account="${esc(asset.account)}">
          <td>
            <div class="name-cell"><b>${esc(asset.name)}</b><span>${esc(asset.code || 'No code')}</span></div>
          </td>
          <td>${esc(asset.category)}</td>
          <td>${esc(asset.account)}</td>
          <td class="r cell-num">${money(asset.cost)}</td>
          <td class="r cell-num cell-main">${money(asset.value)}</td>
          <td class="r cell-num ${pnl >= 0 ? 'gain' : 'loss'}">
            ${money(pnl, true)}<span class="cell-sub">${percent(rate)}</span>
          </td>
          <td class="r cell-num">${percent(share, false)}</td>
          <td>${pill(asset.dataStatus, statusTone)}</td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit-asset" data-id="${esc(asset.id)}" title="Edit" aria-label="Edit holding">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-asset" data-id="${esc(asset.id)}" title="Delete" aria-label="Delete holding">${icon('trash')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="holding-search" data-filter-scope="holdings" data-filter-key="q" value="${esc(filters.q)}" placeholder="Search name, code or account" autocomplete="off">
          <button class="clear-search" data-clear-search="holding-search" title="Clear" aria-label="Clear search">${icon('x')}</button>
        </div>
        <span class="select-wrap">
          <select data-filter-scope="holdings" data-filter-key="category" aria-label="Filter by category">${options(categoriesPresent, filters.category, { all: 'All categories' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="select-wrap">
          <select data-filter-scope="holdings" data-filter-key="account" aria-label="Filter by account">${options(accounts, filters.account, { all: 'All accounts' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="holdings-count">${assets.length} items</span>
      </section>
      <section class="card table-card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Name / code</th><th>Category</th><th>Account</th>
              <th class="r">Cost</th><th class="r">Value</th><th class="r">P&amp;L</th><th class="r">Weight</th><th>Status</th><th></th>
            </tr></thead>
            <tbody id="holdings-body">${rows}</tbody>
          </table>
        </div>
        <div id="holdings-filter-empty" class="filter-empty" hidden>No holdings match these filters.</div>
      </section>
      <p class="footnote">P&amp;L = current value − cost. Red for gains and green for losses is a local bookkeeping convention, not a market signal.</p>
    `;
  }

  function applyHoldingFilters() {
    const body = $('#holdings-body');
    if (!body) return;
    const filters = state.filters.holdings;
    const query = filters.q.trim().toLowerCase();
    let visible = 0;
    $$('tr', body).forEach((row) => {
      const matchQuery = !query || (row.dataset.search || '').includes(query);
      const matchCategory = filters.category === 'All' || row.dataset.category === filters.category;
      const matchAccount = filters.account === 'All' || row.dataset.account === filters.account;
      const show = matchQuery && matchCategory && matchAccount;
      row.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $('#holdings-filter-empty');
    if (empty) empty.hidden = visible !== 0;
    const count = $('#holdings-count');
    if (count) count.textContent = `${visible} / ${state.data.assets.length} items`;
    const clear = $('[data-clear-search="holding-search"]');
    if (clear) clear.hidden = !filters.q;
  }

  // ---------- trades ----------

  function renderTrades() {
    const trades = sortedTrades();
    const filters = state.filters.trades;
    const months = Array.from(new Set(trades.map((trade) => trade.date.slice(0, 7)))).sort().reverse();
    const actionsPresent = ACTIONS.filter((action) => trades.some((trade) => trade.action === action));
    const head = pageHead({
      title: 'Trade log',
      subtitle: `${plural(state.data.trades.length, 'trade', 'trades')} · ${plural(state.data.reviews.length, 'review', 'reviews')} · 300-entry practice ${Math.min(100, Math.round(progress300() * 100))}% complete`,
      actions: `
        <button class="btn btn-secondary" data-action="export-trades">${icon('download')}Export CSV</button>
        <button class="btn btn-primary" data-action="new-trade">${icon('plus')}Log a trade</button>
      `
    });

    if (!trades.length) {
      return head + emptyCard({
        iconName: 'swap',
        title: 'No trades yet',
        message: 'Buys, sells, DCA, switches and dividends all belong here. The point is not the ledger — it is why you acted.',
        action: 'new-trade',
        cta: 'Record the first one',
        hint: 'Write 300 entries before you buy.'
      });
    }

    const rows = trades.map((trade) => {
      const search = [trade.name, trade.code, trade.account, trade.action, trade.reason, trade.review, trade.lesson, trade.market].join(' ').toLowerCase();
      const pnl = trade.realizedPnL;
      const planTone = trade.followedPlan === 'Yes' ? 'loss' : trade.followedPlan === 'No' ? 'gain' : 'neutral';
      return `
        <tr data-search="${esc(search)}" data-action="${esc(trade.action)}" data-month="${esc(trade.date.slice(0, 7))}">
          <td class="cell-num">${esc(trade.date)}<span class="cell-sub">${esc(shortDate(trade.date))}</span></td>
          <td>
            <div class="name-cell"><b>${esc(trade.name)}</b><span>${esc(trade.code || trade.category)}${trade.account ? ` · ${esc(trade.account)}` : ''}</span></div>
          </td>
          <td>${pill(trade.action, actionTone(trade.action))}</td>
          <td class="r cell-num">${trade.amount == null ? '—' : money(trade.amount)}</td>
          <td class="r cell-num ${pnl == null ? '' : pnl >= 0 ? 'gain' : 'loss'}">${pnl == null ? '—' : money(pnl, true)}</td>
          <td>
            <div class="name-cell"><b style="font-size:11px;font-weight:500">${esc(trade.followedPlan)}</b>
              <span>${esc(moodLabelText(trade.mood))}</span>
            </div>
          </td>
          <td>
            <div class="row-actions">
              <button class="icon-btn" data-action="edit-trade" data-id="${esc(trade.id)}" title="Edit" aria-label="Edit trade">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-trade" data-id="${esc(trade.id)}" title="Delete" aria-label="Delete trade">${icon('trash')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="trade-search" data-filter-scope="trades" data-filter-key="q" value="${esc(filters.q)}" placeholder="Search name, reason or review" autocomplete="off">
          <button class="clear-search" data-clear-search="trade-search" title="Clear" aria-label="Clear search">${icon('x')}</button>
        </div>
        <span class="select-wrap">
          <select data-filter-scope="trades" data-filter-key="action" aria-label="Filter by action">${options(actionsPresent, filters.action, { all: 'All actions' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="select-wrap">
          <select data-filter-scope="trades" data-filter-key="month" aria-label="Filter by month">
            <option value="All" ${filters.month === 'All' ? 'selected' : ''}>All months</option>
            ${months.map((month) => {
              const [year, m] = month.split('-');
              return `<option value="${esc(month)}" ${filters.month === month ? 'selected' : ''}>${MONTHS[Number(m) - 1]} ${year}</option>`;
            }).join('')}
          </select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="trades-count">${trades.length} trades</span>
      </section>
      <section class="card table-card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>Date</th><th>Name / code</th><th>Action</th><th class="r">Amount</th><th class="r">Realized P&amp;L</th><th>Plan / mood</th><th></th>
            </tr></thead>
            <tbody id="trades-body">${rows}</tbody>
          </table>
        </div>
        <div id="trades-filter-empty" class="filter-empty" hidden>No trades match these filters.</div>
      </section>
      <p class="footnote">Use the pencil to add the reason, the mood and the after-the-fact review. Changes save automatically.</p>
    `;
  }

  function moodLabelText(value) {
    if (!value) return 'No mood recorded';
    const found = MOODS.find((item) => item.label === value);
    if (found) return `Mood · ${found.label}`;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 5) return `Mood · ${moodLabel(numeric)}`;
    return String(value);
  }

  function applyTradeFilters() {
    const body = $('#trades-body');
    if (!body) return;
    const filters = state.filters.trades;
    const query = filters.q.trim().toLowerCase();
    let visible = 0;
    $$('tr', body).forEach((row) => {
      const show = (!query || (row.dataset.search || '').includes(query))
        && (filters.action === 'All' || row.dataset.action === filters.action)
        && (filters.month === 'All' || row.dataset.month === filters.month);
      row.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $('#trades-filter-empty');
    if (empty) empty.hidden = visible !== 0;
    const count = $('#trades-count');
    if (count) count.textContent = `${visible} / ${state.data.trades.length} trades`;
    const clear = $('[data-clear-search="trade-search"]');
    if (clear) clear.hidden = !filters.q;
  }

  // ---------- reviews ----------

  function renderReviews() {
    const reviews = sortedReviews();
    const filters = state.filters.reviews;
    const head = pageHead({
      title: 'Daily reviews',
      subtitle: `${plural(state.data.reviews.length, 'entry', 'entries')} · trades + reviews both count toward 300 · currently ${recordCount()} / 300`,
      actions: `<button class="btn btn-primary" data-action="review-today">${icon('plus')}Write today's review</button>`
    });

    if (!reviews.length) {
      return head + emptyCard({
        iconName: 'book',
        title: 'One sentence today is enough',
        message: 'What the market did, what you did, the one next step. Three to five lines — no essay required.',
        action: 'review-today',
        cta: "Write today's review",
        hint: "Style isn't imagined. It's recorded."
      });
    }

    const query = filters.q.trim().toLowerCase();
    const cards = reviews.map((review) => {
      const day = parseDate(review.date);
      const tone = 'gold';
      const search = [review.date, review.trigger, review.operations, review.market, review.didRight, review.didWrong, review.nextPlan].join(' ').toLowerCase();
      const field = (labelText, value, span = false, emptyText = '—') => `
        <div class="review-field ${span ? 'span2' : ''}">
          <label>${labelText}</label>
          <p class="${value ? '' : 'empty'}">${esc(value || emptyText)}</p>
        </div>
      `;
      const fields = [
        field('Trigger', review.trigger),
        field('Market', review.market),
        field('Actions', review.operations, true),
        field('Did right', review.didRight),
        field('Did not do well', review.didWrong)
      ].filter((html, index) => {
        const values = [review.trigger, review.market, review.operations, review.didRight, review.didWrong];
        return values[index] || review.didWrong !== '' || index < 5;
      }).join('');
      return `
        <article class="card review-card" data-search="${esc(search)}">
          <div class="review-card-head">
            <div class="review-year-month">
              <strong>${day ? day.getDate() : '—'}</strong>
              <span>${day ? `${day.getFullYear()}.${day.getMonth() + 1}` : ''}</span>
            </div>
            <div class="review-title">
              <div class="review-title-top">
                ${pill(`Mood · ${moodLabel(review.mood)}`, tone)}
                <h3>${esc(review.trigger || 'Daily note')}</h3>
              </div>
              <p>${fullDate(review.date)}${review.market ? ` · ${esc(review.market.slice(0, 80))}` : ''}</p>
            </div>
            <div class="review-card-actions">
              <button class="icon-btn" data-action="edit-review" data-id="${esc(review.id)}" title="Edit" aria-label="Edit review">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-review" data-id="${esc(review.id)}" title="Delete" aria-label="Delete review">${icon('trash')}</button>
            </div>
          </div>
          <div class="review-grid">
            ${fields}
            <div class="review-field review-next span2">
              <label>The one next step</label>
              <p class="${review.nextPlan ? '' : 'empty'}">${esc(review.nextPlan || 'No next step yet.')}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="review-search" data-filter-scope="reviews" data-filter-key="q" value="${esc(filters.q)}" placeholder="Search triggers, actions or lessons" autocomplete="off">
          <button class="clear-search" data-clear-search="review-search" title="Clear" aria-label="Clear search">${icon('x')}</button>
        </div>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="reviews-count">${reviews.length} entries</span>
      </section>
      <section class="review-list" id="review-list">${cards}</section>
      <div id="reviews-filter-empty" class="card filter-empty" hidden>No matching reviews.</div>
    `;
  }

  function applyReviewFilters() {
    const list = $('#review-list');
    if (!list) return;
    const query = state.filters.reviews.q.trim().toLowerCase();
    let visible = 0;
    $$('.review-card', list).forEach((card) => {
      const show = !query || (card.dataset.search || '').includes(query);
      card.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $('#reviews-filter-empty');
    if (empty) empty.hidden = visible !== 0;
    const count = $('#reviews-count');
    if (count) count.textContent = `${visible} / ${state.data.reviews.length} entries`;
    const clear = $('[data-clear-search="review-search"]');
    if (clear) clear.hidden = !query;
  }

  // ---------- plans ----------

  function planCard(plan) {
    const statusTone = plan.status === 'Active' ? 'loss' : plan.status === 'Cash pool' ? 'gold' : 'neutral';
    const metaStart = plan.startDate ? shortDate(plan.startDate) : 'Not set';
    return `
      <article class="card plan-card">
        <div class="plan-card-top">
          <div style="flex:1;min-width:0">
            <div class="plan-platform">${esc(plan.platform)}</div>
            <div class="plan-name">${esc(plan.name)}</div>
          </div>
          ${pill(plan.status, statusTone)}
          <button class="icon-btn" data-action="edit-plan" data-id="${esc(plan.id)}" title="Edit" aria-label="Edit plan">${icon('edit')}</button>
        </div>
        <div class="plan-amount">
          <strong>${plan.amount == null ? '—' : money(plan.amount)}</strong>
          <span>${plan.amount == null ? 'No amount set' : `/ ${esc(plan.frequency)}`}</span>
        </div>
        <div class="plan-meta">
          <div><span>Debit day</span><b>${esc(plan.debitDay || '—')}</b></div>
          <div><span>Start</span><b>${metaStart}</b></div>
          <div><span>Code</span><b>${esc(plan.code || '—')}</b></div>
        </div>
        <div class="plan-card-foot">
          <span class="plan-note">${esc(plan.note || 'No note')}</span>
          <button class="icon-btn danger" data-action="delete-plan" data-id="${esc(plan.id)}" title="Delete" aria-label="Delete plan">${icon('trash')}</button>
        </div>
      </article>
    `;
  }

  function renderPlans() {
    const plans = state.data.plans;
    const head = pageHead({
      title: 'DCA plans',
      subtitle: `${plural(activePlans().length, 'active plan', 'active plans')} · about ${money(monthlyInvesting())} per month · actual debits may differ`,
      actions: `<button class="btn btn-primary" data-action="new-plan">${icon('plus')}Add plan</button>`
    });

    if (!plans.length) {
      return head + emptyCard({
        iconName: 'calendar',
        title: 'No DCA plans yet',
        message: 'Write down the frequency, the amount and the debit day. It is harder to change your mind mid-volatility when the rules are already on paper.',
        action: 'new-plan',
        cta: 'Add the first plan'
      });
    }

    const running = plans.filter((plan) => plan.status === 'Active' && !isCashPool(plan));
    const pools = plans.filter(isCashPool);
    const resting = plans.filter((plan) => plan.status !== 'Active' && !isCashPool(plan));
    const section = (title, subtitle, items) => items.length ? `
      <section class="plan-section">
        <div class="plan-section-head"><h2>${title}</h2><span>${subtitle}</span></div>
        <div class="plan-grid">${items.map(planCard).join('')}</div>
      </section>
    ` : '';

    return head + `
      <section class="card summary-band">
        <div class="summary-band-item"><small>Monthly DCA estimate</small><strong>${money(monthlyInvesting())}</strong></div>
        <div class="summary-band-item"><small>Active plans</small><strong>${activePlans().length}</strong></div>
        <div class="summary-band-item"><small>Cash pool</small><strong>${pools.length ? money(pools.reduce((sum, plan) => sum + finite(plan.amount), 0)) : '—'}</strong></div>
        <div class="summary-band-item"><small>Paused / finished</small><strong>${resting.length}</strong></div>
      </section>
      ${section('Active', 'Follow the rhythm, not the headlines', running)}
      ${section('Cash pool', 'Set the reserve aside first', pools)}
      ${section('Paused / finished', 'Keep the record — it is experience too', resting)}
    `;
  }

  // ---------- data ----------

  function recordHero() {
    return `
      <section class="card record-hero">
        <div class="big">${recordCount()}<small> / 300</small></div>
        <div class="record-hero-copy">
          <strong>300-entry practice · ${esc(stage(recordCount()))}</strong>
          <div class="bar"><i style="width:${Math.max(recordCount() > 0 ? 1.5 : 0, progress300() * 100)}%"></i></div>
          <span>${plural(state.data.trades.length, 'trade', 'trades')} + ${plural(state.data.reviews.length, 'review', 'reviews')}. This is not a streak — it separates impulse from judgment.</span>
        </div>
        <div class="quote"><b>Write 300 entries before you buy.</b> Style isn't imagined. It's recorded.</div>
      </section>
    `;
  }

  function renderData() {
    const total = totals();
    const modeText = state.mode === 'file' ? 'Local file (agent-ready)' : 'Browser storage';
    const storagePath = state.mode === 'file'
      ? state.dataFile
      : 'localStorage · koi300.data.v1';
    const agentPrompt = state.mode === 'file'
      ? `Back up ${state.dataFile} first, then read and edit my investment review data.\nKeep schemaVersion=1, field names and UUIDs unchanged; use YYYY-MM-DD dates.\nWrite back to the same path; the app refreshes within seconds. Do not upload or commit it to a public repository.`
      : 'Run the desktop app (Koi 300) to enter local-file mode, then read data/portfolio.json. Back it up before editing and keep schemaVersion=1 and field names unchanged. Do not upload or commit it to a public repository.';

    const head = pageHead({
      title: 'Data & export',
      subtitle: 'Take it with you. Take it over. No account, no cloud.',
      actions: `
        <button class="btn btn-secondary" data-action="import-json">${icon('upload')}Import JSON</button>
        <button class="btn btn-primary" data-action="export-json">${icon('download')}Export full backup</button>
      `
    });

    return head + recordHero() + `
      <section class="data-grid">
        <div class="data-stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${icon('database')}Data overview</div></div>
            <div class="kv-list">
              <div class="kv"><span>Holdings</span><b>${plural(state.data.assets.length, 'item', 'items')}</b></div>
              <div class="kv"><span>Trades</span><b>${plural(state.data.trades.length, 'trade', 'trades')}</b></div>
              <div class="kv"><span>Daily reviews</span><b>${plural(state.data.reviews.length, 'entry', 'entries')}</b></div>
              <div class="kv"><span>DCA plans</span><b>${plural(state.data.plans.length, 'plan', 'plans')}</b></div>
              <div class="kv"><span>Value snapshots</span><b>${plural(state.data.snapshots.length, 'day', 'days')}</b></div>
              <div class="kv"><span>Total cost / value</span><b>${money(total.cost)} / ${money(total.value)}</b></div>
              <div class="kv"><span>Last modified</span><b>${esc(dateTimeText(state.data.lastModified))}</b></div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('download')}Export</div></div>
            <div class="action-list">
              <div class="action-row">
                <span class="action-icon">${icon('database')}</span>
                <div class="action-copy"><b>Full JSON backup</b><span>Holdings, trades, reviews, plans and value history. Re-importable.</span></div>
                <button class="btn btn-secondary sm" data-action="export-json">Export</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('wallet')}</span>
                <div class="action-copy"><b>Holdings CSV</b><span>Opens in Excel or Numbers; UTF-8 BOM included</span></div>
                <button class="btn btn-secondary sm" data-action="export-holdings">Export</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('swap')}</span>
                <div class="action-copy"><b>Trades CSV</b><span>Includes reason, mood, plan adherence and review</span></div>
                <button class="btn btn-secondary sm" data-action="export-trades">Export</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('book')}</span>
                <div class="action-copy"><b>Daily reviews CSV</b><span>Every review field, ordered by date</span></div>
                <button class="btn btn-secondary sm" data-action="export-reviews">Export</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('calendar')}</span>
                <div class="action-copy"><b>DCA plans CSV</b><span>Platform, frequency, debit day and status</span></div>
                <button class="btn btn-secondary sm" data-action="export-plans">Export</button>
              </div>
              ${state.mode === 'file' ? `
              <div class="action-row">
                <span class="action-icon">${icon('folder')}</span>
                <div class="action-copy"><b>Back up on this device now</b><span>Writes to data/backups and keeps the last 80 versions</span></div>
                <button class="btn btn-secondary sm" data-action="backup-now">Back up</button>
              </div>` : ''}
            </div>
            <div class="divider"></div>
            <div class="hint">${icon('info')}<span>Import replaces the current data. A backup is exported automatically first.</span></div>
          </section>

          <section class="card">
            <div class="card-head">
              <div class="card-title">${icon('chart')}Sample & reset</div>
            </div>
            <div class="action-list">
              <div class="action-row">
                <span class="action-icon">${icon('grid')}</span>
                <div class="action-copy"><b>Fictional sample data</b><span>Seven holdings, six trades and four reviews show the full interface</span></div>
                <button class="btn btn-secondary sm" data-action="load-sample">Load</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('trash')}</span>
                <div class="action-copy"><b>Reset this device</b><span>A backup is exported first; no other files are touched</span></div>
                <button class="btn btn-danger sm" data-action="clear-data">Clear</button>
              </div>
            </div>
          </section>
        </div>

        <div class="data-stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${icon('lock')}This device</div><span class="mode-pill"><span class="dot"></span>${esc(modeText)}</span></div>
            <div class="kv-list">
              <div class="kv"><span>Data location</span><b class="mono-path">${esc(storagePath || '—')}</b></div>
              <div class="kv"><span>Save method</span><b>${state.mode === 'file' ? 'Rewrites the JSON file on save' : 'Saved in this browser'}</b></div>
              <div class="kv"><span>Network upload</span><b>Never</b></div>
              <div class="kv"><span>Account / login</span><b>Not needed</b></div>
              <div class="kv"><span>Theme</span><b>${esc((THEMES.find((theme) => theme.id === readTheme()) || THEMES[0]).label)}</b></div>
            </div>
            ${state.mode === 'browser' ? `
              <div class="divider"></div>
              <button class="btn btn-secondary sm" data-action="retry-file">Connect to local-file mode</button>
              <div class="hint" style="margin-top:9px">${icon('info')}<span>Local-file mode runs through the Koi 300 desktop app. Export a JSON backup first if you are only browsing this demo.</span></div>
            ` : `
              <div class="divider"></div>
              <button class="btn btn-secondary sm" data-action="reload-file">Reload from file</button>
            `}
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('copy')}Hand it to an agent</div></div>
            <p class="small muted" style="margin:0 0 11px;line-height:1.7">The data is plain JSON. An agent can edit the file directly or call the local API; the app notices outside changes and refreshes.</p>
            <div class="code-box">
              <code>${esc(agentPrompt)}</code>
              <button class="icon-btn" data-action="copy-agent" title="Copy the agent brief" aria-label="Copy the agent brief">${icon('copy')}</button>
            </div>
            <div class="divider"></div>
            <div class="kv-list">
              <div class="kv"><span>Read</span><b class="mono-path">GET /api/data</b></div>
              <div class="kv"><span>Write</span><b class="mono-path">PUT /api/data</b></div>
              <div class="kv"><span>Backup</span><b class="mono-path">POST /api/backup</b></div>
            </div>
            <div class="hint" style="margin-top:9px">${icon('lock')}<span>The service listens only on 127.0.0.1 and rejects cross-site writes. Never expose these endpoints to the public internet.</span></div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('info')}About the 300</div></div>
            <p class="small muted" style="margin:0;line-height:1.75">300 is the practice target this project set for itself — not a return promise, and not a quote from a famous investor. It only asks you to leave a judgment behind before you press buy.</p>
            <div class="divider"></div>
            <p class="tiny-text faint" style="margin:0;line-height:1.7">Local data is not encrypted automatically. Protect your computer login, export backups regularly, and never commit a JSON file containing real positions to GitHub.</p>
          </section>
        </div>
      </section>
    `;
  }

  // ---------- render ----------

  const views = {
    overview: renderOverview,
    holdings: renderHoldings,
    trades: renderTrades,
    reviews: renderReviews,
    plans: renderPlans,
    data: renderData
  };

  function render() {
    updateChrome();
    const main = $('#main');
    if (!main) return;
    const view = views[state.section] || renderOverview;
    main.innerHTML = `<div class="page">${view()}</div>`;
    if (state.section === 'holdings') applyHoldingFilters();
    if (state.section === 'trades') applyTradeFilters();
    if (state.section === 'reviews') applyReviewFilters();
  }

  function navigate(section) {
    if (!views[section]) section = 'overview';
    state.section = section;
    if (location.hash.slice(1) !== section) {
      location.hash = section;
    } else {
      render();
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  // ---------- modal ----------

  let editorSubmitHandler = null;
  let confirmAction = null;

  function lockScroll(locked) {
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  function closeModal() {
    const root = $('#modal-root');
    if (root) root.innerHTML = '';
    editorSubmitHandler = null;
    confirmAction = null;
    lockScroll(false);
  }

  function showModal(html, { onMount, onSubmit } = {}) {
    const root = $('#modal-root');
    root.innerHTML = html;
    lockScroll(true);
    editorSubmitHandler = onSubmit || null;
    const form = $('#editor-form', root);
    if (form && onSubmit) {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const result = await onSubmit(form, root);
        if (result !== false) closeModal();
      });
    }
    onMount?.(root);
    requestAnimationFrame(() => {
      fitOpenModal();
      const first = root.querySelector('input:not([type="hidden"]):not([disabled]), select, textarea, button.confirm-primary');
      first?.focus({ preventScroll: true });
    });
  }

  function fitOpenModal() {
    const root = $('#modal-root');
    const body = $('.modal-body', root);
    const head = $('.modal-head', root);
    const foot = $('.modal-foot', root);
    if (!body || !head || !foot) return;
    body.style.maxHeight = 'none';
    const limit = Math.min(window.innerHeight * (window.innerWidth <= 860 ? 0.92 : 0.86), 900);
    const chrome = head.offsetHeight + foot.offsetHeight + 2;
    if (chrome + body.scrollHeight > limit) {
      body.style.maxHeight = `${Math.max(140, limit - chrome)}px`;
    }
  }

  function modalShell({ title, subtitle = '', body, submitLabel = 'Save', showDelete = false, narrow = false }) {
    return `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <form id="editor-form" novalidate>
            <div class="modal-head">
              <div class="modal-head-copy">
                <h2 id="modal-title">${esc(title)}</h2>
                ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
              </div>
              <button type="button" class="modal-close" data-close-modal aria-label="Close">${icon('x')}</button>
            </div>
            <div class="modal-body">${body}</div>
            <div class="modal-foot">
              ${showDelete ? '<button type="button" class="delete-link" id="modal-delete">Delete</button>' : ''}
              <span class="spacer"></span>
              <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
              <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openConfirm({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, secondaryLabel = '' }) {
    const root = $('#modal-root');
    confirmAction = onConfirm;
    root.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal narrow" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div class="modal-head">
            <div class="modal-head-copy">
              <h2 id="confirm-title">${esc(title)}</h2>
            </div>
            <button type="button" class="modal-close" data-close-modal aria-label="Close">${icon('x')}</button>
          </div>
          <div class="modal-body"><div class="confirm-copy">${message}</div></div>
          <div class="confirm-actions">
            <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
            ${secondaryLabel ? `<button type="button" class="btn btn-secondary" id="confirm-secondary">${esc(secondaryLabel)}</button>` : ''}
            <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-primary">${esc(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;
    lockScroll(true);
    $('#confirm-primary', root).addEventListener('click', async () => {
      const action = confirmAction;
      confirmAction = null;
      closeModal();
      if (action) await action();
    });
  }

  function failField(form, name, message) {
    const input = form.elements[name];
    if (!input) return false;
    const field = input.closest('.field');
    if (field) {
      field.classList.add('invalid');
      let error = field.querySelector('.error');
      if (!error) {
        error = document.createElement('span');
        error.className = 'error';
        field.appendChild(error);
      }
      error.textContent = message;
    }
    input.focus();
    return false;
  }

  // ---------- editors ----------

  function openAssetEditor(asset = null) {
    const editing = Boolean(asset);
    const item = asset || {
      account: accountSummaries()[0]?.name || '',
      category: 'Fund (OTC)',
      code: '',
      name: '',
      cost: '',
      value: '',
      units: '',
      costPrice: '',
      price: '',
      note: '',
      nextStep: '',
      dataStatus: 'Manual'
    };
    const accountNames = accountSummaries().map((entry) => entry.name);
    const body = `
      <div class="form-section">
        <p class="form-section-title">Basics</p>
        <div class="form-grid">
          ${fieldInput({ label: 'Name', name: 'name', value: item.name, placeholder: 'e.g. CSI 300 index fund', required: true })}
          ${fieldInput({ label: 'Code', name: 'code', value: item.code, placeholder: 'Fund / stock code' })}
          ${fieldInput({ label: 'Account', name: 'account', value: item.account, placeholder: 'e.g. Long-term', required: true, list: 'account-list' })}
          ${fieldSelect({ label: 'Category', name: 'category', value: item.category, choices: CATEGORIES })}
          <datalist id="account-list">${accountNames.map((name) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">Amounts & units</p>
        <div class="form-grid">
          ${fieldInput({ label: 'Cost basis', name: 'cost', value: item.cost, type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
          ${fieldInput({ label: 'Current value', name: 'value', value: item.value, type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
          ${fieldInput({ label: 'Units held', name: 'units', value: item.units ?? '', type: 'number', min: 0, step: '0.0001', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Cost price', name: 'costPrice', value: item.costPrice ?? '', type: 'number', min: 0, step: '0.0001', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Last price', name: 'price', value: item.price ?? '', type: 'number', min: 0, step: '0.0001', placeholder: 'Optional' })}
          ${fieldSelect({ label: 'Data status', name: 'dataStatus', value: item.dataStatus, choices: DATA_STATUSES })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">Notes</p>
        <div class="form-grid">
          ${fieldTextarea({ label: 'Note', name: 'note', value: item.note, placeholder: 'What this position is for, why you bought it, what to watch', span: true })}
          ${fieldTextarea({ label: 'Next step', name: 'nextStep', value: item.nextStep, placeholder: 'e.g. Check whether to rebalance after the next payday', span: true, rows: 2 })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? 'Edit holding' : 'Add holding',
      subtitle: 'Cost and value are whatever you record here; no market data is fetched.',
      body,
      showDelete: editing
    }), {
      onMount(root) {
        if (editing) {
          $('#modal-delete', root)?.addEventListener('click', () => {
            closeModal();
            confirmDeleteAsset(item);
          });
        }
      },
      onSubmit(form) {
        const name = form.elements.name.value.trim();
        const account = form.elements.account.value.trim();
        if (!name) return failField(form, 'name', 'Enter a name');
        if (!account) return failField(form, 'account', 'Enter an account');
        const numbers = {};
        for (const key of ['cost', 'value', 'units', 'costPrice', 'price']) {
          const raw = form.elements[key].value.trim();
          if (raw === '') { numbers[key] = key === 'cost' || key === 'value' ? 0 : null; continue; }
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0) return failField(form, key, 'Enter a number of 0 or more');
          numbers[key] = value;
        }
        const next = {
          id: item.id || uuid(),
          account,
          category: form.elements.category.value,
          code: form.elements.code.value.trim(),
          name,
          cost: numbers.cost,
          value: numbers.value,
          units: numbers.units,
          costPrice: numbers.costPrice,
          price: numbers.price,
          note: form.elements.note.value.trim(),
          nextStep: form.elements.nextStep.value.trim(),
          dataStatus: form.elements.dataStatus.value,
          updatedAt: isoNow()
        };
        if (editing) {
          const index = state.data.assets.findIndex((row) => row.id === item.id);
          if (index >= 0) state.data.assets[index] = next;
        } else {
          state.data.assets.push(next);
        }
        refreshTodaySnapshot();
        render();
        persist();
        toast(editing ? 'Holding updated' : 'Holding added', `${name} · ${money(next.value)}`);
        return true;
      }
    });
  }

  function openTradeEditor(trade = null) {
    const editing = Boolean(trade);
    const item = trade || {
      date: today(),
      account: '',
      category: 'Fund (OTC)',
      code: '',
      name: '',
      action: 'Buy',
      amount: '',
      shares: '',
      price: '',
      fee: '',
      realizedPnL: '',
      reason: '',
      mood: '',
      market: '',
      review: '',
      followedPlan: 'Not reviewed',
      lesson: ''
    };
    const assetOptions = state.data.assets.map((asset) =>
      `<option value="${esc(asset.id)}">${esc(asset.name)}${asset.account ? ` · ${esc(asset.account)}` : ''}</option>`
    ).join('');
    const body = `
      <div class="form-section">
        <p class="form-section-title">Trade</p>
        <div class="form-grid">
          ${assetOptions ? `
          <div class="field span2">
            <label for="f-link">Fill from a holding (optional)</label>
            <select id="f-link" name="link"><option value="">Enter manually</option>${assetOptions}</select>
            <span class="help">Only the name, code, category and account are copied; amounts are left alone.</span>
          </div>` : ''}
          ${fieldInput({ label: 'Date', name: 'date', value: item.date, type: 'date', required: true, max: today() })}
          ${fieldSelect({ label: 'Action', name: 'action', value: item.action, choices: ACTIONS })}
          ${fieldInput({ label: 'Name', name: 'name', value: item.name, placeholder: 'Fund or stock name', required: true })}
          ${fieldInput({ label: 'Code', name: 'code', value: item.code, placeholder: 'Optional' })}
          ${fieldInput({ label: 'Account', name: 'account', value: item.account, placeholder: 'e.g. Long-term', list: 'trade-account-list' })}
          ${fieldSelect({ label: 'Category', name: 'category', value: item.category, choices: CATEGORIES })}
          <datalist id="trade-account-list">${accountSummaries().map((entry) => `<option value="${esc(entry.name)}"></option>`).join('')}</datalist>
          ${fieldInput({ label: 'Amount', name: 'amount', value: item.amount ?? '', type: 'number', min: 0, step: '0.01', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Units', name: 'shares', value: item.shares ?? '', type: 'number', min: 0, step: '0.0001', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Price', name: 'price', value: item.price ?? '', type: 'number', min: 0, step: '0.0001', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Fee', name: 'fee', value: item.fee ?? '', type: 'number', min: 0, step: '0.01', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Realized P&L', name: 'realizedPnL', value: item.realizedPnL ?? '', type: 'number', step: '0.01', placeholder: 'For sells / dividends; can be negative' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">What you were thinking</p>
        <div class="form-grid">
          ${fieldTextarea({ label: 'Why this trade', name: 'reason', value: item.reason, placeholder: 'What triggered it? A planned action or a sudden impulse?', span: true })}
          ${fieldInput({ label: 'Mood', name: 'mood', value: item.mood, placeholder: 'e.g. calm / impatient / greedy / afraid' })}
          ${fieldInput({ label: 'Market context', name: 'market', value: item.market, placeholder: 'e.g. third week of declines' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">After the fact</p>
        <div class="form-grid">
          ${fieldTextarea({ label: 'Review', name: 'review', value: item.review, placeholder: 'If this happened again, what would you do?', span: true })}
          ${fieldTextarea({ label: 'Lesson', name: 'lesson', value: item.lesson, placeholder: 'One sentence is enough', span: true, rows: 2 })}
          ${fieldSelect({ label: 'Followed the plan?', name: 'followedPlan', value: item.followedPlan, choices: ['Not reviewed', 'Yes', 'No', 'Partly'] })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? 'Edit trade' : 'Log a trade',
      subtitle: 'Use the actual fill for amount and date; the review can come later.',
      body,
      showDelete: editing
    }), {
      onMount(root) {
        const link = $('#f-link', root);
        link?.addEventListener('change', () => {
          const asset = state.data.assets.find((entry) => entry.id === link.value);
          if (!asset) return;
          formFill(root, {
            name: asset.name,
            code: asset.code,
            account: asset.account,
            category: asset.category
          });
        });
        if (editing) {
          $('#modal-delete', root)?.addEventListener('click', () => {
            closeModal();
            confirmDeleteTrade(item);
          });
        }
      },
      onSubmit(form) {
        const date = form.elements.date.value;
        if (!date) return failField(form, 'date', 'Pick a date');
        if (date > today()) return failField(form, 'date', 'The date cannot be in the future');
        const name = form.elements.name.value.trim();
        if (!name) return failField(form, 'name', 'Enter a name');
        const numbers = {};
        for (const key of ['amount', 'shares', 'price', 'fee', 'realizedPnL']) {
          const raw = form.elements[key].value.trim();
          if (raw === '') { numbers[key] = null; continue; }
          const value = Number(raw);
          if (!Number.isFinite(value)) return failField(form, key, 'Enter a valid number');
          if (key !== 'realizedPnL' && value < 0) return failField(form, key, 'Cannot be less than 0');
          numbers[key] = value;
        }
        const next = {
          id: item.id || uuid(),
          date,
          account: form.elements.account.value.trim(),
          category: form.elements.category.value,
          code: form.elements.code.value.trim(),
          name,
          action: form.elements.action.value,
          amount: numbers.amount,
          shares: numbers.shares,
          price: numbers.price,
          fee: numbers.fee,
          realizedPnL: numbers.realizedPnL,
          reason: form.elements.reason.value.trim(),
          mood: form.elements.mood.value.trim(),
          market: form.elements.market.value.trim(),
          review: form.elements.review.value.trim(),
          followedPlan: form.elements.followedPlan.value,
          lesson: form.elements.lesson.value.trim(),
          createdAt: item.createdAt || isoNow()
        };
        if (editing) {
          const index = state.data.trades.findIndex((row) => row.id === item.id);
          if (index >= 0) state.data.trades[index] = next;
        } else {
          state.data.trades.push(next);
        }
        render();
        persist();
        toast(editing ? 'Trade updated' : 'Trade logged', `${name} · ${date}`);
        return true;
      }
    });
  }

  function formFill(root, values) {
    for (const [key, value] of Object.entries(values)) {
      const input = root.querySelector(`[name="${key}"]`);
      if (input) input.value = value ?? '';
    }
  }

  function openReviewEditor(review = null, presetDate = null) {
    const editing = Boolean(review);
    const item = review || {
      date: presetDate || today(),
      mood: 3,
      trigger: '',
      operations: '',
      market: '',
      didRight: '',
      didWrong: '',
      nextPlan: ''
    };
    const body = `
      <div class="form-section">
        <p class="form-section-title">Today's state</p>
        <div class="form-grid">
          ${fieldInput({ label: 'Date', name: 'date', value: item.date, type: 'date', required: true, max: today() })}
          <div class="field">
            <label>Mood</label>
            <div class="mood-picker" data-mood-picker>
              <input type="hidden" name="mood" value="${item.mood || 3}">
              ${MOODS.map((mood) => `<button type="button" class="mood-choice ${Number(item.mood) === mood.value ? 'active' : ''}" data-mood="${mood.value}">${mood.label}</button>`).join('')}
            </div>
            <span class="help">No judgement — just the state you were in.</span>
          </div>
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">Facts</p>
        <div class="form-grid">
          ${fieldInput({ label: 'Trigger', name: 'trigger', value: item.trigger, placeholder: 'Why did you open the account today?', span: true })}
          ${fieldInput({ label: 'Market', name: 'market', value: item.market, placeholder: 'What happened in the index, sector or news' })}
          ${fieldInput({ label: 'Actions', name: 'operations', value: item.operations, placeholder: 'Bought, sold, or did nothing' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">Review</p>
        <div class="form-grid">
          ${fieldTextarea({ label: 'Did right', name: 'didRight', value: item.didRight, placeholder: 'What went according to plan?' })}
          ${fieldTextarea({ label: 'Did not do well', name: 'didWrong', value: item.didWrong, placeholder: 'Where did emotion take over?' })}
          ${fieldTextarea({ label: 'The one next step', name: 'nextPlan', value: item.nextPlan, placeholder: 'Be specific — e.g. no chart-watching tomorrow; just confirm the DCA debit.', span: true })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? 'Edit review' : "Write today's review",
      subtitle: 'Three to five lines. Facts first, then judgement.',
      body,
      showDelete: editing
    }), {
      onMount(root) {
        const picker = $('[data-mood-picker]', root);
        picker?.addEventListener('click', (event) => {
          const button = event.target.closest('[data-mood]');
          if (!button) return;
          $$('.mood-choice', picker).forEach((itemButton) => itemButton.classList.toggle('active', itemButton === button));
          const hidden = $('input[name="mood"]', picker);
          if (hidden) hidden.value = button.dataset.mood;
        });
        if (editing) {
          $('#modal-delete', root)?.addEventListener('click', () => {
            closeModal();
            confirmDeleteReview(item);
          });
        }
      },
      onSubmit(form) {
        const date = form.elements.date.value;
        if (!date) return failField(form, 'date', 'Pick a date');
        if (date > today()) return failField(form, 'date', 'The date cannot be in the future');
        const duplicate = state.data.reviews.find((row) => row.date === date && row.id !== item.id);
        if (duplicate) return failField(form, 'date', 'A review already exists for this day. Change the date or edit that entry.');
        const next = {
          id: item.id || uuid(),
          date,
          mood: Number(form.elements.mood.value) || 3,
          trigger: form.elements.trigger.value.trim(),
          operations: form.elements.operations.value.trim(),
          market: form.elements.market.value.trim(),
          didRight: form.elements.didRight.value.trim(),
          didWrong: form.elements.didWrong.value.trim(),
          nextPlan: form.elements.nextPlan.value.trim(),
          createdAt: item.createdAt || isoNow(),
          updatedAt: isoNow()
        };
        if (editing) {
          const index = state.data.reviews.findIndex((row) => row.id === item.id);
          if (index >= 0) state.data.reviews[index] = next;
        } else {
          state.data.reviews.push(next);
        }
        if (next.date === today()) refreshTodaySnapshot();
        render();
        persist();
        toast(editing ? 'Review updated' : 'Review saved', fullDate(date));
        return true;
      }
    });
  }

  function openPlanEditor(plan = null) {
    const editing = Boolean(plan);
    const item = plan || {
      platform: '',
      code: '—',
      name: '',
      category: 'Fund (OTC)',
      frequency: 'Monthly',
      amount: '',
      debitDay: '',
      startDate: '',
      status: 'Active',
      note: ''
    };
    const body = `
      <div class="form-section">
        <p class="form-section-title">Plan</p>
        <div class="form-grid">
          ${fieldInput({ label: 'Platform', name: 'platform', value: item.platform, placeholder: 'e.g. Broker or bank app', required: true })}
          ${fieldInput({ label: 'Name', name: 'name', value: item.name, placeholder: 'Fund or asset name', required: true })}
          ${fieldInput({ label: 'Code', name: 'code', value: item.code === '—' ? '' : item.code, placeholder: 'Optional' })}
          ${fieldSelect({ label: 'Category', name: 'category', value: item.category, choices: CATEGORIES })}
          ${fieldSelect({ label: 'Frequency', name: 'frequency', value: item.frequency, choices: FREQUENCIES })}
          ${fieldInput({ label: 'Amount per period', name: 'amount', value: item.amount ?? '', type: 'number', min: 0, step: '0.01', placeholder: 'Optional' })}
          ${fieldInput({ label: 'Debit day', name: 'debitDay', value: item.debitDay, placeholder: 'e.g. Day 8 / every Monday' })}
          ${fieldInput({ label: 'Start date', name: 'startDate', value: item.startDate, type: 'date' })}
          ${fieldSelect({ label: 'Status', name: 'status', value: item.status, choices: PLAN_STATUSES })}
          ${fieldTextarea({ label: 'Note', name: 'note', value: item.note, placeholder: 'Why you started, and when you would pause', span: true, rows: 2 })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? 'Edit DCA plan' : 'Add DCA plan',
      subtitle: 'Amounts are estimates; the platform debit is the source of truth.',
      body,
      showDelete: editing
    }), {
      onMount(root) {
        if (editing) {
          $('#modal-delete', root)?.addEventListener('click', () => {
            closeModal();
            confirmDeletePlan(item);
          });
        }
      },
      onSubmit(form) {
        const platform = form.elements.platform.value.trim();
        const name = form.elements.name.value.trim();
        if (!platform) return failField(form, 'platform', 'Enter a platform');
        if (!name) return failField(form, 'name', 'Enter a name');
        const rawAmount = form.elements.amount.value.trim();
        let amount = null;
        if (rawAmount !== '') {
          amount = Number(rawAmount);
          if (!Number.isFinite(amount) || amount < 0) return failField(form, 'amount', 'Enter a number of 0 or more');
        }
        const next = {
          id: item.id || uuid(),
          platform,
          code: form.elements.code.value.trim() || '—',
          name,
          category: form.elements.category.value,
          frequency: form.elements.frequency.value,
          amount,
          debitDay: form.elements.debitDay.value.trim(),
          startDate: form.elements.startDate.value,
          status: form.elements.status.value,
          note: form.elements.note.value.trim()
        };
        if (editing) {
          const index = state.data.plans.findIndex((row) => row.id === item.id);
          if (index >= 0) state.data.plans[index] = next;
        } else {
          state.data.plans.push(next);
        }
        render();
        persist();
        toast(editing ? 'Plan updated' : 'Plan added', `${name} · ${next.frequency}`);
        return true;
      }
    });
  }

  function confirmDeleteAsset(asset) {
    openConfirm({
      title: 'Delete this holding?',
      message: `This removes <b>${esc(asset.name)}</b> (${money(asset.value)}) and its note. Trades are not deleted automatically. This cannot be undone.`,
      confirmLabel: 'Delete holding',
      onConfirm() {
        state.data.assets = state.data.assets.filter((item) => item.id !== asset.id);
        refreshTodaySnapshot();
        render();
        persist();
        toast('Holding deleted', asset.name);
      }
    });
  }

  function confirmDeleteTrade(trade) {
    openConfirm({
      title: 'Delete this trade?',
      message: `This removes the ${esc(trade.action)} record for <b>${esc(trade.name)}</b> on ${esc(trade.date)}, including its review. This cannot be undone.`,
      confirmLabel: 'Delete trade',
      onConfirm() {
        state.data.trades = state.data.trades.filter((item) => item.id !== trade.id);
        render();
        persist();
        toast('Trade deleted', trade.name);
      }
    });
  }

  function confirmDeleteReview(review) {
    openConfirm({
      title: 'Delete this review?',
      message: `This removes the review for <b>${fullDate(review.date)}</b>. This cannot be undone.`,
      confirmLabel: 'Delete review',
      onConfirm() {
        state.data.reviews = state.data.reviews.filter((item) => item.id !== review.id);
        render();
        persist();
        toast('Review deleted', fullDate(review.date));
      }
    });
  }

  function confirmDeletePlan(plan) {
    openConfirm({
      title: 'Delete this DCA plan?',
      message: `This removes the plan <b>${esc(plan.name)}</b>. Trades that already happened are not affected.`,
      confirmLabel: 'Delete plan',
      onConfirm() {
        state.data.plans = state.data.plans.filter((item) => item.id !== plan.id);
        render();
        persist();
        toast('Plan deleted', plan.name);
      }
    });
  }

  // ---------- export / import ----------

  function download(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function exportJSON(silent = false) {
    download(`koi300-backup-${fileStamp()}.json`, JSON.stringify(state.data, null, 2) + '\n', 'application/json');
    if (!silent) toast('Full backup exported', 'The JSON file can be re-imported from the data page.');
  }

  function csvCell(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function csvFile(rows) {
    return '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }

  function exportHoldingsCSV() {
    const head = ['Account', 'Category', 'Code', 'Name', 'Cost', 'Value', 'Units', 'Cost price', 'Last price', 'P&L', 'Return', 'Note', 'Next step', 'Data status', 'Updated'];
    const rows = state.data.assets.map((asset) => {
      const pnl = finite(asset.value) - finite(asset.cost);
      return [
        asset.account, asset.category, asset.code, asset.name,
        asset.cost.toFixed(2), asset.value.toFixed(2), asset.units ?? '', asset.costPrice ?? '', asset.price ?? '',
        pnl.toFixed(2), finite(asset.cost) === 0 ? '0.00%' : `${(pnl / finite(asset.cost) * 100).toFixed(2)}%`,
        asset.note, asset.nextStep, asset.dataStatus, asset.updatedAt
      ];
    });
    download(`koi300-holdings-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('Holdings CSV exported', plural(rows.length, 'item', 'items'));
  }

  function exportTradesCSV() {
    const head = ['Date', 'Account', 'Category', 'Code', 'Name', 'Action', 'Amount', 'Units', 'Price', 'Fee', 'Realized P&L', 'Reason', 'Mood', 'Market', 'Review', 'Followed plan', 'Lesson', 'Created'];
    const rows = sortedTrades().map((trade) => [
      trade.date, trade.account, trade.category, trade.code, trade.name, trade.action,
      trade.amount ?? '', trade.shares ?? '', trade.price ?? '', trade.fee ?? '', trade.realizedPnL ?? '',
      trade.reason, trade.mood, trade.market, trade.review, trade.followedPlan, trade.lesson, trade.createdAt
    ]);
    download(`koi300-trades-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('Trades CSV exported', plural(rows.length, 'trade', 'trades'));
  }

  function exportReviewsCSV() {
    const head = ['Date', 'Mood', 'Trigger', 'Actions', 'Market', 'Did right', 'Did not do well', 'Next step', 'Created', 'Updated'];
    const rows = sortedReviews().map((review) => [
      review.date, review.mood, review.trigger, review.operations, review.market,
      review.didRight, review.didWrong, review.nextPlan, review.createdAt, review.updatedAt
    ]);
    download(`koi300-reviews-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('Reviews CSV exported', plural(rows.length, 'entry', 'entries'));
  }

  function exportPlansCSV() {
    const head = ['Platform', 'Code', 'Name', 'Category', 'Frequency', 'Amount', 'Debit day', 'Start date', 'Status', 'Note', 'Monthly estimate'];
    const rows = state.data.plans.map((plan) => [
      plan.platform, plan.code, plan.name, plan.category, plan.frequency, plan.amount ?? '',
      plan.debitDay, plan.startDate, plan.status, plan.note, monthlyEstimate(plan).toFixed(2)
    ]);
    download(`koi300-plans-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('Plans CSV exported', plural(rows.length, 'plan', 'plans'));
  }

  async function backupNow(showToast = true) {
    if (state.mode === 'file') {
      try {
        const response = await fetch('api/backup', { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Backup failed');
        if (showToast) toast('Backed up on this device', `data/backups/${result.name}`);
        return true;
      } catch (error) {
        if (showToast) toast('Local backup failed', error.message, 'error');
        return false;
      }
    }
    exportJSON(!showToast);
    return true;
  }

  function protectBeforeReplace() {
    exportJSON(true);
    if (state.mode === 'file') {
      fetch('api/backup', { method: 'POST' }).catch(() => {});
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || ''));
        const imported = normalizeData(raw);
        const counts = `${plural(imported.assets.length, 'holding', 'holdings')}, ${plural(imported.trades.length, 'trade', 'trades')}, ${plural(imported.reviews.length, 'review', 'reviews')}, ${plural(imported.plans.length, 'plan', 'plans')}`;
        openConfirm({
          title: 'Import and replace the current data?',
          message: `The backup file will replace everything here (${counts}). The current data is exported automatically before the import.`,
          confirmLabel: 'Import and replace',
          danger: false,
          onConfirm() {
            protectBeforeReplace();
            state.data = imported;
            state.section = 'overview';
            if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
            render();
            persist();
            toast('Import finished', counts);
          }
        });
      } catch (error) {
        toast('Import failed', error.message || 'This is not a valid Koi 300 JSON file.', 'error');
      }
    };
    reader.onerror = () => toast('Import failed', 'Could not read this file.', 'error');
    reader.readAsText(file, 'utf-8');
  }

  function sampleData() {
    const now = new Date();
    const day = (offset) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    };
    const iso = (offset, hour = 20) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, hour, 10, 0);
      return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
    };
    const assets = [
      ['Long-term', 'Fund (OTC)', 'DEMO01', 'Demo · Broad Index', 48000, 51260.5, 32680.2, 1.468, 1.5685, 'Monthly DCA; do not pause just because the market is down.', 'Decide next month whether to keep the ¥2,000 plan.', 'Manual'],
      ['Long-term', 'Fund (OTC)', 'DEMO02', 'Demo · Global Tech', 18000, 21450.8, 10240, 1.758, 2.0948, 'Only money you will not need for years; cap it at 15% of the portfolio.', 'Check the weight at the quarterly rebalance.', 'Manual'],
      ['Flexible', 'Fund (ETF)', 'DEMO03', 'Demo · Dividend Low Vol', 16000, 17012.4, 15200, 1.0526, 1.1192, 'Lower volatility; holds part of the defensive sleeve.', '', 'Manual'],
      ['Flexible', 'Stock', 'DEMO04', 'Demo · New Energy', 12000, 9877.2, 800, 15, 12.3465, 'Bought after a chase; kept as a negative example.', 'Cut by half near cost; do not average down.', 'Needs update'],
      ['Long-term', 'Gold', 'DEMO05', 'Demo · Gold Savings', 9000, 10482.6, 18.5, 486.5, 566.6, 'Hedges extreme risk; no more than 10% of assets.', 'Do not add just because it rose.', 'Manual'],
      ['Retirement', 'Pension', 'DEMO06', 'Demo · Personal Pension', 24000, 25200, 0, 1, 1.05, 'Use the full annual allowance; choose low-fee products.', 'Check the remaining allowance before year-end.', 'Estimate'],
      ['Cash', 'Cash', 'DEMO07', 'Demo · Emergency Cash', 15000, 15000, 0, 1, 1, 'Six to twelve months of expenses; not invested.', '', 'Manual']
    ].map((row, index) => ({
      id: uuid(),
      account: row[0], category: row[1], code: row[2], name: row[3],
      cost: row[4], value: row[5], units: row[6], costPrice: row[7], price: row[8],
      note: row[9], nextStep: row[10], dataStatus: row[11],
      updatedAt: iso(0, 16 - index)
    }));
    const trades = [
      {
        date: day(-1), account: 'Long-term', category: 'Fund (OTC)', code: 'DEMO01', name: 'Demo · Broad Index',
        action: 'DCA', amount: 2000, shares: 1275.4, price: 1.5685, fee: 0, realizedPnL: null,
        reason: 'Scheduled monthly debit; the market fell this month, so continue as planned.', mood: 'Neutral', market: 'The broad index has pulled back two weeks in a row.',
        review: 'Did not pause the debit during the decline — plan followed.', followedPlan: 'Yes', lesson: 'The point of DCA is not to change the rules mid-way.', createdAt: iso(-1)
      },
      {
        date: day(-3), account: 'Flexible', category: 'Stock', code: 'DEMO04', name: 'Demo · New Energy',
        action: 'Sell', amount: 2469.3, shares: 200, price: 12.3465, fee: 5, realizedPnL: -530.7,
        reason: 'Trimmed a quarter after the bounce to reduce single-stock weight.', mood: 'A bit reluctant', market: 'The sector bounced for two days.',
        review: 'The sell was in the plan, but the position is still heavy.', followedPlan: 'Partly', lesson: 'Do not use averaging down as a substitute for a stop.', createdAt: iso(-3)
      },
      {
        date: day(-7), account: 'Long-term', category: 'Gold', code: 'DEMO05', name: 'Demo · Gold Savings',
        action: 'Buy', amount: 300, shares: 0.529, price: 566.6, fee: 0, realizedPnL: null,
        reason: 'Small, steady accumulation; no directional call.', mood: 'Neutral', market: 'Gold is choppy near its highs.',
        review: 'Small enough to fit the trial position.', followedPlan: 'Yes', lesson: '', createdAt: iso(-7)
      },
      {
        date: day(-12), account: 'Long-term', category: 'Fund (OTC)', code: 'DEMO02', name: 'Demo · Global Tech',
        action: 'DCA', amount: 500, shares: 238.7, price: 2.0948, fee: 0, realizedPnL: null,
        reason: 'Weekly automatic debit.', mood: 'Neutral', market: 'Overseas tech volatility increased.',
        review: 'No manual top-up; rhythm kept.', followedPlan: 'Yes', lesson: 'Check the account less often when volatility is high.', createdAt: iso(-12)
      },
      {
        date: day(-20), account: 'Flexible', category: 'Fund (ETF)', code: 'DEMO03', name: 'Demo · Dividend Low Vol',
        action: 'Switch', amount: 8000, shares: 7500, price: 1.0667, fee: 8, realizedPnL: null,
        reason: 'Moved part of the growth sleeve into defense.', mood: 'A little anxious', market: 'Volume kept shrinking.',
        review: 'The switch was a rebalance, not a short-term forecast.', followedPlan: 'Partly', lesson: 'Write down the conditions for a switch first.', createdAt: iso(-20)
      },
      {
        date: day(-30), account: 'Long-term', category: 'Fund (OTC)', code: 'DEMO01', name: 'Demo · Broad Index',
        action: 'Dividend', amount: 126.4, shares: null, price: null, fee: 0, realizedPnL: 126.4,
        reason: 'Cash dividend received.', mood: 'Neutral', market: 'No particular change.',
        review: 'Dividend stays in the cash pool for the next debit.', followedPlan: 'Yes', lesson: '', createdAt: iso(-30)
      }
    ].map((trade) => ({ id: uuid(), ...trade }));
    const reviews = [
      {
        date: day(-1), mood: 4, trigger: 'DCA debit day, so I checked the account.',
        operations: 'Confirmed the broad-index debit; nothing else.',
        market: 'The pullback continued and the loss widened, but volume did not expand.',
        didRight: 'Kept the debit; no pause and no extra top-up.',
        didWrong: 'Opened the app three times and lost focus.',
        nextPlan: 'No trading app for the next three days; keep only the DCA reminder.',
        createdAt: iso(-1), updatedAt: iso(-1)
      },
      {
        date: day(-4), mood: 2, trigger: 'New Energy bounced; I wanted to sell but feared missing more upside.',
        operations: 'Placed a sell for 200 shares first; cancelled the rest after it filled.',
        market: 'The sector bounced two days, but the stock trend is still broken.',
        didRight: 'Executed half of the pre-set trim plan.',
        didWrong: 'Changed the price once intraday; the chart pulled me along.',
        nextPlan: 'Write the price and size before the open; no changes intraday.',
        createdAt: iso(-4), updatedAt: iso(-4)
      },
      {
        date: day(-8), mood: 3, trigger: 'Friends were talking about gold; I was afraid of missing out.',
        operations: 'Added only the planned ¥300; no large top-up.',
        market: 'Gold is choppy near its high.',
        didRight: 'Separated “want to buy” from “plan to buy”.',
        didWrong: 'Still spent too much time reading other people’s views.',
        nextPlan: 'Skip gold content this week; stick to the debit day.',
        createdAt: iso(-8), updatedAt: iso(-8)
      },
      {
        date: day(-15), mood: 5, trigger: 'Monthly review; went through this month’s activity.',
        operations: 'No trades; checked position and cash weights.',
        market: 'Range-bound; the account is roughly flat.',
        didRight: 'Cut the number of trades and left more time for work.',
        didWrong: 'Wrote only feelings, no numbers.',
        nextPlan: 'Next month, copy cost, value and cash first.',
        createdAt: iso(-15), updatedAt: iso(-15)
      }
    ].map((review) => ({ id: uuid(), ...review }));
    const plans = [
      { id: uuid(), platform: 'Demo Broker · A', code: 'DEMO01', name: 'Demo · Broad Index', category: 'Fund (OTC)', frequency: 'Monthly', amount: 2000, debitDay: 'Day 8', startDate: day(-180), status: 'Active', note: 'Debit the day after payday so late-month cash is not a problem.' },
      { id: uuid(), platform: 'Demo Broker · A', code: 'DEMO02', name: 'Demo · Global Tech', category: 'Fund (OTC)', frequency: 'Weekly', amount: 500, debitDay: 'Every Monday', startDate: day(-120), status: 'Active', note: 'Small and steady; not changed by short-term moves.' },
      { id: uuid(), platform: 'Demo Broker · B', code: 'DEMO05', name: 'Demo · Gold Savings', category: 'Gold', frequency: 'Monthly', amount: 300, debitDay: 'Day 18', startDate: day(-90), status: 'Active', note: 'Position cap: 10%.' },
      { id: uuid(), platform: 'Demo Broker · B', code: 'DEMO07', name: 'Demo · Cash Pool', category: 'Cash', frequency: 'Monthly', amount: 1500, debitDay: 'Day 25', startDate: day(-200), status: 'Cash pool', note: 'Fill the reserve first, then consider adding risk.' }
    ];
    const base = totals({ assets, trades, reviews, plans, snapshots: [], schemaVersion: 1, lastModified: isoNow() });
    const snapshots = [-42, -35, -28, -21, -14, -7, 0].map((offset, index, list) => {
      const factor = 0.92 + (index / (list.length - 1)) * 0.08;
      return {
        id: uuid(),
        date: day(offset),
        cost: Math.round(base.cost * (0.90 + index * 0.015) * 100) / 100,
        value: Math.round(base.value * factor * 100) / 100,
        cash: Math.round(base.cash * (0.7 + index * 0.05) * 100) / 100
      };
    });
    return {
      schemaVersion: 1,
      assets,
      trades,
      reviews,
      plans,
      snapshots,
      lastModified: isoNow()
    };
  }

  function loadSampleData() {
    openConfirm({
      title: 'Load fictional sample data?',
      message: 'The current data is exported automatically, then replaced with seven holdings, six trades and four reviews. Every name, code and amount in the sample is fictional.',
      confirmLabel: 'Load sample',
      danger: false,
      onConfirm() {
        protectBeforeReplace();
        state.data = normalizeData(sampleData());
        state.section = 'overview';
        if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
        render();
        persist();
        toast('Sample data loaded', 'You can clear it from the data page or import your own JSON at any time.');
      }
    });
  }

  function clearData() {
    openConfirm({
      title: 'Clear all data on this device?',
      message: 'This removes the current holdings, trades, reviews, plans and snapshots. A backup is exported first. Only this app’s data is affected; no other files are touched.',
      confirmLabel: 'Clear everything',
      onConfirm() {
        protectBeforeReplace();
        state.data = emptyData();
        state.section = 'overview';
        if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
        render();
        persist();
        toast('Local data cleared', 'The backup file was downloaded and can be re-imported from the data page.');
      }
    });
  }

  // ---------- toasts ----------

  function toast(title, message = '', tone = 'success') {
    const root = $('#toast-root');
    if (!root) return;
    const item = document.createElement('div');
    item.className = `toast ${tone === 'error' ? 'error' : ''}`;
    item.innerHTML = `
      ${icon(tone === 'error' ? 'info' : 'check')}
      <div class="toast-copy"><b>${esc(title)}</b>${message ? `<span>${esc(message)}</span>` : ''}</div>
      <button class="toast-close" aria-label="Dismiss">${icon('x', 'icon tiny')}</button>
    `;
    item.querySelector('.toast-close').addEventListener('click', () => item.remove());
    root.appendChild(item);
    setTimeout(() => {
      if (item.isConnected) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(-4px)';
        item.style.transition = 'opacity .2s ease, transform .2s ease';
        setTimeout(() => item.remove(), 220);
      }
    }, 4800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied', 'You can paste it straight to an agent.');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        toast('Copied', 'You can paste it straight to an agent.');
      } catch {
        toast('Copy failed', 'Select the text manually.', 'error');
      }
      area.remove();
    }
  }

  // ---------- actions ----------

  function findById(list, id) {
    return list.find((item) => item.id === id) || null;
  }

  function handleAction(action, id) {
    switch (action) {
      case 'cycle-theme': {
        const current = THEMES.findIndex((theme) => theme.id === readTheme());
        const next = THEMES[(current + 1) % THEMES.length];
        applyTheme(next.id);
        break;
      }
      case 'new-asset': openAssetEditor(); break;
      case 'edit-asset': {
        const asset = findById(state.data.assets, id);
        if (asset) openAssetEditor(asset);
        break;
      }
      case 'delete-asset': {
        const asset = findById(state.data.assets, id);
        if (asset) confirmDeleteAsset(asset);
        break;
      }
      case 'new-trade': openTradeEditor(); break;
      case 'edit-trade': {
        const trade = findById(state.data.trades, id);
        if (trade) openTradeEditor(trade);
        break;
      }
      case 'delete-trade': {
        const trade = findById(state.data.trades, id);
        if (trade) confirmDeleteTrade(trade);
        break;
      }
      case 'review-today':
        openReviewEditor(todayReview(), today());
        break;
      case 'edit-review': {
        const review = findById(state.data.reviews, id);
        if (review) openReviewEditor(review);
        break;
      }
      case 'delete-review': {
        const review = findById(state.data.reviews, id);
        if (review) confirmDeleteReview(review);
        break;
      }
      case 'new-plan': openPlanEditor(); break;
      case 'edit-plan': {
        const plan = findById(state.data.plans, id);
        if (plan) openPlanEditor(plan);
        break;
      }
      case 'delete-plan': {
        const plan = findById(state.data.plans, id);
        if (plan) confirmDeletePlan(plan);
        break;
      }
      case 'export-json': exportJSON(); break;
      case 'export-holdings': exportHoldingsCSV(); break;
      case 'export-trades': exportTradesCSV(); break;
      case 'export-reviews': exportReviewsCSV(); break;
      case 'export-plans': exportPlansCSV(); break;
      case 'import-json': $('#import-input')?.click(); break;
      case 'backup-now': backupNow(); break;
      case 'load-sample': loadSampleData(); break;
      case 'clear-data': clearData(); break;
      case 'retry-file': retryFileMode(); break;
      case 'reload-file': reloadFromFile(); break;
      case 'copy-agent': copyAgentPrompt(); break;
      case 'copy-path': copyText(state.dataFile || 'data/portfolio.json'); break;
      case 'go-data': navigate('data'); break;
      default: break;
    }
  }

  async function reloadFromFile() {
    if (state.mode !== 'file') return retryFileMode();
    try {
      const [dataResponse, statusResponse] = await Promise.all([
        fetch('api/data', { cache: 'no-store' }),
        fetch('api/status', { cache: 'no-store' })
      ]);
      if (!dataResponse.ok) throw new Error('Could not read the data file.');
      const status = await statusResponse.json();
      state.data = normalizeData(await dataResponse.json());
      state.mtimeMs = status.mtimeMs || 0;
      render();
      toast('Reloaded from file', state.dataFile);
    } catch (error) {
      toast('Read failed', error.message, 'error');
    }
  }

  function copyAgentPrompt() {
    const prompt = state.mode === 'file'
      ? `Back up ${state.dataFile} first, then read and edit my investment review data. Keep schemaVersion=1, field names and UUIDs unchanged; use YYYY-MM-DD dates. Write back to the same path; the app refreshes within seconds. Do not upload or commit it to a public repository.`
      : 'Run the desktop app (Koi 300) to enter local-file mode, then read data/portfolio.json. Back it up before editing and keep schemaVersion=1 and field names unchanged. Do not upload or commit it to a public repository.';
    copyText(prompt);
  }

  // ---------- polling for agent edits ----------

  function startPolling() {
    setInterval(async () => {
      if (state.mode !== 'file' || document.hidden || state.saving) return;
      if ($('#modal-root .modal')) return;
      try {
        const response = await fetch('api/status', { cache: 'no-store' });
        if (!response.ok) return;
        const status = await response.json();
        if (!status.mtimeMs || status.mtimeMs === state.mtimeMs) return;
        const dataResponse = await fetch('api/data', { cache: 'no-store' });
        if (!dataResponse.ok) return;
        const next = normalizeData(await dataResponse.json());
        state.data = next;
        state.mtimeMs = status.mtimeMs;
        state.dataFile = status.dataFile || state.dataFile;
        render();
        const now = Date.now();
        if (now - state.lastExternalToast > 8000) {
          state.lastExternalToast = now;
          toast('External change synced', 'The data file was updated by an agent or another program.');
        }
      } catch {
        /* offline or server restarting; keep local state */
      }
    }, 4000);
  }

  // ---------- events ----------

  function renderRouteFromHash() {
    const section = location.hash.slice(1);
    state.section = views[section] ? section : 'overview';
    render();
  }

  function bindEvents() {
    document.addEventListener('click', (event) => {
      const themeButton = event.target.closest('[data-theme-choice]');
      if (themeButton) {
        applyTheme(themeButton.dataset.themeChoice);
        return;
      }
      const sectionButton = event.target.closest('[data-section]');
      if (sectionButton) {
        navigate(sectionButton.dataset.section);
        return;
      }
      if (event.target.closest('[data-close-modal]')) {
        closeModal();
        return;
      }
      if (event.target.matches('[data-modal-backdrop]')) {
        closeModal();
        return;
      }
      const clearSearch = event.target.closest('[data-clear-search]');
      if (clearSearch) {
        const input = document.getElementById(clearSearch.dataset.clearSearch);
        if (input) {
          input.value = '';
          const scope = input.dataset.filterScope;
          const key = input.dataset.filterKey;
          if (state.filters[scope]) state.filters[scope][key] = '';
          input.focus();
          if (scope === 'holdings') applyHoldingFilters();
          if (scope === 'trades') applyTradeFilters();
          if (scope === 'reviews') applyReviewFilters();
        }
        return;
      }
      const actionButton = event.target.closest('[data-action]');
      if (actionButton) {
        event.preventDefault();
        handleAction(actionButton.dataset.action, actionButton.dataset.id);
      }
    });

    document.addEventListener('input', (event) => {
      const input = event.target.closest('[data-filter-scope][data-filter-key]');
      if (!input) return;
      const scope = input.dataset.filterScope;
      const key = input.dataset.filterKey;
      if (!state.filters[scope]) return;
      state.filters[scope][key] = input.value;
      if (scope === 'holdings') applyHoldingFilters();
      if (scope === 'trades') applyTradeFilters();
      if (scope === 'reviews') applyReviewFilters();
    });

    document.addEventListener('change', (event) => {
      const input = event.target.closest('[data-filter-scope][data-filter-key]');
      if (input) {
        const scope = input.dataset.filterScope;
        const key = input.dataset.filterKey;
        if (state.filters[scope]) state.filters[scope][key] = input.value;
        if (scope === 'holdings') applyHoldingFilters();
        if (scope === 'trades') applyTradeFilters();
        return;
      }
      if (event.target.id === 'import-input') {
        const file = event.target.files?.[0];
        event.target.value = '';
        handleImportFile(file);
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && $('#modal-root .modal')) {
        closeModal();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        const form = $('#editor-form');
        if (form) {
          event.preventDefault();
          form.requestSubmit();
        }
      }
    });

    window.addEventListener('hashchange', renderRouteFromHash);
    window.addEventListener('resize', fitOpenModal);
  }

  // ---------- boot ----------

  async function boot() {
    renderThemeDots();
    bindEvents();
    const fileMode = await tryFileMode();
    if (!fileMode) {
      state.data = loadLocalData();
      state.mode = 'browser';
      updateChrome();
    }
    renderRouteFromHash();
    updateChrome();
    if (!fileMode && state.storageBroken) {
      toast('Browser storage was not allowed', 'Use the desktop app for local-file mode, or export a JSON backup regularly.', 'error');
    }
    if (fileMode) {
      toast('Local-file mode is active', 'Data file: data/portfolio.json · agents can edit it directly.');
    }
    startPolling();
  }

  boot();
})();
