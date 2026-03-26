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
  const name = document.getElementById('loginName')?.value.trim();
  const email = document.getElementById('loginEmail')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;

  if (!name || !email || !password) {
    alert('Please fill in all details correctly.');
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters long.');
    return;
  }

  closeLoginModal();
  document.getElementById('successPopup').style.display = 'flex';
  
  // Store login info for Dashboard
  localStorage.setItem('shadowUserEmail', email);
  localStorage.setItem('shadowUserName', name);
  
  // Swap Login button with Profile icon
  const loginBtn = document.getElementById('loginBtn');
  const profileBtn = document.getElementById('profileBtn');
  if (loginBtn) loginBtn.style.display = 'none';
  if (profileBtn) profileBtn.style.display = 'flex';

  // Clear fields
  if (document.getElementById('loginName')) document.getElementById('loginName').value = '';
  if (document.getElementById('loginEmail')) document.getElementById('loginEmail').value = '';
  if (document.getElementById('loginPassword')) document.getElementById('loginPassword').value = '';
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
  const sessionDisplay = document.getElementById('sessionId');
  if (sessionDisplay) {
    sessionDisplay.innerText = 'SESSION CODE: ' + currentSession;
    sessionDisplay.scrollIntoView({ behavior: 'smooth' });
  }
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
  textDiv.style.background = type === 'sent' ? 'var(--primary)' : 'rgba(217, 217, 217, 0.2)';
  textDiv.style.color = type === 'sent' ? '#ffffff' : 'var(--text-main)';
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




// QR Code Logic
let qrInstance = null;
let qrRefreshInterval = null;
let qrCountdownInterval = null;
let secondsRemaining = 10;

async function openQRModal() {
    const modal = document.getElementById('qrModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    // If no active session, create one first so we have something to share
    if (!currentSession) {
        console.log('No active session. Creating one for QR...');
        await createSession();
    }
    
    generateQRCode();
    startQRRefreshTimer();
}

function closeQRModal() {
    const modal = document.getElementById('qrModal');
    modal.style.display = 'none';
    clearInterval(qrRefreshInterval);
    clearInterval(qrCountdownInterval);
}

function generateQRCode() {
    const qrcodeDiv = document.getElementById('qrcode');
    if (!qrcodeDiv) return;
    qrcodeDiv.innerHTML = '';
    
    // Create a JOIN URL that works for both index and dashboard
    const joinURL = `${window.location.origin}${window.location.pathname}?join=${currentSession}`;

    qrInstance = new QRCode(qrcodeDiv, {
        text: joinURL,
        width: 250,
        height: 250,
        colorDark: "#353535",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
    
    secondsRemaining = 10;
    const countdownEl = document.getElementById('refreshCountdown');
    if (countdownEl) countdownEl.textContent = secondsRemaining;
}

// Auto-join logic for scanned QR links
async function checkAutoJoin() {
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    
    if (joinId) {
        console.log('Auto-joining session:', joinId);
        
        const res = await fetch('http://localhost:5000/join-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: joinId })
        });
        
        const data = await res.json();
        if (data.success) {
            currentSession = joinId;
            startChat();
            // Clean up URL without reload
            const newURL = window.location.origin + window.location.pathname;
            window.history.replaceState({}, document.title, newURL);
        } else {
            console.error('Failed to auto-join: Invalid session ID');
            alert('This session is no longer active.');
        }
    }
}

function startQRRefreshTimer() {
    clearInterval(qrRefreshInterval);
    clearInterval(qrCountdownInterval);
    
    qrRefreshInterval = setInterval(() => {
        generateQRCode();
    }, 10000);

    qrCountdownInterval = setInterval(() => {
        secondsRemaining--;
        if (secondsRemaining < 0) secondsRemaining = 10;
        document.getElementById('refreshCountdown').textContent = secondsRemaining;
    }, 1000);
}
