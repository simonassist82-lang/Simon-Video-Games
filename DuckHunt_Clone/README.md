# Duck Hunt Clone

A complete browser-based clone of the classic NES Duck Hunt game, built with HTML5 Canvas and vanilla JavaScript.

![Duck Hunt](screenshot.png)

## Features

- **Authentic NES-style graphics** - Pixel art ducks, dog, and backgrounds
- **8-bit audio** - Synthesized sound effects (gunshot, quack, bark, laugh)
- **Mouse & touch controls** - Click or tap to shoot
- **Difficulty progression** - Ducks fly faster each round
- **Classic mechanics** - 3 shots per round, score tracking, dog reactions
- **Responsive design** - Works on desktop and mobile devices

## How to Play

1. Open `index.html` in any modern web browser
2. Click **START GAME**
3. Click or tap on the ducks to shoot them
4. You have **3 shots** per round - make them count!
5. Hit enough ducks to advance to the next round
6. Ducks get faster each round!

### Controls

- **Desktop:** Mouse click to shoot
- **Mobile/Tablet:** Touch to shoot

## Game Mechanics

- **Rounds:** Each round requires you to hit a certain number of ducks
- **Shots:** You get 3 shots per round
- **Scoring:** 100 points per duck × current round number
- **Dog:** 
  - Pops up laughing if you miss all ducks
  - Jumps up with the duck in his mouth when you hit one
  - Sniffs around between rounds

## File Structure

```
DuckHunt_Clone/
├── index.html      # Main game file
├── game.js         # Game logic & rendering
├── style.css       # Styling & responsive design
├── assets/         # Assets folder (for future images/audio)
└── README.md       # This file
```

## Technical Details

- **Rendering:** HTML5 Canvas with pixel-perfect scaling
- **Audio:** Web Audio API for real-time 8-bit sound synthesis
- **Graphics:** Procedural pixel art drawn directly to canvas
- **No external dependencies** - Pure HTML/CSS/JavaScript

## Browser Compatibility

Works in all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

## Running Locally

Simply open `index.html` in your browser:

```bash
# On macOS
open index.html

# Or use a local server for better performance
python3 -m http.server 8000
# Then visit http://localhost:8000
```

## Future Enhancements

Possible additions:
- Two-duck mode (like the original)
- Clay pigeon shooting mode
- High score persistence
- More duck colors and types
- Bonus round with perfect accuracy

## Credits

Inspired by the classic NES game Duck Hunt (1984) by Nintendo.

Built as a learning project using modern web technologies.