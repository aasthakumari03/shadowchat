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
  res.json({ sessionId });
});

app.post('/join-session', (req, res) => {
  const { sessionId } = req.body;
  if (sessions[sessionId]) res.json({ success: true });
  else res.json({ success: false });
});

app.post('/end-session', (req, res) => {
  const { sessionId } = req.body;
  delete sessions[sessionId];
  res.json({ success: true });
});
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/../frontend/index.html');
});
server.listen(5000, () => console.log('Server running on port 5000'));
