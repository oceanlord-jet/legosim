# Lego Simulator

A real-time multiplayer Lego-style building game built with Three.js and Socket.io.

## Table of Contents

- [Features](#features)
- [Demo](#demo)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
- [Usage](#usage)
  - [Running the Client](#running-the-client)
  - [Running the Server](#running-the-server)
- [Controls](#controls)
- [Multiplayer](#multiplayer)
  - [Creating a Room](#creating-a-room)
  - [Joining a Room](#joining-a-room)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
  - [Deploying the Client to Vercel](#deploying-the-client-to-vercel)
  - [Deploying the Server to Render](#deploying-the-server-to-render)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)

## Features

- **3D Environment**: Navigate a 3D world built with Three.js.
- **Block Placement and Removal**: Place and remove blocks to build structures.
- **Multiplayer Support**: Create or join rooms to build collaboratively in real-time.
- **Different Block Types**: Choose from various block types and colors.
- **First-Person Controls**: Immersive first-person movement and camera control.
- **Grid-Based Building**: Snap blocks to a grid for precise placement.
- **Persistent Rooms**: Rooms maintain state so players can rejoin and continue building.

## Demo

*(Will include screenshots)*

## Tech Stack

- **Client**:
  - [Three.js](https://threejs.org/) - 3D rendering library.
  - [Socket.io Client](https://socket.io/) - Real-time bidirectional event-based communication.
  - [Vite](https://vitejs.dev/) - Development environment.
- **Server**:
  - [Express.js](https://expressjs.com/) - Web framework for Node.js.
  - [Socket.io](https://socket.io/) - WebSocket library for real-time communication.

## Getting Started

### Prerequisites

- **Node.js** (version 14 or higher)
- **npm** or **yarn**

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/your-username/lego-simulator.git
   cd lego-simulator
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

## Usage

### Running the Client

```bash
npm run dev
```

### Running the Server

```bash
npm run server
```

## Controls

- **W/A/S/D**: Move
- **Q/E**: Up/Down
- **Mouse**: Look around
- **Left Click**: Place block
- **Right Click**: Remove block
- **1-4**: Select block type

## Multiplayer

### Creating a Room

*On the title screen, click on the CREATE ROOM button.
A room ID will be generated and displayed. Share this ID with other players.*

### Joining a Room

*Enter the room ID in the input field on the title screen.
Click on the JOIN ROOM button to join the room.*

### Notes
*Rooms can have up to 4 players.
Blocks placed are synchronized across all players in the room.
Player positions are updated in real-time.*

## Project Structure

```plaintext
lego-simulator/
├── models/             # 3D models used in the game
├── public/             # Static assets
├── src/
│   ├── main.js         # Main client-side JavaScript file
│   ├── style.css       # Global styles
│   └── index.html      # Main HTML file
├── server.js           # WebSocket server logic
├── package.json        # Project manifest
└── README.md           # Project documentation
```

## Deployment

### Deploying the Client to Vercel

1. **Connect GitHub repository**
2. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `dist`

### Deploying the Server to Render

1. Create a Render account and create a new Web Service.
2. Connect your GitHub repository.
3. Configure the service:
   - Build Command: `npm install`
   - Start Command: `npm start`
4. Set Environment Variables:
- NODE_ENV: production
- PORT: 3000
- CORS_ORIGIN: Your client URL (e.g., https://your-client.vercel.app)
5. Deploy!

## Environment Variables

### Client

- `VITE_SOCKET_URL=your-server-url`
- `const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:3000";`

### Server

- `PORT=3000`
- `NODE_ENV=production`


