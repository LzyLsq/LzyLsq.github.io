/* Private, device-local habit diary. No sample data and no network calls. */
(function () {
  'use strict';
  var KEY = 'ryan-habits-v1';
  var data = { version: 1, sleep: [], workouts: [], goals: [] };
  var unreadable = false;
  var editing = { sleep: null, workouts: null, goals: null };
  var message = document.getElementById('habit-message');
  var forms = { sleep: document.getElementById('sleep-form'), workouts: document.getElementById('workout-form'), goals: document.getElementById('goal-form') };
  var lists = { sleep: document.getElementById('sleep-list'), workouts: document.getElementById('workout-list'), goals: document.getElementById('goal-list') };
  var chart = document.getElementById('habit-chart');
  if (!forms.sleep) { return; }
  function tell(text, error) { message.textContent = text; message.classList.toggle('is-error', !!error); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function day(date) { return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()); }
  function localDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) { return null; }
    var d = new Date(value + 'T12:00:00'); return Number.isFinite(d.getTime()) && day(d) === value ? d : null;
  }
  function moment(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) { return null; }
    var d = new Date(value); return Number.isFinite(d.getTime()) && day(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()) === value ? d : null;
  }
  function stamp(d) { return day(d) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function id() { return (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2); }
  function validate(input) {
    if (!input || input.version !== 1 || !Array.isArray(input.sleep) || !Array.isArray(input.workouts) || !Array.isArray(input.goals)) { throw new Error('备份格式不符合本站的习惯小记格式。'); }
    if ([input.sleep, input.workouts, input.goals].some(function (a) { return a.length > 5000; })) { throw new Error('记录数量过多，无法导入。'); }
    var seen = new Set(), now = Date.now();
    function unique(item) { if (!item || typeof item.id !== 'string' || !item.id || item.id.length > 100 || seen.has(item.id)) { throw new Error('记录编号缺失或重复。'); } seen.add(item.id); }
    input.sleep.forEach(function (r) { unique(r); var b = moment(r.bed), w = moment(r.wake); if (!b || !w || w <= b || w-b > 24*3600000 || w.getTime() > now + 60000) { throw new Error('睡眠时间无效。'); } });
    input.workouts.forEach(function (r) { unique(r); if (!localDate(r.date) || r.date > day(new Date()) || (r.minutes !== null && (!Number.isInteger(r.minutes) || r.minutes < 1 || r.minutes > 1440)) || typeof r.note !== 'string' || r.note.length > 120) { throw new Error('健身记录无效。'); } });
    input.goals.forEach(function (r) { unique(r); if (typeof r.title !== 'string' || !r.title.trim() || r.title.length > 100 || (r.due !== '' && !localDate(r.due)) || typeof r.done !== 'boolean') { throw new Error('目标记录无效。'); } });
    if (new Set(input.sleep.map(function (r) { return r.wake.slice(0,10); })).size !== input.sleep.length || new Set(input.workouts.map(function (r) { return r.date; })).size !== input.workouts.length) { throw new Error('备份包含重复日期。'); }
    return { version: 1, sleep: input.sleep.map(function (r) { return { id: r.id, bed: r.bed, wake: r.wake }; }), workouts: input.workouts.map(function (r) { return { id: r.id, date: r.date, minutes: r.minutes, note: r.note }; }), goals: input.goals.map(function (r) { return { id: r.id, title: r.title.trim(), due: r.due, done: r.done }; }) };
  }
  function save(next, restoring) {
    if (unreadable && !restoring) { tell('已有数据无法读取，请先导入有效备份，避免覆盖原记录。', true); return false; }
    try { localStorage.setItem(KEY, JSON.stringify(next)); data = next; unreadable = false; Object.values(forms).forEach(function (form) { form.querySelector('[data-save]').disabled = false; }); document.getElementById('export-habits').disabled = false; render(); return true; }
    catch (e) { tell('没有保存成功：此浏览器可能禁用了本地存储或空间已满。请检查浏览器设置。', true); return false; }
  }
  try { var raw = localStorage.getItem(KEY); if (raw) { data = validate(JSON.parse(raw)); } }
  catch (e) { unreadable = true; tell('已有记录无法读取；为避免覆盖，已暂停保存。可通过导入有效备份恢复，或检查浏览器数据。', true); Object.values(forms).forEach(function (form) { form.querySelector('[data-save]').disabled = true; }); document.getElementById('export-habits').disabled = true; }
  function duration(r) { return Math.round((moment(r.wake) - moment(r.bed))/60000); }
  function length(minutes) { return Math.floor(minutes/60) + '小时' + (minutes%60 ? pad(minutes%60) + '分' : ''); }
  function button(text, action, idValue) { var b = document.createElement('button'); b.type = 'button'; b.textContent = text; b.dataset.action = action; b.dataset.id = idValue; return b; }
  function renderList(kind) {
    var node = lists[kind]; node.replaceChildren();
    var entries = data[kind].slice().sort(function (a,b) { return kind === 'sleep' ? b.wake.localeCompare(a.wake) : kind === 'workouts' ? b.date.localeCompare(a.date) : Number(a.done) - Number(b.done); });
    if (!entries.length) { var empty = document.createElement('p'); empty.className = 'habit-empty'; empty.textContent = kind === 'sleep' ? '还没有睡眠记录，填入真实的入睡和起床时间吧。' : kind === 'workouts' ? '还没有健身打卡。' : '还没有目标，先写下一件想做的事。'; node.append(empty); return; }
    entries.forEach(function (r) {
      var row = document.createElement('div'), copy = document.createElement('div'), title = document.createElement('strong'), sub = document.createElement('small'), actions = document.createElement('div');
      row.className = 'habit-entry' + (r.done ? ' is-done' : ''); actions.className = 'habit-entry-actions';
      if (kind === 'sleep') { title.textContent = r.wake.slice(0,10) + ' · ' + length(duration(r)); sub.textContent = r.bed.replace('T',' ') + ' → ' + r.wake.replace('T',' '); }
      else if (kind === 'workouts') { title.textContent = r.date + ' · 已打卡' + (r.minutes ? ' · ' + r.minutes + ' 分钟' : ''); sub.textContent = r.note || '没有添加备注'; }
      else { title.textContent = (r.done ? '✓ ' : '○ ') + r.title; sub.textContent = r.done ? '已完成' : (r.due ? '目标日期：' + r.due : '进行中'); actions.append(button(r.done ? '恢复' : '完成', 'toggle', r.id)); }
      copy.append(title,sub); actions.append(button('编辑','edit',r.id),button('删除','delete',r.id)); row.append(copy,actions); node.append(row);
    });
  }
  function renderChart() {
    chart.replaceChildren(); var today = new Date(), days = [], max = 12*60;
    for (var i=6;i>=0;i--) { var d = new Date(today.getFullYear(),today.getMonth(),today.getDate()-i,12); var record = data.sleep.find(function (r) { return r.wake.slice(0,10) === day(d); }); days.push({ date:d, record:record }); if (record) { max = Math.max(max,duration(record)); } }
    max = Math.ceil(max/240)*240;
    days.forEach(function (entry) {
      var r = entry.record, row = document.createElement('div'), label = document.createElement('span'), track = document.createElement('span'), fill = document.createElement('span'), value = document.createElement('strong'), time = document.createElement('span');
      row.className = 'habit-chart-row' + (r ? ' has-data' : ''); label.className = 'habit-chart-day'; label.textContent = pad(entry.date.getMonth()+1) + '/' + pad(entry.date.getDate());
      track.className = 'habit-chart-track'; fill.className = 'habit-chart-fill'; fill.style.setProperty('--width',r ? (duration(r)/max*100).toFixed(2)+'%' : '0%'); track.append(fill);
      value.className = 'habit-chart-value'; value.textContent = r ? length(duration(r)) : '未记录';
      time.className = 'habit-chart-time'; time.textContent = r ? r.bed.replace('T',' ') + ' → ' + r.wake.replace('T',' ') : '—';
      row.append(label,track,value,time); chart.append(row);
    });
    var scale = document.createElement('div'); scale.className = 'habit-chart-scale'; [0,.25,.5,.75,1].forEach(function (n) { var tick = document.createElement('span'); tick.textContent = Math.round(max*n/60) + 'h'; scale.append(tick); }); chart.append(scale);
    chart.setAttribute('aria-label','最近七天睡眠时长图，最大刻度 ' + max/60 + ' 小时。' + days.map(function (e) { return day(e.date) + '：' + (e.record ? length(duration(e.record)) + '，' + e.record.bed.replace('T',' ') + ' 到 ' + e.record.wake.replace('T',' ') : '未记录'); }).join('；'));
    document.getElementById('habit-chart-note').textContent = '横轴 0–' + max/60 + ' 小时；按起床日期统计，只展示本机真实记录。';
  }
  function render() { renderChart(); Object.keys(lists).forEach(renderList); document.getElementById('goal-count').textContent = data.goals.filter(function (g) { return g.done; }).length + ' / ' + data.goals.length + ' 已完成'; }
  function reset(kind) { var form = forms[kind]; form.reset(); editing[kind] = null; form.querySelector('[data-cancel]').hidden = true; form.querySelector('[data-save]').textContent = {sleep:'保存睡眠记录',workouts:'保存健身打卡',goals:'添加目标'}[kind]; if (kind === 'workouts') { form.elements.date.value = day(new Date()); } }
  forms.workouts.elements.date.value = day(new Date());
  Object.keys(forms).forEach(function (kind) {
    forms[kind].querySelector('[data-cancel]').addEventListener('click', function () { reset(kind); tell('已取消编辑。'); });
    forms[kind].addEventListener('submit', function (event) {
      event.preventDefault(); var f = forms[kind], r, old = editing[kind], now = new Date();
      if (kind === 'sleep') {
        var bed = f.elements.bed.value, wake = f.elements.wake.value, b = moment(bed), w = moment(wake);
        if (!b || !w || w <= b || w-b > 24*3600000 || w > now) { tell('请检查时间：起床要晚于入睡，最长 24 小时，且不能晚于现在。',true); return; }
        if (data.sleep.some(function (x) { return x.id !== old && x.wake.slice(0,10) === wake.slice(0,10); })) { tell('这一天已有睡眠记录，请编辑现有记录。',true); return; }
        r = {id:old || id(),bed:bed,wake:wake};
      } else if (kind === 'workouts') {
        var date = f.elements.date.value, min = f.elements.minutes.value.trim(), minutes = min === '' ? null : Number(min), note = f.elements.note.value.trim();
        if (!localDate(date) || date > day(now) || (min !== '' && (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440))) { tell('请检查运动日期和时长：不能填未来日期，时长限 1–1440 分钟。',true); return; }
        if (data.workouts.some(function (x) { return x.id !== old && x.date === date; })) { tell('这一天已经打卡，可以编辑已有记录。',true); return; }
        r = {id:old || id(),date:date,minutes:minutes,note:note};
      } else { var title = f.elements.title.value.trim(), due = f.elements.due.value; if (!title || title.length > 100 || (due && !localDate(due))) { tell('请填写有效目标内容与日期。',true); return; } var prev = data.goals.find(function (g) { return g.id === old; }); r = {id:old || id(),title:title,due:due,done:prev ? prev.done : false}; }
      var next = Object.assign({},data); next[kind] = old ? data[kind].map(function (entry) { return entry.id === old ? r : entry; }) : data[kind].concat(r);
      if (save(next)) { reset(kind); tell(old ? '已更新记录。' : '已保存记录，仅在此浏览器可见。'); }
    });
    lists[kind].addEventListener('click', function (event) {
      var btn = event.target.closest('button[data-action]'); if (!btn) { return; }
      var item = data[kind].find(function (r) { return r.id === btn.dataset.id; }); if (!item) { return; }
      if (btn.dataset.action === 'edit') {
        editing[kind] = item.id; var f = forms[kind];
        if (kind === 'sleep') { f.elements.bed.value = item.bed; f.elements.wake.value = item.wake; }
        else if (kind === 'workouts') { f.elements.date.value = item.date; f.elements.minutes.value = item.minutes || ''; f.elements.note.value = item.note; }
        else { f.elements.title.value = item.title; f.elements.due.value = item.due; }
        f.querySelector('[data-save]').textContent = '保存修改'; f.querySelector('[data-cancel]').hidden = false; f.scrollIntoView({behavior:'auto',block:'center'}); f.querySelector('input').focus(); tell('正在编辑记录，修改后请保存。'); return;
      }
      if (btn.dataset.action === 'delete' && !confirm('确定删除这条记录吗？删除后无法撤销。')) { return; }
      var next = Object.assign({},data);
      next[kind] = btn.dataset.action === 'delete' ? data[kind].filter(function (r) { return r.id !== item.id; }) : data[kind].map(function (r) { return r.id === item.id ? Object.assign({},r,{done:!r.done}) : r; });
      if (save(next)) { if (editing[kind] === item.id) { reset(kind); } tell(btn.dataset.action === 'delete' ? '已删除记录。' : '目标状态已更新。'); }
    });
  });
  document.getElementById('export-habits').addEventListener('click', function () {
    try { var blob = new Blob([JSON.stringify(data,null,2)],{type:'application/json'}), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'ryan-habits-' + day(new Date()) + '.json'; a.click(); setTimeout(function () { URL.revokeObjectURL(url); },60000); tell('备份文件已准备下载，请妥善保管。'); }
    catch (e) { tell('无法导出备份，请检查浏览器下载权限。',true); }
  });
  document.getElementById('import-habits').addEventListener('click', function () { document.getElementById('import-file').click(); });
  document.getElementById('import-file').addEventListener('change', async function (event) {
    var file = event.target.files[0]; event.target.value = ''; if (!file) { return; }
    if (file.size > 2*1024*1024) { tell('备份文件超过 2 MB，未导入。',true); return; }
    try { var incoming = validate(JSON.parse(await file.text())); if (!confirm('导入会覆盖此浏览器当前的全部习惯记录。建议先导出当前备份。确定继续吗？')) { return; } if (save(incoming, true)) { Object.keys(forms).forEach(reset); tell('已导入备份，仅在此浏览器可见。'); } }
    catch (e) { tell('导入失败：' + (e instanceof SyntaxError ? '文件不是有效 JSON。' : e.message),true); }
  });
  if (!unreadable) { render(); if (data.sleep.length || data.workouts.length || data.goals.length) { tell('已从当前浏览器读取习惯记录。'); } }
  window.addEventListener('storage', function (event) {
    if (event.key !== KEY) { return; }
    try { data = event.newValue ? validate(JSON.parse(event.newValue)) : {version:1,sleep:[],workouts:[],goals:[]}; unreadable = false; Object.keys(forms).forEach(function (kind) { reset(kind); forms[kind].querySelector('[data-save]').disabled = false; }); document.getElementById('export-habits').disabled = false; render(); tell(event.newValue ? '另一个标签页更新了习惯记录，已同步显示。' : '记录已从另一个标签页清除。'); }
    catch (e) { unreadable = true; Object.values(forms).forEach(function (form) { form.querySelector('[data-save]').disabled = true; }); document.getElementById('export-habits').disabled = true; tell('另一个标签页写入了无法读取的记录，已暂停保存。', true); }
  });
})();
