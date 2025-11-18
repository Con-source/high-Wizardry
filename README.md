# High Wizardry

A web-based wizard/RPG game with online multiplayer support.

## Features

- **Single Player Mode**: Play offline with local saves
- **Online Multiplayer**: Connect with other wizards in real-time
- **Character Progression**: Level up, train stats, and complete quests
- **Crafting System**: Gather resources and craft powerful items
- **Guild System**: Join guilds for unique benefits
- **Location-based Gameplay**: Travel between various magical locations
- **Chat System**: Communicate with other players globally or locally

## Getting Started

### Prerequisites

- Node.js 16 or higher (for multiplayer server)
- A modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Con-source/high-Wizardry.git
cd high-Wizardry
```

2. Install dependencies (for multiplayer):
```bash
npm install
```

### Running the Game

#### Single Player (Offline)

Simply open `index.html` in your web browser. Your progress will be saved locally.

#### Multiplayer (Online)

1. Start the server:
```bash
npm start
```

2. Open your browser and navigate to:
```
http://localhost:8080
```

3. Create an account or login to start playing!

### Configuration

The server runs on port 8080 by default. You can change this by setting the PORT environment variable:

```bash
PORT=3000 npm start
```

## How to Play

1. **Register/Login**: Create an account or login with existing credentials
2. **Explore Locations**: Use the sidebar to navigate between different areas
3. **Interact**: Click on actions and buttons to perform various activities
4. **Chat**: Use the chat system to communicate with other players
5. **Progress**: Complete quests, train stats, and craft items to level up

### Game Mechanics

- **Energy**: Required for most actions, regenerates over time
- **Health**: Your life points, restore at the hospital
- **Mana**: Magical energy for spells (coming soon)
- **Currency**: Shillings and pennies for purchasing items and services

## Development

### Project Structure

```
high-Wizardry/
├── index.html           # Main game UI
├── jsjs/               # Client-side JavaScript modules
│   ├── main.js         # Game initialization
│   ├── player.js       # Player state management
│   ├── online.game.js  # Multiplayer client
│   ├── locations.js    # Location system
│   ├── ui.js           # UI components
│   └── ...
├── server/             # Backend server
│   ├── index.js        # Main server file
│   ├── auth/           # Authentication system
│   └── game/           # Game logic managers
├── {css/               # Stylesheets
└── package.json        # Dependencies
```

### Running in Development

```bash
npm run dev
```

## Multiplayer Architecture

The game uses WebSocket connections for real-time communication:

1. **Authentication**: Secure login with bcrypt password hashing
2. **Player Sync**: Server-side player state management
3. **Location System**: Players can see others in the same location
4. **Action Validation**: Critical calculations happen server-side to prevent cheating
5. **Chat System**: Global and location-based messaging

## Security

- Passwords are hashed using bcrypt
- Critical game calculations (rewards, crafting) are server-side
- Input validation on both client and server
- Session tokens for authentication

## Contributing

Contributions are welcome! Please feel free to submit pull requests.

## License

See LICENSE file for details.

