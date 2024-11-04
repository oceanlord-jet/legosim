import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const container = document.getElementById('threejs-container');
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

renderer.shadowMap.enabled = true; // Enable shadow mapping
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows

scene.background = new THREE.Color(0xb5f1ff); // Set background color to blue
camera.position.set(0, 1.6, 0); // Setting camera at head height

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(5, 10, 7.5).normalize();
directionalLight.castShadow = true; // Enable shadows for this light

// Configure shadow properties for the light
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
scene.add(directionalLight);

// Load models
const loader = new GLTFLoader();
let blockModels = {}; // Dictionary to hold different block models

// Function to load a block model with scale and store it with a key
function loadBlockModel(key, url, x = 1, y = 1, z = 1) {
    loader.load(url, (gltf) => {
        const model = gltf.scene;
        model.scale.set(x, y, z);
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true; // Enable casting shadow for block models
                child.receiveShadow = true; // Enable receiving shadow for block models
            }
        });
        blockModels[key] = model;
    }, undefined, (error) => {
        console.error(`Error loading model ${key}:`, error);
    });
}

// Load 8 different block models with specified scales
loadBlockModel(1, '/models/yellow_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(2, '/models/brown_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(3, '/models/darkred_2x2.glb', 0.47, 0.49, 0.47);
loadBlockModel(4, '/models/purple_2x2.glb', 0.47, 0.49, 0.47);
// loadBlockModel(5, '/models/white_2x2.glb', 0.45, 0.55, 0.45);
// loadBlockModel(6, '/models/blue_2x4.glb', 0.5, 0.5, 0.5);
// loadBlockModel(7, '/models/orange_2x4.glb', 0.5, 0.5, 0.5);
// loadBlockModel(8, '/models/red_2x4.glb', 0.5, 0.5, 0.5);

// Load ground model
function loadGround() {
    loader.load('/models/green.glb', (gltf) => {
        const model = gltf.scene;
        model.position.set(0, 0, 0);
        model.scale.set(0.5, 0.5, 0.5);
        model.name = "ground"; // Assign the name "ground" to the ground model
        model.traverse((child) => {
            if (child.isMesh) {
                child.receiveShadow = true; // Enable ground to receive shadows
            }
        });
        scene.add(model);
    });
}

loadGround();

// Controls setup
const controls = new PointerLockControls(camera, renderer.domElement);
container.addEventListener('click', () => controls.lock());

const keys = { w: false, a: false, s: false, d: false, q: false, e: false };
const raycaster = new THREE.Raycaster();
const initialPosition = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const intersectionPoint = new THREE.Vector3();

// Define ground boundaries
const groundBoundaries = {
    minX: -44,
    maxX: 44,
    minZ: -44,
    maxZ: 44
};

// Ray line visualization
const rayLineMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
const rayLineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, 0)
]);
const rayLine = new THREE.Line(rayLineGeometry, rayLineMaterial);
scene.add(rayLine);

// Define gridSize as dimensions for x, y, and z axes
const gridSize = { x: 0.75, y: 0.5, z: 0.75 };

// Variable to hold the selected block number
let selectedBlockNumber = 1;

function updateCameraPosition() {
    const speed = 0.05;
    const prevPosition = camera.position.clone();
    const collisionDistance = 0.6; // Distance threshold for collision

    // Helper function to check collision in a direction
    function checkCollision(directionVector) {
        raycaster.set(camera.position, directionVector);
        const intersects = raycaster.intersectObjects(scene.children, true);
        return intersects.length > 0 && intersects[0].distance < collisionDistance;
    }

    const forwardVector = new THREE.Vector3();
    camera.getWorldDirection(forwardVector);

    // Raycast directions
    const backwardVector = forwardVector.clone().negate();
    const rightVector = new THREE.Vector3().crossVectors(forwardVector, camera.up);
    const leftVector = rightVector.clone().negate();

    // Movement with collision check
    if (keys.w && !checkCollision(forwardVector)) controls.moveForward(speed);
    if (keys.s && !checkCollision(backwardVector)) controls.moveForward(-speed);
    if (keys.a && !checkCollision(leftVector)) controls.moveRight(-speed);
    if (keys.d && !checkCollision(rightVector)) controls.moveRight(speed);

    // Handle vertical movement with Q and E keys
    if (keys.q && camera.position.y < 44) {
        camera.position.y += speed;
    }
    if (keys.e && camera.position.y > 0) {
        camera.position.y -= speed;
    }

    // Boundary constraints for x, y, and z
    if (camera.position.x < groundBoundaries.minX || camera.position.x > groundBoundaries.maxX) {
        camera.position.x = prevPosition.x;
    }
    if (camera.position.z < groundBoundaries.minZ || camera.position.z > groundBoundaries.maxZ) {
        camera.position.z = prevPosition.z;
    }
    if (camera.position.y > 44) {
        camera.position.y = 44;
    }
    if (camera.position.y < 1.6) {
        camera.position.y = 1.6;
    }
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

// Function to update the ray line position
function updateRayLine() {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        intersectionPoint.copy(intersects[0].point);
        const points = [camera.position, intersectionPoint];
        rayLine.geometry.setFromPoints(points);
    } else {
        const defaultEndPoint = new THREE.Vector3().addVectors(camera.position, camera.getWorldDirection(rayDirection).multiplyScalar(5));
        rayLine.geometry.setFromPoints([camera.position, defaultEndPoint]);
    }
}

// Function to snap positions to a grid based on gridSize dimensions
function snapToGrid(position, axis) {
    return Math.round(position / gridSize[axis]) * gridSize[axis];
}

function handleMouseClick(event) {
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        intersectionPoint.copy(intersects[0].point);
        
        // Calculate the distance between the camera and the intersection point
        const distanceFromCamera = intersectionPoint.distanceTo(camera.position);
        const minDistance = 1.5; // Minimum distance from camera to place a block

        if (event.button === 0 && blockModels[selectedBlockNumber]) { // Left-click to place selected block
            // Only place the block if it is beyond the minimum distance
            if (distanceFromCamera > minDistance) {
                const newBlock = blockModels[selectedBlockNumber].clone();
                newBlock.castShadow = true; // Enable casting shadow for the new block
                newBlock.receiveShadow = true; // Enable receiving shadow for the new block
                const snappedX = snapToGrid(intersectionPoint.x, 'x');
                const snappedY = snapToGrid(intersectionPoint.y, 'y');
                const snappedZ = snapToGrid(intersectionPoint.z, 'z');
                newBlock.position.set(snappedX, snappedY, snappedZ);
                scene.add(newBlock);
            } else {
                console.log(`Cannot place block too close to the camera. Minimum distance is ${minDistance}.`);
            }
        } else if (event.button === 2) { // Right-click to remove block
            // Check if any parent of the intersected object is the ground
            let isGroundBlock = false;
            let object = intersectedObject;
            while (object) {
                if (object.name === "ground") {
                    isGroundBlock = true;
                    break;
                }
                object = object.parent;
            }

            // Only remove the object if it is not the ground
            if (!isGroundBlock) {
                scene.remove(intersectedObject.parent || intersectedObject);
            }
        }
    }
}

// Reference to the title screen and start button
const titleScreen = document.getElementById('title-screen');
const startButton = document.getElementById('start-button');

// Start game function to hide the title screen and show the game
function startGame() {
    titleScreen.style.display = 'none'; // Hide the title screen
    animate(); // Start the game animation loop
}

// Event listener for the start button
startButton.addEventListener('click', startGame);

// Event listener for block selection
document.querySelectorAll('.block').forEach((blockElement) => {
    blockElement.addEventListener('click', (event) => {
      selectedBlockNumber = parseInt(event.currentTarget.getAttribute('data-block'));
      console.log(`Selected block number: ${selectedBlockNumber}`);
    });
  });


// Event listener for mouse click
window.addEventListener('mousedown', handleMouseClick);

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    //updateRayLine(); // Update the ray line visualization
    updateCameraPosition(); // Update the camera position based on key presses
    controls.update(); // Update controls
    renderer.render(scene, camera); // Render the scene
}

animate(); // Start the animation loop
