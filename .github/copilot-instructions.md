# High Wizardry - Copilot Instructions

## Project Overview

High Wizardry is a web-based wizard/RPG game built with vanilla JavaScript, HTML5, and CSS. The game features a dark fantasy theme with wizard characters, chat systems, and online multiplayer capabilities.

## Project Structure

```
/
├── index.html          # Main game entry point with embedded styles
├── jsjs/              # JavaScript modules
│   ├── main.js        # Main initialization and entry point
│   ├── game-core.js   # Core game logic and mechanics
│   ├── player.js      # Player state and management
│   ├── ui.js          # UI components and interactions
│   ├── chat.js        # Chat system
│   ├── online.game.js # Multiplayer/online features
│   ├── server.js      # Server-related functionality
│   ├── config.js      # Game configuration
│   └── script.js      # Additional scripts
├── {css/              # Stylesheets
│   └── styles.css     # Main styles (note: directory has unusual name)
└── .github/           # GitHub configuration
    └── workflows/     # GitHub Actions workflows
```

## How to Test

This is a **client-side web application** with no build process. Testing is done by opening the HTML file in a browser:

1. **Manual testing**: Open `index.html` in a web browser (Chrome, Firefox, Safari, etc.)
2. **Browser console**: Check the browser's developer console for errors and log messages
3. **Live server**: Use a simple HTTP server for testing (e.g., `python -m http.server` or VS Code Live Server extension)
4. **Verify initialization**: Look for console messages like "✅ UI initialized", "✅ Player initialized", etc.

**There is no automated test suite currently.** All testing is manual and browser-based.

## Coding Conventions

### JavaScript Style
- Use **modern ES6+ JavaScript** (const, let, arrow functions, template literals)
- Follow **module pattern** with namespaces (e.g., `window.WizardCity.Game`)
- Use **camelCase** for variables and functions
- Use **PascalCase** for module/class names
- Add **console logging** for initialization and important events with emoji prefixes (✅, ⚠️, ❌)

### Code Organization
- Each JavaScript file focuses on a specific concern/module
- Initialize modules in correct dependency order (UI → Player → Chat → GameCore)
- Use `typeof` checks before calling module methods to handle missing dependencies gracefully
- Event listeners should be added in `DOMContentLoaded` handlers

### HTML/CSS
- Use **Bootstrap 5.3** for layout and components (loaded via CDN)
- Use **Font Awesome 6.4** for icons (loaded via CDN)
- Use **CSS custom properties** (variables) for theming in `:root`
- Follow the **dark theme** design with fantasy aesthetics
- Google Fonts used: 'Cinzel' for headings, 'Inter' for body text

### Error Handling
- Set up global error handling early in initialization
- Use try-catch blocks for module initialization
- Provide graceful degradation when modules are missing
- Log warnings for missing optional components

## Common Tasks

### Adding a New Feature
1. Determine which module(s) need modification
2. Follow existing patterns (check similar features first)
3. Update initialization order in `main.js` if adding new module
4. Test manually in browser with console open
5. Ensure no console errors during initialization

### Fixing Bugs
1. Reproduce the issue in browser
2. Check browser console for error messages
3. Add debug logging if needed
4. Make minimal changes to fix the issue
5. Verify fix doesn't break existing functionality

### Styling Changes
1. Use CSS custom properties defined in `:root` for colors
2. Follow existing color scheme (purple/dark fantasy theme)
3. Ensure responsive design (mobile-friendly)
4. Test in multiple browsers if possible

### Adding New Game Mechanics
1. Update `game-core.js` for core logic
2. Update `player.js` if affecting player state
3. Update `ui.js` for any UI changes
4. Test the full flow manually in browser

## Dependencies

- **Bootstrap 5.3.0** (CSS framework)
- **Font Awesome 6.4.0** (icons)
- **Google Fonts**: Cinzel, MedievalSharp (decorative fonts)

All dependencies are loaded via CDN in `index.html` - no package manager required.

## Important Notes

- No build process or transpilation needed
- No package.json or npm dependencies
- Pure vanilla JavaScript (no frameworks like React/Vue)
- Game state is managed client-side
- The `{css` directory has an unusual name - be careful when referencing it
- Always test changes by opening `index.html` in a browser
- Check console logs during initialization to verify modules loaded correctly
