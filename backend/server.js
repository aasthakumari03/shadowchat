const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

let sessions = {};
let joinTokens = {}; // token -> sessionId
let sessionPins = {}; // 4-digit pin -> sessionId


io.on('connection', (socket) => {
  socket.on('join-session', ({ sessionId, userName }) => {
    socket.join(sessionId);
    // Notify others in the room
    socket.to(sessionId).emit('user-joined', { userName });
  });

  socket.on('send-message', ({ sessionId, message }) => {
    socket.to(sessionId).emit('receive-message', message);
  });
});

app.post('/create-session', (req, res) => {
  const sessionId = Math.random().toString(36).substring(2, 10).toUpperCase();
  sessions[sessionId] = { active: true };

  // Generate a unique 4-digit PIN
  let pin;
  do {
    pin = Math.floor(1000 + Math.random() * 9000).toString();
  } while (sessionPins[pin]);
  
  sessionPins[pin] = sessionId;

  res.json({ sessionId, pin });
});

app.post('/refresh-token', (req, res) => {
  const { sessionId } = req.body;
  if (!sessions[sessionId]) return res.json({ error: 'Session not found' });
  
  // Generate a short-lived token
  const token = Math.random().toString(36).substring(2, 12).toUpperCase();
  joinTokens[token] = { sessionId, expiry: Date.now() + 20000 }; // 20s lifespan
  
  res.json({ token });
});


app.post('/join-session', (req, res) => {
  const { sessionId, token, pin } = req.body;
  
  // If joining via PIN
  if (pin) {
    if (sessionPins[pin]) {
      return res.json({ success: true, sessionId: sessionPins[pin] });
    }
    return res.json({ success: false, error: 'Invalid or expired Room PIN' });
  }

  // If joining via token
  if (token) {
    const tokenData = joinTokens[token];
    if (tokenData && tokenData.expiry > Date.now()) {
      return res.json({ success: true, sessionId: tokenData.sessionId });
    }
    return res.json({ success: false, error: 'Token expired or invalid' });
  }

  // Fallback to direct session ID
  if (sessions[sessionId]) res.json({ success: true, sessionId });
  else res.json({ success: false });
});


app.post('/end-session', (req, res) => {
  const { sessionId } = req.body;
  delete sessions[sessionId];
  // Clean up tokens
  Object.keys(joinTokens).forEach(t => {
    if (joinTokens[t].sessionId === sessionId) delete joinTokens[t];
  });
  // Clean up PINs
  Object.keys(sessionPins).forEach(p => {
    if (sessionPins[p] === sessionId) delete sessionPins[p];
  });
  res.json({ success: true });
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});
server.listen(5000, () => console.log('Server running on port 5000'));
