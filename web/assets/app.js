'use strict';

(() => {
  const CATEGORIES = ['场外基金', '场内基金', '股票', '养老金', '黄金', '现金'];
  const ACTIONS = ['买入', '卖出', '定投', '转换', '分红'];
  const FREQUENCIES = ['每月', '每周', '每日', '每交易日', '一次性'];
  const PLAN_STATUSES = ['进行中', '已暂停', '资金归集', '已结束'];
  const DATA_STATUSES = ['手工填写', '截图录入', '券商截图', '估算', '待更新'];
  const MOODS = [
    { value: 1, label: '很差' },
    { value: 2, label: '偏低' },
    { value: 3, label: '一般' },
    { value: 4, label: '不错' },
    { value: 5, label: '很好' }
  ];
  const THEMES = [
    { id: 'warm', label: '暖米', page: '#F6F2EA', accent: '#1F4E4A' },
    { id: 'blush', label: '淡粉', page: '#FBF4F2', accent: '#8A5A63' },
    { id: 'mist', label: '淡蓝', page: '#F2F6F8', accent: '#346074' },
    { id: 'snow', label: '纯白', page: '#FAFAF9', accent: '#3E3E3A' },
    { id: 'night', label: '黑夜', page: '#0F1315', accent: '#9DC9C1' }
  ];
  const CHART_COLORS = ['#2C5D57', '#B08D50', '#5B7C99', '#8C6B8E', '#B06A4F', '#7E8B76', '#D3B38C'];
  const LS_DATA = 'koi300.data.v1';
  const LS_THEME = 'koi300.theme';
  const GOAL = 300;
  const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

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
      holdings: { q: '', category: '全部', account: '全部' },
      trades: { q: '', action: '全部', month: '全部' },
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

  const numberFormat = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const shortNumberFormat = new Intl.NumberFormat('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  // ---------- formatting ----------

  function money(value, signed = false) {
    const number = Number(value) || 0;
    const clean = Math.abs(number) < 0.005 ? 0 : number;
    const body = numberFormat.format(Math.abs(clean));
    if (clean < 0) return '-' + body;
    if (signed && clean > 0) return '+' + body;
    return body;
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
    return new Intl.NumberFormat('zh-CN', {
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
    return date ? `${date.getMonth() + 1}月${date.getDate()}日` : '—';
  }
  function fullDate(value) {
    const date = parseDate(value);
    if (!date) return value || '—';
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
  }
  function chineseToday() {
    const date = new Date();
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${WEEKDAYS[date.getDay()]}`;
  }
  function timeText(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  function dateTimeText(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
    if (action === '买入' || action === '定投') return 'gain';
    if (action === '卖出') return 'loss';
    if (action === '分红') return 'gold';
    return '';
  }

  function stage(count) {
    if (count <= 0) return '第一笔，从今天开始';
    if (count < 30) return '先观察自己';
    if (count < 100) return '节奏正在出现';
    if (count < 200) return '纪律开始成形';
    if (count < GOAL) return '风格就在附近';
    return '风格已自成一套';
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

  // 接受英文演示站导出的枚举值，导入后统一为中文枚举，避免被回退成默认值。
  const ENUM_ALIASES = {
    'Fund (OTC)': '场外基金', 'Fund (ETF)': '场内基金', 'Stock': '股票',
    'Pension': '养老金', 'Gold': '黄金', 'Cash': '现金',
    'Buy': '买入', 'Sell': '卖出', 'DCA': '定投', 'Switch': '转换', 'Dividend': '分红',
    'Monthly': '每月', 'Weekly': '每周', 'Daily': '每日', 'Every trading day': '每交易日', 'One-off': '一次性',
    'Active': '进行中', 'Paused': '已暂停', 'Cash pool': '资金归集', 'Finished': '已结束',
    'Manual': '手工填写', 'From screenshot': '截图录入', 'Broker screenshot': '券商截图',
    'Estimate': '估算', 'Needs update': '待更新',
    'Not reviewed': '待复盘', 'Yes': '是', 'No': '否', 'Partly': '部分按计划'
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
      throw new Error('不是有效的复盘数据文件');
    }
    for (const key of ['assets', 'trades', 'reviews', 'plans', 'snapshots']) {
      if (raw[key] != null && !Array.isArray(raw[key])) {
        throw new Error(`字段 ${key} 格式不正确`);
      }
    }
    const assets = (raw.assets || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      account: String(item.account || '未分类账户'),
      category: oneOf(item.category, CATEGORIES, '场外基金'),
      code: String(item.code || ''),
      name: String(item.name || '未命名持仓'),
      cost: finite(item.cost),
      value: finite(item.value),
      units: optionalNumber(item.units),
      costPrice: optionalNumber(item.costPrice),
      price: optionalNumber(item.price),
      note: String(item.note || ''),
      nextStep: String(item.nextStep || ''),
      dataStatus: oneOf(item.dataStatus, DATA_STATUSES, '手工填写'),
      updatedAt: String(item.updatedAt || isoNow())
    }));

    const trades = (raw.trades || []).filter((item) => item && typeof item === 'object').map((item) => ({
      id: String(item.id || uuid()),
      date: String(item.date || today()),
      account: String(item.account || ''),
      category: oneOf(item.category, CATEGORIES, '场外基金'),
      code: String(item.code || ''),
      name: String(item.name || '未命名操作'),
      action: oneOf(item.action, ACTIONS, '买入'),
      amount: optionalNumber(item.amount),
      shares: optionalNumber(item.shares),
      price: optionalNumber(item.price),
      fee: optionalNumber(item.fee),
      realizedPnL: optionalNumber(item.realizedPnL),
      reason: String(item.reason || ''),
      mood: String(item.mood || ''),
      market: String(item.market || ''),
      review: String(item.review || ''),
      followedPlan: String(alias(item.followedPlan) || '待复盘'),
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
      platform: String(item.platform || '未填写平台'),
      code: String(item.code || '—'),
      name: String(item.name || '未命名计划'),
      category: oneOf(item.category, CATEGORIES, '场外基金'),
      frequency: oneOf(item.frequency, FREQUENCIES, '每月'),
      amount: optionalNumber(item.amount),
      debitDay: String(item.debitDay || ''),
      startDate: String(item.startDate || ''),
      status: oneOf(item.status, PLAN_STATUSES, '进行中'),
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
      .filter((item) => item.category === '现金')
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
      const key = asset.account || '未分类账户';
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
    return plan.status === '资金归集' || plan.category === '现金';
  }

  function monthlyEstimate(plan) {
    if (plan.status !== '进行中' || plan.amount == null) return 0;
    const amount = finite(plan.amount);
    switch (plan.frequency) {
      case '每月': return amount;
      case '每周': return amount * 52 / 12;
      case '每日': return amount * 30;
      case '每交易日': return amount * 21.75;
      default: return 0;
    }
  }

  function activePlans() {
    return state.data.plans.filter((plan) => plan.status === '进行中');
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

  function migrateLegacyStorage() {
    try {
      if (!localStorage.getItem(LS_DATA)) {
        const legacyData = localStorage.getItem('fupan300.data.v1');
        if (legacyData) localStorage.setItem(LS_DATA, legacyData);
      }
      if (!localStorage.getItem(LS_THEME)) {
        const legacyTheme = localStorage.getItem('fupan300.theme');
        if (legacyTheme) localStorage.setItem(LS_THEME, legacyTheme);
      }
    } catch { /* file:// may deny storage */ }
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
      toast('本地数据无法读取', '已载入空数据，原始内容保留在浏览器中，可尝试导入备份。', 'error');
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
          const response = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || `保存失败 (${response.status})`);
          if (seq === state.saveSeq && result.mtimeMs) {
            state.mtimeMs = result.mtimeMs;
            state.dataFile = result.dataFile || state.dataFile;
          }
          updateChrome();
        } catch (error) {
          toast('保存失败', error.message || '无法写入本地文件。', 'error');
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
      toast('浏览器本地存储不可用', '请改用启动脚本进入本地文件模式，或先导出 JSON 备份。', 'error');
    }
    return Promise.resolve();
  }

  async function tryFileMode() {
    if (location.protocol === 'file:') return false;
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1200);
      const response = await fetch('/api/status', {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!response.ok) return false;
      if (!(response.headers.get('content-type') || '').includes('application/json')) return false;
      const status = await response.json();
      if (status.app !== 'koi-300' && status.app !== 'fupan-300') return false;
      state.mode = 'file';
      state.dataFile = status.dataFile || '';
      state.dataDir = status.dataDir || '';
      state.port = status.port || 4877;
      state.mtimeMs = status.mtimeMs || 0;
      const dataResponse = await fetch('/api/data', { cache: 'no-store' });
      if (!dataResponse.ok) throw new Error('无法读取本地数据文件');
      state.data = normalizeData(await dataResponse.json());
      const refreshed = await fetch('/api/status', { cache: 'no-store' }).then((res) => res.json()).catch(() => null);
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
      toast('已连接本地文件', '数据来自 data/portfolio.json，可由 agent 直接修改。');
    } else if (previous === 'browser') {
      toast('未发现本地服务', '请用 start-mac.command 或 start-windows.bat 打开本地文件模式。', 'error');
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
        data-theme-choice="${theme.id}" title="${theme.label}" aria-label="切换为${theme.label}主题"></button>
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
    const modeLabel = state.mode === 'file' ? '本地文件 · 自动保存' : (state.storageBroken ? '浏览器未授权存储' : '浏览器本地存储');
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
          <div class="donut-center"><strong>—</strong><span>持仓占比</span></div>
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
      : summaries.filter((item) => item.name !== '现金').reduce((sum, item) => sum + item.value, 0) / total;
    return `
      <div class="donut">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${circles}</svg>
        <div class="donut-center"><strong>${percent(holdingsShare, false)}</strong><span>持仓占比</span></div>
      </div>
    `;
  }

  function recordStrip() {
    const count = recordCount();
    return `
      <section class="card strip300">
        <div class="count300"><strong>${count}</strong><span>/ 300</span></div>
        <div class="strip-main">
          <div class="strip-title"><strong>300 记录计划</strong><span>${esc(stage(count))}</span></div>
          <div class="bar"><i style="width:${Math.max(count > 0 ? 1.5 : 0, progress300() * 100)}%"></i></div>
          <span class="strip-note">交易与每日复盘都计入　·　不用一次写很多，写真的就行</span>
        </div>
        <div class="strip-quote">
          <strong>在买入前，先写 300 次。</strong>
          <span>风格不是想出来的，是记出来的。</span>
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
      : emptyStateInline('还没有账户分布', '添加持仓后，这里会按账户显示占比。', 'new-asset', '新增持仓');

    const legend = categories.length
      ? categories.map((category, index) => `
          <div class="legend-row">
            <span class="legend-swatch" style="background:${CHART_COLORS[index % CHART_COLORS.length]}"></span>
            <span>${esc(category.name)}</span>
            <b>${percent(total.value === 0 ? 0 : category.value / total.value, false)}</b>
          </div>
        `).join('')
      : '<div class="filter-empty" style="padding:20px 0">暂无类别数据</div>';

    const recent = reviews.length
      ? reviews.map((review) => {
          const day = parseDate(review.date);
          const title = review.trigger || review.operations || review.nextPlan || '当日记录';
          const summary = review.nextPlan
            ? `下一步：${review.nextPlan}`
            : (review.market || review.didRight || review.didWrong || '只记录了心情。');
          const tone = 'gold';
          return `
            <button class="review-line" data-action="edit-review" data-id="${esc(review.id)}">
              <span class="review-date"><strong>${day ? day.getDate() : '—'}</strong><span>${day ? `${day.getMonth() + 1}月` : ''}</span></span>
              <span class="review-copy">
                <span class="review-copy-top">${pill(moodLabel(review.mood), tone)}<b>${esc(title)}</b></span>
                <p>${esc(summary)}</p>
              </span>
              <span class="chev">${icon('arrow-right')}</span>
            </button>
          `;
        }).join('')
      : `<div class="empty-state" style="padding:18px 0 8px;align-items:flex-start;text-align:left">
          <h3 style="font-size:14px">今天写下第一句就够。</h3>
          <p>市场怎么样、你做了什么、下一步只做哪一件事。3–5 行即可。</p>
          <button class="btn btn-primary sm" data-action="review-today" style="margin-top:3px">写今日复盘</button>
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
      : '<div class="filter-empty" style="padding:12px 0">还没有进行中的定投计划。</div>';

    return `
      ${pageHead({
        title: '概览',
        subtitle: `${state.data.assets.length} 条持仓　·　更新于 ${timeText(state.data.lastModified) || '刚刚'}`,
        actions: `
          <button class="btn btn-secondary" data-action="new-trade">记一笔操作</button>
          <button class="btn btn-primary" data-action="review-today">写今日复盘</button>
        `
      })}

      <section class="hero">
        ${koiSvg()}
        <div class="hero-copy">
          <div class="hero-label">当前总资产<small>元</small></div>
          <div class="hero-main">
            <span class="hero-value">${money(total.value)}</span>
            <span class="hero-pnl ${up ? 'up' : 'down'}">
              ${icon(up ? 'arrow-right' : 'arrow-right', 'icon')}
              ${money(total.pnl, true)}
              <span class="pct">${percent(total.rate)}</span>
            </span>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><small>总投入成本</small><strong>${money(total.cost)}</strong></div>
            <div class="hero-stat"><small>持仓市值</small><strong>${money(total.holdings)}</strong></div>
            <div class="hero-stat"><small>现金</small><strong>${money(total.cash)}</strong></div>
          </div>
        </div>
        <div class="hero-chart">
          <div class="hero-chart-head"><span>净值走势</span><span>${snapshots.length} 个记录日</span></div>
          ${sparkline(snapshots)}
          <div class="hero-chart-foot">
            <span>${snapshots.length ? shortDate(snapshots[0].date) : '今天开始'}</span>
            <span>${snapshots.length ? shortDate(snapshots[snapshots.length - 1].date) : shortDate(today())}</span>
          </div>
        </div>
      </section>

      ${recordStrip()}

      <section class="insight-grid">
        <div class="card insight">
          <span class="insight-icon loss">${icon('chart')}</span>
          <div class="insight-copy">
            <small>最大浮亏</small>
            <strong class="${lossPnl < 0 ? 'loss' : ''}">${loss ? money(lossPnl, true) : '—'}</strong>
            <span>${loss ? `${esc(loss.name)}　${percent(finite(loss.cost) === 0 ? 0 : lossPnl / finite(loss.cost))}` : '暂无持仓'}</span>
          </div>
        </div>
        <div class="card insight">
          <span class="insight-icon">${icon('grid')}</span>
          <div class="insight-copy">
            <small>仓位最重</small>
            <strong>${top ? money(top.value) : '—'}</strong>
            <span>${top ? `${esc(top.name)}　${percent(total.value === 0 ? 0 : finite(top.value) / total.value, false)}` : '暂无持仓'}</span>
          </div>
        </div>
        <div class="card insight">
          <span class="insight-icon gold">${icon('wallet')}</span>
          <div class="insight-copy">
            <small>现金占比</small>
            <strong>${percent(total.cashShare, false)}</strong>
            <span>现金 ${money(total.cash)} 元　·　共 ${state.data.assets.filter((item) => item.category === '现金').length} 笔</span>
          </div>
        </div>
      </section>

      <section class="grid-main-side">
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('grid')}账户分布<small>按当前市值</small></div>
          </div>
          <div class="accounts">${accountRows}</div>
          ${accounts.length ? `<div class="divider"></div>
          <div class="category-foot"><span>合计</span><span><b class="num" style="color:var(--ink)">${money(total.value)}</b>　<span class="${total.pnl >= 0 ? 'gain' : 'loss'}">${percent(total.rate)}</span></span></div>` : ''}
        </div>
        <div class="card">
          <div class="card-head"><div class="card-title">${icon('chart')}资产类别<small>含现金</small></div></div>
          <div class="donut-wrap">
            ${donutSvg(categories, total.value)}
            <div class="legend">${legend}</div>
          </div>
          <div class="divider"></div>
          <div class="category-foot"><span>持仓 ${money(total.holdings)}</span><span>现金 ${money(total.cash)}</span></div>
        </div>
      </section>

      <section class="grid-main-side">
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('book')}最近复盘<small>先记事实，再记感受</small></div>
            ${state.data.reviews.length ? '<button class="card-link" data-section="reviews">查看全部</button>' : ''}
          </div>
          <div class="review-preview">${recent}</div>
        </div>
        <div class="card">
          <div class="card-head">
            <div class="card-title">${icon('calendar')}定投节奏<small>按当前计划估算</small></div>
            <button class="card-link" data-section="plans">管理</button>
          </div>
          <div class="dca-total">
            <strong>${money(monthlyInvesting())}</strong><span>元 / 月</span>
            <span class="side-note faint" style="font-size:10.5px">${active.length} 个进行中</span>
          </div>
          <div class="divider"></div>
          <div class="dca-list">${dca}</div>
          <div class="divider"></div>
          <div class="dca-foot">
            <div><small>每月备用金</small><strong>${cashPool && cashPool.amount != null ? money(cashPool.amount) : '—'}</strong></div>
            <span class="faint">实际以扣款为准</span>
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
      title: '当前持仓',
      subtitle: `${state.data.assets.length} 条资产　·　总市值 ${money(totals().value)}　·　所有数据仅在本机`,
      actions: `
        <button class="btn btn-secondary" data-action="export-holdings">${icon('download')}导出 CSV</button>
        <button class="btn btn-primary" data-action="new-asset">${icon('plus')}新增持仓</button>
      `
    });

    if (!assets.length) {
      return head + emptyCard({
        iconName: 'wallet',
        title: '还没有持仓记录',
        message: '从一笔真实持仓开始。名称、账户、成本、市值四项就够，其他可以以后补。',
        action: 'new-asset',
        cta: '新增第一笔持仓'
      });
    }

    const rows = assets.map((asset) => {
      const pnl = finite(asset.value) - finite(asset.cost);
      const rate = finite(asset.cost) === 0 ? 0 : pnl / finite(asset.cost);
      const share = totals().value === 0 ? 0 : finite(asset.value) / totals().value;
      const search = [asset.name, asset.code, asset.account, asset.category].join(' ').toLowerCase();
      const statusTone = asset.dataStatus === '待更新' ? 'gold' : 'neutral';
      return `
        <tr data-search="${esc(search)}" data-category="${esc(asset.category)}" data-account="${esc(asset.account)}">
          <td>
            <div class="name-cell"><b>${esc(asset.name)}</b><span>${esc(asset.code || '无代码')}</span></div>
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
              <button class="icon-btn" data-action="edit-asset" data-id="${esc(asset.id)}" title="编辑" aria-label="编辑持仓">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-asset" data-id="${esc(asset.id)}" title="删除" aria-label="删除持仓">${icon('trash')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="holding-search" data-filter-scope="holdings" data-filter-key="q" value="${esc(filters.q)}" placeholder="搜索名称、代码或账户" autocomplete="off">
          <button class="clear-search" data-clear-search="holding-search" title="清空" aria-label="清空搜索">${icon('x')}</button>
        </div>
        <span class="select-wrap">
          <select data-filter-scope="holdings" data-filter-key="category" aria-label="按类别筛选">${options(categoriesPresent, filters.category, { all: '全部类别' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="select-wrap">
          <select data-filter-scope="holdings" data-filter-key="account" aria-label="按账户筛选">${options(accounts, filters.account, { all: '全部账户' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="holdings-count">${assets.length} 条</span>
      </section>
      <section class="card table-card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>名称 / 代码</th><th>类别</th><th>账户</th>
              <th class="r">成本</th><th class="r">市值</th><th class="r">盈亏</th><th class="r">占比</th><th>状态</th><th></th>
            </tr></thead>
            <tbody id="holdings-body">${rows}</tbody>
          </table>
        </div>
        <div id="holdings-filter-empty" class="filter-empty" hidden>没有符合筛选条件的持仓。</div>
      </section>
      <p class="footnote">盈亏 = 当前市值 − 投入成本；红涨绿跌，仅为本地记账口径。</p>
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
      const matchCategory = filters.category === '全部' || row.dataset.category === filters.category;
      const matchAccount = filters.account === '全部' || row.dataset.account === filters.account;
      const show = matchQuery && matchCategory && matchAccount;
      row.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $('#holdings-filter-empty');
    if (empty) empty.hidden = visible !== 0;
    const count = $('#holdings-count');
    if (count) count.textContent = `${visible} / ${state.data.assets.length} 条`;
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
      title: '操作记录',
      subtitle: `${state.data.trades.length} 笔交易　·　${state.data.reviews.length} 篇复盘　·　300 计划已完成 ${Math.min(100, Math.round(progress300() * 100))}%`,
      actions: `
        <button class="btn btn-secondary" data-action="export-trades">${icon('download')}导出 CSV</button>
        <button class="btn btn-primary" data-action="new-trade">${icon('plus')}记一笔</button>
      `
    });

    if (!trades.length) {
      return head + emptyCard({
        iconName: 'swap',
        title: '还没有操作记录',
        message: '买入、卖出、定投、转换、分红都可以记。重点不是流水，而是当时为什么这么做。',
        action: 'new-trade',
        cta: '记下第一笔',
        hint: '在买入前，先写 300 次。'
      });
    }

    const rows = trades.map((trade) => {
      const search = [trade.name, trade.code, trade.account, trade.action, trade.reason, trade.review, trade.lesson, trade.market].join(' ').toLowerCase();
      const pnl = trade.realizedPnL;
      const planTone = trade.followedPlan === '是' ? 'loss' : trade.followedPlan === '否' ? 'gain' : 'neutral';
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
              <button class="icon-btn" data-action="edit-trade" data-id="${esc(trade.id)}" title="编辑" aria-label="编辑交易">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-trade" data-id="${esc(trade.id)}" title="删除" aria-label="删除交易">${icon('trash')}</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="trade-search" data-filter-scope="trades" data-filter-key="q" value="${esc(filters.q)}" placeholder="搜索名称、理由或复盘" autocomplete="off">
          <button class="clear-search" data-clear-search="trade-search" title="清空" aria-label="清空搜索">${icon('x')}</button>
        </div>
        <span class="select-wrap">
          <select data-filter-scope="trades" data-filter-key="action" aria-label="按动作筛选">${options(actionsPresent, filters.action, { all: '全部动作' })}</select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="select-wrap">
          <select data-filter-scope="trades" data-filter-key="month" aria-label="按月份筛选">
            <option value="全部" ${filters.month === '全部' ? 'selected' : ''}>全部月份</option>
            ${months.map((month) => {
              const [year, m] = month.split('-');
              return `<option value="${esc(month)}" ${filters.month === month ? 'selected' : ''}>${year}年${Number(m)}月</option>`;
            }).join('')}
          </select>
          ${icon('chevron', 'icon chev')}
        </span>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="trades-count">${trades.length} 笔</span>
      </section>
      <section class="card table-card">
        <div class="table-wrap">
          <table>
            <thead><tr>
              <th>日期</th><th>名称 / 代码</th><th>动作</th><th class="r">金额</th><th class="r">已实现盈亏</th><th>复盘</th><th></th>
            </tr></thead>
            <tbody id="trades-body">${rows}</tbody>
          </table>
        </div>
        <div id="trades-filter-empty" class="filter-empty" hidden>没有符合筛选条件的操作记录。</div>
      </section>
      <p class="footnote">点击铅笔补上当时的理由、情绪和事后复盘。记录会实时保存。</p>
    `;
  }

  function moodLabelText(value) {
    if (!value) return '未记录心情';
    const found = MOODS.find((item) => item.label === value);
    if (found) return `心情 ${found.label}`;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 1 && numeric <= 5) return `心情 ${moodLabel(numeric)}`;
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
        && (filters.action === '全部' || row.dataset.action === filters.action)
        && (filters.month === '全部' || row.dataset.month === filters.month);
      row.hidden = !show;
      if (show) visible += 1;
    });
    const empty = $('#trades-filter-empty');
    if (empty) empty.hidden = visible !== 0;
    const count = $('#trades-count');
    if (count) count.textContent = `${visible} / ${state.data.trades.length} 笔`;
    const clear = $('[data-clear-search="trade-search"]');
    if (clear) clear.hidden = !filters.q;
  }

  // ---------- reviews ----------

  function renderReviews() {
    const reviews = sortedReviews();
    const filters = state.filters.reviews;
    const head = pageHead({
      title: '每日复盘',
      subtitle: `${state.data.reviews.length} 篇　·　交易 + 复盘共同计入 300 记录　·　目前 ${recordCount()} / 300`,
      actions: `<button class="btn btn-primary" data-action="review-today">${icon('plus')}写今日复盘</button>`
    });

    if (!reviews.length) {
      return head + emptyCard({
        iconName: 'book',
        title: '今天写下第一句就够',
        message: '市场怎么样、你做了什么、下一步只做哪一件事。三到五行，不用写成作文。',
        action: 'review-today',
        cta: '写今日复盘',
        hint: '风格不是想出来的，是记出来的。'
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
        field('触发', review.trigger),
        field('市场', review.market),
        field('操作', review.operations, true),
        field('做得对', review.didRight),
        field('做得不对', review.didWrong)
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
                ${pill(`心情 · ${moodLabel(review.mood)}`, tone)}
                <h3>${esc(review.trigger || '当日记录')}</h3>
              </div>
              <p>${fullDate(review.date)}${review.market ? `　·　${esc(review.market.slice(0, 80))}` : ''}</p>
            </div>
            <div class="review-card-actions">
              <button class="icon-btn" data-action="edit-review" data-id="${esc(review.id)}" title="编辑" aria-label="编辑复盘">${icon('edit')}</button>
              <button class="icon-btn danger" data-action="delete-review" data-id="${esc(review.id)}" title="删除" aria-label="删除复盘">${icon('trash')}</button>
            </div>
          </div>
          <div class="review-grid">
            ${fields}
            <div class="review-field review-next span2">
              <label>下一步只做哪一件事</label>
              <p class="${review.nextPlan ? '' : 'empty'}">${esc(review.nextPlan || '还没有写下一步。')}</p>
            </div>
          </div>
        </article>
      `;
    }).join('');

    return head + `
      <section class="toolbar">
        <div class="search-box">
          ${icon('search')}
          <input id="review-search" data-filter-scope="reviews" data-filter-key="q" value="${esc(filters.q)}" placeholder="搜索触发、操作或教训" autocomplete="off">
          <button class="clear-search" data-clear-search="review-search" title="清空" aria-label="清空搜索">${icon('x')}</button>
        </div>
        <span class="toolbar-spacer"></span>
        <span class="toolbar-count" id="reviews-count">${reviews.length} 篇</span>
      </section>
      <section class="review-list" id="review-list">${cards}</section>
      <div id="reviews-filter-empty" class="card filter-empty" hidden>没有找到相关的复盘。</div>
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
    if (count) count.textContent = `${visible} / ${state.data.reviews.length} 篇`;
    const clear = $('[data-clear-search="review-search"]');
    if (clear) clear.hidden = !query;
  }

  // ---------- plans ----------

  function planCard(plan) {
    const statusTone = plan.status === '进行中' ? 'loss' : plan.status === '资金归集' ? 'gold' : 'neutral';
    const metaStart = plan.startDate ? shortDate(plan.startDate) : '未填写';
    return `
      <article class="card plan-card">
        <div class="plan-card-top">
          <div style="flex:1;min-width:0">
            <div class="plan-platform">${esc(plan.platform)}</div>
            <div class="plan-name">${esc(plan.name)}</div>
          </div>
          ${pill(plan.status, statusTone)}
          <button class="icon-btn" data-action="edit-plan" data-id="${esc(plan.id)}" title="编辑" aria-label="编辑计划">${icon('edit')}</button>
        </div>
        <div class="plan-amount">
          <strong>${plan.amount == null ? '—' : money(plan.amount)}</strong>
          <span>${plan.amount == null ? '未填写金额' : `/ ${esc(plan.frequency)}`}</span>
        </div>
        <div class="plan-meta">
          <div><span>扣款日</span><b>${esc(plan.debitDay || '—')}</b></div>
          <div><span>开始</span><b>${metaStart}</b></div>
          <div><span>代码</span><b>${esc(plan.code || '—')}</b></div>
        </div>
        <div class="plan-card-foot">
          <span class="plan-note">${esc(plan.note || '没有备注')}</span>
          <button class="icon-btn danger" data-action="delete-plan" data-id="${esc(plan.id)}" title="删除" aria-label="删除计划">${icon('trash')}</button>
        </div>
      </article>
    `;
  }

  function renderPlans() {
    const plans = state.data.plans;
    const head = pageHead({
      title: '定投计划',
      subtitle: `${activePlans().length} 个进行中　·　每月估算 ${money(monthlyInvesting())} 元　·　金额以实际扣款为准`,
      actions: `<button class="btn btn-primary" data-action="new-plan">${icon('plus')}新增计划</button>`
    });

    if (!plans.length) {
      return head + emptyCard({
        iconName: 'calendar',
        title: '还没有定投计划',
        message: '把频率、金额和扣款日写下来，市场波动时就不容易临时改变主意。',
        action: 'new-plan',
        cta: '新增第一个计划'
      });
    }

    const running = plans.filter((plan) => plan.status === '进行中' && !isCashPool(plan));
    const pools = plans.filter(isCashPool);
    const resting = plans.filter((plan) => plan.status !== '进行中' && !isCashPool(plan));
    const section = (title, subtitle, items) => items.length ? `
      <section class="plan-section">
        <div class="plan-section-head"><h2>${title}</h2><span>${subtitle}</span></div>
        <div class="plan-grid">${items.map(planCard).join('')}</div>
      </section>
    ` : '';

    return head + `
      <section class="card summary-band">
        <div class="summary-band-item"><small>每月定投估算</small><strong>${money(monthlyInvesting())}</strong></div>
        <div class="summary-band-item"><small>进行中计划</small><strong>${activePlans().length} 个</strong></div>
        <div class="summary-band-item"><small>资金归集</small><strong>${pools.length ? money(pools.reduce((sum, plan) => sum + finite(plan.amount), 0)) : '—'}</strong></div>
        <div class="summary-band-item"><small>已暂停 / 结束</small><strong>${resting.length} 个</strong></div>
      </section>
      ${section('进行中', '按节奏执行，不追涨杀跌', running)}
      ${section('资金归集', '先把备用金放好', pools)}
      ${section('已暂停 / 已结束', '保留记录，也是经验', resting)}
    `;
  }

  // ---------- data ----------

  function recordHero() {
    return `
      <section class="card record-hero">
        <div class="big">${recordCount()}<small> / 300</small></div>
        <div class="record-hero-copy">
          <strong>300 记录计划 · ${esc(stage(recordCount()))}</strong>
          <div class="bar"><i style="width:${Math.max(recordCount() > 0 ? 1.5 : 0, progress300() * 100)}%"></i></div>
          <span>${state.data.trades.length} 笔交易 + ${state.data.reviews.length} 篇复盘。记录不是打卡，是把冲动和判断分开。</span>
        </div>
        <div class="quote"><b>在买入前，先写 300 次。</b>风格不是想出来的，是记出来的。</div>
      </section>
    `;
  }

  function renderData() {
    const total = totals();
    const modeText = state.mode === 'file' ? '本地文件（可交给 agent）' : '浏览器本地存储';
    const storagePath = state.mode === 'file'
      ? state.dataFile
      : 'localStorage · koi300.data.v1';
    const agentPrompt = state.mode === 'file'
      ? `请先备份 ${state.dataFile}，再读取并修改我的投资复盘数据。\n保持 schemaVersion=1、字段名和 UUID 不变；日期用 YYYY-MM-DD。\n修改后写回同一路径，应用会在几秒内自动刷新。不要上传或提交到公开仓库。`
      : '请先启动本地文件模式（start-mac.command 或 start-windows.bat），再读取 data/portfolio.json。修改前先备份，保持 schemaVersion=1 与字段名不变。不要上传或提交到公开仓库。';

    const head = pageHead({
      title: '数据与导出',
      subtitle: '随时带走，随时接管。这个应用没有账号，也没有云端。',
      actions: `
        <button class="btn btn-secondary" data-action="import-json">${icon('upload')}导入 JSON</button>
        <button class="btn btn-primary" data-action="export-json">${icon('download')}导出完整备份</button>
      `
    });

    return head + recordHero() + `
      <section class="data-grid">
        <div class="data-stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${icon('database')}数据概况</div></div>
            <div class="kv-list">
              <div class="kv"><span>持仓</span><b>${state.data.assets.length} 条</b></div>
              <div class="kv"><span>交易</span><b>${state.data.trades.length} 笔</b></div>
              <div class="kv"><span>每日复盘</span><b>${state.data.reviews.length} 篇</b></div>
              <div class="kv"><span>定投计划</span><b>${state.data.plans.length} 个</b></div>
              <div class="kv"><span>净值快照</span><b>${state.data.snapshots.length} 个</b></div>
              <div class="kv"><span>总成本 / 总市值</span><b>${money(total.cost)} / ${money(total.value)}</b></div>
              <div class="kv"><span>最后修改</span><b>${esc(dateTimeText(state.data.lastModified))}</b></div>
            </div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('download')}导出</div></div>
            <div class="action-list">
              <div class="action-row">
                <span class="action-icon">${icon('database')}</span>
                <div class="action-copy"><b>完整 JSON 备份</b><span>含持仓、交易、复盘、计划、净值历史，可重新导入</span></div>
                <button class="btn btn-secondary sm" data-action="export-json">导出</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('wallet')}</span>
                <div class="action-copy"><b>持仓 CSV</b><span>Excel / Numbers 可直接打开，带 UTF-8 BOM</span></div>
                <button class="btn btn-secondary sm" data-action="export-holdings">导出</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('swap')}</span>
                <div class="action-copy"><b>交易 CSV</b><span>包含理由、情绪、是否按计划与复盘</span></div>
                <button class="btn btn-secondary sm" data-action="export-trades">导出</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('book')}</span>
                <div class="action-copy"><b>每日复盘 CSV</b><span>按日期导出全部复盘字段</span></div>
                <button class="btn btn-secondary sm" data-action="export-reviews">导出</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('calendar')}</span>
                <div class="action-copy"><b>定投计划 CSV</b><span>平台、频率、扣款日与状态</span></div>
                <button class="btn btn-secondary sm" data-action="export-plans">导出</button>
              </div>
              ${state.mode === 'file' ? `
              <div class="action-row">
                <span class="action-icon">${icon('folder')}</span>
                <div class="action-copy"><b>立即在本机备份一份</b><span>写入 data/backups，保留最近 80 个版本</span></div>
                <button class="btn btn-secondary sm" data-action="backup-now">备份</button>
              </div>` : ''}
            </div>
            <div class="divider"></div>
            <div class="hint">${icon('info')}<span>导入会覆盖当前数据。系统会先自动导出一份当前备份，再执行导入。</span></div>
          </section>

          <section class="card">
            <div class="card-head">
              <div class="card-title">${icon('chart')}示例与清理</div>
            </div>
            <div class="action-list">
              <div class="action-row">
                <span class="action-icon">${icon('grid')}</span>
                <div class="action-copy"><b>载入虚构示例</b><span>用 7 条持仓、6 笔交易、4 篇复盘展示完整界面</span></div>
                <button class="btn btn-secondary sm" data-action="load-sample">载入</button>
              </div>
              <div class="action-row">
                <span class="action-icon">${icon('trash')}</span>
                <div class="action-copy"><b>清除本机数据</b><span>清除前自动备份；不会删除其他文件</span></div>
                <button class="btn btn-danger sm" data-action="clear-data">清除</button>
              </div>
            </div>
          </section>
        </div>

        <div class="data-stack">
          <section class="card">
            <div class="card-head"><div class="card-title">${icon('lock')}本机存储</div><span class="mode-pill"><span class="dot"></span>${esc(modeText)}</span></div>
            <div class="kv-list">
              <div class="kv"><span>数据位置</span><b class="mono-path">${esc(storagePath || '—')}</b></div>
              <div class="kv"><span>保存方式</span><b>${state.mode === 'file' ? '修改后自动写入 JSON 文件' : '写入当前浏览器'}</b></div>
              <div class="kv"><span>网络上传</span><b>从不</b></div>
              <div class="kv"><span>账户 / 登录</span><b>不需要</b></div>
              <div class="kv"><span>主题</span><b>${esc((THEMES.find((theme) => theme.id === readTheme()) || THEMES[0]).label)}</b></div>
            </div>
            ${state.mode === 'browser' ? `
              <div class="divider"></div>
              <button class="btn btn-secondary sm" data-action="retry-file">连接本地文件模式</button>
              <div class="hint" style="margin-top:9px">${icon('info')}<span>本地文件模式需要启动脚本：Mac 双击 <b>start-mac.command</b>，Windows 双击 <b>start-windows.bat</b>。</span></div>
            ` : `
              <div class="divider"></div>
              <button class="btn btn-secondary sm" data-action="reload-file">从文件重新读取</button>
            `}
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('copy')}交给 agent</div></div>
            <p class="small muted" style="margin:0 0 11px;line-height:1.7">数据是普通 JSON。agent 可以直接编辑文件，也可以调用本机 API；应用会检测外部修改并刷新。</p>
            <div class="code-box">
              <code>${esc(agentPrompt)}</code>
              <button class="icon-btn" data-action="copy-agent" title="复制给 agent 的说明" aria-label="复制给 agent 的说明">${icon('copy')}</button>
            </div>
            <div class="divider"></div>
            <div class="kv-list">
              <div class="kv"><span>读</span><b class="mono-path">GET /api/data</b></div>
              <div class="kv"><span>写</span><b class="mono-path">PUT /api/data</b></div>
              <div class="kv"><span>备份</span><b class="mono-path">POST /api/backup</b></div>
            </div>
            <div class="hint" style="margin-top:9px">${icon('lock')}<span>服务只监听 127.0.0.1，拒绝跨站写入。不要把这些接口转发到公网。</span></div>
          </section>

          <section class="card">
            <div class="card-head"><div class="card-title">${icon('info')}说明</div></div>
            <p class="small muted" style="margin:0;line-height:1.75">300 是这个项目给自己定的练习量，不是收益承诺，也不是名人名言。它只提醒你：在按下买入之前，先留下判断。</p>
            <div class="divider"></div>
            <p class="tiny-text faint" style="margin:0;line-height:1.7">本地数据不会自动加密。请保护电脑登录密码，定期导出备份；不要把带真实数据的 JSON 提交到 GitHub。</p>
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

  function modalShell({ title, subtitle = '', body, submitLabel = '保存', showDelete = false, narrow = false }) {
    return `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <form id="editor-form" novalidate>
            <div class="modal-head">
              <div class="modal-head-copy">
                <h2 id="modal-title">${esc(title)}</h2>
                ${subtitle ? `<p>${esc(subtitle)}</p>` : ''}
              </div>
              <button type="button" class="modal-close" data-close-modal aria-label="关闭">${icon('x')}</button>
            </div>
            <div class="modal-body">${body}</div>
            <div class="modal-foot">
              ${showDelete ? '<button type="button" class="delete-link" id="modal-delete">删除</button>' : ''}
              <span class="spacer"></span>
              <button type="button" class="btn btn-secondary" data-close-modal>取消</button>
              <button type="submit" class="btn btn-primary">${esc(submitLabel)}</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function openConfirm({ title, message, confirmLabel = '确认', danger = true, onConfirm, secondaryLabel = '' }) {
    const root = $('#modal-root');
    confirmAction = onConfirm;
    root.innerHTML = `
      <div class="modal-backdrop" data-modal-backdrop>
        <div class="modal narrow" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div class="modal-head">
            <div class="modal-head-copy">
              <h2 id="confirm-title">${esc(title)}</h2>
            </div>
            <button type="button" class="modal-close" data-close-modal aria-label="关闭">${icon('x')}</button>
          </div>
          <div class="modal-body"><div class="confirm-copy">${message}</div></div>
          <div class="confirm-actions">
            <button type="button" class="btn btn-secondary" data-close-modal>取消</button>
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
      category: '场外基金',
      code: '',
      name: '',
      cost: '',
      value: '',
      units: '',
      costPrice: '',
      price: '',
      note: '',
      nextStep: '',
      dataStatus: '手工填写'
    };
    const accountNames = accountSummaries().map((entry) => entry.name);
    const body = `
      <div class="form-section">
        <p class="form-section-title">基本信息</p>
        <div class="form-grid">
          ${fieldInput({ label: '名称', name: 'name', value: item.name, placeholder: '例如：沪深300指数基金', required: true })}
          ${fieldInput({ label: '代码', name: 'code', value: item.code, placeholder: '基金 / 股票代码' })}
          ${fieldInput({ label: '账户', name: 'account', value: item.account, placeholder: '例如：长期账户', required: true, list: 'account-list' })}
          ${fieldSelect({ label: '类别', name: 'category', value: item.category, choices: CATEGORIES })}
          <datalist id="account-list">${accountNames.map((name) => `<option value="${esc(name)}"></option>`).join('')}</datalist>
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">金额与份额</p>
        <div class="form-grid">
          ${fieldInput({ label: '投入成本', name: 'cost', value: item.cost, type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
          ${fieldInput({ label: '当前市值', name: 'value', value: item.value, type: 'number', min: 0, step: '0.01', placeholder: '0.00' })}
          ${fieldInput({ label: '持有份额', name: 'units', value: item.units ?? '', type: 'number', min: 0, step: '0.0001', placeholder: '可选' })}
          ${fieldInput({ label: '成本价', name: 'costPrice', value: item.costPrice ?? '', type: 'number', min: 0, step: '0.0001', placeholder: '可选' })}
          ${fieldInput({ label: '现价', name: 'price', value: item.price ?? '', type: 'number', min: 0, step: '0.0001', placeholder: '可选' })}
          ${fieldSelect({ label: '数据状态', name: 'dataStatus', value: item.dataStatus, choices: DATA_STATUSES })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">备注</p>
        <div class="form-grid">
          ${fieldTextarea({ label: '备注', name: 'note', value: item.note, placeholder: '这笔持仓的用途、买入逻辑或需要留意的事', span: true })}
          ${fieldTextarea({ label: '下一步', name: 'nextStep', value: item.nextStep, placeholder: '例如：下月发薪后检查是否需要再平衡', span: true, rows: 2 })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? '编辑持仓' : '新增持仓',
      subtitle: '成本与市值按本机记录填写，不自动抓取行情。',
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
        if (!name) return failField(form, 'name', '请填写名称');
        if (!account) return failField(form, 'account', '请填写账户');
        const numbers = {};
        for (const key of ['cost', 'value', 'units', 'costPrice', 'price']) {
          const raw = form.elements[key].value.trim();
          if (raw === '') { numbers[key] = key === 'cost' || key === 'value' ? 0 : null; continue; }
          const value = Number(raw);
          if (!Number.isFinite(value) || value < 0) return failField(form, key, '请输入不小于 0 的数字');
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
        toast(editing ? '持仓已更新' : '持仓已添加', `${name} · ${money(next.value)} 元`);
        return true;
      }
    });
  }

  function openTradeEditor(trade = null) {
    const editing = Boolean(trade);
    const item = trade || {
      date: today(),
      account: '',
      category: '场外基金',
      code: '',
      name: '',
      action: '买入',
      amount: '',
      shares: '',
      price: '',
      fee: '',
      realizedPnL: '',
      reason: '',
      mood: '',
      market: '',
      review: '',
      followedPlan: '待复盘',
      lesson: ''
    };
    const assetOptions = state.data.assets.map((asset) =>
      `<option value="${esc(asset.id)}">${esc(asset.name)}${asset.account ? ` · ${esc(asset.account)}` : ''}</option>`
    ).join('');
    const body = `
      <div class="form-section">
        <p class="form-section-title">交易</p>
        <div class="form-grid">
          ${assetOptions ? `
          <div class="field span2">
            <label for="f-link">从持仓带入（可选）</label>
            <select id="f-link" name="link"><option value="">手动填写</option>${assetOptions}</select>
            <span class="help">只会带入名称、代码、类别和账户，不会改动金额。</span>
          </div>` : ''}
          ${fieldInput({ label: '日期', name: 'date', value: item.date, type: 'date', required: true, max: today() })}
          ${fieldSelect({ label: '动作', name: 'action', value: item.action, choices: ACTIONS })}
          ${fieldInput({ label: '名称', name: 'name', value: item.name, placeholder: '基金或股票名称', required: true })}
          ${fieldInput({ label: '代码', name: 'code', value: item.code, placeholder: '可选' })}
          ${fieldInput({ label: '账户', name: 'account', value: item.account, placeholder: '例如：长期账户', list: 'trade-account-list' })}
          ${fieldSelect({ label: '类别', name: 'category', value: item.category, choices: CATEGORIES })}
          <datalist id="trade-account-list">${accountSummaries().map((entry) => `<option value="${esc(entry.name)}"></option>`).join('')}</datalist>
          ${fieldInput({ label: '金额', name: 'amount', value: item.amount ?? '', type: 'number', min: 0, step: '0.01', placeholder: '可选' })}
          ${fieldInput({ label: '份额', name: 'shares', value: item.shares ?? '', type: 'number', min: 0, step: '0.0001', placeholder: '可选' })}
          ${fieldInput({ label: '成交价', name: 'price', value: item.price ?? '', type: 'number', min: 0, step: '0.0001', placeholder: '可选' })}
          ${fieldInput({ label: '费用', name: 'fee', value: item.fee ?? '', type: 'number', min: 0, step: '0.01', placeholder: '可选' })}
          ${fieldInput({ label: '已实现盈亏', name: 'realizedPnL', value: item.realizedPnL ?? '', type: 'number', step: '0.01', placeholder: '卖出 / 分红时填写，可为负' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">当时的想法</p>
        <div class="form-grid">
          ${fieldTextarea({ label: '为什么做这笔操作', name: 'reason', value: item.reason, placeholder: '触发是什么？是计划内的动作，还是临时起意？', span: true })}
          ${fieldInput({ label: '情绪', name: 'mood', value: item.mood, placeholder: '例如：平静 / 急躁 / 贪心 / 害怕' })}
          ${fieldInput({ label: '市场环境', name: 'market', value: item.market, placeholder: '例如：连续下跌第三周' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">事后复盘</p>
        <div class="form-grid">
          ${fieldTextarea({ label: '复盘', name: 'review', value: item.review, placeholder: '如果再遇到一次，会怎么做？', span: true })}
          ${fieldTextarea({ label: '教训', name: 'lesson', value: item.lesson, placeholder: '一句话即可', span: true, rows: 2 })}
          ${fieldSelect({ label: '是否按计划', name: 'followedPlan', value: item.followedPlan, choices: ['待复盘', '是', '否', '部分按计划'] })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? '编辑操作' : '记一笔操作',
      subtitle: '金额与日期按实际成交填写；复盘可以以后再补。',
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
        if (!date) return failField(form, 'date', '请选择日期');
        if (date > today()) return failField(form, 'date', '日期不能晚于今天');
        const name = form.elements.name.value.trim();
        if (!name) return failField(form, 'name', '请填写名称');
        const numbers = {};
        for (const key of ['amount', 'shares', 'price', 'fee', 'realizedPnL']) {
          const raw = form.elements[key].value.trim();
          if (raw === '') { numbers[key] = null; continue; }
          const value = Number(raw);
          if (!Number.isFinite(value)) return failField(form, key, '请输入有效数字');
          if (key !== 'realizedPnL' && value < 0) return failField(form, key, '不能小于 0');
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
        toast(editing ? '操作已更新' : '操作已记录', `${name} · ${date}`);
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
        <p class="form-section-title">今天的状态</p>
        <div class="form-grid">
          ${fieldInput({ label: '日期', name: 'date', value: item.date, type: 'date', required: true, max: today() })}
          <div class="field">
            <label>心情</label>
            <div class="mood-picker" data-mood-picker>
              <input type="hidden" name="mood" value="${item.mood || 3}">
              ${MOODS.map((mood) => `<button type="button" class="mood-choice ${Number(item.mood) === mood.value ? 'active' : ''}" data-mood="${mood.value}">${mood.label}</button>`).join('')}
            </div>
            <span class="help">不评价好坏，只记录当时的状态。</span>
          </div>
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">事实</p>
        <div class="form-grid">
          ${fieldInput({ label: '触发', name: 'trigger', value: item.trigger, placeholder: '今天为什么打开账户？', span: true })}
          ${fieldInput({ label: '市场', name: 'market', value: item.market, placeholder: '指数、板块或消息面发生了什么' })}
          ${fieldInput({ label: '操作', name: 'operations', value: item.operations, placeholder: '买了、卖了，或者什么都没做' })}
        </div>
      </div>
      <div class="form-section">
        <p class="form-section-title">复盘</p>
        <div class="form-grid">
          ${fieldTextarea({ label: '做得对', name: 'didRight', value: item.didRight, placeholder: '哪件事符合自己的计划？' })}
          ${fieldTextarea({ label: '做得不对', name: 'didWrong', value: item.didWrong, placeholder: '哪里被情绪带走了？' })}
          ${fieldTextarea({ label: '下一步只做哪一件事', name: 'nextPlan', value: item.nextPlan, placeholder: '越具体越好，例如：明天不看盘，只检查定投是否扣款成功。', span: true })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? '编辑复盘' : '写今日复盘',
      subtitle: '三到五行就够。先写事实，再写判断。',
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
        if (!date) return failField(form, 'date', '请选择日期');
        if (date > today()) return failField(form, 'date', '日期不能晚于今天');
        const duplicate = state.data.reviews.find((row) => row.date === date && row.id !== item.id);
        if (duplicate) return failField(form, 'date', '这一天已经有复盘了，改日期或直接编辑那一篇');
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
        toast(editing ? '复盘已更新' : '复盘已保存', fullDate(date));
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
      category: '场外基金',
      frequency: '每月',
      amount: '',
      debitDay: '',
      startDate: '',
      status: '进行中',
      note: ''
    };
    const body = `
      <div class="form-section">
        <p class="form-section-title">计划</p>
        <div class="form-grid">
          ${fieldInput({ label: '平台', name: 'platform', value: item.platform, placeholder: '例如：支付宝 / 券商 / 银行', required: true })}
          ${fieldInput({ label: '名称', name: 'name', value: item.name, placeholder: '基金或标的名称', required: true })}
          ${fieldInput({ label: '代码', name: 'code', value: item.code === '—' ? '' : item.code, placeholder: '可选' })}
          ${fieldSelect({ label: '类别', name: 'category', value: item.category, choices: CATEGORIES })}
          ${fieldSelect({ label: '频率', name: 'frequency', value: item.frequency, choices: FREQUENCIES })}
          ${fieldInput({ label: '每期金额', name: 'amount', value: item.amount ?? '', type: 'number', min: 0, step: '0.01', placeholder: '可选' })}
          ${fieldInput({ label: '扣款日', name: 'debitDay', value: item.debitDay, placeholder: '例如：每月 8 日 / 每周一' })}
          ${fieldInput({ label: '开始日期', name: 'startDate', value: item.startDate, type: 'date' })}
          ${fieldSelect({ label: '状态', name: 'status', value: item.status, choices: PLAN_STATUSES })}
          ${fieldTextarea({ label: '备注', name: 'note', value: item.note, placeholder: '为什么开始、什么情况下暂停', span: true, rows: 2 })}
        </div>
      </div>
    `;
    showModal(modalShell({
      title: editing ? '编辑定投计划' : '新增定投计划',
      subtitle: '金额只做估算，实际以平台扣款为准。',
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
        if (!platform) return failField(form, 'platform', '请填写平台');
        if (!name) return failField(form, 'name', '请填写名称');
        const rawAmount = form.elements.amount.value.trim();
        let amount = null;
        if (rawAmount !== '') {
          amount = Number(rawAmount);
          if (!Number.isFinite(amount) || amount < 0) return failField(form, 'amount', '请输入不小于 0 的数字');
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
        toast(editing ? '计划已更新' : '计划已添加', `${name} · ${next.frequency}`);
        return true;
      }
    });
  }

  function confirmDeleteAsset(asset) {
    openConfirm({
      title: '删除这条持仓？',
      message: `将删除 <b>${esc(asset.name)}</b>（${money(asset.value)} 元）及其备注。交易记录不会自动删除。删除后无法撤销。`,
      confirmLabel: '删除持仓',
      onConfirm() {
        state.data.assets = state.data.assets.filter((item) => item.id !== asset.id);
        refreshTodaySnapshot();
        render();
        persist();
        toast('持仓已删除', asset.name);
      }
    });
  }

  function confirmDeleteTrade(trade) {
    openConfirm({
      title: '删除这笔操作？',
      message: `将删除 <b>${esc(trade.name)}</b> 在 ${esc(trade.date)} 的${esc(trade.action)}记录，包括当时的复盘。删除后无法撤销。`,
      confirmLabel: '删除操作',
      onConfirm() {
        state.data.trades = state.data.trades.filter((item) => item.id !== trade.id);
        render();
        persist();
        toast('操作已删除', trade.name);
      }
    });
  }

  function confirmDeleteReview(review) {
    openConfirm({
      title: '删除这篇复盘？',
      message: `将删除 <b>${fullDate(review.date)}</b> 的复盘记录。删除后无法撤销。`,
      confirmLabel: '删除复盘',
      onConfirm() {
        state.data.reviews = state.data.reviews.filter((item) => item.id !== review.id);
        render();
        persist();
        toast('复盘已删除', fullDate(review.date));
      }
    });
  }

  function confirmDeletePlan(plan) {
    openConfirm({
      title: '删除这个定投计划？',
      message: `将删除 <b>${esc(plan.name)}</b> 的计划。已经发生的交易记录不会受影响。`,
      confirmLabel: '删除计划',
      onConfirm() {
        state.data.plans = state.data.plans.filter((item) => item.id !== plan.id);
        render();
        persist();
        toast('计划已删除', plan.name);
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
    download(`koi300-备份-${fileStamp()}.json`, JSON.stringify(state.data, null, 2) + '\n', 'application/json');
    if (!silent) toast('完整备份已导出', 'JSON 文件可在数据页重新导入。');
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
    const head = ['账户', '类别', '代码', '名称', '成本', '市值', '持有份额', '成本价', '现价', '盈亏', '收益率', '备注', '下一步', '数据状态', '更新时间'];
    const rows = state.data.assets.map((asset) => {
      const pnl = finite(asset.value) - finite(asset.cost);
      return [
        asset.account, asset.category, asset.code, asset.name,
        asset.cost.toFixed(2), asset.value.toFixed(2), asset.units ?? '', asset.costPrice ?? '', asset.price ?? '',
        pnl.toFixed(2), finite(asset.cost) === 0 ? '0.00%' : `${(pnl / finite(asset.cost) * 100).toFixed(2)}%`,
        asset.note, asset.nextStep, asset.dataStatus, asset.updatedAt
      ];
    });
    download(`koi300-持仓-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('持仓 CSV 已导出', `${rows.length} 条`);
  }

  function exportTradesCSV() {
    const head = ['日期', '账户', '类别', '代码', '名称', '动作', '金额', '份额', '价格', '费用', '已实现盈亏', '理由', '情绪', '市场', '复盘', '是否按计划', '教训', '创建时间'];
    const rows = sortedTrades().map((trade) => [
      trade.date, trade.account, trade.category, trade.code, trade.name, trade.action,
      trade.amount ?? '', trade.shares ?? '', trade.price ?? '', trade.fee ?? '', trade.realizedPnL ?? '',
      trade.reason, trade.mood, trade.market, trade.review, trade.followedPlan, trade.lesson, trade.createdAt
    ]);
    download(`koi300-交易-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('交易 CSV 已导出', `${rows.length} 笔`);
  }

  function exportReviewsCSV() {
    const head = ['日期', '心情', '触发', '操作', '市场', '做得对', '做得不对', '下一步', '创建时间', '更新时间'];
    const rows = sortedReviews().map((review) => [
      review.date, review.mood, review.trigger, review.operations, review.market,
      review.didRight, review.didWrong, review.nextPlan, review.createdAt, review.updatedAt
    ]);
    download(`koi300-复盘-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('复盘 CSV 已导出', `${rows.length} 篇`);
  }

  function exportPlansCSV() {
    const head = ['平台', '代码', '名称', '类别', '频率', '金额', '扣款日', '开始日期', '状态', '备注', '每月估算'];
    const rows = state.data.plans.map((plan) => [
      plan.platform, plan.code, plan.name, plan.category, plan.frequency, plan.amount ?? '',
      plan.debitDay, plan.startDate, plan.status, plan.note, monthlyEstimate(plan).toFixed(2)
    ]);
    download(`koi300-定投计划-${fileStamp()}.csv`, csvFile([head, ...rows]), 'text/csv;charset=utf-8');
    toast('计划 CSV 已导出', `${rows.length} 个`);
  }

  async function backupNow(showToast = true) {
    if (state.mode === 'file') {
      try {
        const response = await fetch('/api/backup', { method: 'POST' });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || '备份失败');
        if (showToast) toast('已备份到本机', `data/backups/${result.name}`);
        return true;
      } catch (error) {
        if (showToast) toast('本机备份失败', error.message, 'error');
        return false;
      }
    }
    exportJSON(!showToast);
    return true;
  }

  function protectBeforeReplace() {
    exportJSON(true);
    if (state.mode === 'file') {
      fetch('/api/backup', { method: 'POST' }).catch(() => {});
    }
  }

  function handleImportFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = JSON.parse(String(reader.result || ''));
        const imported = normalizeData(raw);
        const counts = `${imported.assets.length} 条持仓、${imported.trades.length} 笔交易、${imported.reviews.length} 篇复盘、${imported.plans.length} 个计划`;
        openConfirm({
          title: '导入并覆盖当前数据？',
          message: `将用备份文件替换当前全部数据（${counts}）。当前数据会先自动导出备份，再执行覆盖。`,
          confirmLabel: '导入并覆盖',
          danger: false,
          onConfirm() {
            protectBeforeReplace();
            state.data = imported;
            state.section = 'overview';
            if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
            render();
            persist();
            toast('导入完成', counts);
          }
        });
      } catch (error) {
        toast('导入失败', error.message || '文件不是有效的复盘 JSON。', 'error');
      }
    };
    reader.onerror = () => toast('导入失败', '无法读取这个文件。', 'error');
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
      ['长期账户', '场外基金', 'DEMO01', '示例·宽基指数', 48000, 51260.5, 32680.2, 1.468, 1.5685, '每月定投，不在下跌时停扣。', '下月复盘是否继续维持 2000 元。', '手工填写'],
      ['长期账户', '场外基金', 'DEMO02', '示例·全球科技', 18000, 21450.8, 10240, 1.758, 2.0948, '只用长期不用的钱，控制在总仓位 15% 以内。', '季度再平衡时检查占比。', '手工填写'],
      ['机动账户', '场内基金', 'DEMO03', '示例·红利低波', 16000, 17012.4, 15200, 1.0526, 1.1192, '波动较小，用来放一部分防守仓位。', '', '手工填写'],
      ['机动账户', '股票', 'DEMO04', '示例·新能源', 12000, 9877.2, 800, 15, 12.3465, '追高买入，作为反面样本保留。', '反弹到成本附近先减半，不补仓。', '待更新'],
      ['长期账户', '黄金', 'DEMO05', '示例·黄金积存', 9000, 10482.6, 18.5, 486.5, 566.6, '对冲极端风险，不超过总资产 10%。', '不因短期上涨加仓。', '手工填写'],
      ['养老账户', '养老金', 'DEMO06', '示例·个人养老金', 24000, 25200, 0, 1, 1.05, '每年额度用满，选择低费率产品。', '年底前检查是否还有额度。', '估算'],
      ['现金账户', '现金', 'DEMO07', '示例·应急现金', 15000, 15000, 0, 1, 1, '六到十二个月生活费，不参与投资。', '', '手工填写']
    ].map((row, index) => ({
      id: uuid(),
      account: row[0], category: row[1], code: row[2], name: row[3],
      cost: row[4], value: row[5], units: row[6], costPrice: row[7], price: row[8],
      note: row[9], nextStep: row[10], dataStatus: row[11],
      updatedAt: iso(0, 16 - index)
    }));
    const trades = [
      {
        date: day(-1), account: '长期账户', category: '场外基金', code: 'DEMO01', name: '示例·宽基指数',
        action: '定投', amount: 2000, shares: 1275.4, price: 1.5685, fee: 0, realizedPnL: null,
        reason: '每月固定扣款，本月下跌，按计划继续。', mood: '平静', market: '宽基连续两周回调。',
        review: '没有因为下跌暂停扣款，符合计划。', followedPlan: '是', lesson: '定投最重要的是不临时改规则。', createdAt: iso(-1)
      },
      {
        date: day(-3), account: '机动账户', category: '股票', code: 'DEMO04', name: '示例·新能源',
        action: '卖出', amount: 2469.3, shares: 200, price: 12.3465, fee: 5, realizedPnL: -530.7,
        reason: '反弹后减掉四分之一仓位，降低单一股票占比。', mood: '有点不舍', market: '板块反弹两天。',
        review: '卖在执行计划里，但仓位还是偏重。', followedPlan: '部分按计划', lesson: '不要用摊平成本代替止损。', createdAt: iso(-3)
      },
      {
        date: day(-7), account: '长期账户', category: '黄金', code: 'DEMO05', name: '示例·黄金积存',
        action: '买入', amount: 300, shares: 0.529, price: 566.6, fee: 0, realizedPnL: null,
        reason: '按固定节奏小额积存，不做方向判断。', mood: '平静', market: '金价高位震荡。',
        review: '金额很小，符合试错定位。', followedPlan: '是', lesson: '', createdAt: iso(-7)
      },
      {
        date: day(-12), account: '长期账户', category: '场外基金', code: 'DEMO02', name: '示例·全球科技',
        action: '定投', amount: 500, shares: 238.7, price: 2.0948, fee: 0, realizedPnL: null,
        reason: '每周定投，自动扣款。', mood: '平静', market: '海外科技板块波动加大。',
        review: '没有手动加仓，保持节奏。', followedPlan: '是', lesson: '波动大时更要降低查看频率。', createdAt: iso(-12)
      },
      {
        date: day(-20), account: '机动账户', category: '场内基金', code: 'DEMO03', name: '示例·红利低波',
        action: '转换', amount: 8000, shares: 7500, price: 1.0667, fee: 8, realizedPnL: null,
        reason: '把一部分成长仓位换成防守仓位。', mood: '略焦虑', market: '市场连续缩量。',
        review: '转换不是基于短期预测，而是仓位再平衡。', followedPlan: '部分按计划', lesson: '先写清楚转换的条件。', createdAt: iso(-20)
      },
      {
        date: day(-30), account: '长期账户', category: '场外基金', code: 'DEMO01', name: '示例·宽基指数',
        action: '分红', amount: 126.4, shares: null, price: null, fee: 0, realizedPnL: 126.4,
        reason: '现金分红到账。', mood: '平静', market: '无特别变化。',
        review: '分红继续留在现金池，等待下一次扣款。', followedPlan: '是', lesson: '', createdAt: iso(-30)
      }
    ].map((trade) => ({ id: uuid(), ...trade }));
    const reviews = [
      {
        date: day(-1), mood: 4, trigger: '定投扣款日，顺便看了一眼账户。',
        operations: '确认宽基定投扣款成功，没有额外操作。',
        market: '连续回调，账户浮亏扩大，但成交量没有明显放大。',
        didRight: '按计划扣款，没有暂停，也没有临时加码。',
        didWrong: '看了三次盘，注意力被分走。',
        nextPlan: '接下来三天不打开交易软件，只保留定投提醒。',
        createdAt: iso(-1), updatedAt: iso(-1)
      },
      {
        date: day(-4), mood: 2, trigger: '新能源反弹，想卖掉又怕卖飞。',
        operations: '挂单先卖 200 股，成交后取消了剩余卖单。',
        market: '板块两天反弹，但个股趋势仍未修复。',
        didRight: '按预设的减仓计划执行了一半。',
        didWrong: '盘中改了一次价格，情绪被分时图带走。',
        nextPlan: '提前写好价格和数量，盘中不再改单。',
        createdAt: iso(-4), updatedAt: iso(-4)
      },
      {
        date: day(-8), mood: 3, trigger: '朋友讨论黄金，担心错过。',
        operations: '只按原计划积存 300 元，没有追加大额。',
        market: '黄金处于高位震荡。',
        didRight: '把“想买”与“计划买”分开了。',
        didWrong: '还是花太多时间看别人的观点。',
        nextPlan: '本周不看黄金相关内容，按扣款日执行。',
        createdAt: iso(-8), updatedAt: iso(-8)
      },
      {
        date: day(-15), mood: 5, trigger: '月度复盘，整理这个月的操作。',
        operations: '没有交易，只检查仓位与现金比例。',
        market: '市场震荡，账户基本持平。',
        didRight: '把交易次数降了下来，留出更多时间做主业。',
        didWrong: '复盘只写了感受，没有写具体数字。',
        nextPlan: '下个月复盘先抄一遍成本、市值与现金。',
        createdAt: iso(-15), updatedAt: iso(-15)
      }
    ].map((review) => ({ id: uuid(), ...review }));
    const plans = [
      { id: uuid(), platform: '示例平台·A', code: 'DEMO01', name: '示例·宽基指数', category: '场外基金', frequency: '每月', amount: 2000, debitDay: '每月 8 日', startDate: day(-180), status: '进行中', note: '发薪后第二天扣款，避免月底没钱。' },
      { id: uuid(), platform: '示例平台·A', code: 'DEMO02', name: '示例·全球科技', category: '场外基金', frequency: '每周', amount: 500, debitDay: '每周一', startDate: day(-120), status: '进行中', note: '小额定投，不因短期涨跌改变。' },
      { id: uuid(), platform: '示例平台·B', code: 'DEMO05', name: '示例·黄金积存', category: '黄金', frequency: '每月', amount: 300, debitDay: '每月 18 日', startDate: day(-90), status: '进行中', note: '仓位上限 10%。' },
      { id: uuid(), platform: '示例平台·B', code: 'DEMO07', name: '示例·现金归集', category: '现金', frequency: '每月', amount: 1500, debitDay: '每月 25 日', startDate: day(-200), status: '资金归集', note: '先把应急金放够，再考虑加仓。' }
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
      title: '载入虚构示例数据？',
      message: '当前数据会先自动导出备份，然后用一套 7 条持仓、6 笔交易、4 篇复盘的示例替换。示例中的名称、代码与金额全部是虚构的。',
      confirmLabel: '载入示例',
      danger: false,
      onConfirm() {
        protectBeforeReplace();
        state.data = normalizeData(sampleData());
        state.section = 'overview';
        if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
        render();
        persist();
        toast('示例数据已载入', '你可以随时在数据页清除，或导入自己的 JSON。');
      }
    });
  }

  function clearData() {
    openConfirm({
      title: '清除本机全部数据？',
      message: '将删除当前持仓、交易、复盘、计划和快照。清除前会先自动导出备份。此操作只影响这个应用的数据，不会删除其他文件。',
      confirmLabel: '清除全部',
      onConfirm() {
        protectBeforeReplace();
        state.data = emptyData();
        state.section = 'overview';
        if (location.hash.slice(1) !== 'overview') location.hash = 'overview';
        render();
        persist();
        toast('本机数据已清除', '备份文件已下载，可在数据页重新导入。');
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
      <button class="toast-close" aria-label="关闭提示">${icon('x', 'icon tiny')}</button>
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
      toast('已复制', '可以直接粘贴给 agent。');
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
        toast('已复制', '可以直接粘贴给 agent。');
      } catch {
        toast('复制失败', '请手动选择文本。', 'error');
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
        fetch('/api/data', { cache: 'no-store' }),
        fetch('/api/status', { cache: 'no-store' })
      ]);
      if (!dataResponse.ok) throw new Error('无法读取数据文件');
      const status = await statusResponse.json();
      state.data = normalizeData(await dataResponse.json());
      state.mtimeMs = status.mtimeMs || 0;
      render();
      toast('已从文件重新读取', state.dataFile);
    } catch (error) {
      toast('读取失败', error.message, 'error');
    }
  }

  function copyAgentPrompt() {
    const prompt = state.mode === 'file'
      ? `请先备份 ${state.dataFile}，再读取并修改我的投资复盘数据。保持 schemaVersion=1、字段名和 UUID 不变；日期用 YYYY-MM-DD。修改后写回同一路径，应用会在几秒内自动刷新。不要上传或提交到公开仓库。`
      : '请先启动本地文件模式（start-mac.command 或 start-windows.bat），再读取 data/portfolio.json。修改前先备份，保持 schemaVersion=1 与字段名不变。不要上传或提交到公开仓库。';
    copyText(prompt);
  }

  // ---------- polling for agent edits ----------

  function startPolling() {
    setInterval(async () => {
      if (state.mode !== 'file' || document.hidden || state.saving) return;
      if ($('#modal-root .modal')) return;
      try {
        const response = await fetch('/api/status', { cache: 'no-store' });
        if (!response.ok) return;
        const status = await response.json();
        if (!status.mtimeMs || status.mtimeMs === state.mtimeMs) return;
        const dataResponse = await fetch('/api/data', { cache: 'no-store' });
        if (!dataResponse.ok) return;
        const next = normalizeData(await dataResponse.json());
        state.data = next;
        state.mtimeMs = status.mtimeMs;
        state.dataFile = status.dataFile || state.dataFile;
        render();
        const now = Date.now();
        if (now - state.lastExternalToast > 8000) {
          state.lastExternalToast = now;
          toast('已同步外部修改', '检测到数据文件被 agent 或其他程序更新。');
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
      const langLink = event.target.closest('[data-lang]');
      if (langLink) {
        event.preventDefault();
        const target = langLink.dataset.lang;
        try { localStorage.setItem('koi300.lang', target); } catch { /* file:// may deny storage */ }
        try {
          document.cookie = `koi300.lang=${target}; path=/; max-age=31536000; SameSite=Lax`;
        } catch { /* cookies may be blocked */ }
        location.href = langLink.getAttribute('href') + location.hash;
        return;
      }
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
    migrateLegacyStorage();
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
      toast('浏览器未允许本地存储', '请使用启动脚本进入本地文件模式，或定期导出 JSON。', 'error');
    }
    if (fileMode) {
      toast('已进入本地文件模式', '数据文件：data/portfolio.json　·　支持 agent 直接修改。');
    }
    startPolling();
  }

  boot();
})();
