# Skateboard Game Design Document
## Target Audience: 7-14 Year Old Boys

---

## Game Overview
A simple, addictive 2D side-scrolling skateboarding game set in a mountain-town skatepark. Players control a skater, perform tricks, and navigate obstacles while the world scrolls by.

---

## Core Mechanics

### 1. Movement
- **Auto-scroll**: The world moves left-to-right automatically at a steady pace
- **Speed control**: Player can hold a button to speed up slightly (risk/reward)
- **Slow down**: Release to return to base speed
- **Momentum matters**: Speed affects jump height and trick difficulty

### 2. Jumping (Ollies)
- **Input**: Tap spacebar or tap screen (mobile)
- **Hold to charge**: Hold longer = higher jump
- **Visual feedback**: Skater crouches while charging, then springs up
- **Landing**: Must land on flat ground or ramps; bail on rough terrain
- **Timing windows**: Perfect landings give small speed boost

### 3. Tricks

#### Kickflip (Air Trick)
- **Input**: Press F key or swipe up while in air
- **Execution**: 
  - Skater board spins beneath them (360° rotation)
  - Particle effect: Small dust/spark on successful landing
  - Sound: Satisfying "pop" + board slap on landing
- **Scoring**: 
  - Base: 100 points
  - Multiplier: Chain tricks without touching ground (2x, 3x, 4x...)
  - Bonus: Kickflip over obstacles = +50 points
- **Risk**: Attempting kickflip too close to ground = bail

#### Grinding (Rail Trick)
- **Input**: Hold G key or hold touch while approaching a rail
- **Execution**:
  - Skater jumps onto rail, balances on trucks
  - Board slides along rail with sparks
  - Release to ollie off rail
- **Scoring**:
  - Base: 10 points per meter grinded
  - Bonus: Ollie off rail +50 points
  - Multiplier: Can chain into kickflip for combo
- **Balance mechanic**: 
  - Small left/right corrections needed (subtle)
  - Too much lean = bail off rail
- **Visual**: Sparks fly from trucks, skater in crouched balance pose

#### Manual (Wheelie)
- **Input**: Hold H key or swipe down while on ground
- **Execution**:
  - Skater lifts front wheels, balances on back two
  - Continue rolling while manualing
  - Release to drop front wheels
- **Scoring**:
  - Base: 5 points per meter manualled
  - Bonus: Manual into kickflip = +100 points
  - Multiplier: Can chain manual → kickflip → manual for big combos
- **Balance mechanic**:
  - Hold too long = loop out (bail)
  - Release at right time = clean drop
- **Visual**: Skater leans back, front wheels in air

---

## Mountain-Town Skatepark Setting

### Visual Style
- **Backdrop**: Snow-capped mountains, pine trees, blue sky
- **Midground**: Wooden skatepark structures, rails, ramps, quarter pipes
- **Foreground**: Concrete surface with occasional cracks/leaves
- **Time of day**: Golden hour (warm oranges, long shadows)
- **Vibe**: Chill, adventurous, slightly retro

### Obstacles & Features
- **Ramps**: Launch points for big air
- **Rails**: Grindable surfaces for rail tricks
- **Gaps**: Jumps between platforms
- **Rough patches**: Grass/dirt sections that slow you down
- **Collectibles**: Floating coins or skate stickers (optional v1)

---

## Game Flow

### Session Structure
- **Endless runner**: No levels, just survive as long as possible
- **Difficulty ramp**: Gradually increases speed over time
- **High score**: Local storage saves best run

### Failure State
- **Bail conditions**:
  - Land on rough terrain
  - Miss a gap
  - Crash into obstacle
- **Bail animation**: Skater tumbles, board flies off screen
- **Restart**: Instant, one-button restart

### Progression (Future)
- Unlock new skater characters
- New skateparks (beach, city, indoor)
- Additional tricks (heelflip, 360 flip)

---

## Controls

### Desktop
- **Spacebar**: Jump (hold to charge)
- **F key**: Kickflip (while airborne)
- **G key**: Grind (hold while on rail)
- **H key**: Manual (hold while on ground)
- **Right Arrow / D**: Speed up
- **R**: Restart after bail

### Mobile
- **Tap**: Jump (hold to charge)
- **Swipe up**: Kickflip (while airborne)
- **Hold on rail**: Grind
- **Swipe down**: Manual (hold to maintain)
- **Hold right side**: Speed up

---

## Audio Design

### Sound Effects
- **Ollie**: Pop sound (rubber band + wood snap)
- **Landing**: Board slap on concrete
- **Kickflip**: Whoosh + board spin sound
- **Grind**: Metal scraping + spark sounds
- **Manual**: Wheel squeak, subtle engine-like hum
- **Bail**: Crash sound, crowd "ohhh"
- **Coin collect**: Satisfying chime

### Music
- **Genre**: Lo-fi hip hop / skate punk instrumental
- **Tempo**: 120-140 BPM
- **Mood**: Energetic but chill
- **Looping**: Seamless background loop

---

## Visual Polish

### Particle Effects
- Dust puff on landing
- Sparkle on perfect landing
- Trail effect when speeding up
- Confetti on high score

### Animation Priorities
1. Skater idle (subtle bounce)
2. Crouch/charge pose
3. Jump arc
4. Kickflip rotation
5. Grind pose (balanced on rail)
6. Manual pose (leaning back)
7. Bail tumble
6. Victory pose (high score)

---

## Success Metrics

### Fun Factor
- Easy to learn, hard to master
- "Just one more run" feeling
- Satisfying trick feedback

### Technical Simplicity
- Single HTML file
- No external dependencies
- Works on all devices
- < 1MB total size

---

## Development Phases

### Phase 1: Core Loop
- Movement + scrolling
- Jumping
- One obstacle type
- Score display

### Phase 2: Trick System
- Kickflip mechanic
- Grinding on rails
- Manuals (wheelies)
- Scoring system
- Multiplier chain
- Combo system

### Phase 3: Polish
- Particle effects
- Sound effects
- Background art
- Mobile optimization

---

*Document Version: 1.0*
*Date: April 9, 2026*
*Status: Ready for Development*
