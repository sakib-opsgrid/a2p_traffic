// =============================================
//  A2P Error Report Tool — app.js
//  Infozillion Teletech BD Ltd · Service Assurance
// =============================================

const fileInput    = document.getElementById('fileInput');
const uploadZone   = document.getElementById('uploadZone');
const fileListEl   = document.getElementById('fileList');
const actionRow    = document.getElementById('actionRow');
const generateBtn  = document.getElementById('generateBtn');
const clearBtn     = document.getElementById('clearBtn');
const reportSection= document.getElementById('reportSection');
const reportBody   = document.getElementById('reportBody');
const reportFoot   = document.getElementById('reportFoot');
const exportBtn    = document.getElementById('exportBtn');
const copyBtn      = document.getElementById('copyBtn');
const parsedInfo   = document.getElementById('parsedInfo');
const headerMeta   = document.getElementById('headerMeta');
const toast        = document.getElementById('toast');

// ── State ──
let files = []; // { file, name, date, type }

// =============================================
//  FILENAME PARSER
//  X9_M_20260520_19  → { date:'2026-05-20', type:'MNO' }
//  X9_I_20260520_19  → { date:'2026-05-20', type:'IPTSP' }
// =============================================
function parseFilename(name) {
  // Remove extension
  const base = name.replace(/\.csv$/i, '');
  // Pattern: X9_M_YYYYMMDD_HH  or  X9_I_YYYYMMDD_HH
  const match = base.match(/^X9_(M|I)_(\d{8})_(\d{2})$/i);
  if (!match) return null;

  const typeChar = match[1].toUpperCase();
  const raw      = match[2]; // e.g. 20260520
  const hour     = match[3];

  const year  = raw.slice(0, 4);
  const month = raw.slice(4, 6);
  const day   = raw.slice(6, 8);
  const date  = `${year}-${month}-${day}`;

  const type = typeChar === 'M' ? 'MNO' : 'IPTSP';
  return { date, type, hour };
}

// =============================================
//  FORMAT DATE  2026-05-20 → 20-May-26
// =============================================
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)}-${MONTHS[parseInt(m)-1]}-${y.slice(2)}`;
}

// =============================================
//  CSV PARSER  (handles quoted fields)
// =============================================
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  function splitLine(line) {
    const result = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  }

  const headers = splitLine(lines[0]);
  const rows = lines.slice(1).map(l => splitLine(l));
  return { headers, rows };
}

// =============================================
//  COUNT not-9000 rows
// =============================================
function countErrors(text) {
  const { headers, rows } = parseCSV(text);
  const idx = headers.indexOf('a2pResponseCode');
  if (idx === -1) return { count: 0, error: 'Column a2pResponseCode not found' };

  let count = 0;
  for (const row of rows) {
    const val = row[idx];
    if (val !== undefined && val !== '' && String(val).trim() !== '9000') {
      count++;
    }
  }
  return { count, error: null };
}

// =============================================
//  RENDER FILE LIST
// =============================================
function renderFileList() {
  fileListEl.innerHTML = '';
  files.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    const badgeClass = f.type === 'MNO' ? 'mno' : f.type === 'IPTSP' ? 'iptsp' : 'unknown';
    const dateLabel = f.date ? formatDate(f.date) : '—';
    item.innerHTML = `
      <span class="file-badge ${badgeClass}">${f.type || '?'}</span>
      <span class="file-name">${f.file.name}</span>
      <span class="file-date">${dateLabel} ${f.hour ? '·' + f.hour + ':00' : ''}</span>
      <button class="file-remove" data-index="${i}" title="Remove">×</button>
    `;
    fileListEl.appendChild(item);
  });

  // Remove buttons
  fileListEl.querySelectorAll('.file-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      files.splice(parseInt(btn.dataset.index), 1);
      renderFileList();
      updateActionRow();
    });
  });
}

function updateActionRow() {
  actionRow.style.display = files.length > 0 ? 'flex' : 'none';
  // header meta
  if (files.length > 0) {
    headerMeta.textContent = `${files.length} file${files.length > 1 ? 's' : ''} loaded`;
  } else {
    headerMeta.textContent = '—';
  }
}

// =============================================
//  ADD FILES
// =============================================
function addFiles(newFiles) {
  for (const f of newFiles) {
    // Avoid duplicates by name
    if (files.find(x => x.file.name === f.name)) continue;
    const parsed = parseFilename(f.name);
    files.push({
      file: f,
      date:  parsed ? parsed.date : null,
      type:  parsed ? parsed.type : 'UNKNOWN',
      hour:  parsed ? parsed.hour : null,
    });
  }
  renderFileList();
  updateActionRow();
}

// =============================================
//  GENERATE REPORT
// =============================================
generateBtn.addEventListener('click', async () => {
  if (files.length === 0) return;

  generateBtn.textContent = 'Processing…';
  generateBtn.disabled = true;

  // date → { mno: 0, iptsp: 0 }
  const dateMap = {};

  const fileInfoChips = [];

  for (const f of files) {
    const text = await readFile(f.file);
    const { count, error } = countErrors(text);

    if (error) {
      showToast(`${f.file.name}: ${error}`, 'error');
      continue;
    }

    if (!f.date) {
      showToast(`Filename not recognized: ${f.file.name}`, 'error');
      continue;
    }

    if (!dateMap[f.date]) dateMap[f.date] = { mno: 0, iptsp: 0 };

    if (f.type === 'MNO')   dateMap[f.date].mno   += count;
    if (f.type === 'IPTSP') dateMap[f.date].iptsp += count;

    fileInfoChips.push({ label: `${f.file.name} → ${count.toLocaleString()} errors` });
  }

  generateBtn.textContent = 'Generate Report';
  generateBtn.disabled = false;

  if (Object.keys(dateMap).length === 0) {
    showToast('No valid data to display.', 'error');
    return;
  }

  renderReport(dateMap, fileInfoChips);
});

// =============================================
//  RENDER REPORT TABLE
// =============================================
function renderReport(dateMap, chips) {
  reportBody.innerHTML = '';
  reportFoot.innerHTML = '';
  parsedInfo.innerHTML = '';

  const sortedDates = Object.keys(dateMap).sort();

  let totalMno = 0, totalIptsp = 0;

  for (const date of sortedDates) {
    const { mno, iptsp } = dateMap[date];
    const total = mno + iptsp;
    totalMno   += mno;
    totalIptsp += iptsp;

    const tr = document.createElement('tr');
    const hasData = total > 0;
    tr.className = hasData ? 'has-data' : 'zero-row';
    tr.innerHTML = `
      <td>${formatDate(date)}</td>
      <td class="mno-cell">${mno > 0 ? mno.toLocaleString() : '—'}</td>
      <td class="iptsp-cell">${iptsp > 0 ? iptsp.toLocaleString() : '—'}</td>
      <td class="total-cell">${total > 0 ? total.toLocaleString() : '0'}</td>
    `;
    reportBody.appendChild(tr);
  }

  const grandTotal = totalMno + totalIptsp;
  reportFoot.innerHTML = `
    <tr>
      <td>GRAND TOTAL</td>
      <td class="mno-total">${totalMno.toLocaleString()}</td>
      <td class="iptsp-total">${totalIptsp.toLocaleString()}</td>
      <td class="grand-total">${grandTotal.toLocaleString()}</td>
    </tr>
  `;

  // Chips
  chips.forEach(c => {
    const chip = document.createElement('div');
    chip.className = 'info-chip';
    chip.textContent = c.label;
    parsedInfo.appendChild(chip);
  });

  reportSection.style.display = 'block';
  reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  headerMeta.textContent = `${sortedDates.length} dates · ${(totalMno+totalIptsp).toLocaleString()} total errors`;
  showToast('Report generated successfully', 'success');
}

// =============================================
//  EXPORT CSV
// =============================================
exportBtn.addEventListener('click', () => {
  const rows = reportBody.querySelectorAll('tr');
  let csv = 'DATE,MNO,IPTSP,TOTAL\n';
  rows.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    const vals = Array.from(cells).map(td => {
      const v = td.textContent.trim().replace(/,/g, '');
      return v === '—' ? '0' : v;
    });
    csv += vals.join(',') + '\n';
  });

  // Grand total
  const ft = reportFoot.querySelectorAll('td');
  if (ft.length) {
    const fvals = Array.from(ft).map(td => td.textContent.trim().replace(/,/g, ''));
    csv += fvals.join(',') + '\n';
  }

  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  const today = new Date().toISOString().slice(0, 10);
  a.href     = url;
  a.download = `A2P_Error_Report_${today}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('CSV exported!', 'success');
});

// =============================================
//  COPY TABLE
// =============================================
copyBtn.addEventListener('click', () => {
  const rows = reportBody.querySelectorAll('tr');
  let text = 'DATE\t\tMNO\t\tIPTSP\t\tTOTAL\n';
  rows.forEach(tr => {
    const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
    text += cells.join('\t\t') + '\n';
  });
  navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard!', 'success'));
});

// =============================================
//  CLEAR
// =============================================
clearBtn.addEventListener('click', () => {
  files = [];
  fileInput.value = '';
  renderFileList();
  updateActionRow();
  reportSection.style.display = 'none';
  headerMeta.textContent = '—';
});

// =============================================
//  FILE INPUT EVENTS
// =============================================
fileInput.addEventListener('change', e => addFiles(Array.from(e.target.files)));

uploadZone.addEventListener('click', e => {
  if (!e.target.closest('label')) fileInput.click();
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});

uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));

uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  addFiles(Array.from(e.dataTransfer.files).filter(f => f.name.endsWith('.csv')));
});

// =============================================
//  HELPERS
// =============================================
function readFile(file) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload  = e => res(e.target.result);
    reader.onerror = () => rej(new Error('Read failed'));
    reader.readAsText(file);
  });
}

let toastTimer;
function showToast(msg, type = '') {
  toast.textContent = msg;
  toast.className   = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.className = 'toast', 3000);
}
