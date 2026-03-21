const socket = io('http://localhost:5000');
let currentSession = null;

function toggleQR() {
  const box = document.getElementById('qrBox');
  if (box.style.display === 'none' || box.style.display === '') {
    box.style.display = 'flex';
  } else {
    box.style.display = 'none';
  }
}

function openLoginModal() {
  document.getElementById('loginModal').style.display = 'flex';
}

function closeLoginModal() {
  document.getElementById('loginModal').style.display = 'none';
}

function submitLogin() {
  closeLoginModal();
  document.getElementById('successPopup').style.display = 'flex';
}

function closeSuccessPopup() {
  document.getElementById('successPopup').style.display = 'none';
}

async function createSession() {
  const res = await fetch('http://localhost:5000/create-session', { method: 'POST' });
  const data = await res.json();

  currentSession = data.sessionId;
  document.getElementById('sessionId').innerText = 'SESSION CODE: ' + currentSession;

  startChat();
}

async function joinSession() {
  const sessionId = document.getElementById('sessionInput').value.trim().toUpperCase();
  if (!sessionId) return alert('Please enter a session code');

  const res = await fetch('http://localhost:5000/join-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId })
  });

  const data = await res.json();

  if (data.success) {
    currentSession = sessionId;
    startChat();
  } else {
    alert('Invalid Code');
  }
}

function startChat() {
  document.getElementById('chat').style.display = 'block';
  document.getElementById('sessionId').scrollIntoView({ behavior: 'smooth' });
  socket.emit('join-session', currentSession);
}

function sendMessage() {
  const msgInput = document.getElementById('msg');
  const msg = msgInput.value.trim();
  if (!msg) return;

  socket.emit('send-message', {
    sessionId: currentSession,
    message: msg
  });

  addMessage('You', msg, 'sent');
  msgInput.value = '';
}

socket.on('receive-message', (msg) => {
  addMessage('Stranger', msg, 'received');
});

function addMessage(sender, text, type) {
  const messagesDiv = document.getElementById('messages');
  const div = document.createElement('div');
  div.style.marginBottom = '12px';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.alignItems = type === 'sent' ? 'flex-end' : 'flex-start';

  const senderSpan = document.createElement('span');
  senderSpan.innerText = sender;
  senderSpan.style.fontSize = '0.7rem';
  senderSpan.style.color = 'var(--text-muted)';
  senderSpan.style.marginBottom = '4px';
  senderSpan.style.textTransform = 'uppercase';
  senderSpan.style.letterSpacing = '1px';

  const textDiv = document.createElement('div');
  textDiv.innerText = text;
  textDiv.style.background = type === 'sent' ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
  textDiv.style.color = '#fff';
  textDiv.style.padding = '8px 16px';
  textDiv.style.borderRadius = '12px';
  textDiv.style.fontSize = '0.95rem';
  textDiv.style.maxWidth = '80%';
  textDiv.style.border = type === 'sent' ? 'none' : '1px solid var(--glass-border)';

  div.appendChild(senderSpan);
  div.appendChild(textDiv);
  messagesDiv.appendChild(div);
  
  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function endSession() {
  if (confirm('Are you sure you want to end this session? All messages will be lost.')) {
    await fetch('http://localhost:5000/end-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSession })
    });
    location.reload();
  }
}

// Spotlight cursor tracking
document.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth) * 100;
  const y = (e.clientY / window.innerHeight) * 100;
  document.body.style.setProperty('--x', `${x}%`);
  document.body.style.setProperty('--y', `${y}%`);
});

