// 2. Create server.js in project root
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*" }
});

const rooms = new Map();

io.on('connection', socket => {
  socket.on('createRoom', () => {
    const roomId = Math.random().toString(36).substring(7);
    rooms.set(roomId, {
      players: new Map(),
      blocks: []
    });
    socket.join(roomId);
    socket.emit('roomCreated', roomId);
  });

  socket.on('joinRoom', roomId => {
    if (rooms.has(roomId)) {
      socket.join(roomId);
      socket.emit('joinedRoom', roomId);
    } else {
      socket.emit('roomError', 'Room not found');
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});