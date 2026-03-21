/* ============================================================
   DebateAI — script.js
   ============================================================ */

// ---- Animated Grid Canvas ----
(function () {
  const canvas = document.getElementById('grid-canvas');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let tick = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const size = 50;
    const cols = Math.ceil(canvas.width  / size) + 1;
    const rows = Math.ceil(canvas.height / size) + 1;

    ctx.strokeStyle = 'rgba(0,245,255,0.07)';
    ctx.lineWidth   = 0.5;

    for (let c = 0; c < cols; c++) {
      ctx.beginPath();
      ctx.moveTo(c * size, 0);
      ctx.lineTo(c * size, canvas.height);
      ctx.stroke();
    }
    for (let r = 0; r < rows; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * size);
      ctx.lineTo(canvas.width, r * size);
      ctx.stroke();
    }

    // Subtle moving particle
    tick += 0.008;
    const px = (Math.sin(tick)       * 0.4 + 0.5) * canvas.width;
    const py = (Math.sin(tick * 0.7) * 0.4 + 0.5) * canvas.height;

    const grad = ctx.createRadialGradient(px, py, 0, px, py, 320);
    grad.addColorStop(0,   'rgba(0,245,255,0.06)');
    grad.addColorStop(0.5, 'rgba(124,58,237,0.03)');
    grad.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    requestAnimationFrame(draw);
  }
  draw();
})();


// ---- Markdown renderer (lightweight) ----
function renderMarkdown(text) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Bold / italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Inline code
  html = html.replace(/`(.+?)`/g, '<code>$1</code>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Tables
  html = html.replace(
    /(\|.+\|\n)(\|[-| :]+\|\n)((?:\|.+\|\n?)*)/g,
    function (match, header, sep, body) {
      const heads = header.trim().split('|').filter(Boolean).map(h =>
        `<th>${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').filter(Boolean).map(row => {
        const cells = row.split('|').filter(Boolean).map(c =>
          `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
    }
  );

  // Unordered list
  html = html.replace(/((?:^[\*\-] .+\n?)+)/gm, function (block) {
    const items = block.trim().split('\n').map(l =>
      `<li>${l.replace(/^[\*\-] /, '').trim()}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Paragraphs (wrap non-tagged lines)
  html = html.split('\n').map(line => {
    if (!line.trim()) return '';
    if (/^<(h[1-6]|ul|ol|li|table|thead|tbody|tr|th|td|hr)/.test(line)) return line;
    return `<p>${line}</p>`;
  }).join('\n');

  return html;
}


// ---- Toast ----
function showToast(msg, type = '') {
  let t = document.querySelector('.toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.className = 'toast ' + type;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timeout);
  t._timeout = setTimeout(() => t.classList.remove('show'), 3000);
}


// ---- DOM refs ----
const messagesEl    = document.getElementById('chat-messages');
const welcomeScreen = document.getElementById('welcome-screen');
const userInput     = document.getElementById('user-input');
const sendBtn       = document.getElementById('send-btn');
const fileInput     = document.getElementById('file-input');
const attachInput   = document.getElementById('attach-file-input');
const uploadZone    = document.getElementById('upload-zone');
const uploadTrigger = document.getElementById('upload-trigger');
const uploadProg    = document.getElementById('upload-progress');
const progressFill  = document.getElementById('progress-fill');
const progressLabel = document.getElementById('progress-label');
const fileLoaded    = document.getElementById('file-loaded');
const fileNameDisp  = document.getElementById('file-name-display');
const clearBtn      = document.getElementById('clear-btn');
const modeDot       = document.querySelector('.mode-dot');
const modeText      = document.getElementById('mode-text');
const inputHint     = document.getElementById('input-hint');


// ---- Auto-resize textarea ----
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
});

// ---- Send on Enter (Shift+Enter = newline) ----
userInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);


// ---- Upload handlers ----
// Sidebar upload zone
uploadTrigger.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', e => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) handleFileUpload(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) handleFileUpload(fileInput.files[0]);
});

// Inline attach button in input bar
attachInput.addEventListener('change', () => {
  if (attachInput.files[0]) handleFileUpload(attachInput.files[0]);
});


// ---- Clear source ----
clearBtn.addEventListener('click', async () => {
  await fetch('/clear', { method: 'POST' });
  fileLoaded.style.display = 'none';
  uploadZone.style.display = '';
  setMode(false);
  showToast('Source cleared', 'success');
});


// ---- File upload logic ----
async function handleFileUpload(file) {
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    showToast('Only PDF files supported', 'error');
    return;
  }

  uploadZone.style.display = 'none';
  fileLoaded.style.display = 'none';
  uploadProg.style.display = 'flex';
  progressFill.style.width = '0%';
  progressLabel.textContent = 'Reading PDF…';

  // Animate progress
  const stages = [
    { width: '25%', label: 'Splitting into chunks…', delay: 400 },
    { width: '55%', label: 'Generating embeddings…', delay: 900 },
    { width: '80%', label: 'Building vector store…', delay: 1600 },
    { width: '95%', label: 'Finalising…', delay: 2200 },
  ];

  stages.forEach(s => setTimeout(() => {
    progressFill.style.width = s.width;
    progressLabel.textContent = s.label;
  }, s.delay));

  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch('/upload', { method: 'POST', body: formData });
    const data = await res.json();

    uploadProg.style.display = 'none';

    if (data.error) {
      uploadZone.style.display = '';
      showToast(data.error, 'error');
      return;
    }

    progressFill.style.width = '100%';
    fileNameDisp.textContent = file.name;
    fileLoaded.style.display = 'flex';
    setMode(true);
    showToast(`Loaded ${data.chunks} chunks from "${file.name}"`, 'success');

  } catch (err) {
    uploadProg.style.display = 'none';
    uploadZone.style.display = '';
    showToast('Upload failed: ' + err.message, 'error');
  }
}

function setMode(rag) {
  modeDot.className = 'mode-dot ' + (rag ? 'rag' : 'general');
  modeText.textContent = rag ? 'RAG Mode — PDF loaded' : 'General Mode';
  inputHint.textContent = rag
    ? `Source: ${fileNameDisp.textContent}`
    : 'No source loaded — using general knowledge';
  inputHint.className = 'input-hint ' + (rag ? 'rag-mode' : '');
}


// ---- New Chat ----
document.getElementById('new-chat-btn').addEventListener('click', async () => {
  // Clear RAG state on server
  await fetch('/clear', { method: 'POST' });

  // Clear messages and re-inject welcome screen
  messagesEl.innerHTML = '';
  const welcome = document.createElement('div');
  welcome.className = 'welcome-screen';
  welcome.id = 'welcome-screen';
  welcome.innerHTML = `
    <div class="welcome-glyph">
      <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="40" r="35" stroke="url(#wg2)" stroke-width="0.8" stroke-dasharray="4 3"/>
        <circle cx="40" cy="40" r="22" stroke="url(#wg2)" stroke-width="0.8"/>
        <circle cx="40" cy="40" r="8" fill="url(#wg2)" opacity="0.8"/>
        <line x1="40" y1="5" x2="40" y2="18" stroke="url(#wg2)" stroke-width="1"/>
        <line x1="40" y1="62" x2="40" y2="75" stroke="url(#wg2)" stroke-width="1"/>
        <line x1="5" y1="40" x2="18" y2="40" stroke="url(#wg2)" stroke-width="1"/>
        <line x1="62" y1="40" x2="75" y2="40" stroke="url(#wg2)" stroke-width="1"/>
        <defs>
          <linearGradient id="wg2" x1="0" y1="0" x2="80" y2="80">
            <stop offset="0%" stop-color="#00f5ff"/>
            <stop offset="100%" stop-color="#7c3aed"/>
          </linearGradient>
        </defs>
      </svg>
    </div>
    <h1 class="welcome-title">Ready to Debate</h1>
    <p class="welcome-sub">Ask about any topic — I'll argue both sides with surgical precision.<br/>Optionally load a PDF to ground answers in your document.</p>
    <div class="welcome-chips">
      <button class="chip" onclick="fillInput('Sports and physical education')">Sports</button>
      <button class="chip" onclick="fillInput('Artificial Intelligence ethics')">AI Ethics</button>
      <button class="chip" onclick="fillInput('Social media and society')">Social Media</button>
      <button class="chip" onclick="fillInput('Remote work vs office work')">Remote Work</button>
    </div>
  `;
  messagesEl.appendChild(welcome);

  // Reset file/PDF UI
  fileLoaded.style.display = 'none';
  uploadZone.style.display = '';
  uploadProg.style.display = 'none';
  setMode(false);

  // Clear input
  userInput.value = '';
  userInput.style.height = 'auto';

  showToast('New chat started', 'success');
});


async function sendMessage() {
  const text = userInput.value.trim();
  if (!text) return;

  // Hide welcome
  if (welcomeScreen) welcomeScreen.remove();

  addMessage('user', text);
  userInput.value = '';
  userInput.style.height = 'auto';
  sendBtn.disabled = true;

  // Typing indicator
  const typingId = 'typing-' + Date.now();
  addTyping(typingId);

  try {
    const res  = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();

    removeTyping(typingId);

    if (data.error) {
      addMessage('assistant', '⚠️ ' + data.error);
    } else {
      addMessage('assistant', data.answer, data.source);
    }

  } catch (err) {
    removeTyping(typingId);
    addMessage('assistant', '⚠️ Network error: ' + err.message);
  }

  sendBtn.disabled = false;
}

function addMessage(role, text, source) {
  const wrap = document.createElement('div');
  wrap.className = 'message ' + role;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = role === 'user' ? 'YOU' : 'DEBATEAI';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  if (role === 'assistant') {
    bubble.innerHTML = renderMarkdown(text);
    const hasTables = bubble.querySelectorAll('table').length > 0;

    // ---- Table download button (only when tables exist) ----
    if (hasTables) {
      bubble.style.position = 'relative';
      bubble.querySelectorAll('table').forEach((tbl) => {
        const tblWrap = document.createElement('div');  // FIX: renamed from wrap to tblWrap
        tblWrap.className = 'table-dl-wrap';
        tblWrap.innerHTML = `
          <button class="table-dl-icon-btn" title="Download table">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
          </button>
          <div class="table-dl-dropdown">
            <button class="table-dl-option" data-fmt="csv">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              Export as CSV
            </button>
            <button class="table-dl-option" data-fmt="xlsx">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 17 10 13 12 17"/><polyline points="12 17 14 13 16 17"/></svg>
              Export as Excel
            </button>
            <button class="table-dl-option" data-fmt="png">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Export as PNG
            </button>
            <button class="table-dl-option" data-fmt="pdf">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
              Export as PDF
            </button>
          </div>
        `;
        bubble.appendChild(tblWrap);  // FIX: use tblWrap

        tblWrap.querySelector('.table-dl-icon-btn').addEventListener('click', (e) => {  // FIX: tblWrap
          e.stopPropagation();
          tblWrap.classList.toggle('open');  // FIX: tblWrap
        });
        document.addEventListener('click', () => tblWrap.classList.remove('open'));  // FIX: tblWrap
        tblWrap.querySelectorAll('.table-dl-option').forEach(btn => {  // FIX: tblWrap
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadTable(tbl, btn.dataset.fmt);
            tblWrap.classList.remove('open');  // FIX: tblWrap
          });
        });
      });
    }

    // FIX: removed the else { bubble.textContent = text; } block entirely

  } else {
    bubble.textContent = text;  // for user messages
  }

  wrap.appendChild(label);
  wrap.appendChild(bubble);

  // Copy bar appended AFTER bubble so it sits below it
  if (role === 'assistant') {
    const hasTables = bubble.querySelectorAll('table').length > 0;
    if (!hasTables) {
      const copyBar = document.createElement('div');
      copyBar.className = 'copy-bar';
      copyBar.innerHTML = `
        <button class="copy-btn" title="Copy response">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      `;
      wrap.appendChild(copyBar);

      copyBar.querySelector('.copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(text).then(() => {
          const btn = copyBar.querySelector('.copy-btn');
          btn.classList.add('copied');
          btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
          }, 2000);
        });
      });
    }
  }

  if (source) {
    const tag = document.createElement('div');
    tag.className = 'source-tag';
    tag.innerHTML = `<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${source}`;
    wrap.appendChild(tag);
  }

  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function addTyping(id) {
  const wrap = document.createElement('div');
  wrap.className = 'message assistant';
  wrap.id = id;

  const label = document.createElement('div');
  label.className = 'msg-label';
  label.textContent = 'DEBATEAI';

  const ind = document.createElement('div');
  ind.className = 'typing-indicator';
  ind.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

  wrap.appendChild(label);
  wrap.appendChild(ind);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function removeTyping(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ---- Table Download Engine ----
function tableToMatrix(tbl) {
  const rows = [];
  tbl.querySelectorAll('tr').forEach(tr => {
    const cells = [];
    tr.querySelectorAll('th, td').forEach(td => cells.push(td.innerText.trim()));
    if (cells.length) rows.push(cells);
  });
  return rows;
}

function downloadTable(tbl, fmt) {
  const matrix = tableToMatrix(tbl);
  const ts = Date.now();

  if (fmt === 'csv') {
    const csv = matrix.map(r => r.map(c => `"${c.replace(/"/g,'""')}"`).join(',')).join('\n');
    triggerDownload('data:text/csv;charset=utf-8,' + encodeURIComponent(csv), `debate-table-${ts}.csv`);

  } else if (fmt === 'xlsx') {
    // Build a minimal XLSX using SheetJS loaded from CDN
    if (typeof XLSX === 'undefined') {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = () => doXlsx(matrix, ts);
      document.head.appendChild(s);
    } else {
      doXlsx(matrix, ts);
    }

  } else if (fmt === 'png') {
    doPng(tbl, ts);

  } else if (fmt === 'pdf') {
    doPdf(tbl, ts);
  }
}

function triggerDownload(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.click();
}

function doXlsx(matrix, ts) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(matrix);
  XLSX.utils.book_append_sheet(wb, ws, 'Debate');
  XLSX.writeFile(wb, `debate-table-${ts}.xlsx`);
}

function doPng(tbl, ts) {
  // Clone table into a styled off-screen container and use canvas
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position:fixed; left:-9999px; top:0;
    background:#111820; padding:20px; border-radius:10px;
    font-family:'JetBrains Mono',monospace; font-size:13px; color:#e2e8f0;
  `;
  // Inline-style the cloned table for canvas capture
  const clone = tbl.cloneNode(true);
  clone.style.cssText = 'border-collapse:collapse; width:auto; min-width:400px;';
  clone.querySelectorAll('th').forEach(th => {
    th.style.cssText = 'background:#0d2a2a; color:#00f5ff; padding:8px 14px; border:1px solid rgba(0,245,255,0.2); text-align:left; font-weight:600;';
  });
  clone.querySelectorAll('td').forEach((td, i) => {
    td.style.cssText = 'padding:7px 14px; border:1px solid rgba(0,245,255,0.1); color:#94a3b8; vertical-align:top;';
    if (td.cellIndex === 0) td.style.color = '#a855f7';
  });
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  if (typeof html2canvas === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => captureAndDownload(wrapper, ts);
    document.head.appendChild(s);
  } else {
    captureAndDownload(wrapper, ts);
  }
}

function captureAndDownload(el, ts) {
  html2canvas(el, { backgroundColor: '#111820', scale: 2, useCORS: true }).then(canvas => {
    triggerDownload(canvas.toDataURL('image/png'), `debate-table-${ts}.png`);
    document.body.removeChild(el);
  });
}

function doPdf(tbl, ts) {
  if (typeof window.jspdf === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      s2.onload = () => doPdfRender(tbl, ts);
      document.head.appendChild(s2);
    };
    document.head.appendChild(s);
  } else {
    doPdfRender(tbl, ts);
  }
}

function doPdfRender(tbl, ts) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const matrix = tableToMatrix(tbl);
  const head = [matrix[0]];
  const body = matrix.slice(1);
  const pageWidth = doc.internal.pageSize.getWidth();
  const colCount = head[0].length;
  const colWidth = (pageWidth - 80) / colCount;

  doc.autoTable({
    head,
    body,
    startY: 40,
    margin: { left: 40, right: 40, top: 40, bottom: 40 },
    tableWidth: pageWidth - 80,
    columnStyles: Object.fromEntries(
      Array.from({ length: colCount }, (_, i) => [i, { cellWidth: (pageWidth - 80) / colCount }])
    ),
    styles: {
      font: 'helvetica',
      fontSize: 10,
      cellPadding: 8,
      overflow: 'linebreak',
      valign: 'top',
      minCellHeight: 10,
      textColor: [0, 0, 0],
      lineColor: [180, 180, 180],
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
  });
  doc.save(`debate-table-${ts}.pdf`);
}

// ---- Chip helper ----
function fillInput(text) {
  userInput.value = text;
  userInput.focus();
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
}
