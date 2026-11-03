(() => {
  'use strict';

  const STORAGE_KEY = 'spartanx-nutrition-standalone-v1';
  const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Liquids'];
  const THEMES = ['red', 'gold', 'blue'];
  const WATER_FOOD = {id:'system:water',name:'Water',barcode:'',brand:'',image:'',source:'manual',unit:'ml',servingAmount:250,n:{kcal:0,kj:0,protein:0,carbs:0,fat:0,sugar:0,satFat:0,fibre:0,salt:0,sodium:0},micros:{}};
  const TARGET_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2"/><path d="m14 10 6-6m-3 0h3v3"/></svg>';
  const CALENDAR_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/></svg>';
  const DEFAULT_GOALS = { kcal: 2500, protein: 160, carbs: 280, fat: 75 };
  const MICRO_MAP = [
    ['vitamin-a','Vitamin A','µg',1e6], ['vitamin-b1','Vitamin B1 (thiamin)','mg',1e3],
    ['vitamin-b2','Vitamin B2 (riboflavin)','mg',1e3], ['vitamin-pp','Vitamin B3 (niacin)','mg',1e3],
    ['vitamin-b6','Vitamin B6','mg',1e3], ['vitamin-b9','Vitamin B9 (folate)','µg',1e6],
    ['folates','Folates','µg',1e6], ['vitamin-b12','Vitamin B12','µg',1e6],
    ['vitamin-c','Vitamin C','mg',1e3], ['vitamin-d','Vitamin D','µg',1e6],
    ['vitamin-e','Vitamin E','mg',1e3], ['vitamin-k','Vitamin K','µg',1e6],
    ['calcium','Calcium','mg',1e3], ['iron','Iron','mg',1e3],
    ['magnesium','Magnesium','mg',1e3], ['phosphorus','Phosphorus','mg',1e3],
    ['potassium','Potassium','mg',1e3], ['zinc','Zinc','mg',1e3],
    ['selenium','Selenium','µg',1e6], ['iodine','Iodine','µg',1e6],
    ['copper','Copper','mg',1e3], ['manganese','Manganese','mg',1e3],
    ['pantothenic-acid','Vitamin B5','mg',1e3], ['biotin','Biotin','µg',1e6]
  ];
  const $ = (query) => document.querySelector(query);
  const $$ = (query) => [...document.querySelectorAll(query)];
  const today = () => localDate(new Date());
  const ui = { tab: 'today', date: today(), food: null, amount: 100, meal: 'Breakfast', scanBusy: false, scanner: null, scannerActive: false, manualBarcode: '', toastTimer: null, pendingMeal: null, waterAmount: 250, autoBalance: true };
  let state = loadState();

  function localDate(date) {
    const yyyy = date.getFullYear();
    return `${yyyy}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }
  function datePlus(dateString, days) {
    const date = new Date(`${dateString}T12:00:00`);
    date.setDate(date.getDate()+days);
    return localDate(date);
  }
  function uid() {
    return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `x${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        entries: Array.isArray(parsed.entries) ? parsed.entries : [],
        foods: Array.isArray(parsed.foods) ? parsed.foods : [],
        recent: Array.isArray(parsed.recent) ? parsed.recent : [],
        goals: { ...DEFAULT_GOALS, ...(parsed.goals || {}) },
        theme: THEMES.includes(parsed.theme) ? parsed.theme : 'red'
      };
    } catch { return { entries: [], foods: [], recent: [], goals: {...DEFAULT_GOALS}, theme:'red' }; }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { toast('Browser storage is unavailable or full. Data may not persist.'); }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function safeImage(value) {
    try { const u = new URL(value); return u.protocol === 'https:' ? u.href : ''; } catch { return ''; }
  }
  function numeric(x) { return x === undefined || x === null || x === '' ? null : (Number.isFinite(Number(x)) ? Number(x) : null); }
  function pretty(x, decimals=1) {
    if (x === null || !Number.isFinite(x)) return '—';
    return new Intl.NumberFormat('en-GB', { maximumFractionDigits:decimals }).format(x);
  }
  function toDisplay(x) { return x === null ? '—' : `${pretty(x)} g`; }
  function scale(value, amount) { return value === null || value === undefined ? null : value * amount / 100; }
  function foodInfo(food) { return food.n || {}; }
  function stats(food, amount) {
    const n = foodInfo(food);
    return Object.fromEntries(['kcal','kj','protein','carbs','fat','sugar','satFat','fibre','salt','sodium'].map(k=>[k, scale(n[k], amount)]));
  }
  function sumEntries(entries) {
    const acc = { kcal:0, protein:0, carbs:0, fat:0, kj:0 };
    for (const entry of entries) {
      const v = stats(entry.food, entry.amount);
      for(const k of Object.keys(acc)) acc[k] += v[k] ?? 0;
    }
    return acc;
  }
  function progress(value, target) { return target > 0 ? Math.min(100, Math.max(0, value/target*100)) : 0; }
  function toast(text) {
    const node = $('#toast'); node.textContent = text; node.classList.add('visible');
    if(ui.toastTimer) clearTimeout(ui.toastTimer);
    ui.toastTimer = setTimeout(() => node.classList.remove('visible'), 3400);
  }
  function render() {
    $$('.nav-item').forEach(n => {n.classList.toggle('active', n.dataset.tab === ui.tab);n.setAttribute('aria-current', n.dataset.tab === ui.tab ? 'page' : 'false');});
    document.documentElement.dataset.nutritionTheme=state.theme||'red';
    const main = $('#main-content');
    main.innerHTML = ui.tab === 'today' ? renderToday() : ui.tab === 'scan' ? renderScan() : ui.tab === 'foods' ? renderFoods() : ui.tab === 'targets' ? renderTargets() : renderSettings();
  }

  function macroRow(name, key, colourClass, total) {
    const goal = Number(state.goals[key]) || 0;
    return `<div class="macro-item"><div class="macro-heading"><span class="macro-name">${name}</span><span class="macro-value"><strong>${pretty(total[key])} g</strong> / ${pretty(goal,0)} g</span></div><div class="track"><div class="fill ${colourClass}" style="width:${progress(total[key],goal)}%"></div></div></div>`;
  }
  function renderToday() {
    const entries = state.entries.filter(e => e.date === ui.date);
    const total = sumEntries(entries);
    const calGoal = Number(state.goals.kcal) || 0;
    const remaining = calGoal-total.kcal;
    const dateLabel = new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date(`${ui.date}T12:00:00`));
    const pct = progress(total.kcal,calGoal);
    const incomplete = entries.some(e => ['kcal','protein','carbs','fat'].some(k => e.food.n?.[k] === null || e.food.n?.[k] === undefined));
    return `<div class="eyebrow">DAILY PERFORMANCE</div><h1 class="page-title">Fuel your progress.</h1><p class="page-subtitle">Track your nutrition, one meal at a time.</p>
      <div class="date-row"><button class="small-circle" data-action="prev-date" aria-label="Previous day">‹</button><span class="date-display">${esc(dateLabel)} ${ui.date === today() ? '<span class="tag">TODAY</span>' : ''}</span><label class="calendar-picker" aria-label="Choose diary date" title="Choose diary date">${CALENDAR_ICON}<input class="date-native" id="diary-date" type="date" value="${esc(ui.date)}" aria-label="Choose diary date"/></label><button class="small-circle" data-action="next-date" aria-label="Next day">›</button></div>
      <section class="card"><div class="card-header"><span class="eyebrow">ENERGY BALANCE</span><button class="card-icon-button" data-action="open-targets" title="Daily nutrition targets" aria-label="Daily nutrition targets">${TARGET_ICON}</button></div>
      <div class="energy-wrap"><div class="ring" style="--pct:${pct}%"><div class="ring-inner"><span class="ring-number">${pretty(total.kcal,0)}</span><span class="ring-label">CONSUMED</span><span class="ring-goal">/ ${pretty(calGoal,0)}</span></div></div><div class="energy-side"><span class="eyebrow">${remaining >= 0 ? 'REMAINING' : 'OVER TARGET'}</span><div class="remaining ${remaining<0?'negative':''}">${pretty(Math.abs(remaining),0)}</div><div class="cal-caption">${remaining >= 0 ? 'kcal available in your daily target.' : 'kcal above your daily target.'}</div></div></div>
      <div class="divider"></div><div class="macro-grid">${macroRow('Protein','protein','protein',total)}${macroRow('Carbohydrates','carbs','carbs',total)}${macroRow('Fat','fat','fat',total)}</div>
      ${incomplete ? `<p class="footnote danger">Some foods have missing nutrition values. Totals only include reported values.</p>` : ''}</section>
      <div class="quick-start"><button class="btn btn-primary" data-action="go-scan">▤ &nbsp; Scan barcode</button><button class="btn btn-ghost" data-action="open-manual">＋ &nbsp; Add manually</button></div>
      <div class="section-line"><h2>Food diary</h2><span class="small-label">${entries.length} item${entries.length === 1?'':'s'} logged</span></div>
      ${MEALS.map(meal => renderMeal(meal, entries)).join('')}
      <p class="footnote">Data is saved on this device only. Backup your diary from Settings → Your Data before clearing browser data.</p>`;
  }
  function renderMeal(meal, entries) {
    const matching = entries.filter(e=>e.meal===meal);
    if(meal==='Liquids') return renderLiquids(matching);
    const kcal = sumEntries(matching).kcal;
    return `<section class="card meal-card"><div class="meal-top"><div class="meal-heading">${esc(meal)}</div><div style="display:flex;align-items:center;gap:10px"><span class="meal-total">${pretty(kcal,0)} kcal</span><button class="btn btn-sm btn-soft" data-action="add-to-meal" data-meal="${esc(meal)}">+ Add</button></div></div>
      ${matching.length ? matching.map(e => {
        const s = stats(e.food,e.amount), photo=safeImage(e.food.image);
        return `<div class="meal-entry"><div class="meal-entry-icon">${photo?`<img src="${esc(photo)}" alt="" loading="lazy"/>`:'◉'}</div><div class="meal-entry-content"><div class="meal-entry-name">${esc(e.food.name)}</div><div class="meal-entry-detail">${pretty(e.amount)} ${esc(e.unit)} · P ${pretty(s.protein)}g · C ${pretty(s.carbs)}g · F ${pretty(s.fat)}g</div></div><div class="meal-entry-action"><strong>${pretty(s.kcal,0)} kcal</strong><button class="tiny-action" data-action="remove-entry" data-id="${esc(e.id)}">Remove</button></div></div>`;
      }).join('') : '<div class="meal-empty">Nothing logged yet</div>'}</section>`;
  }


  function renderLiquids(matching) {
    const kcal=sumEntries(matching).kcal;
    const water=matching.filter(e=>e.food?.id==='system:water' && e.unit==='ml').reduce((v,e)=>v+Number(e.amount||0),0);
    const other=matching.filter(e=>e.food?.id!=='system:water' && e.unit==='ml').reduce((v,e)=>v+Number(e.amount||0),0);
    return `<section class="card meal-card liquid-card"><div class="meal-top"><div><div class="meal-heading">Liquids</div><div class="liquid-summary">Water ${pretty(water,0)} ml · Other drinks ${pretty(other,0)} ml</div></div><span class="meal-total">${pretty(kcal,0)} kcal</span></div>
      <div class="liquid-actions"><div class="water-stepper" role="group" aria-label="Water amount"><button type="button" class="water-step-button" data-action="water-down" aria-label="Decrease water amount by 10 millilitres" ${ui.waterAmount<=10 ? 'disabled' : ''}>−</button><button type="button" class="btn btn-soft water-log-button" data-action="add-water">+ ${ui.waterAmount} ml Water</button><button type="button" class="water-step-button" data-action="water-up" aria-label="Increase water amount by 10 millilitres" ${ui.waterAmount>=5000 ? 'disabled' : ''}>+</button></div><button class="btn btn-ghost drink-add-button" data-action="add-to-meal" data-meal="Liquids">+ Add Drink</button></div>
      <button class="muted-button liquid-custom" data-action="custom-water">Log a different water amount</button>
      ${matching.length ? matching.map(e => {
        const s=stats(e.food,e.amount),photo=safeImage(e.food.image);
        return `<div class="meal-entry"><div class="meal-entry-icon">${photo?`<img src="${esc(photo)}" alt="" loading="lazy"/>`:'💧'}</div><div class="meal-entry-content"><div class="meal-entry-name">${esc(e.food.name)}</div><div class="meal-entry-detail">${pretty(e.amount)} ${esc(e.unit)} · P ${pretty(s.protein)}g · C ${pretty(s.carbs)}g · F ${pretty(s.fat)}g</div></div><div class="meal-entry-action"><strong>${pretty(s.kcal,0)} kcal</strong><button class="tiny-action" data-action="remove-entry" data-id="${esc(e.id)}">Remove</button></div></div>`;
      }).join('') : '<div class="meal-empty">No drinks logged for this day</div>'}
      <p class="liquid-footnote">Fluid totals include entries recorded in ml. Drinks also contribute to daily calories and macros.</p></section>`;
  }

  function renderScan() {
    return `<div class="eyebrow">BARCODE LOOKUP</div><h1 class="page-title">Scan. Check. Log.</h1><p class="page-subtitle">Find nutrition facts with Open Food Facts, then log exactly how much you consumed.</p>
      <section class="scan-panel"><div class="card-header" style="margin-bottom:13px"><span class="section-heading">Camera scanner</span><span class="chip">EAN · UPC</span></div>
      <div class="scanner-frame"><div id="camera-reader"></div><div class="scanner-placeholder" id="scanner-placeholder"><span class="scan-glyph">▤</span>Position the product barcode in the camera view to scan.</div></div>
      <div class="scan-actions"><button class="btn btn-primary" id="scan-barcode">▤ Scan Barcode</button><button class="btn btn-ghost" data-action="open-manual">+ Create Food</button></div>
      <div id="scan-status" class="result-note" aria-live="polite">Camera access requires HTTPS and permission. Manual barcode entry is available below.</div></section>
      <section class="card"><div class="section-heading" style="margin-bottom:11px">Enter barcode manually</div><form id="barcode-form"><div class="code-row"><input id="barcode-input" name="barcode" type="text" inputmode="numeric" autocomplete="off" placeholder="e.g. 3017620422003" maxlength="20" aria-label="Barcode" required/><button type="submit" class="btn btn-primary">Look up</button></div></form>
      <div class="result-note">Try barcode <button class="muted-button" data-action="example-barcode">3017620422003</button> to test a real Open Food Facts lookup.</div></section>
      <div class="info"><div class="info-icon">ⓘ</div><div><strong>Product information may be incomplete.</strong> Data is contributed by the Open Food Facts community. Always check the packaging when accuracy matters, especially for allergens and nutrition labels.</div></div>
      <p class="footnote">Food data: <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener noreferrer" style="color:#ff8b9b">Open Food Facts</a> (ODbL). Barcode lookup requires an internet connection.</p>`;
  }

  function getLibrary() {
    const used = new Set();
    const values=[];
    for (const item of [...state.foods, ...state.recent]) {
      const key=item.id || item.barcode || item.name;
      if (used.has(key)) continue;
      used.add(key); values.push(item);
    }
    return values;
  }
  function renderFoods() {
    const foods = getLibrary();
    return `<div class="eyebrow">PERSONAL FOOD LIBRARY</div><h1 class="page-title">My foods.</h1><p class="page-subtitle">Quickly reuse foods you scanned or added yourself.</p>
      <div class="action-row" style="margin-bottom:17px"><button class="btn btn-primary" data-action="open-manual">+ Create food</button><button class="btn btn-ghost" data-action="go-scan">▤ Scan barcode</button></div>
      <input id="food-search" class="food-search" type="search" placeholder="Search saved foods" aria-label="Search saved foods" style="margin-bottom:15px"/>
      <div class="card-header" style="margin:0 2px 13px"><span class="section-heading">Saved & recent</span><span class="chip">${foods.length} foods</span></div><div id="food-results">${renderFoodResults(foods)}</div>`;
  }
  function renderFoodResults(foods) {
    if(!foods.length) return `<div class="card"><div class="empty"><div class="empty-icon">⊕</div><strong>No foods found</strong><p>Scan your first product or create a food manually.</p><button class="btn btn-primary" data-action="open-manual">Create a food</button></div></div>`;
    return `<div class="food-list">${foods.map(f=>`<div class="food-row" data-action="open-food" data-id="${esc(f.id)}"><div class="food-mini">${f.source==='manual'?'✎':'▤'}</div><div class="food-text"><div class="food-title">${esc(f.name)}</div><div class="food-meta">${esc(f.brand||'')}${f.brand?' · ':''}${pretty(f.n?.kcal,0)} kcal / 100 ${esc(f.unit||'g')} · ${f.source==='manual'?'Manual':'Open Food Facts'}</div></div>${f.source==='manual' ? `<button class="tiny-action danger" data-action="delete-food" data-id="${esc(f.id)}">Delete</button>` : ''}<span class="food-chevron">›</span></div>`).join('')}</div>`;
  }


  const MACRO_KCAL = {protein:4,carbs:4,fat:9};
  const MACRO_TITLES = {protein:'Protein',carbs:'Carbohydrates',fat:'Fat'};
  const MACRO_COLORS = {protein:'#79b7f5',carbs:'#f5b75d',fat:'#c18cea'};
  const MACRO_KEYS = ['protein','carbs','fat'];

  function readTargetForm(form) {
    const result={};
    for(const key of ['kcal','protein','carbs','fat']) {
      const raw=String(form.elements[key].value).trim();
      result[key]=raw===''?NaN:Number(raw);
    }
    return result;
  }
  function balanceTargetInputs(form, edited='carbs') {
    const v=readTargetForm(form);
    if(!Object.values(v).every(n=>Number.isFinite(n)&&n>=0)||v.kcal<=0)return;
    // Preserve the value being edited: if fat is edited, balance carbs instead.
    const adjust=edited==='fat'?'carbs':'fat';
    const fixed=MACRO_KEYS.filter(k=>k!==adjust).reduce((sum,k)=>sum+v[k]*MACRO_KCAL[k],0);
    const amount=Math.max(0,Math.round((v.kcal-fixed)/MACRO_KCAL[adjust]));
    form.elements[adjust].value=String(amount);
  }
  function macroBudgetMarkup(v) {
    if(!Object.values(v).every(n=>Number.isFinite(n)&&n>=0)||v.kcal<=0)
      return '<p class="budget-error">Enter a positive calorie target and non-negative macro amounts.</p>';
    const p=v.protein*4,c=v.carbs*4,f=v.fat*9,total=p+c+f,goal=v.kcal,difference=goal-total;
    const base=Math.max(goal,total,1);
    const bound=(n)=>Math.min(100,Math.max(0,n/base*100)).toFixed(2)+'%';
    const a=bound(p),b=bound(p+c),d=bound(p+c+f);
    const gradient='conic-gradient('+MACRO_COLORS.protein+' 0 '+a+','+MACRO_COLORS.carbs+' '+a+' '+b+','+MACRO_COLORS.fat+' '+b+' '+d+',rgba(255,255,255,.10) '+d+' 100%)';
    const category=Math.abs(difference)<=25?'balanced':difference>0?'under':'over';
    const label=category==='balanced'?'Balanced':category==='under'?'Calories remaining':'Over calorie target';
    const summary=category==='balanced'?'Within '+pretty(Math.abs(difference),0)+' kcal':pretty(Math.abs(difference),0)+' kcal';
    const breakdown=MACRO_KEYS.map(k=>{
      const calories=v[k]*MACRO_KCAL[k];
      return '<div class="budget-macro"><span class="budget-dot" style="background:'+MACRO_COLORS[k]+'"></span><span class="budget-macro-name">'+MACRO_TITLES[k]+'</span><strong>'+pretty(v[k],0)+' g</strong><span class="budget-macro-cal">'+pretty(calories,0)+' kcal · '+pretty(calories/goal*100,1)+'%</span></div>';
    }).join('');
    return '<div class="budget-heading"><span class="section-heading">Where your calories go</span><span class="budget-status '+category+'">'+label+'</span></div>'
      +'<div class="budget-visual"><div class="macro-donut" style="background:'+gradient+'"><div class="macro-donut-centre"><strong>'+pretty(total,0)+'</strong><span>of '+pretty(goal,0)+' kcal</span><small>allocated</small></div></div>'
      +'<div class="budget-stats"><div class="budget-remaining">'+summary+'</div><span class="budget-remaining-label">'+label+'</span><div class="budget-track"><div style="width:'+progress(total,goal)+'%"></div></div><small>'+pretty(total/goal*100,1)+'% of daily goal assigned</small></div></div>'
      +'<div class="budget-breakdown">'+breakdown+'</div><p class="field-help budget-footnote">Estimates use 4 kcal/g for protein and carbohydrates, 9 kcal/g for fat. Food labels can differ due to fibre and rounding.</p>';
  }
  function refreshMacroBudget(form,edited='') {
    if(!form)return;
    if(ui.autoBalance)balanceTargetInputs(form,edited);
    const preview=$('#macro-budget-preview');
    if(preview)preview.innerHTML=macroBudgetMarkup(readTargetForm(form));
  }
  function renderTargets() {
    const macroFields=MACRO_KEYS.map(k=>'<label class="field">'+MACRO_TITLES[k]+' (g)<input name="'+k+'" type="number" min="0" max="15000" step="1" value="'+esc(state.goals[k])+'" required/></label>').join('');
    return '<div class="eyebrow">PERSONALISED GOALS</div>'
      +'<div class="page-heading-actions"><div><h1 class="page-title">Your targets.</h1><p class="page-subtitle">Adjust your macros and visualise how they fill your calorie budget.</p></div><button class="btn btn-ghost btn-sm" data-action="back-today">← Today</button></div>'
      +'<section class="card target-card"><form id="goal-form" class="settings-form">'
      +'<div class="section-heading">Daily calorie target</div><div class="form-grid"><label class="field span-2 target-calories">Energy budget (kcal)<input name="kcal" type="number" min="1" max="15000" step="1" value="'+esc(state.goals.kcal)+'" required/></label></div>'
      +'<div class="section-heading target-macro-label">Macronutrient targets</div><div class="form-grid target-macro-fields">'+macroFields+'</div>'
      +'<label class="auto-balance"><input id="auto-balance" type="checkbox" '+(ui.autoBalance?'checked':'')+'/><span><strong>Automatically balance calories</strong><small>Adjusts fat when editing calories, protein or carbs. Adjusts carbs when editing fat.</small></span></label>'
      +'<div id="macro-budget-preview" class="macro-budget-preview" aria-live="polite">'+macroBudgetMarkup(state.goals)+'</div>'
      +'<div class="target-actions"><button type="button" class="btn btn-ghost" data-action="balance-macros">Balance remaining calories</button><button type="submit" class="btn btn-primary">Save targets</button></div>'
      +'</form></section>';
  }
  function renderSettings() {
    const themes=[['red','Spartan Red','Classic red and charcoal'],['gold','Olympian Gold','Gold and charcoal'],['blue','Arctic Blue','Blue and charcoal']];
    return `<div class="eyebrow">APP PREFERENCES</div><h1 class="page-title">Settings.</h1><p class="page-subtitle">Make Nutrition Lab your own and manage your locally saved data.</p>
      <section class="card settings-card"><details open><summary><span class="settings-option-icon">◈</span><span class="settings-option-label"><strong>Appearance</strong><small>Choose a theme</small></span><span class="settings-chevron">⌄</span></summary>
      <div class="settings-detail"><div class="theme-list">${themes.map(([id,name,description])=>`<button class="theme-option ${state.theme===id?'selected':''}" type="button" data-action="set-theme" data-theme="${id}" aria-pressed="${state.theme===id}"><span class="theme-swatch theme-${id}"></span><span><strong>${name}</strong><small>${description}</small></span><span class="theme-check">${state.theme===id?'✓':''}</span></button>`).join('')}</div></div></details></section>
      <section class="card settings-card"><details><summary><span class="settings-option-icon">ⓘ</span><span class="settings-option-label"><strong>About this prototype</strong><small>App details and data sources</small></span><span class="settings-chevron">⌄</span></summary>
      <div class="settings-detail"><p class="page-subtitle">SpartanX Nutrition Lab is an independent testing app. Barcode data comes from Open Food Facts, and some products may have missing nutrients or vitamins and minerals.</p><p class="field-help">Always verify food packaging. Open Food Facts data and images are subject to their respective open licences.</p></div></details></section>
      <section class="card settings-card"><details><summary><span class="settings-option-icon">▤</span><span class="settings-option-label"><strong>Your Data</strong><small>Back up or clear saved diary entries</small></span><span class="settings-chevron">⌄</span></summary>
      <div class="settings-detail"><p class="page-subtitle">${state.entries.length} diary entries · ${state.foods.length} manual foods · ${state.recent.length} scanned/recent foods</p><div class="action-row"><button class="btn btn-ghost" id="export-data">Export backup</button><button class="btn btn-ghost danger" id="clear-data">Clear saved data</button></div><p class="field-help">Nutrition data is stored in this browser, not synced to SpartanX or other devices. Clearing browser data may erase it.</p></div></details></section>`;
  }

  function fromOpenFoodFacts(product, code) {
    const n = product.nutriments || {};
    const val = (...keys) => { for(const k of keys) { const v=numeric(n[k]); if(v!==null) return v; } return null; };
    let kcal = val('energy-kcal_100g');
    let kj = val('energy-kj_100g','energy_100g');
    if(kcal === null && kj !== null) kcal = kj/4.184;
    if(kj === null && kcal !== null) kj = kcal*4.184;
    const servingText = String(product.serving_size||'');
    const match = servingText.match(/(\d+(?:[.,]\d+)?)\s*(ml|g)\b/i);
    const servingAmount = match ? Number(match[1].replace(',','.')) : 100;
    const unit = match?.[2]?.toLowerCase() === 'ml' ? 'ml' : 'g';
    const micros = {};
    for(const [key] of MICRO_MAP) { const v = val(`${key}_100g`); if(v !== null) micros[key]=v; }
    return {
      id: `off:${code}`, barcode: code, name: String(product.product_name_en||product.product_name||product.generic_name||`Product ${code}`).trim(),
      brand: String(product.brands||'').trim(), image: safeImage(product.image_front_small_url||product.image_url||''),
      source:'off', unit, servingAmount: Number.isFinite(servingAmount) && servingAmount > 0 ? servingAmount : 100,
      n:{kcal,kj,protein:val('proteins_100g'),carbs:val('carbohydrates_100g'),fat:val('fat_100g'),
        sugar:val('sugars_100g'),satFat:val('saturated-fat_100g'),fibre:val('fiber_100g','fibre_100g'),
        salt:val('salt_100g'),sodium:val('sodium_100g')}, micros
    };
  }
  function setScanStatus(message, error=false) {
    const status=$('#scan-status'); if(status) {status.innerHTML=message;status.classList.toggle('error',error);}
  }
  async function lookupBarcode(raw) {
    if(ui.scanBusy) return;
    const code = String(raw||'').trim().replace(/\s/g,'');
    if(!/^\d{8,14}$/.test(code)) {toast('Please use an 8–14 digit barcode.');return;}
    ui.scanBusy=true;
    setScanStatus('<span class="loading-spinner"></span> Looking up product in Open Food Facts…');
    await stopCamera();
    try {
      const fields='code,product_name,product_name_en,generic_name,brands,image_front_small_url,image_url,nutriments,serving_size,quantity';
      const url=`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}?fields=${encodeURIComponent(fields)}`;
      const res=await fetch(url,{headers:{Accept:'application/json'},cache:'no-store'});
      if(res.status===404) {notFound(code);return;}
      if(res.status===429) throw new Error('Open Food Facts is rate limiting requests. Try again later.');
      if(!res.ok) throw new Error(`Open Food Facts returned HTTP ${res.status}.`);
      const json=await res.json();
      if(!json.product) {notFound(code);return;}
      const food=fromOpenFoodFacts(json.product,code);
      if(!food.name) {notFound(code);return;}
      addRecent(food);
      setScanStatus(`Found: ${esc(food.name)}`);
      openProduct(food);
    } catch(err) {
      const reason = err && err.message ? err.message : 'Unknown error';
      setScanStatus(`Lookup failed: ${esc(reason)}. Check your connection and try again.`,true);
      toast('Could not reach Open Food Facts.');
    } finally {ui.scanBusy=false;}
  }
  function notFound(code) {
    ui.manualBarcode=code;
    setScanStatus(`Barcode ${esc(code)} was not found. <button class="muted-button" data-action="manual-unfound">Add this product manually</button>.`,true);
  }
  function addRecent(food) {
    state.recent=[food,...state.recent.filter(f=>f.id!==food.id)].slice(0,35);
    persist();
  }
  async function startCamera() {
    if (ui.scannerActive || ui.scanBusy) return;
    if (!window.isSecureContext) {setScanStatus('The camera needs HTTPS. Publish the app using GitHub Pages, or use the barcode field below.',true);return;}
    if (!navigator.mediaDevices?.getUserMedia) {setScanStatus('This browser does not expose camera access. Enter the barcode manually.',true);return;}
    if (typeof Html5Qrcode === 'undefined') {setScanStatus('Camera scanner library did not load. Check your connection or use manual barcode entry.',true);return;}
    try {
      const formats=window.Html5QrcodeSupportedFormats;
      ui.scanner = new Html5Qrcode('camera-reader',{formatsToSupport:formats?[formats.EAN_13,formats.EAN_8,formats.UPC_A,formats.UPC_E]:undefined,verbose:false});
      const placeholder=$('#scanner-placeholder');if(placeholder)placeholder.style.display='none';
      setScanStatus('Requesting camera permission…');
      await ui.scanner.start({facingMode:'environment'}, {fps:10,qrbox:(w,h)=>({width:Math.min(285,Math.max(100,w-28)),height:Math.min(130,Math.max(75,h-26))})}, async(code) => {
        if(ui.scanBusy) return;
        await lookupBarcode(code);
      }, () => {});
      ui.scannerActive=true;
      setScanStatus('Scanner active. Hold a barcode steady in the viewfinder.');
    } catch(e) {
      setScanStatus(`Camera could not start: ${esc(e.message || e)}. Please use the manual barcode entry below.`,true);
      await stopCamera();
    }
  }
  async function stopCamera() {
    const scanner=ui.scanner;
    ui.scanner=null;
    const active=ui.scannerActive;
    ui.scannerActive=false;
    if (scanner) {
      try {if(active) await scanner.stop();} catch {}
      try {scanner.clear();} catch {}
    }
    const placeholder=$('#scanner-placeholder');if(placeholder) placeholder.style.display='';
  }
  function openProduct(food, meal) {
    ui.food=food;
    ui.amount=food.servingAmount||100;
    ui.meal=meal || ui.pendingMeal || (food.unit==='ml' ? 'Liquids' : 'Breakfast');
    ui.pendingMeal=null;
    $('#product-overlay').classList.remove('hidden');
    document.body.style.overflow='hidden';
    renderProduct();
  }
  function closeProduct() {$('#product-overlay').classList.add('hidden');ui.food=null;document.body.style.overflow='';}
  function nutrientRow(label, value, unit='g') {
    return `<div class="nutri-item"><span>${esc(label)}</span><strong>${value===null?'Not available':`${pretty(value,unit==='µg'?2:1)} ${esc(unit)}`}</strong></div>`;
  }
  function renderProduct() {
    const food=ui.food; if(!food)return;
    const n=foodInfo(food);
    const photo=safeImage(food.image);
    const per100=stats(food,100);
    const micros=MICRO_MAP.filter(([key])=>numeric(food.micros?.[key])!==null);
    const notEnough=['kcal','protein','carbs','fat'].filter(k=>n[k]===null || n[k]===undefined);
    $('#product-body').innerHTML = `<div class="product-hero"><div class="product-image">${photo?`<img src="${esc(photo)}" alt="Product packaging"/>`:'▤'}</div><div><div class="eyebrow">${food.source==='off'?'BARCODE RESULT':'SAVED FOOD'}</div><h2 id="product-title" class="product-name">${esc(food.name)}</h2><div class="product-brand">${esc(food.brand||'No brand listed')}</div><div class="product-source">${food.source==='off'?'<span>●</span> Open Food Facts':'✎ Manually entered'}${food.barcode?` · ${esc(food.barcode)}`:''}</div></div></div>
      <div class="card-header" style="margin:11px 0"><div class="section-heading">Per 100 ${esc(food.unit)}</div><span class="tag">NUTRITION FACTS</span></div>
      <div class="product-stat-grid"><div class="product-stat red"><strong>${pretty(per100.kcal,0)}</strong><small>kcal</small></div><div class="product-stat blue"><strong>${pretty(per100.protein)}</strong><small>Protein g</small></div><div class="product-stat gold"><strong>${pretty(per100.carbs)}</strong><small>Carbs g</small></div><div class="product-stat purple"><strong>${pretty(per100.fat)}</strong><small>Fat g</small></div></div>
      ${notEnough.length ? `<p class="footnote danger">Missing values: ${notEnough.map(k=>esc(k)).join(', ')}. Missing values are not assumed to be zero.</p>` : ''}
      <div class="section-line"><h2>Detailed nutrition</h2></div>
      <div class="nutri-list">${nutrientRow('Energy',n.kj,'kJ')}${nutrientRow('Energy',n.kcal,'kcal')}${nutrientRow('Protein',n.protein)}${nutrientRow('Carbohydrates',n.carbs)}${nutrientRow('  of which sugars',n.sugar)}${nutrientRow('Fat',n.fat)}${nutrientRow('  of which saturates',n.satFat)}${nutrientRow('Fibre',n.fibre)}${nutrientRow('Salt',n.salt)}${nutrientRow('Sodium',n.sodium===null?null:n.sodium*1000,'mg')}</div>
      <div class="section-line"><h2>Vitamins & minerals</h2><span class="chip">${micros.length} available</span></div>
      ${micros.length?`<div class="nutri-list">${micros.map(([key,label,unit,factor])=>nutrientRow(label,food.micros[key]*factor,unit)).join('')}</div>`:'<div class="nutri-empty">No vitamin or mineral values are reported for this product. This does not mean the food contains none.</div>'}
      <div class="section-line"><h2>Log to diary</h2></div>
      <div class="portion-form"><label class="field">Amount (${esc(food.unit)})<input id="portion-input" type="number" min="0.1" max="100000" step="any" value="${esc(ui.amount)}" required/></label>
      <label class="field">Meal<select id="meal-select">${MEALS.map(m=>`<option value="${esc(m)}" ${ui.meal===m?'selected':''}>${esc(m)}</option>`).join('')}</select></label></div>
      <div class="portion-preview" id="portion-preview"></div>
      <div class="product-footer"><button class="btn btn-primary btn-block" id="confirm-log">+ Add to food diary</button></div>
      <p class="footnote" style="margin-top:14px">Nutrition is scaled linearly from values per 100 ${esc(food.unit)}. For liquids, Open Food Facts may provide values per 100 g rather than per 100 ml; verify against the packaging before logging.</p>`;
    renderPortionPreview();
  }
  function renderPortionPreview() {
    if(!ui.food)return;
    const portion=stats(ui.food,ui.amount);
    const el=$('#portion-preview'); if(!el)return;
    el.innerHTML=`<div class="row-between"><span>YOUR PORTION</span><span>${pretty(ui.amount)} ${esc(ui.food.unit)}</span></div><div style="margin-top:8px"><strong>${pretty(portion.kcal,0)} kcal</strong> &nbsp;·&nbsp; P ${pretty(portion.protein)}g &nbsp;·&nbsp; C ${pretty(portion.carbs)}g &nbsp;·&nbsp; F ${pretty(portion.fat)}g</div>`;
  }
  function logFood() {
    if(!ui.food)return;
    if(!Number.isFinite(ui.amount)||ui.amount<=0||ui.amount>100000){toast('Enter a valid serving amount.');return;}
    const n=ui.food.n||{};
    if(['kcal','protein','carbs','fat'].every(k=>n[k]===null||n[k]===undefined)) {toast('This record has no usable nutrients. Create a manual food instead.');return;}
    state.entries.push({id:uid(),date:ui.date,meal:ui.meal,amount:ui.amount,unit:ui.food.unit,food:structuredCloneSafe(ui.food),createdAt:Date.now()});
    persist();closeProduct();toast(`Added to ${ui.meal.toLowerCase()} · ${ui.date}`);changeTab('today');
  }
  function addWater(amount=250) {
    state.entries.push({id:uid(),date:ui.date,meal:'Liquids',amount,unit:'ml',food:structuredCloneSafe(WATER_FOOD),createdAt:Date.now()});
    persist();render();toast(`${pretty(amount,0)} ml of water logged.`);
  }
  function structuredCloneSafe(value) {return JSON.parse(JSON.stringify(value));}
  function openManual(barcode='') {
    const form=$('#manual-form');form.reset();form.elements.barcode.value=barcode||'';
    $('#manual-overlay').classList.remove('hidden');document.body.style.overflow='hidden';
    setTimeout(()=>form.elements.name.focus(),80);
  }
  function closeManual() {$('#manual-overlay').classList.add('hidden');document.body.style.overflow='';}
  function saveManual(ev) {
    ev.preventDefault();
    const form=ev.currentTarget;
    if(!form.reportValidity())return;
    const val=(k)=>numeric(form.elements[k].value);
    const food={id:`manual:${uid()}`,barcode:String(form.elements.barcode.value||'').trim(),name:String(form.elements.name.value||'').trim(),brand:String(form.elements.brand.value||'').trim(),image:'',source:'manual',unit:form.elements.unit.value,servingAmount:100,
      n:{kcal:val('kcal'),kj:val('kj')??(val('kcal')!==null?val('kcal')*4.184:null),protein:val('protein'),carbs:val('carbs'),fat:val('fat'),sugar:val('sugar'),satFat:val('satFat'),fibre:val('fibre'),salt:val('salt'),sodium:null},
      micros:{}};
    if(!food.name){toast('Please enter a food name.');return;}
    if(val('calcium')!==null)food.micros.calcium=val('calcium')/1000;
    if(val('iron')!==null)food.micros.iron=val('iron')/1000;
    if(val('vitaminC')!==null)food.micros['vitamin-c']=val('vitaminC')/1000;
    if(val('vitaminB12')!==null)food.micros['vitamin-b12']=val('vitaminB12')/1e6;
    state.foods.unshift(food);persist();closeManual();openProduct(food);toast('Food saved. Select your portion to log it.');
  }
  function exportData() {
    const blob=new Blob([JSON.stringify({app:'SpartanX Nutrition Lab',version:1,exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`spartanx-nutrition-backup-${today()}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2500);
    toast('Backup export started.');
  }
  async function changeTab(tab) {
    if (ui.tab === 'scan' && tab !== 'scan') await stopCamera();
    ui.tab=tab;render();window.scrollTo({top:0,behavior:'instant'});
  }

  document.addEventListener('click',async(ev)=>{
    const tab=ev.target.closest('[data-tab]');if(tab){if(tab.dataset.tab==='scan')ui.pendingMeal=null;await changeTab(tab.dataset.tab);return;}
    const btn=ev.target.closest('[data-action]');
    if(btn){
      const action=btn.dataset.action;
      if(action==='prev-date'||action==='next-date'){ui.date=datePlus(ui.date,action==='prev-date'?-1:1);render();}
      else if(action==='go-scan'){ui.pendingMeal=null;await changeTab('scan');}
      else if(action==='open-targets'){await changeTab('targets');}
      else if(action==='back-today'){await changeTab('today');}
      else if(action==='set-theme'){const theme=btn.dataset.theme;if(THEMES.includes(theme)){state.theme=theme;persist();render();toast('Theme applied.');}}
      else if(action==='open-manual'){openManual();}
      else if(action==='balance-macros'){const form=$('#goal-form');if(form){balanceTargetInputs(form,'carbs');const preview=$('#macro-budget-preview');if(preview)preview.innerHTML=macroBudgetMarkup(readTargetForm(form));toast('Remaining calories balanced.');}}
      else if(action==='water-down'){ui.waterAmount=Math.max(10,ui.waterAmount-10);render();}
      else if(action==='water-up'){ui.waterAmount=Math.min(5000,ui.waterAmount+10);render();}
      else if(action==='add-water'){addWater(ui.waterAmount);}
      else if(action==='custom-water'){openProduct(WATER_FOOD,'Liquids');}
      else if(action==='add-to-meal'){ui.pendingMeal=btn.dataset.meal;await changeTab('scan');}
      else if(action==='example-barcode'){const el=$('#barcode-input');if(el){el.value='3017620422003';await lookupBarcode(el.value);}}
      else if(action==='manual-unfound'){openManual(ui.manualBarcode);}
      else if(action==='open-food'){
        const food=getLibrary().find(f=>f.id===btn.dataset.id);if(food)openProduct(food);
      }
      else if(action==='delete-food'){
        ev.stopPropagation();
        if(confirm('Delete this food from your library? Previously logged diary entries will remain.')){
          state.foods=state.foods.filter(f=>f.id!==btn.dataset.id);persist();render();toast('Food deleted.');
        }
      }
      else if(action==='remove-entry'){
        state.entries=state.entries.filter(e=>e.id!==btn.dataset.id);persist();render();toast('Diary entry removed.');
      }
      return;
    }
    if(ev.target.closest('#header-settings')) {await changeTab('settings');return;}
    if(ev.target.closest('#scan-barcode')) {await startCamera();return;}
    if(ev.target.closest('#close-product')){closeProduct();return;}
    if(ev.target.closest('#close-manual')||ev.target.closest('#cancel-manual')){closeManual();return;}
    if(ev.target.closest('#confirm-log')){logFood();return;}
    if(ev.target.closest('#export-data')){exportData();return;}
    if(ev.target.closest('#clear-data')){
      if(confirm('Delete all local SpartanX Nutrition data on this device? Export a backup first if you want to keep it.')){
        state={entries:[],foods:[],recent:[],goals:{...DEFAULT_GOALS},theme:state.theme};persist();render();toast('Local nutrition data cleared.');
      }return;
    }
  });
  document.addEventListener('submit',(ev)=>{
    if(ev.target.id==='barcode-form'){ev.preventDefault();lookupBarcode($('#barcode-input').value);}
    if(ev.target.id==='manual-form'){saveManual(ev);}
    if(ev.target.id==='goal-form'){
      ev.preventDefault();const form=ev.target;const next={};
      for(const k of ['kcal','protein','carbs','fat']){
        const v=Number(form.elements[k].value);if(!Number.isFinite(v)||v<0||v>15000||(k==='kcal'&&v===0)){toast('Enter a positive calorie goal and non-negative macro values below 15,000.');return;}next[k]=v;
      }
      state.goals=next;persist();render();toast('Daily targets saved.');
    }
  });
  document.addEventListener('change',async(ev)=>{
    const target=ev.target;
    if(target.id==='diary-date'){if(/^\d{4}-\d{2}-\d{2}$/.test(target.value)){ui.date=target.value;render();}}
    if(target.id==='meal-select'){ui.meal=target.value;}
    if(target.id==='auto-balance'){ui.autoBalance=target.checked;refreshMacroBudget(target.form || $('#goal-form'),'carbs');}
  });
  document.addEventListener('input',(ev)=>{
    if(ev.target.closest?.('#goal-form') && ['kcal','protein','carbs','fat'].includes(ev.target.name)) refreshMacroBudget(ev.target.form || $('#goal-form'),ev.target.name);
    if(ev.target.id==='portion-input'){ui.amount=Number(ev.target.value);renderPortionPreview();}
    if(ev.target.id==='food-search'){
      const q=ev.target.value.trim().toLowerCase();const foods=getLibrary().filter(f=>`${f.name} ${f.brand||''} ${f.barcode||''}`.toLowerCase().includes(q));
      const results=$('#food-results');if(results)results.innerHTML=renderFoodResults(foods);
    }
  });
  document.addEventListener('keydown',ev=>{
    if(ev.key==='Escape'){if(!$('#product-overlay').classList.contains('hidden'))closeProduct();else if(!$('#manual-overlay').classList.contains('hidden'))closeManual();}
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&ui.scannerActive)stopCamera();});
  render();
})();