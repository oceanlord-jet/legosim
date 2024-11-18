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
const socket = io('http://localhost:3000');
let currentRoom = null;

// Add room management functions
function createRoom() {
  socket.emit('createRoom');
  document.getElementById('room-status').textContent = 'Creating room...';
}

function joinRoom() {
  const roomId = document.getElementById('room-id').value;
  if (!roomId) {
    document.getElementById('room-status').textContent = 'Please enter a room ID';
    return;
  }
  socket.emit('joinRoom', roomId);
  document.getElementById('room-status').textContent = 'Joining room...';
}

// Socket event listeners
socket.on('roomCreated', (roomId) => {
  currentRoom = roomId;
  document.getElementById('room-id').value = roomId;
  document.getElementById('room-status').textContent = `Room created! ID: ${roomId}`;
});

socket.on('joinedRoom', (roomId) => {
  currentRoom = roomId;
  document.getElementById('room-status').textContent = `Joined room: ${roomId}`;
  startMultiplayerGame();
});

socket.on('roomError', (message) => {
  document.getElementById('room-status').textContent = message;
});

// Add event listeners
document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('join-room-button').addEventListener('click', joinRoom);

function startMultiplayerGame() {
  titleScreen.style.display = 'none';
  // Initialize multiplayer specific setup
  animate();
}

function animate() {
    requestAnimationFrame(animate);
    updateCameraPosition();
    controls.update();
    renderer.render(scene, camera);
}

animate();
