(() => {
  'use strict';

  const DONATE_URL = '#'; // Replace with your donation URL before publishing.
  const QR_TARGET_URL_LENGTH = 1150;
  const DB_NAME = 'text-list-v0.1';
  const STORE = 'kv';

  const state = {
    rows: [],
    headers: [],
    sourceName: '',
    phoneCol: '',
    displayCols: [],
    mergeCols: [],
    ignoredCols: [],
    template: '',
    previewIndex: 0,
    issueRules: {},
    prepared: [],
    qrChunks: [],
    qrIndex: 0,
    textIndex: 0
  };

  const $ = (id) => document.getElementById(id);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const helpDialog = $('helpDialog');
  const customizeDialog = $('customizeDialog');
  const privacyDialog = $('privacyDialog');
  const donateDialog = $('donateDialog');

  async function loadDisplayedVersion() {
    const targets = $$('[data-app-version]');
    if (!targets.length) return;
    try {
      const response = await fetch('./service-worker.js', { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const source = await response.text();
      const match = source.match(/const\s+APP_VERSION\s*=\s*['"]([^'"]+)['"]/);
      if (!match) throw new Error('APP_VERSION not found');
      targets.forEach(el => { el.textContent = el.classList.contains('version') ? `v${match[1]}` : match[1]; });
    } catch (err) {
      console.warn('Text-o-Matic could not read the app version from the service worker:', err);
      targets.forEach(el => { el.textContent = el.classList.contains('version') ? 'v?' : '?'; });
    }
  }
  loadDisplayedVersion();

  function openHelp() { if (!helpDialog.open) helpDialog.showModal(); }
  $('helpBtn').addEventListener('click', openHelp);
  $('helpDoneBtn').addEventListener('click', () => {
    localStorage.setItem('textList.hideHelp', $('hideHelpCheckbox').checked ? '1' : '0');
  });
  $('privacyFromHelpBtn').addEventListener('click', () => {
    helpDialog.close();
    if (!privacyDialog.open) privacyDialog.showModal();
  });
  $('privacyCloseBtn').addEventListener('click', () => privacyDialog.close());
  $('privacyDoneBtn').addEventListener('click', () => privacyDialog.close());
  if (!location.hash.startsWith('#xfer=') && localStorage.getItem('textList.hideHelp') !== '1') setTimeout(openHelp, 60);

  function parseDelimited(text) {
    text = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    if (!text) return { headers: [], rows: [] };
    const firstLine = text.split('\n')[0] || '';
    const delimiter = firstLine.includes('\t') ? '\t' : ',';
    const records = [];
    let row = [], cell = '', inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (ch === '"') {
        if (inQuotes && text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === delimiter && !inQuotes) {
        row.push(cell); cell = '';
      } else if (ch === '\n' && !inQuotes) {
        row.push(cell); records.push(row); row = []; cell = '';
      } else cell += ch;
    }
    row.push(cell); records.push(row);
    const cleaned = records.filter(r => r.some(v => String(v).trim() !== ''));
    if (!cleaned.length) return { headers: [], rows: [] };

    if (cleaned[0].length === 1) {
      return {
        headers: ['Phone'],
        rows: cleaned.map(r => ({ Phone: (r[0] || '').trim() }))
      };
    }

    let headers = cleaned[0].map((v, i) => String(v || '').trim() || `Column ${i + 1}`);
    const looksHeader = headers.some(h => /phone|cell|mobile|name|first|last|email|event|time|date/i.test(h));
    let dataRows = looksHeader ? cleaned.slice(1) : cleaned;
    if (!looksHeader) headers = headers.map((_, i) => `Column ${i + 1}`);
    const rows = dataRows.map(vals => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = String(vals[i] ?? '').trim(); });
      return obj;
    });
    return { headers, rows };
  }

  function ingest(parsed, sourceName) {
    if (!parsed.rows.length) {
      $('step1Status').textContent = 'I could not find any rows in that list.';
      $('step1Status').className = 'status bad';
      return;
    }
    state.rows = parsed.rows;
    state.headers = parsed.headers;
    state.sourceName = sourceName;
    state.issueRules = {};
    autoMap();
    $('step1Status').textContent = `${state.rows.length.toLocaleString()} rows found.`;
    $('step1Status').className = 'status good';
    buildMappingUI();
    enableStep(2);
    showStep(2);
  }

  function autoMap() {
    const phoneGuess = state.headers.find(h => /(^|\b)(phone|cell|mobile|sms|text)(\b|$)/i.test(h)) || (state.headers.length === 1 ? state.headers[0] : '');
    state.phoneCol = phoneGuess;
    const nameGuesses = state.headers.filter(h => /name|first|last/i.test(h) && h !== phoneGuess).slice(0, 2);
    state.displayCols = nameGuesses;
    state.mergeCols = state.headers.filter(h => h !== phoneGuess);
    state.ignoredCols = [];
  }

  $('parsePasteBtn').addEventListener('click', () => ingest(parseDelimited($('pasteInput').value), 'Pasted list'));
  let selectedFile = null;
  $('csvFile').addEventListener('change', e => {
    selectedFile = e.target.files?.[0] || null;
    $('fileName').textContent = selectedFile ? selectedFile.name : 'No file selected';
    $('parseFileBtn').disabled = !selectedFile;
  });
  $('parseFileBtn').addEventListener('click', async () => {
    if (!selectedFile) return;
    ingest(parseDelimited(await selectedFile.text()), selectedFile.name);
  });

  function buildMappingUI() {
    const area = $('mappingArea');
    area.innerHTML = `
      <div class="status good">${escapeHtml(state.rows.length.toLocaleString())} rows from ${escapeHtml(state.sourceName)}</div>
      <table class="mapping-table">
        <thead><tr><th>Column</th><th>Use as</th></tr></thead>
        <tbody>${state.headers.map((h, i) => `
          <tr>
            <td data-label="Column"><strong>${escapeHtml(h)}</strong><div class="muted">${escapeHtml(sampleValues(h))}</div></td>
            <td data-label="Use as">
              <select class="mapping-select" data-header="${escapeAttr(h)}">
                <option value="merge">Merge field</option>
                <option value="phone" ${h === state.phoneCol ? 'selected' : ''}>Phone number</option>
                <option value="display" ${state.displayCols.includes(h) ? 'selected' : ''}>Display name</option>
                <option value="ignore">Ignore</option>
              </select>
            </td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="mapping-note"><strong>What is “Display name”?</strong> This is what Text-o-Matic will call the recipient on the texting screen. For example, choosing <em>First Name</em> and <em>Last Name</em> will show “Jane Smith.” You can choose more than one display-name column; they will be joined with spaces. Display-name columns can still be used as merge fields in your message.</div>`;
    $$('.mapping-select').forEach(sel => {
      if (sel.value === 'merge' && state.mergeCols.includes(sel.dataset.header)) sel.value = 'merge';
      sel.addEventListener('change', syncMappingsFromUI);
    });
  }

  function sampleValues(h) {
    return state.rows.slice(0, 3).map(r => r[h]).filter(Boolean).join(' · ') || 'No sample values';
  }

  function syncMappingsFromUI() {
    const entries = $$('.mapping-select').map(s => [s.dataset.header, s.value]);
    const phones = entries.filter(([,v]) => v === 'phone').map(([h]) => h);
    if (phones.length > 1) {
      const keep = phones[phones.length - 1];
      $$('.mapping-select').forEach(s => { if (s.dataset.header !== keep && s.value === 'phone') s.value = 'merge'; });
    }
    state.phoneCol = ($$('.mapping-select').find(s => s.value === 'phone') || {}).dataset?.header || '';
    state.displayCols = $$('.mapping-select').filter(s => s.value === 'display').map(s => s.dataset.header);
    state.mergeCols = $$('.mapping-select').filter(s => ['merge','display'].includes(s.value)).map(s => s.dataset.header);
    state.ignoredCols = $$('.mapping-select').filter(s => s.value === 'ignore').map(s => s.dataset.header);
  }

  $('mappingNextBtn').addEventListener('click', async () => {
    syncMappingsFromUI();
    if (!state.phoneCol) return alert('Choose one column to use as the phone number.');
    if (!state.mergeCols.length) state.mergeCols = state.headers.filter(h => h !== state.phoneCol && !state.ignoredCols.includes(h));
    // Start each newly mapped list with deduplication enabled. Previous review
    // overrides should never leak into a remapped phone column.
    Object.keys(state.issueRules).filter(k => k.startsWith('__duplicate__')).forEach(k => delete state.issueRules[k]);
    state.previewIndex = 0;
    buildMergeChips();
    updatePreview();
    enableStep(3); showStep(3);
    await rememberMapping();
  });

  function buildMergeChips() {
    const chips = state.mergeCols.map(h => `<button type="button" class="chip" data-field="${escapeAttr(h)}">{{${escapeHtml(h)}}}</button>`).join('');
    $('mergeChips').innerHTML = chips || '<span class="muted">No merge fields selected.</span>';
    $$('#mergeChips .chip').forEach(b => b.addEventListener('click', () => insertField($('messageTemplate'), b.dataset.field)));
  }

  function insertField(textarea, field) {
    const token = `{{${field}}}`;
    const start = textarea.selectionStart ?? textarea.value.length;
    const end = textarea.selectionEnd ?? textarea.value.length;
    textarea.value = textarea.value.slice(0, start) + token + textarea.value.slice(end);
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + token.length;
    textarea.dispatchEvent(new Event('input'));
  }

  $('messageTemplate').addEventListener('input', () => { state.template = $('messageTemplate').value; updatePreview(); });
  $('prevPreview').addEventListener('click', () => { state.previewIndex = Math.max(0, state.previewIndex - 1); updatePreview(); });
  $('nextPreview').addEventListener('click', () => { state.previewIndex = Math.min(activeRowIndexes().length - 1, state.previewIndex + 1); updatePreview(); });

  function displayName(row) {
    const n = state.displayCols.map(h => row[h]).filter(Boolean).join(' ').trim();
    return n || normalizePhone(row[state.phoneCol]) || 'Unnamed recipient';
  }
  function updatePreview() {
    const indexes = activeRowIndexes();
    if (!indexes.length) return;
    state.previewIndex = Math.min(state.previewIndex, indexes.length - 1);
    const row = state.rows[indexes[state.previewIndex]];
    $('previewName').textContent = displayName(row);
    $('previewCounter').textContent = `${state.previewIndex + 1} / ${indexes.length}`;
    $('messagePreview').textContent = renderTemplate($('messageTemplate').value, row, false);
    $('prevPreview').disabled = state.previewIndex === 0;
    $('nextPreview').disabled = state.previewIndex === indexes.length - 1;
  }

  $('messageNextBtn').addEventListener('click', () => {
    state.template = $('messageTemplate').value;
    if (!state.template.trim()) return alert('Write a message before continuing.');
    buildReview(); enableStep(4); showStep(4);
  });

  function templateFields(template) {
    const fields = new Set();
    template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, f) => { fields.add(f.trim()); return ''; });
    return [...fields];
  }
  function missingFieldsFor(row, template) {
    return templateFields(template).filter(f => !String(row[f] ?? '').trim());
  }
  function issueKey(missing) { return missing.slice().sort().join('|||'); }

  function duplicateKey(phone) { return `__duplicate__${phone}`; }

  function duplicateGroups() {
    if (!state.phoneCol) return [];
    const byPhone = new Map();
    state.rows.forEach((row, idx) => {
      const phone = normalizePhone(row[state.phoneCol]);
      if (!phone) return;
      const key = phone.toLowerCase();
      if (!byPhone.has(key)) byPhone.set(key, { phone, indexes: [] });
      byPhone.get(key).indexes.push(idx);
    });
    return [...byPhone.values()]
      .filter(group => group.indexes.length > 1)
      .map(group => ({ ...group, key: duplicateKey(group.phone.toLowerCase()) }));
  }

  function includedIndexesAfterDedupe() {
    // Default behavior is always to keep the first occurrence of a normalized
    // phone number. A duplicate can only re-enter the active list when the
    // user explicitly chooses “Keep all” in Review.
    const included = new Set();
    const seen = new Map();
    state.rows.forEach((row, idx) => {
      const phone = normalizePhone(row[state.phoneCol]);
      if (!phone) { included.add(idx); return; }
      const key = phone.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, idx);
        included.add(idx);
        return;
      }
      const rule = state.issueRules[duplicateKey(key)];
      if (rule?.type === 'keepAll') included.add(idx);
    });
    return included;
  }

  function activeRowIndexes() {
    return [...includedIndexesAfterDedupe()].sort((a,b) => a-b);
  }

  function analyze() {
    const problems = new Map();
    let ready = 0, missingPhone = [];
    const duplicates = duplicateGroups();
    const included = includedIndexesAfterDedupe();
    state.rows.forEach((row, idx) => {
      if (!included.has(idx)) return;
      const phone = normalizePhone(row[state.phoneCol]);
      if (!phone) { missingPhone.push(idx); return; }
      const missing = missingFieldsFor(row, state.template);
      if (!missing.length) { ready++; return; }
      const key = issueKey(missing);
      if (!problems.has(key)) problems.set(key, { key, fields: missing, indexes: [] });
      problems.get(key).indexes.push(idx);
    });
    const duplicatesRemoved = duplicates.reduce((n, g) => n + (state.issueRules[g.key]?.type === 'keepAll' ? 0 : g.indexes.length - 1), 0);
    return { ready, missingPhone, problems: [...problems.values()], duplicates, duplicatesRemoved };
  }

  function buildReview() {
    const analysis = analyze();
    const unresolvedProblems = analysis.problems.filter(g => !state.issueRules[g.key]);
    const unresolvedPhone = analysis.missingPhone.length && state.issueRules.__missingPhone !== 'exclude';
    const need = unresolvedProblems.reduce((a,g) => a + g.indexes.length, 0) + (unresolvedPhone ? analysis.missingPhone.length : 0);
    $('reviewSummary').innerHTML = `
      <div class="summary-card good"><span>Ready</span><strong>${analysis.ready + resolvedIncludedCount(analysis)}</strong></div>
      <div class="summary-card warn"><span>Need attention</span><strong>${need}</strong></div>
      <div class="summary-card"><span>Duplicates removed</span><strong>${analysis.duplicatesRemoved}</strong></div>
      <div class="summary-card"><span>Total rows</span><strong>${state.rows.length}</strong></div>`;
    const issues = [];
    analysis.duplicates.forEach(g => issues.push(renderDuplicateIssue(g)));
    if (analysis.missingPhone.length) issues.push(renderPhoneIssue(analysis.missingPhone));
    analysis.problems.forEach(g => issues.push(renderMergeIssue(g)));
    $('issueList').innerHTML = issues.join('') || '<div class="status good">Everything looks ready.</div>';
    attachIssueHandlers(analysis);
    buildPrepared();
    renderReadyPreview();
    $('reviewNextBtn').disabled = need > 0;
  }

  function resolvedIncludedCount(analysis) {
    let n = 0;
    analysis.problems.forEach(g => {
      const rule = state.issueRules[g.key];
      if (rule && rule.type !== 'exclude') n += g.indexes.length;
    });
    return n;
  }

  function renderDuplicateIssue(group) {
    const keepAll = state.issueRules[group.key]?.type === 'keepAll';
    const first = state.rows[group.indexes[0]];
    const laterNames = group.indexes.slice(1).map(i => displayName(state.rows[i])).join(', ');
    return `<div class="issue ${keepAll ? '' : 'resolved'}">
      <div class="issue-head"><div><span class="pill">Duplicate phone</span><h3>${group.indexes.length} rows use ${escapeHtml(formatPhoneForDisplay(group.phone))}</h3><p class="muted">${keepAll ? 'All of these rows will be kept.' : `Text-o-Matic will keep the first row (${escapeHtml(displayName(first))}) and exclude ${group.indexes.length - 1} later ${group.indexes.length === 2 ? 'duplicate' : 'duplicates'}${laterNames ? ` (${escapeHtml(laterNames)})` : ''}.`}</p></div>${keepAll ? '' : '<strong>Deduped</strong>'}</div>
      <div class="issue-actions">
        ${keepAll ? `<button class="secondary dedupe-first" data-key="${escapeAttr(group.key)}" type="button">Keep first only</button>` : `<button class="secondary keep-duplicates" data-key="${escapeAttr(group.key)}" type="button">Keep all ${group.indexes.length}</button>`}
      </div>
    </div>`;
  }

  function renderPhoneIssue(indexes) {
    const resolved = state.issueRules.__missingPhone === 'exclude';
    return `<div class="issue ${resolved ? 'resolved' : ''}">
      <div class="issue-head"><div><span class="pill">Phone number</span><h3>${indexes.length} ${indexes.length === 1 ? 'recipient is' : 'recipients are'} missing a phone number</h3><p class="muted">A text cannot be opened without a destination number.</p></div>${resolved ? '<strong>Resolved</strong>' : ''}</div>
      ${resolved ? '<div class="issue-actions"><button class="secondary undo-rule" data-key="__missingPhone" type="button">Change</button></div>' : `<div class="issue-actions"><button class="secondary exclude-phone" type="button">Exclude ${indexes.length}</button></div>`}
    </div>`;
  }

  function renderMergeIssue(group) {
    const rule = state.issueRules[group.key];
    const fieldText = group.fields.map(f => `{{${f}}}`).join(group.fields.length > 1 ? ' and ' : '');
    let resolution = '';
    if (rule?.type === 'blank') resolution = 'Missing fields will be left blank.';
    if (rule?.type === 'exclude') resolution = 'These recipients will be excluded.';
    if (rule?.type === 'custom') resolution = 'A customized message will be used for this group.';
    return `<div class="issue ${rule ? 'resolved' : ''}" data-issue="${escapeAttr(group.key)}">
      <div class="issue-head"><div><span class="pill">Merge field</span><h3>${group.indexes.length} ${group.indexes.length === 1 ? 'recipient is' : 'recipients are'} missing ${escapeHtml(fieldText)}</h3><p class="muted">${rule ? escapeHtml(resolution) : 'Choose how to handle the message for this group.'}</p></div>${rule ? '<strong>Resolved</strong>' : ''}</div>
      <div class="issue-actions">
        ${rule ? `<button class="secondary undo-rule" data-key="${escapeAttr(group.key)}" type="button">Change</button>` : `
          <button class="primary customize-rule" data-key="${escapeAttr(group.key)}" type="button">Customize message</button>
          <button class="secondary blank-rule" data-key="${escapeAttr(group.key)}" type="button">Leave blank</button>
          <button class="secondary exclude-rule" data-key="${escapeAttr(group.key)}" type="button">Exclude ${group.indexes.length}</button>`}
      </div>
    </div>`;
  }

  function attachIssueHandlers(analysis) {
    $$('.keep-duplicates').forEach(b => b.addEventListener('click', () => { state.issueRules[b.dataset.key] = { type:'keepAll' }; buildReview(); }));
    $$('.dedupe-first').forEach(b => b.addEventListener('click', () => { delete state.issueRules[b.dataset.key]; buildReview(); }));
    $$('.exclude-phone').forEach(b => b.addEventListener('click', () => { state.issueRules.__missingPhone = 'exclude'; buildReview(); }));
    $$('.undo-rule').forEach(b => b.addEventListener('click', () => { delete state.issueRules[b.dataset.key]; buildReview(); }));
    $$('.blank-rule').forEach(b => b.addEventListener('click', () => { state.issueRules[b.dataset.key] = { type:'blank' }; buildReview(); }));
    $$('.exclude-rule').forEach(b => b.addEventListener('click', () => { state.issueRules[b.dataset.key] = { type:'exclude' }; buildReview(); }));
    $$('.customize-rule').forEach(b => b.addEventListener('click', () => {
      const group = analysis.problems.find(g => g.key === b.dataset.key);
      openCustomize(group);
    }));
  }

  let customizeGroup = null;
  function openCustomize(group) {
    customizeGroup = group;
    $('customizeTitle').textContent = `Customize for ${group.indexes.length} ${group.indexes.length === 1 ? 'recipient' : 'recipients'}`;
    $('customizeDescription').textContent = `This group is missing ${group.fields.map(f => `{{${f}}}`).join(' and ')}. Edit the existing message below. The change will apply only to this group.`;
    $('customizeTemplate').value = state.template;
    $('customizeChips').innerHTML = state.mergeCols.map(h => `<button class="chip" type="button" data-field="${escapeAttr(h)}">{{${escapeHtml(h)}}}</button>`).join('');
    $$('#customizeChips .chip').forEach(b => b.addEventListener('click', () => insertField($('customizeTemplate'), b.dataset.field)));
    customizeDialog.showModal();
  }
  $('customizeClose').addEventListener('click', () => customizeDialog.close());
  $('customizeCancel').addEventListener('click', () => customizeDialog.close());
  $('customizeSave').addEventListener('click', () => {
    if (!customizeGroup) return;
    state.issueRules[customizeGroup.key] = { type:'custom', template:$('customizeTemplate').value };
    customizeDialog.close();
    buildReview();
  });

  function buildPrepared() {
    const list = [];
    const included = includedIndexesAfterDedupe();
    state.rows.forEach((row, idx) => {
      if (!included.has(idx)) return;
      const phone = normalizePhone(row[state.phoneCol]);
      if (!phone) return;
      const missing = missingFieldsFor(row, state.template);
      let template = state.template;
      if (missing.length) {
        const rule = state.issueRules[issueKey(missing)];
        if (!rule || rule.type === 'exclude') return;
        if (rule.type === 'custom') template = rule.template;
      }
      list.push({ id: idx, name: displayName(row), phone, message: renderTemplate(template, row, true), done: false });
    });
    state.prepared = list;
  }

  function renderReadyPreview() {
    if (!state.prepared.length) { $('readyPreview').innerHTML = ''; return; }
    $('readyPreview').innerHTML = `<div class="ready-list"><h3>${state.prepared.length} messages ready</h3>${state.prepared.slice(0,5).map(r => `<div class="recipient-row"><div><strong>${escapeHtml(r.name)}</strong><p>${escapeHtml(r.message)}</p></div><span class="muted">${escapeHtml(r.phone)}</span></div>`).join('')}${state.prepared.length > 5 ? `<p class="muted">And ${state.prepared.length - 5} more…</p>` : ''}</div>`;
  }

  $('reviewNextBtn').addEventListener('click', async () => {
    buildPrepared();
    if (!state.prepared.length) return alert('No recipients are ready to text.');
    enableStep(5); showStep(5); await incrementStat('campaignsCreated', 1); await incrementStat('recipientsPrepared', state.prepared.length);
    renderStep5Choice();
  });

  function renderStep5Choice() {
    $('textChoice').classList.remove('hidden'); $('textingView').classList.add('hidden'); $('qrView').classList.add('hidden');
    const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    $('startHereBtn').textContent = mobile ? 'Start texting' : 'Use this device';
    $('qrEstimate').textContent = 'Create one or more QR codes that reconstruct the prepared list on the other device.';
  }

  $('startHereBtn').addEventListener('click', () => startTexting(state.prepared));

  function startTexting(list) {
    state.prepared = list;
    state.textIndex = Math.max(0, list.findIndex(r => !r.done));
    if (state.textIndex < 0) state.textIndex = 0;
    $('textChoice').classList.add('hidden'); $('qrView').classList.add('hidden'); $('textingView').classList.remove('hidden');
    renderTexting();
  }

  function renderTexting() {
    const host = $('textingView');
    const list = state.prepared;
    if (!list.length) { host.innerHTML = '<p>No recipients available.</p>'; return; }
    const r = list[state.textIndex];
    const completed = list.filter(x => x.done).length;
    host.innerHTML = `<div class="texting-card">
      <div class="progress-line"><span>${state.textIndex + 1} of ${list.length}</span><span>${completed} opened</span></div>
      <h3>${escapeHtml(r.name)}</h3><p class="muted">${escapeHtml(r.phone)}</p>
      <div class="message-box">${escapeHtml(r.message)}</div>
      <div class="issue-actions">
        <a id="smsOpenLink" class="button primary" href="${escapeAttr(smsHref(r.phone, r.message))}">Open text message</a>
        <button id="skipTextBtn" class="secondary" type="button">Skip</button>
        <button id="showRecipientListBtn" class="secondary" type="button">Recipient list</button>
      </div>
    </div>`;
    $('smsOpenLink').addEventListener('click', async () => {
      r.done = true; await incrementStat('smsLinksOpened', 1); maybeDonationPrompt();
      setTimeout(() => advanceText(), 350);
    });
    $('skipTextBtn').addEventListener('click', advanceText);
    $('showRecipientListBtn').addEventListener('click', renderRecipientList);
  }

  function advanceText() {
    if (state.textIndex < state.prepared.length - 1) state.textIndex++;
    else {
      const next = state.prepared.findIndex(x => !x.done);
      if (next >= 0) state.textIndex = next;
    }
    renderTexting();
  }

  function renderRecipientList() {
    $('textingView').innerHTML = `<div class="texting-card"><div class="progress-line"><strong>Recipients</strong><button id="backSequential" class="secondary" type="button">Sequential view</button></div>${state.prepared.map((r,i) => `<div class="recipient-row"><div><strong>${r.done ? '✓ ' : ''}${escapeHtml(r.name)}</strong><p>${escapeHtml(r.phone)}</p></div><button class="secondary jump-recipient" data-index="${i}" type="button">${r.done ? 'Open again' : 'Open'}</button></div>`).join('')}</div>`;
    $('backSequential').addEventListener('click', renderTexting);
    $$('.jump-recipient').forEach(b => b.addEventListener('click', () => { state.textIndex = Number(b.dataset.index); renderTexting(); }));
  }

  $('prepareQrBtn').addEventListener('click', prepareQrTransfer);

  async function prepareQrTransfer() {
    $('prepareQrBtn').disabled = true; $('prepareQrBtn').textContent = 'Preparing…';
    try {
      if (typeof QRCode === 'undefined') throw new Error('The QR-code library did not load. Check your internet connection and reload the page.');
      state.qrChunks = await chunkRecipients(state.prepared);
      state.qrIndex = 0;
      $('textChoice').classList.add('hidden'); $('textingView').classList.add('hidden'); $('qrView').classList.remove('hidden');
      renderQr();
    } catch (err) { alert(err.message || String(err)); }
    finally { $('prepareQrBtn').disabled = false; $('prepareQrBtn').textContent = 'Prepare QR transfer'; }
  }

  async function chunkRecipients(recipients) {
    const transferId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2,8)}`;
    const provisional = [];
    let current = [];
    for (const rec of recipients) {
      const candidate = [...current, compactRecipient(rec)];
      const trial = await makeTransferUrl({ v:1, id:transferId, p:1, n:99, r:candidate });
      if (trial.length > QR_TARGET_URL_LENGTH && current.length) { provisional.push(current); current = [compactRecipient(rec)]; }
      else current = candidate;
    }
    if (current.length) provisional.push(current);
    const total = provisional.length;
    const chunks = [];
    for (let i = 0; i < provisional.length; i++) {
      const payload = { v:1, id:transferId, p:i+1, n:total, r:provisional[i] };
      chunks.push({ payload, url: await makeTransferUrl(payload) });
    }
    return chunks;
  }

  function compactRecipient(r) { return [r.name, r.phone, r.message]; }
  function expandRecipient(a, i) { return { id:i, name:a[0], phone:a[1], message:a[2], done:false }; }

  async function makeTransferUrl(obj) {
    const raw = new TextEncoder().encode(JSON.stringify(obj));
    let bytes = raw, mode = 'u';
    if ('CompressionStream' in window) {
      const cs = new CompressionStream('gzip');
      const writer = cs.writable.getWriter(); writer.write(raw); writer.close();
      bytes = new Uint8Array(await new Response(cs.readable).arrayBuffer()); mode = 'g';
    }
    const encoded = bytesToBase64Url(bytes);
    const base = location.href.split('#')[0];
    return `${base}#xfer=${mode}.${encoded}`;
  }

  async function decodeTransferHash(hash) {
    const m = hash.match(/^#xfer=([ug])\.([A-Za-z0-9_-]+)$/);
    if (!m) return null;
    let bytes = base64UrlToBytes(m[2]);
    if (m[1] === 'g') {
      if (!('DecompressionStream' in window)) throw new Error('This browser cannot decompress the QR transfer.');
      const ds = new DecompressionStream('gzip');
      const writer = ds.writable.getWriter(); writer.write(bytes); writer.close();
      bytes = new Uint8Array(await new Response(ds.readable).arrayBuffer());
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function renderQr() {
    const total = state.qrChunks.length, idx = state.qrIndex, item = state.qrChunks[idx];
    $('qrView').innerHTML = `<div class="qr-wrap">
      <h3>${total === 1 ? 'Scan this code with your other device' : `QR ${idx + 1} of ${total}`}</h3>
      <p class="muted">${total === 1 ? 'The prepared recipient list will open there.' : `Scan each code in order. After the other device says “${idx + 1} of ${total} received,” continue.`}</p>
      <div id="qrcode" aria-label="QR code"></div>
      <div class="qr-nav">
        <button id="qrPrev" class="secondary" type="button" ${idx === 0 ? 'disabled' : ''}>Back</button>
        <span>${idx + 1} / ${total}</span>
        <button id="qrNext" class="primary" type="button" ${idx === total - 1 ? 'disabled' : ''}>Next</button>
      </div>
      ${total >= 8 ? `<div class="transfer-status" style="margin-top:18px">This is a very large transfer and requires ${total} scans. You can continue, or return to Review and divide the list into smaller groups.</div>` : ''}
      <div class="transfer-status" style="margin-top:18px"><strong>Keep this QR code private.</strong> It contains your prepared contact and message data. Treat it like the list itself and don't share or save it.</div>
      <p class="muted" style="margin-top:12px">The data is encoded directly into the QR code and moved between your devices without being uploaded to or exposed on the internet.</p>
    </div>`;
    new QRCode($('qrcode'), { text:item.url, width:280, height:280, correctLevel:QRCode.CorrectLevel.M });
    $('qrPrev').addEventListener('click', () => { state.qrIndex--; renderQr(); });
    $('qrNext').addEventListener('click', () => { state.qrIndex++; renderQr(); });
  }

  async function handleIncomingTransfer() {
    if (!location.hash.startsWith('#xfer=')) return false;
    try {
      const payload = await decodeTransferHash(location.hash);
      if (!payload?.id || !Array.isArray(payload.r)) throw new Error('This QR code does not contain a valid Text-o-Matic transfer.');
      // Remove the encoded transfer payload from the current URL as soon as it has been read.
      history.replaceState(null, '', `${location.pathname}${location.search}`);
      document.querySelector('main').querySelectorAll('.step-panel').forEach(x => x.classList.add('hidden'));
      document.querySelector('.steps').classList.add('hidden');
      const host = $('incomingTransfer'); host.classList.remove('hidden');
      const key = `transfer:${payload.id}`;
      const current = (await idbGet(key)) || { total:payload.n, parts:{} };
      current.total = payload.n; current.parts[String(payload.p)] = payload.r;
      await idbSet(key, current);
      const got = Object.keys(current.parts).length;
      if (got < current.total) {
        host.innerHTML = `<div class="transfer-status"><h2>${got} of ${current.total} received</h2><p>Return to the first device and scan the next QR code.</p></div><p class="muted">You can close this page if needed. The received parts are stored locally on this device.</p>`;
      } else {
        const recipients = [];
        for (let i=1;i<=current.total;i++) (current.parts[String(i)] || []).forEach(a => recipients.push(expandRecipient(a, recipients.length)));
        state.prepared = recipients;
        host.innerHTML = `<div class="transfer-status"><h2>Transfer complete</h2><p>${recipients.length.toLocaleString()} recipients loaded.</p></div><button id="incomingStart" class="primary" type="button">Start texting</button>`;
        $('incomingStart').addEventListener('click', () => {
          host.classList.add('hidden');
          document.querySelector('[data-panel="5"]').classList.remove('hidden');
          startTexting(recipients);
        });
        history.replaceState(null, '', location.pathname + location.search);
      }
      return true;
    } catch (err) {
      $('incomingTransfer').classList.remove('hidden'); $('incomingTransfer').innerHTML = `<h2>Transfer problem</h2><p>${escapeHtml(err.message || String(err))}</p>`;
      return true;
    }
  }

  function renderTemplate(template, row, blanks) {
    return template.replace(/{{\s*([^{}]+?)\s*}}/g, (_, f) => {
      const value = String(row[f.trim()] ?? '');
      return value || (blanks ? '' : `{{${f.trim()}}}`);
    });
  }

  function normalizePhone(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    let digits = raw.replace(/\D/g, '');
    if (digits.length < 7) return '';
    // Treat 10-digit North American numbers and the same number with a leading 1 as identical.
    if (digits.length === 10) digits = `1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
    return raw.startsWith('+') ? `+${digits}` : digits;
  }
  function formatPhoneForDisplay(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
    return phone;
  }
  function smsHref(phone, message) {
    const sep = /iPad|iPhone|iPod/.test(navigator.userAgent) ? '&' : '?';
    return `sms:${phone}${sep}body=${encodeURIComponent(message)}`;
  }

  function resetCurrentSession() {
    state.rows = [];
    state.headers = [];
    state.sourceName = '';
    state.phoneCol = '';
    state.displayCols = [];
    state.mergeCols = [];
    state.ignoredCols = [];
    state.template = '';
    state.previewIndex = 0;
    state.issueRules = {};
    state.prepared = [];
    state.qrChunks = [];
    state.qrIndex = 0;
    state.textIndex = 0;

    selectedFile = null;
    $('pasteInput').value = '';
    $('csvFile').value = '';
    $('fileName').textContent = 'No file selected';
    $('parseFileBtn').disabled = true;
    $('step1Status').textContent = '';
    $('step1Status').className = 'status';
    $('mappingArea').innerHTML = '';
    $('messageTemplate').value = '';
    $('mergeChips').innerHTML = '';
    $('previewName').textContent = '';
    $('previewCounter').textContent = '';
    $('messagePreview').textContent = '';
    $('reviewSummary').innerHTML = '';
    $('issueList').innerHTML = '';
    $('readyPreview').innerHTML = '';
    $('textChoice').classList.remove('hidden');
    $('textingView').classList.add('hidden');
    $('textingView').innerHTML = '';
    $('qrView').classList.add('hidden');
    $('qrView').innerHTML = '';

    $$('.step').forEach((button, idx) => {
      button.disabled = idx !== 0;
      button.classList.remove('complete', 'active');
    });
    showStep(1);
  }

  $('finishBtn').addEventListener('click', resetCurrentSession);

  function showStep(n) {
    $$('.step-panel').forEach(p => p.classList.toggle('hidden', Number(p.dataset.panel) !== n));
    $$('.step').forEach(s => s.classList.toggle('active', Number(s.dataset.step) === n));
    window.scrollTo({ top:0, behavior:'smooth' });
  }
  function enableStep(n) {
    const btn = document.querySelector(`.step[data-step="${n}"]`); if (btn) btn.disabled = false;
    for (let i=1;i<n;i++) document.querySelector(`.step[data-step="${i}"]`)?.classList.add('complete');
  }
  $$('.step').forEach(b => b.addEventListener('click', () => { if (!b.disabled) showStep(Number(b.dataset.step)); }));
  $$('.back-btn').forEach(b => b.addEventListener('click', () => showStep(Number(b.dataset.back))));

  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c])); }
  function escapeAttr(s) { return escapeHtml(s); }
  function bytesToBase64Url(bytes) {
    let bin=''; for (let i=0;i<bytes.length;i+=0x8000) bin += String.fromCharCode(...bytes.subarray(i, i+0x8000));
    return btoa(bin).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function base64UrlToBytes(s) {
    s = s.replace(/-/g,'+').replace(/_/g,'/'); while (s.length % 4) s += '=';
    const bin = atob(s); const out = new Uint8Array(bin.length); for (let i=0;i<bin.length;i++) out[i] = bin.charCodeAt(i); return out;
  }

  function openDb() {
    return new Promise((resolve,reject) => {
      const req = indexedDB.open(DB_NAME,1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
  }
  async function idbGet(key) { const db=await openDb(); return new Promise((res,rej)=>{ const r=db.transaction(STORE).objectStore(STORE).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
  async function idbSet(key,val) { const db=await openDb(); return new Promise((res,rej)=>{ const tx=db.transaction(STORE,'readwrite'); tx.objectStore(STORE).put(val,key); tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error); }); }
  async function incrementStat(key, amount) {
    try {
      const stats = (await idbGet('stats')) || { firstUsed:new Date().toISOString(), campaignsCreated:0, recipientsPrepared:0, smsLinksOpened:0, lastUsed:null, donateMilestoneShown:0 };
      stats[key] = (stats[key] || 0) + amount; stats.lastUsed = new Date().toISOString(); await idbSet('stats', stats); return stats;
    } catch { return null; }
  }
  async function rememberMapping() {
    try { await idbSet('lastMapping', { headers:state.headers, phoneCol:state.phoneCol, displayCols:state.displayCols, mergeCols:state.mergeCols }); } catch {}
  }
  async function maybeDonationPrompt() {
    try {
      if (localStorage.getItem('textList.noDonateAsk') === '1') return;
      const stats = await idbGet('stats'); if (!stats) return;
      const milestones = [1000,5000,10000,25000];
      const milestone = milestones.filter(m => stats.smsLinksOpened >= m && (stats.donateMilestoneShown || 0) < m).pop();
      if (!milestone) return;
      stats.donateMilestoneShown = milestone; await idbSet('stats', stats);
      $('donateTitle').textContent = `You've started more than ${milestone.toLocaleString()} texts with Text-o-Matic!`;
      $('donateText').textContent = 'If this tool has saved you time, consider making a small donation to help keep it available.';
      $('donateLink').href = DONATE_URL;
      donateDialog.showModal();
    } catch {}
  }
  function closeDonate() { if ($('donateNever').checked) localStorage.setItem('textList.noDonateAsk','1'); donateDialog.close(); }
  $('donateClose').addEventListener('click', closeDonate); $('donateLater').addEventListener('click', closeDonate); $('donateLink').addEventListener('click', closeDonate);

  handleIncomingTransfer();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').catch(err => {
        console.warn('Text-o-Matic service worker registration failed:', err);
      });
    });
  }
})();
