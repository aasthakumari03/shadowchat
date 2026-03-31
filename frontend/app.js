const socket = io('http://localhost:5000');
let currentSession = null;
let currentPin = null;


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
  try {
    const res = await fetch('/create-session', { method: 'POST' });
    const data = await res.json();

    currentSession = data.sessionId;
    currentPin = data.pin;

    
    // Update UI elements if they exist
    const sessionDoc = document.getElementById('sessionId');
    if (sessionDoc) sessionDoc.innerText = 'SESSION CODE: ' + currentSession;
    
    const sessionDisplay = document.getElementById('sessionIdDisplay');
    if (sessionDisplay) sessionDisplay.innerText = 'SESSION: ' + currentSession;

    startChat();
  } catch (err) {
    console.error('Failed to create session:', err);
  }
}

async function joinSession() {
  const sessionId = document.getElementById('sessionInput').value.trim().toUpperCase();
  if (!sessionId) return alert('Please enter a session code');

  const res = await fetch('/join-session', {
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
  const chatSection = document.getElementById('chatSection');
  if (chatSection) {
      chatSection.style.display = 'block';
      // Smooth scroll to chat
      setTimeout(() => chatSection.scrollIntoView({ behavior: 'smooth' }), 100);
  }
  
  const sessionDisplay = document.getElementById('sessionIdDisplay');
  if (sessionDisplay) {
    sessionDisplay.innerText = 'SESSION: ' + currentSession;
  }
  
  const messagesDiv = document.getElementById('messages');
  if (messagesDiv) {
      // Keep existing system messages or clear if first join
      if (messagesDiv.innerHTML.includes('Waiting for someone')) {
          messagesDiv.innerHTML = '';
      }
  }

  const userName = localStorage.getItem('shadowUserName') || 'Shadow User';
  socket.emit('join-session', { sessionId: currentSession, userName });
}

socket.on('user-joined', (data) => {
    addSystemMessage(`${data.userName} has connected to the shadow room`);
});

function addSystemMessage(text) {
    const messagesDiv = document.getElementById('messages');
    if (!messagesDiv) return;

    const div = document.createElement('div');
    div.className = 'system-message';
    div.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> <span>${text}</span>`;
    
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function sendMessage() {
  const msgInput = document.getElementById('msg');
  const msg = msgInput.value.trim();
  if (!msg) return;

  const senderName = localStorage.getItem('shadowUserName') || 'Shadow User';

  socket.emit('send-message', {
    sessionId: currentSession,
    message: {
        text: msg,
        sender: senderName
    }
  });

  addMessage(senderName, msg, 'sent');
  msgInput.value = '';
}

socket.on('receive-message', (data) => {
  addMessage(data.sender, data.text, 'received');
});

function addMessage(sender, text, type) {
  const messagesDiv = document.getElementById('messages');
  if (!messagesDiv) return;

  const msgGroup = document.createElement('div');
  msgGroup.style.display = 'flex';
  msgGroup.style.flexDirection = 'column';
  msgGroup.style.alignItems = type === 'sent' ? 'flex-end' : 'flex-start';

  const info = document.createElement('div');
  info.className = 'message-info';
  info.innerText = sender;
  
  const div = document.createElement('div');
  div.className = `message ${type}`;
  div.innerText = text;

  msgGroup.appendChild(info);
  msgGroup.appendChild(div);
  messagesDiv.appendChild(msgGroup);
  
  // Scroll to bottom
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

async function endSession() {
  if (confirm('Are you sure you want to end this session? All messages will be lost.')) {
    await fetch('/end-session', {
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
    const profileLogo = document.querySelector('.nav-profile-logo');
    if (!modal) return;
    modal.style.display = 'flex';
    
    if (profileLogo) profileLogo.classList.add('active-qr');
    
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
    const profileLogo = document.querySelector('.nav-profile-logo');
    if (modal) modal.style.display = 'none';
    if (profileLogo) profileLogo.classList.remove('active-qr');
    clearInterval(qrRefreshInterval);
    clearInterval(qrCountdownInterval);
}

async function generateQRCode() {
    const qrcodeDiv = document.getElementById('qrcode');
    if (!qrcodeDiv) return;
    
    try {
        // Fetch a fresh rotating token from the backend
        const res = await fetch('/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: currentSession })
        });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error);
        const token = data.token;

        qrcodeDiv.innerHTML = '';
        
        // Create a JOIN URL that uses the rotating token
        const joinURL = `${window.location.origin}/dashboard.html?join=${token}`;

        // Check if QRCode is loaded
        if (typeof QRCode === 'undefined') {
            console.error('QRCode library not loaded!');
            qrcodeDiv.innerHTML = `<div style="color:red; font-size:0.8rem; padding:20px;">QR Library Error. Use Code: <strong>${currentSession}</strong></div>`;
            return;
        }

        qrInstance = new QRCode(qrcodeDiv, {
            text: joinURL,
            width: 220,
            height: 220,
            colorDark: "#3A86FF",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Add PIN text below for convenience
        const idText = document.createElement('div');
        idText.style.marginTop = '15px';
        idText.style.fontSize = '1.1rem';
        idText.style.fontWeight = '800';
        idText.style.color = 'var(--primary)';
        idText.innerHTML = `ROOM PIN: <span style="font-family: monospace; letter-spacing: 2px;">${currentPin}</span><br><span style="font-size: 0.75rem; color: var(--text-muted); font-weight: normal;">Session: ${currentSession}</span>`;
        qrcodeDiv.appendChild(idText);
        
        secondsRemaining = 10;
        const countdownEl = document.getElementById('refreshCountdown');
        if (countdownEl) countdownEl.textContent = secondsRemaining;
    } catch (err) {
        console.error('Failed to generate rotating QR:', err);
        qrcodeDiv.innerHTML = `<div style="color:red; font-size:0.8rem; padding:20px;">Connection Error. Refreshing...</div>`;
    }
}


// Auto-join logic for scanned QR links
async function checkAutoJoin() {
    const urlParams = new URLSearchParams(window.location.search);
    const joinId = urlParams.get('join');
    
    if (joinId) {
        console.log('Auto-joining session:', joinId);
        
        // If we don't have an identity, prompt for one
        if (!localStorage.getItem('shadowUserName')) {
            showIdentityPrompt(joinId);
            return;
        }

        performJoin(joinId);
    }
}

async function performJoin(joinId) {
    // joinId could be a sessionId (8 chars) or a token (10 chars)
    const isToken = joinId.length > 8;
    
    const res = await fetch('/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isToken ? { token: joinId } : { sessionId: joinId })
    });
    
    const data = await res.json();
    if (data.success) {
        currentSession = data.sessionId || joinId;
        startChat();
        // Clean up URL without reload
        const newURL = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, newURL);
        addSystemMessage('You joined the shadow room');
    } else {
        console.error('Failed to auto-join:', data.error || 'Invalid session ID');
        alert(data.error || 'This session is no longer active.');
    }
}


function showIdentityPrompt(joinId) {
    const modal = document.getElementById('identityModal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    // Store joinId temporarily
    window.pendingJoinId = joinId;
}

function submitIdentity() {
    const name = document.getElementById('identityName').value.trim();
    if (!name) return alert('Please enter a name to connect');
    
    localStorage.setItem('shadowUserName', name);
    localStorage.setItem('shadowUserEmail', name.toLowerCase().replace(/\s+/g, '.') + '@shadow.chat');
    
    document.getElementById('identityModal').style.display = 'none';
    
    // Update UI if on dashboard
    const displayUser = document.getElementById('displayUserName');
    if (displayUser) displayUser.textContent = name;
    
    performJoin(window.pendingJoinId);
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

// 4-Digit PIN Joining Logic
function openJoinPinModal() {
    const modal = document.getElementById('joinPinModal');
    if (modal) modal.style.display = 'flex';
}

function closeJoinPinModal() {
    const modal = document.getElementById('joinPinModal');
    if (modal) modal.style.display = 'none';
    const input = document.getElementById('joinPinInput');
    if (input) input.value = '';
}

async function submitJoinPin() {
    const input = document.getElementById('joinPinInput');
    if (!input) return;
    const pin = input.value.trim();
    
    if (pin.length !== 4) return alert('Please enter a valid 4-digit PIN');
    
    const res = await fetch('/join-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
    });
    
    const data = await res.json();
    if (data.success) {
        closeJoinPinModal();
        let joinId = data.sessionId;
        
        // If we don't have an identity, prompt for one
        if (!localStorage.getItem('shadowUserName')) {
            showIdentityPrompt(joinId);
            return;
        }

        performJoin(joinId);
    } else {
        alert(data.error || 'Invalid Room PIN');
    }
}

