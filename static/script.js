/* ============================================================
   DebateAI — script.js
   ============================================================ */

// ---- Mobile Sidebar Toggle ----
const sidebar        = document.getElementById('sidebar');
const hamburgerBtn   = document.getElementById('hamburger-btn');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar()  { sidebar.classList.add('open');    sidebarOverlay.classList.add('active'); }
function closeSidebar() { sidebar.classList.remove('open'); sidebarOverlay.classList.remove('active'); }

hamburgerBtn.addEventListener('click', () => {
  sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
});
sidebarOverlay.addEventListener('click', closeSidebar);

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
    if (window.innerWidth <= 768) closeSidebar();

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
  await fetch('/clear', { method: 'POST' });

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

  fileLoaded.style.display = 'none';
  uploadZone.style.display = '';
  uploadProg.style.display = 'none';
  setMode(false);
  userInput.value = '';
  userInput.style.height = 'auto';
  showToast('New chat started', 'success');
  if (window.innerWidth <= 768) closeSidebar();
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
  } else {
    bubble.textContent = text;
  }

  wrap.appendChild(label);
  wrap.appendChild(bubble);

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


// ---- Chip helper ----
function fillInput(text) {
  userInput.value = text;
  userInput.focus();
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 180) + 'px';
}
