# Keyboard Shortcuts Guide

High Wizardry is fully accessible via keyboard navigation. This guide covers all available keyboard shortcuts.

## Global Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` | Move focus to next interactive element |
| `Shift + Tab` | Move focus to previous interactive element |
| `Enter` | Activate focused button or link |
| `Space` | Activate focused button (alternative to Enter) |
| `Escape` | Close modal, dialog, or dropdown / Clear search input |
| `Ctrl/Cmd + K` | Open command palette (coming soon) |

## Skip Navigation

| Shortcut | Action |
|----------|--------|
| `Tab` (from page load) | Focus on "Skip to Content" link |
| `Enter` (on Skip link) | Jump directly to main content |

## Location Navigation

| Shortcut | Action |
|----------|--------|
| `Arrow Up/Down` | Navigate between location buttons in sidebar |
| `Enter` | Travel to selected location |

## Lists and Menus

| Shortcut | Action |
|----------|--------|
| `Arrow Up` | Move to previous item in list |
| `Arrow Down` | Move to next item in list |
| `Home` | Jump to first item in list |
| `End` | Jump to last item in list |
| `Enter` | Select/activate current item |

## Modals and Dialogs

| Shortcut | Action |
|----------|--------|
| `Escape` | Close the topmost modal or dialog |
| `Tab` | Cycle through focusable elements within modal |
| `Shift + Tab` | Cycle backwards through modal elements |
| `Enter` | Submit form or confirm action |

## Tutorial System

| Shortcut | Action |
|----------|--------|
| `Right Arrow` | Next tutorial step |
| `Left Arrow` | Previous tutorial step |
| `Enter` | Next tutorial step (alternative) |
| `Escape` | Skip tutorial (with confirmation) |

## Forms and Input

| Shortcut | Action |
|----------|--------|
| `Tab` | Move to next form field |
| `Shift + Tab` | Move to previous form field |
| `Enter` | Submit form (when on submit button) |
| `Escape` | Clear focused input field |
| `Ctrl/Cmd + A` | Select all text in input |

## Chat and Messaging

| Shortcut | Action |
|----------|--------|
| `Enter` | Send message |
| `Shift + Enter` | Insert line break (if supported) |
| `Escape` | Clear chat input |
| `Arrow Up` | Edit last sent message (if supported) |

## Game Actions

| Shortcut | Action |
|----------|--------|
| `1-9` | Quick action hotkeys (if configured) |
| `I` | Open inventory (if configured) |
| `M` | Open map (if configured) |
| `C` | Open character stats (if configured) |
| `H` | Open help/tutorial |

## Accessibility Features

| Shortcut | Action |
|----------|--------|
| `Tab` | Show visible focus indicators |
| `Mouse click` | Return to mouse-based focus |

## Screen Reader Shortcuts

These shortcuts work with popular screen readers:

### NVDA (Windows)
- `NVDA + Space`: Toggle browse/focus mode
- `H`: Navigate by heading
- `K`: Navigate by link
- `B`: Navigate by button
- `F`: Navigate by form field

### JAWS (Windows)
- `Insert + F7`: List of links
- `Insert + F5`: List of form fields
- `Insert + F6`: List of headings
- `H`: Next heading
- `B`: Next button

### VoiceOver (Mac/iOS)
- `VO + Right Arrow`: Next item
- `VO + Left Arrow`: Previous item
- `VO + Space`: Activate item
- `VO + U`: Open rotor (navigation menu)
- `VO + Command + H`: Next heading

## Browser Shortcuts

Standard browser shortcuts that work with High Wizardry:

| Shortcut | Action |
|----------|--------|
| `F5` / `Ctrl/Cmd + R` | Refresh page |
| `Ctrl/Cmd + Plus` | Zoom in |
| `Ctrl/Cmd + Minus` | Zoom out |
| `Ctrl/Cmd + 0` | Reset zoom |
| `Ctrl/Cmd + F` | Find in page |
| `F11` | Toggle fullscreen |

## Custom Shortcuts (Coming Soon)

Future updates will include customizable shortcuts for:
- Quick travel between favorite locations
- Inventory management
- Guild actions
- Trading operations
- Auction house browsing

## Tips for Keyboard Users

1. **Tab Order**: The tab order follows the visual layout from top to bottom, left to right.

2. **Focus Indicators**: When using Tab navigation, you'll see a purple outline around the focused element.

3. **Modal Focus Trap**: When a modal opens, focus is trapped within it. Press Escape to close and return focus to the previous element.

4. **Skip Links**: Press Tab immediately after page load to reveal the "Skip to Content" link.

5. **Arrow Keys**: Use arrow keys when navigating lists, menus, or the location sidebar for faster navigation.

6. **Screen Reader Mode**: The game includes ARIA labels and live regions that announce important updates to screen reader users.

## Disabling Features

### Reduce Motion
If you have motion sensitivity, enable "Reduce Motion" in your operating system:

- **Windows**: Settings > Ease of Access > Display > Show animations
- **Mac**: System Preferences > Accessibility > Display > Reduce motion
- **iOS**: Settings > Accessibility > Motion > Reduce Motion
- **Android**: Settings > Accessibility > Remove animations

The game will automatically respect this preference and minimize or disable animations.

### High Contrast Mode
For better visibility, enable high contrast mode in your OS:

- **Windows**: Settings > Ease of Access > High contrast
- **Mac**: System Preferences > Accessibility > Display > Increase contrast

The game will automatically adjust borders and outlines for better visibility in high contrast mode.

## Reporting Issues

If you encounter any keyboard navigation or accessibility issues:

1. Open an issue on GitHub
2. Include:
   - Your browser and version
   - Operating system
   - Assistive technology (if using)
   - Steps to reproduce the issue
   - Expected behavior

## Learning Resources

To learn more about keyboard navigation and accessibility:

- [WebAIM Keyboard Accessibility](https://webaim.org/articles/keyboard/)
- [W3C WAI Keyboard Navigation](https://www.w3.org/WAI/WCAG21/Understanding/keyboard.html)
- [Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey9/)

## Practice Mode

New to keyboard navigation? Try these exercises:

1. **Basic Navigation**: Use only Tab and Enter to navigate to each location in the sidebar.

2. **Modal Interaction**: Open the player manual link, then use Tab to navigate through the modal and Escape to close it.

3. **List Navigation**: Navigate to the Online Players list and use arrow keys to move between players.

4. **Tutorial**: Complete the welcome tutorial using only keyboard shortcuts.

5. **Challenge**: Try playing the game for 5 minutes using only your keyboard!

## Contributing

Help us improve keyboard accessibility:

1. Test keyboard navigation in different browsers
2. Report any elements that can't be reached with keyboard
3. Suggest new keyboard shortcuts
4. Help us test with different screen readers

## Changelog

### Version 2.1 (Current)
- Added comprehensive keyboard navigation support
- Implemented focus trap for modals
- Added skip-to-content link
- Enhanced ARIA labels and roles
- Added tutorial keyboard shortcuts

### Future Plans
- Customizable keyboard shortcuts
- Voice control support
- Gamepad support
- Gesture controls for mobile

---

**Remember**: If you can't reach something with your keyboard, it's a bug! Please report it so we can fix it.
