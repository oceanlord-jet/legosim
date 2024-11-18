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

const ROOM_MAX_PLAYERS = 4;

const rooms = new Map();

class Room {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.blocks = [];
    this.maxPlayers = ROOM_MAX_PLAYERS;
  }

  addPlayer(socket, playerData) {
    this.players.set(socket.id, {
      id: socket.id,
      position: playerData.position,
      rotation: playerData.rotation,
      name: playerData.name
    });
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
  }

  addBlock(blockData) {
    this.blocks.push(blockData);
  }

  removeBlock(position) {
    this.blocks = this.blocks.filter(b => 
      !(b.position.x === position.x && 
        b.position.y === position.y && 
        b.position.z === position.z)
    );
  }

  isFull() {
    return this.players.size >= this.maxPlayers;
  }

  getState() {
    return {
      blocks: this.blocks,
      players: Array.from(this.players.values())
    };
  }
}

io.on('connection', socket => {
  // Log active rooms when connection established
  console.log('Client connected. Active rooms:', Array.from(rooms.keys()));

  socket.on('createRoom', (playerData) => {
    const roomId = Math.random().toString(36).substring(7);
    const room = new Room(roomId);
    room.addPlayer(socket, playerData);
    rooms.set(roomId, room);
    
    console.log('Created room:', roomId);
    console.log('Active rooms:', Array.from(rooms.keys()));
    
    socket.join(roomId);
    socket.emit('roomCreated', roomId); // Simplify response to just roomId
  });

  socket.on('joinRoom', ({ roomId, playerData }) => {
    console.log('Join room attempt:', roomId);
    console.log('Available rooms:', Array.from(rooms.keys()));
    
    const room = rooms.get(roomId);
    if (!room) {
      console.log('Room not found:', roomId);
      socket.emit('roomError', 'Room not found');
      return;
    }

    if (room.isFull()) {
      socket.emit('roomError', 'Room is full');
      return;
    }

    console.log('Joining room:', roomId);
    room.addPlayer(socket, playerData);
    socket.join(roomId);
    socket.emit('joinedRoom', {
      roomId,
      state: room.getState()
    });
  });

  socket.on('playerMove', ({ roomId, position, rotation }) => {
    const room = rooms.get(roomId);
    if (room?.players.has(socket.id)) {
      const player = room.players.get(socket.id);
      player.position = position;
      player.rotation = rotation;
      socket.to(roomId).emit('playerMoved', {
        id: socket.id,
        position,
        rotation
      });
    }
  });

  socket.on('blockUpdate', ({ roomId, type, blockData }) => {
    const room = rooms.get(roomId);
    if (room) {
      if (type === 'add') {
        room.addBlock(blockData);
        socket.to(roomId).emit('blockAdded', blockData);
      } else if (type === 'remove') {
        room.removeBlock(blockData.position);
        socket.to(roomId).emit('blockRemoved', blockData.position);
      }
    }
  });

  // Add disconnect handler to clean up rooms
  socket.on('disconnect', () => {
    console.log('Client disconnected');
    for (const [roomId, room] of rooms) {
      if (room.players.has(socket.id)) {
        room.removePlayer(socket.id);
        io.to(roomId).emit('playerLeft', socket.id);
        
        if (room.players.size === 0) {
          console.log('Removing empty room:', roomId);
          rooms.delete(roomId);
        }
        break;
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});