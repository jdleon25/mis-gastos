/* Mis Gastos — app de gastos personales.
   Todo se guarda en este dispositivo (localStorage). No hay peticiones a servicios externos. */
'use strict';

(function () {
  // ===================== Datos fijos =====================
  // [id, nombre, ejemplo de ayuda]. El id nunca cambia; es lo que se guarda en cada gasto.
  const CATEGORIES = [
    [1, 'Supermercado y víveres', ''],
    [2, 'Comida fuera', 'almuerzos, comida rápida, delivery'],
    [3, 'Transporte', 'bus, taxi, apps'],
    [4, 'Snacks, café y bebidas', ''],
    [5, 'Gasolina', ''],
    [6, 'Farmacia y medicinas', ''],
    [7, 'Higiene personal', 'champú, jabón, desodorante'],
    [8, 'Cosméticos y maquillaje', ''],
    [9, 'Limpieza y artículos del hogar', ''],
    [10, 'Salidas y entretenimiento', 'cine, bares, conciertos'],
    [11, 'Parqueadero y peajes', ''],
    [12, 'Ropa y calzado', ''],
    [13, 'Bebidas alcohólicas y tabaco', ''],
    [14, 'Arriendo o cuota de vivienda', ''],
    [15, 'Luz', ''],
    [16, 'Agua', ''],
    [17, 'Internet y TV', ''],
    [18, 'Celular', 'plan o recargas'],
    [19, 'Gas', ''],
    [20, 'Suscripciones', 'streaming, música, apps'],
    [21, 'Educación', 'pensión, cursos'],
    [22, 'Gimnasio y deporte', ''],
    [23, 'Pago de deudas', 'préstamos, tarjeta de crédito'],
    [24, 'Ahorro e inversión', ''],
    [25, 'Seguros', 'salud, vehículo, vida'],
    [26, 'Peluquería, barbería y estética', ''],
    [27, 'Consultas médicas y exámenes', ''],
    [28, 'Dentista y óptica', ''],
    [29, 'Mascotas', 'comida, veterinario'],
    [30, 'Regalos y celebraciones', ''],
    [31, 'Mantenimiento del vehículo', ''],
    [32, 'Hijos', 'pañales, útiles, guardería'],
    [33, 'Tecnología y electrónicos', ''],
    [34, 'Hobbies y pasatiempos', ''],
    [35, 'Libros y papelería', ''],
    [36, 'Comisiones bancarias', ''],
    [37, 'Viajes y vacaciones', ''],
    [38, 'Muebles, electrodomésticos y decoración', ''],
    [39, 'Reparaciones del hogar', ''],
    [40, 'Trámites e impuestos', 'matrícula vehicular, predial'],
    [41, 'Donaciones y ayuda a familiares', ''],
    [42, 'Servicio doméstico', ''],
    [43, 'Multas', ''],
    [44, 'Otros', '']
  ].map(([id, name, hint]) => ({ id, name, hint }));

  const CAT = new Map(CATEGORIES.map((c) => [c.id, c]));
  const MAIN_CATS = CATEGORIES.slice(0, 8);
  const MORE_CATS = CATEGORIES.slice(8);
  const METHODS = ['Efectivo', 'Tarjeta de débito', 'Tarjeta de crédito', 'Transferencia'];
  const NOTE_MAX = 100;
  const STORAGE_KEY = 'misGastos.datos';
  const BACKUP_DAYS = 30;
  const DAY_MS = 24 * 60 * 60 * 1000;

  // ===================== Formatos =====================
  const moneyFmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' });
  const moneyRoundFmt = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const pctFmt = new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 });
  const monthFmt = new Intl.DateTimeFormat('es-EC', { month: 'long', year: 'numeric' });
  const monthOnlyFmt = new Intl.DateTimeFormat('es-EC', { month: 'long' });
  const shortMonthFmt = new Intl.DateTimeFormat('es-EC', { month: 'short' });
  const dayFmt = new Intl.DateTimeFormat('es-EC', { weekday: 'short', day: 'numeric', month: 'short' });
  const longDateFmt = new Intl.DateTimeFormat('es-EC', { day: 'numeric', month: 'long', year: 'numeric' });

  // Los montos se guardan en centavos (enteros) para evitar errores de redondeo.
  const money = (cents) => moneyFmt.format(cents / 100);
  const moneyRound = (cents) => moneyRoundFmt.format(cents / 100);
  const signedMoney = (cents) => (cents > 0 ? '+' : cents < 0 ? '−' : '') + money(Math.abs(cents));
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const pad = (n) => String(n).padStart(2, '0');

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }

  // ===================== Fechas (siempre en hora local) =====================
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayStr = () => ymd(new Date());
  const currentMonth = () => todayStr().slice(0, 7);
  const monthOf = (dateStr) => dateStr.slice(0, 7);

  function parseDate(s) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  function isValidDate(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
  }
  const isValidMonth = (s) => typeof s === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
  function addMonths(mk, n) {
    const [y, m] = mk.split('-').map(Number);
    const d = new Date(y, m - 1 + n, 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }
  const monthDate = (mk) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m - 1, 1); };
  const monthLabel = (mk) => capitalize(monthFmt.format(monthDate(mk)));
  const monthName = (mk) => capitalize(monthOnlyFmt.format(monthDate(mk)));
  const shortMonth = (mk) => shortMonthFmt.format(monthDate(mk)).replace('.', '');

  // ===================== Montos =====================
  // Acepta "12", "12,5", "12.50", ",75". Devuelve centavos o null si no es válido.
  function parseAmount(str) {
    const s = String(str).trim().replace(/\s/g, '');
    if (!/^(\d+([.,]\d{0,2})?|[.,]\d{1,2})$/.test(s)) return null;
    const cents = Math.round(parseFloat(s.replace(',', '.')) * 100);
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }
  const centsToInput = (c) => (c / 100).toFixed(2).replace('.', ',');
  function amountError(raw, example) {
    const s = String(raw).trim();
    if (!s) return 'Escribe el monto.';
    if (/^(\d+([.,]\d{0,2})?|[.,]\d{1,2})$/.test(s.replace(/\s/g, ''))) return 'El monto debe ser mayor que 0.';
    return `Escribe solo números, con hasta 2 decimales (por ejemplo ${example}).`;
  }

  // ===================== Almacenamiento =====================
  const emptyData = () => ({ version: 1, expenses: [], budgets: {}, lastBackup: null });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const newId = () => (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() :Date.now().toString(36) + Math.random().toString(36).slice(2));

  // Revisa y limpia los datos (se usa al abrir la app y al importar un respaldo).
  function validateData(obj) {
    const fail = (error) => ({ ok: false, error });
    if (!obj || typeof obj !== 'object' || !Array.isArray(obj.expenses)) {
      return fail('El archivo no tiene la lista de gastos.');
    }
    const expenses = [];
    const ids = new Set();
    for (let i = 0; i < obj.expenses.length; i++) {
      const e = obj.expenses[i];
      const n = i + 1;
      if (!e || typeof e !== 'object') return fail(`El gasto n.º ${n} no es válido.`);
      if (!Number.isSafeInteger(e.amount) || e.amount <= 0) return fail(`El gasto n.º ${n} tiene un monto no válido.`);
      if (!CAT.has(e.cat)) return fail(`El gasto n.º ${n} tiene una categoría desconocida.`);
      if (!isValidDate(e.date)) return fail(`El gasto n.º ${n} tiene una fecha no válida.`);
      const method = e.method == null ? '' : e.method;
      if (method !== '' && !METHODS.includes(method)) return fail(`El gasto n.º ${n} tiene un método de pago no válido.`);
      let id = typeof e.id === 'string' && e.id ? e.id : newId();
      if (ids.has(id)) id = newId();
      ids.add(id);
      expenses.push({
        id,
        amount: e.amount,
        cat: e.cat,
        date: e.date,
        method,
        note: typeof e.note === 'string' ? e.note.slice(0, NOTE_MAX) : '',
        createdAt: Number.isFinite(e.createdAt) ? e.createdAt : 0,
        updatedAt: Number.isFinite(e.updatedAt) ? e.updatedAt : 0
      });
    }

    const budgets = {};
    const rawBudgets = obj.budgets == null ? {} : obj.budgets;
    if (typeof rawBudgets !== 'object' || Array.isArray(rawBudgets)) return fail('Los presupuestos del archivo no son válidos.');
    for (const key of Object.keys(rawBudgets)) {
      const cat = Number(key);
      const list = rawBudgets[key];
      if (!CAT.has(cat) || !Array.isArray(list)) return fail('Los presupuestos del archivo no son válidos.');
      const clean = [];
      for (const b of list) {
        if (!b || !isValidMonth(b.from)) return fail('Los presupuestos del archivo no son válidos.');
        if (b.amount !== null && (!Number.isSafeInteger(b.amount) || b.amount <= 0)) return fail('Los presupuestos del archivo no son válidos.');
        clean.push({ from: b.from, amount: b.amount });
      }
      clean.sort((a, b) => a.from.localeCompare(b.from));
      const dedup = clean.filter((b, i) => i === clean.length - 1 || clean[i + 1].from !== b.from);
      if (dedup.length) budgets[cat] = dedup;
    }

    const lastBackup = typeof obj.lastBackup === 'string' && !isNaN(Date.parse(obj.lastBackup)) ? obj.lastBackup : null;
    return { ok: true, data: { version: 1, expenses, budgets, lastBackup } };
  }

  let loadProblem = false;
  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return emptyData();
      const v = validateData(JSON.parse(raw));
      if (v.ok) return v.data;
    } catch (e) { /* se maneja abajo */ }
    // Datos dañados: se guarda una copia aparte para no perderlos y se empieza vacío.
    loadProblem = true;
    try { if (raw) localStorage.setItem(STORAGE_KEY + '.danado.' + Date.now(), raw); } catch (e) { /* sin espacio */ }
    return emptyData();
  }

  let data = load();

  // Guarda una nueva versión de los datos. Solo la acepta si se pudo escribir.
  function commit(next) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      data = next;
      return true;
    } catch (e) {
      showAlert('No se pudo guardar', 'El celular no permitió guardar los datos (puede que no haya espacio). Exporta un respaldo y libera espacio.');
      return false;
    }
  }

  // ===================== Cálculos =====================
  const expensesOfMonth = (mk) => data.expenses.filter((e) => monthOf(e.date) === mk);
  const sumOf = (list) => list.reduce((s, e) => s + e.amount, 0);
  function totalsByCat(list) {
    const m = new Map();
    for (const e of list) m.set(e.cat, (m.get(e.cat) || 0) + e.amount);
    return m;
  }
  function sortNewest(list) {
    return list.slice().sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }

  // Presupuesto vigente para una categoría en un mes (o null si no tiene).
  function budgetFor(cat, mk) {
    const list = data.budgets[cat];
    if (!list) return null;
    let amount = null;
    for (const b of list) {
      if (b.from <= mk) amount = b.amount; else break;
    }
    return amount;
  }
  const budgetedCats = (mk) => CATEGORIES.filter((c) => budgetFor(c.id, mk) != null).map((c) => c.id);

  // Un cambio de presupuesto rige desde el mes actual; los meses anteriores conservan el suyo.
  function setBudget(cat, amountOrNull) {
    const mk = currentMonth();
    const next = clone(data);
    let list = (next.budgets[cat] || []).filter((b) => b.from < mk);
    const previous = list.length ? list[list.length - 1].amount : null;
    if (amountOrNull !== previous) list.push({ from: mk, amount: amountOrNull });
    if (list.length) next.budgets[cat] = list; else delete next.budgets[cat];
    return commit(next);
  }

  function budgetState(spent, budget) {
    const ratio = spent / budget;
    if (spent > budget) return 'over';
    if (ratio >= 0.8) return 'warn';
    return 'ok';
  }

  function budgetHtml(spent, budget) {
    const state = budgetState(spent, budget);
    const ratio = spent / budget;
    const width = Math.min(ratio, 1) * 100;
    const pct = pctFmt.format(ratio * 100) + ' %';
    const remaining = budget - spent;
    let badge = '';
    if (state === 'over') badge = `<span class="badge over">⛔ Te pasaste del presupuesto (${pct})</span>`;
    else if (state === 'warn') badge = `<span class="badge warn">⚠ Llegaste al ${pct} del presupuesto</span>`;
    const left = remaining >= 0
      ? `Quedan <strong>${money(remaining)}</strong>`
      : `<span class="text-over">Te pasaste por ${money(-remaining)}</span>`;
    return `
      <span class="bar ${state}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(Math.min(ratio, 1) * 100)}" aria-label="Uso del presupuesto"><span style="width:${width.toFixed(1)}%"></span></span>
      <span class="budget-line"><span>${money(spent)} de ${money(budget)}</span><span>${left}</span></span>
      ${badge}`;
  }

  function needsBackup() {
    if (!data.expenses.length) return false;
    if (!data.lastBackup) return true;
    return Date.now() - Date.parse(data.lastBackup) > BACKUP_DAYS * DAY_MS;
  }

  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // ===================== Utilidades de interfaz =====================
  const $ = (sel) => document.querySelector(sel);
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2600);
  }

  const openOverlays = [];
  function showOverlay(el) {
    el.hidden = false;
    openOverlays.push(el);
    document.body.classList.add('no-scroll');
  }
  function hideOverlay(el) {
    el.hidden = true;
    const i = openOverlays.indexOf(el);
    if (i >= 0) openOverlays.splice(i, 1);
    if (!openOverlays.length) document.body.classList.remove('no-scroll');
  }

  let confirmResolve = null;
  function confirmDialog({ title, message, confirmText = 'Aceptar', cancelText = 'Cancelar', danger = false }) {
    $('#confirm-title').textContent = title;
    $('#confirm-msg').textContent = message;
    const ok = $('#confirm-ok');
    const cancel = $('#confirm-cancel');
    ok.textContent = confirmText;
    ok.className = 'btn ' + (danger ? 'danger solid' : 'primary');
    cancel.textContent = cancelText || '';
    cancel.hidden = !cancelText;
    showOverlay($('#confirm'));
    (cancelText ? cancel : ok).focus();
    return new Promise((resolve) => { confirmResolve = resolve; });
  }
  function closeConfirm(result) {
    hideOverlay($('#confirm'));
    if (confirmResolve) { const r = confirmResolve; confirmResolve = null; r(result); }
  }
  const showAlert = (title, message) => confirmDialog({ title, message, confirmText: 'Entendido', cancelText: null });

  // ===================== Navegación =====================
  const VIEWS = ['inicio', 'presupuestos', 'comparar', 'respaldo', 'ayuda'];
  let viewMonth = currentMonth();

  function currentView() {
    const v = location.hash.slice(1);
    return VIEWS.includes(v) ? v : 'inicio';
  }
  function route() {
    const v = currentView();
    for (const name of VIEWS) $('#view-' + name).hidden = name !== v;
    document.querySelectorAll('.tabbar a').forEach((a) => {
      if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    render();
    window.scrollTo(0, 0);
  }
  function render() {
    const v = currentView();
    if (v === 'inicio') renderHome();
    else if (v === 'presupuestos') renderBudgets();
    else if (v === 'comparar') renderCompare();
    else if (v === 'respaldo') renderBackup();
    else if (v === 'ayuda') renderHelp();
  }

  // ===================== Pantalla principal =====================
  function renderHome() {
    const cur = currentMonth();
    if (viewMonth > cur) viewMonth = cur;

    // Avisos
    const banners = [];
    if (loadProblem) {
      banners.push(`<div class="notice danger">Los datos guardados estaban dañados y no se pudieron leer. Se guardó una copia aparte. Si tienes un respaldo, impórtalo desde <a href="#respaldo">Respaldo</a>.</div>`);
    }
    if (isIOS() && !isStandalone()) {
      banners.push(`<div class="notice warn"><strong>Instala la app</strong> en tu pantalla de inicio y úsala desde ahí para no perder tus datos.<a class="btn secondary" href="#ayuda">Ver cómo instalar</a></div>`);
    }
    if (needsBackup()) {
      const msg = data.lastBackup
        ? `Tu último respaldo fue hace más de ${BACKUP_DAYS} días.`
        : 'Todavía no has hecho ningún respaldo.';
      banners.push(`<div class="notice warn"><strong>${msg}</strong> Tus datos están solo en este celular.<a class="btn secondary" href="#respaldo">Hacer respaldo</a></div>`);
    }
    $('#home-banners').innerHTML = banners.join('');

    $('#month-label').textContent = monthLabel(viewMonth);
    $('#month-sub').textContent = viewMonth === cur ? 'Mes actual' : '';
    $('#next-month').disabled = viewMonth >= cur;

    const list = expensesOfMonth(viewMonth);
    $('#month-total').textContent = money(sumOf(list));
    $('#month-count').textContent = list.length === 1 ? '1 gasto' : `${list.length} gastos`;

    // Gasto por categoría (incluye categorías con presupuesto aunque no tengan gastos)
    const byCat = totalsByCat(list);
    for (const id of budgetedCats(viewMonth)) if (!byCat.has(id)) byCat.set(id, 0);
    const rows = [...byCat.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    $('#home-cats').innerHTML = rows.length
      ? rows.map(([id, spent]) => {
          const budget = budgetFor(id, viewMonth);
          return `<div class="row">
            <div class="row-top"><span class="row-name">${escapeHtml(CAT.get(id).name)}</span><span class="row-amount">${money(spent)}</span></div>
            ${budget != null ? budgetHtml(spent, budget) : ''}
          </div>`;
        }).join('')
      : '<p class="empty">Sin gastos en este mes.</p>';

    // Lista de gastos
    const sorted = sortNewest(list);
    $('#home-list').innerHTML = sorted.length
      ? sorted.map((e) => {
          const meta = [capitalize(dayFmt.format(parseDate(e.date)).replace(/\./g, ''))];
          if (e.method) meta.push(e.method);
          if (e.note) meta.push(e.note);
          return `<li><button type="button" class="row-btn" data-id="${escapeHtml(e.id)}" aria-label="Editar gasto de ${escapeHtml(money(e.amount))} en ${escapeHtml(CAT.get(e.cat).name)}">
            <span class="row-top"><span class="row-name">${escapeHtml(CAT.get(e.cat).name)}</span><span class="row-amount">${money(e.amount)}</span></span>
            <span class="row-meta">${meta.map(escapeHtml).join(' · ')}</span>
          </button></li>`;
        }).join('')
      : '<li><p class="empty">No hay gastos registrados en este mes.</p></li>';
  }

  // ===================== Formulario de gasto =====================
  let editingId = null;
  let selectedCat = null;

  function catButton(c) {
    return `<button type="button" class="cat-btn" data-cat="${c.id}" aria-pressed="false">${escapeHtml(c.name)}${c.hint ? `<small>${escapeHtml(c.hint)}</small>` : ''}</button>`;
  }
  function buildExpenseForm() {
    $('#cat-grid').innerHTML = MAIN_CATS.map(catButton).join('');
    $('#more-cats').innerHTML = MORE_CATS.map(catButton).join('');
    $('#f-method').innerHTML = '<option value="">Sin especificar</option>' +
      METHODS.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
  }
  function setMoreCats(open) {
    $('#more-cats').hidden = !open;
    $('#more-cats-btn').setAttribute('aria-expanded', String(open));
    $('#more-cats-btn').textContent = open ? 'Menos categorías ▴' : 'Más categorías ▾';
  }
  function selectCat(id) {
    selectedCat = id;
    document.querySelectorAll('#expense-form .cat-btn').forEach((b) => {
      b.setAttribute('aria-pressed', String(Number(b.dataset.cat) === id));
    });
    $('#cat-selected').textContent = id ? '· ' + CAT.get(id).name : '';
    if (id && MORE_CATS.some((c) => c.id === id)) setMoreCats(true);
    if (id) { $('#e-cat').textContent = ''; $('#cat-grid').closest('.field').classList.remove('invalid'); }
  }
  function clearErrors(form) {
    form.querySelectorAll('.error').forEach((e) => { e.textContent = ''; });
    form.querySelectorAll('.invalid').forEach((e) => e.classList.remove('invalid'));
  }
  function setError(inputSel, errSel, msg) {
    $(errSel).textContent = msg;
    $(inputSel).closest('.field').classList.add('invalid');
  }

  function openExpense(id) {
    const form = $('#expense-form');
    const e = id ? data.expenses.find((x) => x.id === id) : null;
    if (id && !e) return;
    editingId = e ? e.id : null;
    form.reset();
    clearErrors(form);
    $('#expense-title').textContent = e ? 'Editar gasto' : 'Nuevo gasto';
    $('#f-amount').value = e ? centsToInput(e.amount) : '';
    setMoreCats(false);
    selectCat(e ? e.cat : null);
    const today = todayStr();
    $('#f-date').max = today;
    $('#f-date').value = e ? e.date : today;
    $('#f-method').value = e ? e.method : '';
    $('#f-note').value = e ? e.note : '';
    $('#f-optional').open = !!(e && (e.method || e.note));
    $('#delete-expense').hidden = !e;
    showOverlay($('#expense-sheet'));
    form.querySelector('.sheet-body').scrollTop = 0;
    if (!e) $('#f-amount').focus();
  }
  function closeExpense() { hideOverlay($('#expense-sheet')); editingId = null; }

  function submitExpense(ev) {
    ev.preventDefault();
    const form = $('#expense-form');
    clearErrors(form);
    const amount = parseAmount($('#f-amount').value);
    const date = $('#f-date').value;
    const today = todayStr();
    let firstBad = null;

    if (amount == null) {
      setError('#f-amount', '#e-amount', amountError($('#f-amount').value, '12,50'));
      firstBad = firstBad || $('#f-amount');
    }
    if (!selectedCat) {
      $('#e-cat').textContent = 'Elige una categoría.';
      $('#cat-grid').closest('.field').classList.add('invalid');
      firstBad = firstBad || $('#cat-grid');
    }
    if (!isValidDate(date)) {
      setError('#f-date', '#e-date', 'Elige una fecha.');
      firstBad = firstBad || $('#f-date');
    } else if (date > today) {
      setError('#f-date', '#e-date', 'La fecha no puede ser posterior a hoy.');
      firstBad = firstBad || $('#f-date');
    }
    if (firstBad) {
      firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (firstBad.focus && firstBad.tagName === 'INPUT') firstBad.focus();
      return;
    }

    const method = METHODS.includes($('#f-method').value) ? $('#f-method').value : '';
    const note = $('#f-note').value.trim().slice(0, NOTE_MAX);
    const next = clone(data);
    const now = Date.now();
    if (editingId) {
      const e = next.expenses.find((x) => x.id === editingId);
      if (!e) { closeExpense(); return; }
      Object.assign(e, { amount, cat: selectedCat, date, method, note, updatedAt: now });
    } else {
      next.expenses.push({ id: newId(), amount, cat: selectedCat, date, method, note, createdAt: now, updatedAt: now });
    }
    const wasEditing = !!editingId;
    if (!commit(next)) return;
    closeExpense();
    viewMonth = monthOf(date);
    if (currentView() !== 'inicio') location.hash = '#inicio'; else render();
    toast(wasEditing ? 'Cambios guardados' : 'Gasto guardado');
  }

  async function deleteExpense() {
    const e = data.expenses.find((x) => x.id === editingId);
    if (!e) return;
    const ok = await confirmDialog({
      title: '¿Borrar este gasto?',
      message: `${money(e.amount)} en ${CAT.get(e.cat).name}, ${longDateFmt.format(parseDate(e.date))}.\nNo se puede deshacer.`,
      confirmText: 'Borrar',
      danger: true
    });
    if (!ok) return;
    const next = clone(data);
    next.expenses = next.expenses.filter((x) => x.id !== e.id);
    if (!commit(next)) return;
    closeExpense();
    render();
    toast('Gasto borrado');
  }

  // ===================== Presupuestos =====================
  function renderBudgets() {
    const cur = currentMonth();
    $('#budgets-intro').textContent = `Pon un límite mensual solo en las categorías que quieras. Este es el estado de ${monthLabel(cur).toLowerCase()}. El presupuesto sigue igual cada mes hasta que lo cambies.`;
    const byCat = totalsByCat(expensesOfMonth(cur));
    const ids = budgetedCats(cur).map((id) => {
      const budget = budgetFor(id, cur);
      const spent = byCat.get(id) || 0;
      return { id, budget, spent, ratio: spent / budget };
    }).sort((a, b) => b.ratio - a.ratio || a.id - b.id);

    $('#budget-list').innerHTML = ids.length
      ? ids.map(({ id, budget, spent }) => `<button type="button" class="row-btn" data-cat="${id}" aria-label="Cambiar presupuesto de ${escapeHtml(CAT.get(id).name)}">
          <span class="row-top"><span class="row-name">${escapeHtml(CAT.get(id).name)}</span><span class="row-amount">${money(budget)}</span></span>
          ${budgetHtml(spent, budget)}
        </button>`).join('')
      : '<p class="empty">Aún no tienes presupuestos. Toca “Agregar o cambiar presupuesto”.</p>';
  }

  function fillBudgetSelect() {
    const cur = currentMonth();
    $('#b-cat').innerHTML = '<option value="">Elige una categoría…</option>' + CATEGORIES.map((c) => {
      const b = budgetFor(c.id, cur);
      return `<option value="${c.id}">${escapeHtml(c.name)}${b != null ? ' — ' + escapeHtml(money(b)) : ''}</option>`;
    }).join('');
  }
  function syncBudgetForm() {
    const id = Number($('#b-cat').value) || null;
    const b = id ? budgetFor(id, currentMonth()) : null;
    $('#b-amount').value = b != null ? centsToInput(b) : '';
    $('#remove-budget').hidden = b == null;
    $('#e-budget').textContent = '';
    $('#b-amount').closest('.field').classList.remove('invalid');
  }
  function openBudget(catId) {
    fillBudgetSelect();
    $('#b-cat').value = catId ? String(catId) : '';
    syncBudgetForm();
    $('#budget-note').textContent = `El cambio se aplica desde ${monthLabel(currentMonth()).toLowerCase()} en adelante. Los meses anteriores conservan el presupuesto que tenían.`;
    showOverlay($('#budget-sheet'));
    if (catId) $('#b-amount').focus();
  }
  function submitBudget(ev) {
    ev.preventDefault();
    const id = Number($('#b-cat').value) || null;
    $('#e-budget').textContent = '';
    if (!id) {
      $('#e-budget').textContent = 'Primero elige una categoría.';
      return;
    }
    const amount = parseAmount($('#b-amount').value);
    if (amount == null) {
      setError('#b-amount', '#e-budget', amountError($('#b-amount').value, '150'));
      $('#b-amount').focus();
      return;
    }
    if (!setBudget(id, amount)) return;
    hideOverlay($('#budget-sheet'));
    render();
    toast('Presupuesto guardado');
  }
  function removeBudget() {
    const id = Number($('#b-cat').value) || null;
    if (!id) return;
    if (!setBudget(id, null)) return;
    hideOverlay($('#budget-sheet'));
    render();
    toast('Presupuesto quitado');
  }

  // ===================== Comparar meses =====================
  function diffHtml(cur, prev) {
    const d = cur - prev;
    const cls = d > 0 ? 'up' : d < 0 ? 'down' : 'same';
    let pct;
    if (prev > 0) pct = (d > 0 ? '+' : d < 0 ? '−' : '') + pctFmt.format(Math.abs(d) / prev * 100) + ' %';
    else pct = cur > 0 ? 'nuevo' : '—';
    return `<span class="diff ${cls}">${signedMoney(d)} (${pct})</span>`;
  }

  function renderCompare() {
    const cur = currentMonth();
    const prev = addMonths(cur, -1);
    const curName = monthName(cur);
    const prevName = monthName(prev);
    $('#compare-subtitle').textContent = `${monthLabel(cur)} vs. ${monthLabel(prev).toLowerCase()}`;

    const curList = expensesOfMonth(cur);
    const prevList = expensesOfMonth(prev);
    const curTotal = sumOf(curList);
    const prevTotal = sumOf(prevList);
    $('#compare-total').innerHTML = `
      <div class="compare-total-grid">
        <div><span class="muted small">${escapeHtml(curName)} (actual)</span><strong>${money(curTotal)}</strong></div>
        <div><span class="muted small">${escapeHtml(prevName)} (anterior)</span><strong>${money(prevTotal)}</strong></div>
      </div>
      <div class="compare-total-diff"><span class="muted">Diferencia</span>${diffHtml(curTotal, prevTotal)}</div>`;

    const a = totalsByCat(curList);
    const b = totalsByCat(prevList);
    const ids = [...new Set([...a.keys(), ...b.keys()])]
      .sort((x, y) => (a.get(y) || 0) - (a.get(x) || 0) || (b.get(y) || 0) - (b.get(x) || 0) || x - y);
    $('#compare-list').innerHTML = ids.length
      ? ids.map((id) => {
          const c = a.get(id) || 0;
          const p = b.get(id) || 0;
          return `<div class="row">
            <div class="row-top"><span class="row-name">${escapeHtml(CAT.get(id).name)}</span>${diffHtml(c, p)}</div>
            <div class="compare-months"><span>${escapeHtml(curName)}: <strong>${money(c)}</strong></span><span>${escapeHtml(prevName)}: ${money(p)}</span></div>
          </div>`;
        }).join('')
      : '<p class="empty">No hay gastos en estos dos meses.</p>';

    renderChart(cur);
  }

  function renderChart(cur) {
    const months = [];
    for (let i = 5; i >= 0; i--) months.push(addMonths(cur, -i));
    const totals = months.map((mk) => sumOf(expensesOfMonth(mk)));
    const max = Math.max(...totals, 0);

    const W = 340, H = 220, top = 26, bottom = 30, side = 6;
    const plotH = H - top - bottom;
    const slot = (W - side * 2) / months.length;
    const bw = Math.min(40, slot * 0.62);
    const base = H - bottom;

    let bars = '';
    months.forEach((mk, i) => {
      const t = totals[i];
      const h = max > 0 ? Math.max(t > 0 ? 3 : 0, (t / max) * plotH) : 0;
      const x = side + slot * i + (slot - bw) / 2;
      const y = base - h;
      const cx = x + bw / 2;
      const cls = 'chart-bar' + (t > 0 ? ' has' : '') + (mk === cur ? ' current' : '');
      bars += `<rect class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 0).toFixed(1)}" rx="5"><title>${escapeHtml(monthLabel(mk))}: ${escapeHtml(money(t))}</title></rect>`;
      bars += `<text class="chart-value" x="${cx.toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle">${escapeHtml(moneyRound(t))}</text>`;
      bars += `<text class="chart-label" x="${cx.toFixed(1)}" y="${(base + 19).toFixed(1)}" text-anchor="middle">${escapeHtml(shortMonth(mk))}</text>`;
    });
    const summary = months.map((mk, i) => `${monthLabel(mk)}: ${money(totals[i])}`).join('; ');
    $('#chart').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Total gastado por mes. ${escapeHtml(summary)}">
      <line class="chart-axis" x1="${side}" y1="${base}" x2="${W - side}" y2="${base}"/>
      ${bars}
    </svg>`;
    $('#chart-legend').innerHTML = months.map((mk, i) =>
      `<li><span>${escapeHtml(monthLabel(mk))}</span><span>${money(totals[i])}</span></li>`).reverse().join('');
  }

  // ===================== Respaldo =====================
  function renderBackup() {
    const status = $('#backup-status');
    let html;
    if (data.lastBackup) {
      const d = new Date(data.lastBackup);
      const days = Math.floor((Date.now() - d.getTime()) / DAY_MS);
      const ago = days <= 0 ? 'hoy' : days === 1 ? 'hace 1 día' : `hace ${days} días`;
      html = `<div><span class="muted">Último respaldo:</span><br><strong>${escapeHtml(longDateFmt.format(d))}</strong> (${ago})</div>`;
    } else {
      html = '<div><span class="muted">Último respaldo:</span><br><strong>Nunca has exportado un respaldo.</strong></div>';
    }
    if (needsBackup()) {
      html += `<div class="notice warn" style="margin:12px 0 0">${data.lastBackup ? `Pasaron más de ${BACKUP_DAYS} días desde tu último respaldo.` : 'Tienes gastos sin respaldo.'} Exporta uno ahora.</div>`;
    }
    status.innerHTML = html;

    const nb = budgetedCats(currentMonth()).length;
    $('#storage-info').innerHTML = `En este celular hay <strong>${data.expenses.length}</strong> ${data.expenses.length === 1 ? 'gasto' : 'gastos'} y <strong>${nb}</strong> ${nb === 1 ? 'presupuesto activo' : 'presupuestos activos'}.<br>${persistText()}`;
  }

  let persisted = null;
  function persistText() {
    if (persisted === true) return 'Almacenamiento persistente: activado (el navegador no borrará los datos por falta de espacio).';
    if (persisted === false) return 'Almacenamiento persistente: el navegador no lo concedió todavía. Instala la app y haz respaldos con frecuencia.';
    return 'Almacenamiento persistente: no disponible en este navegador.';
  }
  async function requestPersist() {
    if (!(navigator.storage && navigator.storage.persist)) return;
    try {
      persisted = await navigator.storage.persisted();
      if (!persisted) persisted = await navigator.storage.persist();
    } catch (e) { persisted = false; }
    if (currentView() === 'respaldo') renderBackup();
  }

  function downloadFile(file) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function markBackup(name) {
    const next = clone(data);
    next.lastBackup = new Date().toISOString();
    if (commit(next)) {
      render();
      toast('Respaldo exportado: ' + name);
    }
  }

  async function exportBackup() {
    const payload = {
      app: 'Mis Gastos',
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: data.expenses,
      budgets: data.budgets
    };
    const name = `mis-gastos-respaldo-${todayStr()}.json`;
    const file = new File([JSON.stringify(payload, null, 2)], name, { type: 'application/json' });

    // En iPhone, la descarga directa puede fallar en la app instalada: se usa el menú Compartir
    // ("Guardar en Archivos"). El archivo no se envía a ningún servidor.
    if (isIOS() && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Respaldo de Mis Gastos' });
        markBackup(name);
      } catch (err) {
        if (err && err.name === 'AbortError') toast('No se guardó el respaldo');
        else { downloadFile(file); markBackup(name); }
      }
      return;
    }
    downloadFile(file);
    markBackup(name);
    requestPersist();
  }

  async function importBackup(file) {
    let obj;
    try {
      obj = JSON.parse(await file.text());
    } catch (e) {
      showAlert('No se pudo importar', 'El archivo no es un respaldo válido de Mis Gastos.');
      return;
    }
    if (!obj || obj.app !== 'Mis Gastos') {
      showAlert('No se pudo importar', 'Este archivo no es un respaldo de Mis Gastos.');
      return;
    }
    const v = validateData(obj);
    if (!v.ok) {
      showAlert('No se pudo importar', 'El respaldo tiene datos dañados: ' + v.error);
      return;
    }
    const nNew = v.data.expenses.length;
    const bNew = Object.keys(v.data.budgets).length;
    const nOld = data.expenses.length;
    const when = obj.exportedAt && !isNaN(Date.parse(obj.exportedAt)) ? ' del ' + longDateFmt.format(new Date(obj.exportedAt)) : '';
    const ok = await confirmDialog({
      title: '¿Reemplazar tus datos?',
      message: `Se borrarán los datos actuales de este celular (${nOld} ${nOld === 1 ? 'gasto' : 'gastos'} y sus presupuestos) y se pondrán los del respaldo${when}: ${nNew} ${nNew === 1 ? 'gasto' : 'gastos'} y ${bNew} ${bNew === 1 ? 'categoría' : 'categorías'} con presupuesto.\n\nNo se puede deshacer. Si quieres conservar los datos actuales, exporta un respaldo antes.`,
      confirmText: 'Reemplazar datos',
      danger: true
    });
    if (!ok) return;
    const next = { version: 1, expenses: v.data.expenses, budgets: v.data.budgets, lastBackup: data.lastBackup };
    if (!commit(next)) return;
    loadProblem = false;
    viewMonth = currentMonth();
    render();
    toast(`Respaldo importado: ${nNew} ${nNew === 1 ? 'gasto' : 'gastos'}`);
  }

  // ===================== Ayuda / instalación =====================
  let installPrompt = null;
  function renderHelp() {
    $('#install-state').innerHTML = isStandalone()
      ? '<div class="notice ok">✓ Estás usando la app instalada.</div>'
      : '<p>Instala la app en tu celular para abrirla como cualquier otra app y usarla sin internet.</p>';
    $('#install-btn').hidden = !installPrompt || isStandalone();
  }

  // ===================== Eventos =====================
  function init() {
    buildExpenseForm();

    window.addEventListener('hashchange', route);

    $('#prev-month').addEventListener('click', () => { viewMonth = addMonths(viewMonth, -1); renderHome(); });
    $('#next-month').addEventListener('click', () => {
      if (viewMonth < currentMonth()) { viewMonth = addMonths(viewMonth, 1); renderHome(); }
    });
    $('#add-expense').addEventListener('click', () => openExpense(null));
    $('#home-list').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-id]');
      if (btn) openExpense(btn.dataset.id);
    });

    // Formulario de gasto
    $('#expense-form').addEventListener('submit', submitExpense);
    $('#expense-form').addEventListener('click', (ev) => {
      const btn = ev.target.closest('.cat-btn');
      if (btn) selectCat(Number(btn.dataset.cat));
    });
    $('#more-cats-btn').addEventListener('click', () => setMoreCats($('#more-cats').hidden));
    $('#delete-expense').addEventListener('click', deleteExpense);
    $('#f-amount').addEventListener('input', () => { $('#e-amount').textContent = ''; $('#f-amount').closest('.field').classList.remove('invalid'); });
    $('#f-date').addEventListener('change', () => { $('#e-date').textContent = ''; $('#f-date').closest('.field').classList.remove('invalid'); });

    // Presupuestos
    $('#add-budget').addEventListener('click', () => openBudget(null));
    $('#budget-list').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-cat]');
      if (btn) openBudget(Number(btn.dataset.cat));
    });
    $('#b-cat').addEventListener('change', syncBudgetForm);
    $('#budget-form').addEventListener('submit', submitBudget);
    $('#remove-budget').addEventListener('click', removeBudget);

    // Cerrar hojas
    document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => {
      const ov = b.closest('.overlay');
      if (ov.id === 'expense-sheet') closeExpense(); else hideOverlay(ov);
    }));
    $('#confirm-ok').addEventListener('click', () => closeConfirm(true));
    $('#confirm-cancel').addEventListener('click', () => closeConfirm(false));
    $('#confirm').addEventListener('click', (ev) => { if (ev.target.id === 'confirm') closeConfirm(false); });
    document.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape' || !openOverlays.length) return;
      const top = openOverlays[openOverlays.length - 1];
      if (top.id === 'confirm') closeConfirm(false);
      else if (top.id === 'expense-sheet') closeExpense();
      else hideOverlay(top);
    });

    // Respaldo
    $('#export-btn').addEventListener('click', exportBackup);
    $('#import-btn').addEventListener('click', () => $('#import-file').click());
    $('#import-file').addEventListener('change', (ev) => {
      const file = ev.target.files && ev.target.files[0];
      ev.target.value = '';
      if (file) importBackup(file);
    });

    // Instalación (Android/Chrome)
    window.addEventListener('beforeinstallprompt', (ev) => {
      ev.preventDefault();
      installPrompt = ev;
      if (currentView() === 'ayuda') renderHelp();
    });
    window.addEventListener('appinstalled', () => { installPrompt = null; renderHelp(); });
    $('#install-btn').addEventListener('click', async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      try { await installPrompt.userChoice; } catch (e) { /* nada */ }
      installPrompt = null;
      renderHelp();
    });

    // Si la app queda abierta y cambia el día o el mes, se actualiza al volver.
    let lastMonth = currentMonth();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      const cm = currentMonth();
      if (cm !== lastMonth) { if (viewMonth === lastMonth) viewMonth = cm; lastMonth = cm; }
      if (!openOverlays.length) render();
    });

    route();
    requestPersist();

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { /* sin modo sin conexión */ });
      });
    }
  }

  init();
})();
