import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import { io } from 'socket.io-client';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const container = document.getElementById('threejs-container');
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

scene.background = new THREE.Color(0xb5f1ff);
camera.position.set(0, 1.6, 0);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5).normalize();
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
scene.add(directionalLight);

const loader = new GLTFLoader();
let blockModels = {};

function loadBlockModel(key, url, x = 1, y = 1, z = 1) {
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(x, y, z);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        blockModels[key] = model;
    }, undefined, (error) => {
        console.error(`Error loading model ${key}:`, error);
    });
}

loadBlockModel(1, '/models/yellow_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(2, '/models/brown_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(3, '/models/darkred_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(4, '/models/purple_2x2.glb', 0.47, 0.49, 0.47);

// In main.js - Update ground loading
function loadGround() {
    loader.load('/models/green.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(0.5, 0.5, 0.5);
        model.name = "ground";
        model.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true;
            }
        });
        scene.add(model);
        
        // Notify server ground is loaded
        if (currentRoom) {
            socket.emit('groundLoaded', currentRoom);
        }
    });
}

loadGround();

const controls = new PointerLockControls(camera, renderer.domElement);
container.addEventListener('click', () => controls.lock());

const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
const raycaster = new THREE.Raycaster();
const gridSize = { x: 0.75, y: 0.5, z: 0.75 };

let selectedBlockNumber = 1;

function updateCameraPosition() {
    const speed = 0.05;
    const prevPosition = camera.position.clone();
    const collisionDistance = 0.6;

    function checkCollision(directionVector) {
        raycaster.set(camera.position, directionVector);
        const intersects = raycaster.intersectObjects(scene.children, true);
        return intersects.length > 0 && intersects[0].distance < collisionDistance;
    }

    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);
    const backwardVector = forwardVector.clone().negate();
    const rightVector = new THREE.Vector3().crossVectors(forwardVector, camera.up);
    const leftVector = rightVector.clone().negate();

    if (keys.w && !checkCollision(forwardVector)) controls.moveForward(speed);
    if (keys.s && !checkCollision(backwardVector)) controls.moveForward(-speed);
    if (keys.a && !checkCollision(leftVector)) controls.moveRight(-speed);
    if (keys.d && !checkCollision(rightVector)) controls.moveRight(speed);

    if (keys.q && camera.position.y < 44) camera.position.y += speed;
    if (keys.e && camera.position.y > 0) camera.position.y -= speed;

    if (camera.position.x < -44 || camera.position.x > 44) camera.position.x = prevPosition.x;
    if (camera.position.z < -44 || camera.position.z > 44) camera.position.z = prevPosition.z;
    if (camera.position.y > 44) camera.position.y = 44;
    if (camera.position.y < 1.6) camera.position.y = 1.6;
}

window.addEventListener('keydown', (event) => {
    const num = parseInt(event.key);
    if (num >= 1 && num <= 8) {
        selectedBlockNumber = num;
        console.log(`Selected block number: ${selectedBlockNumber}`);
    } else {
        keys[event.key] = true;
    }
});

window.addEventListener('keyup', (event) => {
    keys[event.key] = false;
});

function snapToGrid(position, axis) {
    return Math.round(position / gridSize[axis]) * gridSize[axis];
}

function saveBlockData() {
    const blocksData = [];
    scene.traverse((object) => {
        if (object.userData.blockType) {
            blocksData.push({
                type: object.userData.blockType,
                position: object.position.clone()
            });
        }
    });
    localStorage.setItem('blocksData', JSON.stringify(blocksData));
}

function loadSavedBlocks() {
    const blocksData = JSON.parse(localStorage.getItem('blocksData'));
    if (blocksData) {
        blocksData.forEach(({ type, position }) => {
            const block = blockModels[type].clone();
            block.position.set(position.x, position.y, position.z);
            block.userData.blockType = type;
            scene.add(block);
        });
    }
}

function handleMouseClick(event) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const intersectionPoint = intersects[0].point;
        const distanceFromCamera = intersectionPoint.distanceTo(camera.position);
        const minDistance = 1.5;

        if (event.button === 0 && blockModels[selectedBlockNumber]) {
            if (distanceFromCamera > minDistance) {
                const newBlock = blockModels[selectedBlockNumber].clone();
                newBlock.userData.blockType = selectedBlockNumber;
                newBlock.castShadow = true;
                newBlock.receiveShadow = true;
                newBlock.position.set(
                    snapToGrid(intersectionPoint.x, 'x'),
                    snapToGrid(intersectionPoint.y, 'y'),
                    snapToGrid(intersectionPoint.z, 'z')
                );
                scene.add(newBlock);
                saveBlockData();
                if (currentRoom) {
                    socket.emit('blockUpdate', {
                        roomId: currentRoom,
                        type: 'add',
                        blockData: {
                            type: selectedBlockNumber,
                            position: newBlock.position
                        }
                    });
                }
            } else {
                console.log(`Cannot place block too close to the camera. Minimum distance is ${minDistance}.`);
            }
        } else if (event.button === 2) {
            let isGroundBlock = false;
            let object = intersectedObject;
            while (object) {
                if (object.name === "ground") {
                    isGroundBlock = true;
                    break;
                }
                object = object.parent;
            }
            if (!isGroundBlock) {
                scene.remove(intersectedObject.parent || intersectedObject);
                saveBlockData();
                if (currentRoom) {
                    socket.emit('blockUpdate', {
                        roomId: currentRoom,
                        type: 'remove',
                        blockData: {
                            position: intersectedObject.position
                        }
                    });
                }
            }
        }
    }
}

const titleScreen = document.getElementById('title-screen');
const loadButton = document.getElementById('load-button');
const newGameButton = document.getElementById('new-game-button');

function startGame() {
    titleScreen.style.display = 'none';
    loadSavedBlocks();
    animate();
}

newGameButton.addEventListener('click', newGame);

function newGame() {
    titleScreen.style.display = 'none';
    localStorage.removeItem('blocksData');  // Clear saved blocks
    // Clear the scene, but keep essential objects like the camera and ground
    scene.children.forEach((child) => {
        if (child.name !== "ground"&&child.type !== "AmbientLight" && child.type !== "DirectionalLight") {
            scene.remove(child);  // Remove all objects except ground
        }
    });
    loadGround();  // Re-load the ground
    animate();
}

loadButton.addEventListener('click', startGame);

document.querySelectorAll('.block').forEach((blockElement) => {
    blockElement.addEventListener('click', (event) => {
        selectedBlockNumber = parseInt(event.currentTarget.getAttribute('data-block'));
        console.log(`Selected block number: ${selectedBlockNumber}`);
    });
});

window.addEventListener('mousedown', handleMouseClick);

// Initialize socket connection
const SOCKET_URL = import.meta.env.PROD 
  ? "https://lego-simulator-server.onrender.com"  // Update after deployment
  : "http://localhost:3000";

const socket = io(SOCKET_URL);
let currentRoom = null;
const players = new Map();
const playerMeshes = new Map();
let isAnimating = false;

// Socket connection status check
socket.on('connect', () => {
  console.log('Connected to server');
  document.getElementById('room-status').textContent = 'Connected to server';
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  document.getElementById('room-status').textContent = 'Server connection failed';
});

// Player mesh creation
function createPlayerAvatar() {
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
  );
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.8, 0.2),
    new THREE.MeshLambertMaterial({ color: 0x00ff00 })
  );
  body.position.y = -0.6;
  head.add(body);
  head.castShadow = true;
  body.castShadow = true;
  return head;
}

// Room management
function createRoom() {
  const playerData = {
    position: [camera.position.x, camera.position.y, camera.position.z],
    rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    name: `Player${Math.floor(Math.random() * 1000)}`
  };
  socket.emit('createRoom', playerData);
}

// Update join room function with logging
function joinRoom(roomId) {
  console.log('Attempting to join room:', roomId);
  
  const playerData = {
    position: [camera.position.x, camera.position.y, camera.position.z],
    rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z],
    name: `Player${Math.floor(Math.random() * 1000)}`
  };
  
  socket.emit('joinRoom', { roomId, playerData });
}

// Socket event listeners
// Update room creation handler
socket.on('roomCreated', (response) => {
  console.log('Room creation response:', response); // Debug log
  
  // Handle string response (just roomId)
  if (typeof response === 'string') {
    currentRoom = response;
    document.getElementById('room-status').textContent = `Room Created: ${response}`;
    document.getElementById('room-id').value = response; // Show room ID in input
    return;
  }
  
  // Handle object response
  if (response && response.roomId) {
    currentRoom = response.roomId;
    document.getElementById('room-status').textContent = `Room Created: ${response.roomId}`;
    document.getElementById('room-id').value = response.roomId;
    
    if (response.state) {
      loadGameState(response.state);
    }
  } else {
    console.error('Invalid room creation response format:', response);
    document.getElementById('room-status').textContent = 'Error creating room';
  }
});

socket.on('joinedRoom', (response) => {
  console.log('Joined room response:', response);
  
  if (!response) {
    console.error('Invalid join room response');
    return;
  }

  currentRoom = response.roomId;
  document.getElementById('room-status').textContent = `Joined Room: ${response.roomId}`;
  
  // Hide title screen and start game
  titleScreen.style.display = 'none';
  
  // Load initial game state if provided
  if (response.state) {
    loadGameState(response.state);
  }
  
  // Start animation loop if not already running
  if (!isAnimating) {
    isAnimating = true;
    animate();
  }
});

socket.on('playerJoined', (player) => {
  if (player.id !== socket.id) {
    const playerMesh = createPlayerAvatar();
    playerMesh.position.set(...player.position);
    scene.add(playerMesh);
    players.set(player.id, player);
    playerMeshes.set(player.id, playerMesh);
  }
});

socket.on('playerMoved', (data) => {
  if (data.id !== socket.id) {
    const playerMesh = playerMeshes.get(data.id);
    if (playerMesh) {
      playerMesh.position.set(...data.position);
      playerMesh.rotation.set(...data.rotation);
    }
  }
});

socket.on('playerLeft', (playerId) => {
  const playerMesh = playerMeshes.get(playerId);
  if (playerMesh) {
    scene.remove(playerMesh);
    playerMeshes.delete(playerId);
    players.delete(playerId);
  }
});

socket.on('blockAdded', (blockData) => {
  const block = blockModels[blockData.type].clone();
  block.position.copy(blockData.position);
  block.userData.blockType = blockData.type;
  scene.add(block);
});

socket.on('blockRemoved', (position) => {
  scene.children.forEach((child) => {
    if (child.position.equals(position)) {
      scene.remove(child);
    }
  });
});

// Error handling
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
  document.getElementById('room-status').textContent = 'Connection error!';
});

// Add join room error handler
socket.on('roomError', (error) => {
  console.error('Room error:', error);
  document.getElementById('room-status').textContent = `Error: ${error}`;
});

// Game state management
// Update loadGameState function
function loadGameState(state) {
    if (!state) return;
    
    // Ensure ground exists
    if (!scene.getObjectByName("ground")) {
        loadGround();
    }
    
    // Rest of state loading...
    if (!state) {
    console.warn('No state provided to loadGameState');
    return;
  }

  try {
    // Clear existing blocks except ground
    scene.children.forEach((child) => {
      if (child.userData.blockType) {
        scene.remove(child);
      }
    });

    // Load blocks if they exist
    if (state.blocks && Array.isArray(state.blocks)) {
      state.blocks.forEach((blockData) => {
        if (blockData && blockData.type && blockData.position) {
          const block = blockModels[blockData.type].clone();
          block.position.copy(blockData.position);
          block.userData.blockType = blockData.type;
          scene.add(block);
        }
      });
    }

    // Load players if they exist
    if (state.players && Array.isArray(state.players)) {
      state.players.forEach((player) => {
        if (player && player.id && player.id !== socket.id) {
          const playerMesh = createPlayerAvatar();
          playerMesh.position.set(...player.position);
          scene.add(playerMesh);
          players.set(player.id, player);
          playerMeshes.set(player.id, playerMesh);
        }
      });
    }
  } catch (error) {
    console.error('Error loading game state:', error);
  }
}

// Player management
function updatePlayerCount() {
  const count = players.size + 1; // +1 for local player
  document.getElementById('player-count').textContent = `Players: ${count}/${ROOM_MAX_PLAYERS}`;
}

// Complete playerLeft handler
socket.on('playerLeft', (playerId) => {
  const playerMesh = playerMeshes.get(playerId);
  if (playerMesh) {
    scene.remove(playerMesh);
    playerMeshes.delete(playerId);
    players.delete(playerId);
    updatePlayerCount();
  }
});

// Reconnection handling
socket.on('disconnect', () => {
  document.getElementById('room-status').textContent = 'Disconnected - Trying to reconnect...';
});

socket.on('reconnect', () => {
  if (currentRoom) {
    joinRoom(currentRoom); // Rejoin current room
  }
});

function startMultiplayerGame() {
  titleScreen.style.display = 'none';
  // Initialize multiplayer specific setup
  animate();
}

// Add button event listeners
document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('join-room-button').addEventListener('click', () => {
  const roomId = document.getElementById('room-id').value;
  joinRoom(roomId);
});

function animate() {
  if (!isAnimating) return;
  
  requestAnimationFrame(animate);
  updateCameraPosition();
  controls.update();
  
  // Sync player position if in multiplayer
  if (currentRoom) {
    socket.emit('playerMove', {
      roomId: currentRoom,
      position: [camera.position.x, camera.position.y, camera.position.z],
      rotation: [camera.rotation.x, camera.rotation.y, camera.rotation.z]
    });
  }
  
  renderer.render(scene, camera);
}

animate();
