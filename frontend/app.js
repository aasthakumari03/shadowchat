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

async function createSession() {
  const res = await fetch('http://localhost:5000/create-session', { method: 'POST' });
  const data = await res.json();

  currentSession = data.sessionId;
  document.getElementById('sessionId').innerText = 'Code: ' + currentSession;

  startChat();
}

async function joinSession() {
  const sessionId = document.getElementById('sessionInput').value;

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
  socket.emit('join-session', currentSession);
}

function sendMessage() {
  const msg = document.getElementById('msg').value;

  socket.emit('send-message', {
    sessionId: currentSession,
    message: msg
  });

  addMessage('You: ' + msg);
}

socket.on('receive-message', (msg) => {
  addMessage('Stranger: ' + msg);
});

function addMessage(msg) {
  const div = document.createElement('div');
  div.innerText = msg;
  document.getElementById('messages').appendChild(div);
}

async function endSession() {
  await fetch('http://localhost:5000/end-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: currentSession })
  });

  location.reload();
}
