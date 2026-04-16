// Duck Hunt Game
// Complete browser-based clone with NES-style graphics and audio

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Disable anti-aliasing for pixel art look
ctx.imageSmoothingEnabled = false;

// Game constants
const GAME_WIDTH = 256;
const GAME_HEIGHT = 240;
const GRASS_HEIGHT = 60;
const SKY_COLOR = '#5C94FC';
const GRASS_COLOR_TOP = '#00A800';
const GRASS_COLOR_BOTTOM = '#008000';

// Game state
let gameState = 'start'; // start, playing, round_end, game_over
let score = 0;
let round = 1;
let shots = 3;
let ducksHit = 0;
let ducksNeeded = 10;
let ducks = [];
let particles = [];
let dog = null;
let lastTime = 0;
let roundTimer = 0;
let duckSpawnTimer = 0;

// Leaderboard
let leaderboard = JSON.parse(localStorage.getItem('duckHuntLeaderboard')) || [];

// Load leaderboard from localStorage
function loadLeaderboard() {
    const saved = localStorage.getItem('duckHuntLeaderboard');
    if (saved) {
        leaderboard = JSON.parse(saved);
    }
}

// Save leaderboard to localStorage
function saveLeaderboard() {
    localStorage.setItem('duckHuntLeaderboard', JSON.stringify(leaderboard));
}

// Check if score is in top 3
function isHighScore(score) {
    if (leaderboard.length < 3) return true;
    return score > leaderboard[leaderboard.length - 1].score;
}

// Add score to leaderboard
function addToLeaderboard(initials, score) {
    leaderboard.push({ initials: initials.toUpperCase(), score: score });
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 3); // Keep only top 3
    saveLeaderboard();
}

// Display leaderboard
function displayLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    list.innerHTML = '';
    
    if (leaderboard.length === 0) {
        list.innerHTML = '<div class="leaderboard-entry"><span class="initials">No scores yet!</span></div>';
        return;
    }
    
    leaderboard.forEach((entry, index) => {
        const div = document.createElement('div');
        div.className = 'leaderboard-entry';
        div.innerHTML = `
            <span class="rank">${index + 1}.</span>
            <span class="initials">${entry.initials}</span>
            <span class="score">${entry.score}</span>
        `;
        list.appendChild(div);
    });
}
let canShoot = true;
let ducksSpawned = 0; // Track how many ducks have appeared this round

// Get pass line requirement based on round
function getPassLine(roundNum) {
    if (roundNum >= 20) return 10;
    if (roundNum >= 15) return 9;
    if (roundNum >= 13) return 8;
    if (roundNum >= 11) return 7;
    return 6;
}

// Audio context for 8-bit sounds
let audioCtx = null;

// Initialize canvas size
function resizeCanvas() {
    const aspectRatio = GAME_WIDTH / GAME_HEIGHT;
    let width = window.innerWidth;
    let height = window.innerHeight;
    
    if (width / height > aspectRatio) {
        width = height * aspectRatio;
    } else {
        height = width / aspectRatio;
    }
    
    canvas.width = GAME_WIDTH;
    canvas.height = GAME_HEIGHT;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
}

// 8-bit Audio Generator
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch(type) {
        case 'shoot':
            // Gunshot - white noise burst
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, now);
            osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
            gain.gain.setValueAtTime(0.5, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
            
        case 'quack':
            // Duck quack
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, now);
            osc.frequency.setValueAtTime(350, now + 0.1);
            osc.frequency.setValueAtTime(400, now + 0.2);
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.setValueAtTime(0.2, now + 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
            break;
            
        case 'bark':
            // Dog bark
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.setValueAtTime(250, now + 0.1);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
            osc.start(now);
            osc.stop(now + 0.15);
            
            // Second bark
            setTimeout(() => {
                const osc2 = audioCtx.createOscillator();
                const gain2 = audioCtx.createGain();
                osc2.connect(gain2);
                gain2.connect(audioCtx.destination);
                osc2.type = 'sawtooth';
                osc2.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc2.frequency.setValueAtTime(250, audioCtx.currentTime + 0.1);
                gain2.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
                osc2.start(audioCtx.currentTime);
                osc2.stop(audioCtx.currentTime + 0.15);
            }, 200);
            break;
            
        case 'laugh':
            // Dog laugh
            osc.type = 'square';
            osc.frequency.setValueAtTime(200, now);
            for (let i = 0; i < 6; i++) {
                osc.frequency.setValueAtTime(200 + (i % 2) * 50, now + i * 0.1);
            }
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.6);
            osc.start(now);
            osc.stop(now + 0.6);
            break;
            
        case 'hit':
            // Duck hit
            osc.type = 'square';
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
            
        case 'fall':
            // Duck falling
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(300, now);
            osc.frequency.linearRampToValueAtTime(100, now + 0.5);
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.5);
            osc.start(now);
            osc.stop(now + 0.5);
            break;
    }
}

// Pixel Art Drawing Functions
function drawPixelRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), width, height);
}

function drawPixelCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
            if (dx * dx + dy * dy <= radius * radius) {
                ctx.fillRect(Math.floor(x + dx), Math.floor(y + dy), 1, 1);
            }
        }
    }
}

// Draw Duck (NES style)
function drawDuck(duck) {
    const x = Math.floor(duck.x);
    const y = Math.floor(duck.y);
    const frame = duck.frame;
    
    ctx.save();
    
    // Flip if moving left
    if (duck.vx < 0) {
        ctx.translate(x + 16, y);
        ctx.scale(-1, 1);
        ctx.translate(-16, -16);
    } else {
        ctx.translate(x, y - 16);
    }
    
    // Duck colors
    const bodyColor = duck.color === 'black' ? '#000' : 
                      duck.color === 'red' ? '#C84C0C' : '#00A800';
    const wingColor = duck.color === 'black' ? '#444' : 
                      duck.color === 'red' ? '#E69C5C' : '#5CFC5C';
    
    if (duck.state === 'flying') {
        // Flying animation frames
        if (frame === 0) {
            // Wings up
            drawPixelRect(4, 8, 8, 6, bodyColor); // body
            drawPixelRect(2, 4, 6, 4, wingColor); // left wing
            drawPixelRect(10, 4, 6, 4, wingColor); // right wing
            drawPixelRect(12, 10, 4, 3, bodyColor); // tail
            drawPixelRect(14, 6, 3, 3, '#FFF'); // head
            drawPixelRect(16, 7, 2, 1, '#000'); // eye
            drawPixelRect(17, 8, 3, 2, '#FF6B00'); // beak
        } else if (frame === 1) {
            // Wings middle
            drawPixelRect(4, 10, 8, 5, bodyColor);
            drawPixelRect(2, 8, 6, 3, wingColor);
            drawPixelRect(10, 8, 6, 3, wingColor);
            drawPixelRect(12, 12, 4, 2, bodyColor);
            drawPixelRect(14, 8, 3, 3, '#FFF');
            drawPixelRect(16, 9, 2, 1, '#000');
            drawPixelRect(17, 10, 3, 2, '#FF6B00');
        } else {
            // Wings down
            drawPixelRect(4, 12, 8, 4, bodyColor);
            drawPixelRect(2, 14, 6, 2, wingColor);
            drawPixelRect(10, 14, 6, 2, wingColor);
            drawPixelRect(12, 14, 4, 2, bodyColor);
            drawPixelRect(14, 10, 3, 3, '#FFF');
            drawPixelRect(16, 11, 2, 1, '#000');
            drawPixelRect(17, 12, 3, 2, '#FF6B00');
        }
    } else if (duck.state === 'falling') {
        // Falling - wings tucked
        drawPixelRect(6, 8, 6, 8, bodyColor);
        drawPixelRect(4, 10, 2, 4, wingColor);
        drawPixelRect(12, 10, 2, 4, wingColor);
        drawPixelRect(10, 6, 3, 3, '#FFF');
        drawPixelRect(11, 7, 1, 1, '#000');
    } else if (duck.state === 'hit') {
        // Hit - falling straight down
        drawPixelRect(6, 8, 6, 6, bodyColor);
        drawPixelRect(10, 6, 3, 3, '#FFF');
        // X eyes
        drawPixelRect(11, 7, 1, 1, '#000');
        drawPixelRect(12, 8, 1, 1, '#000');
        drawPixelRect(12, 7, 1, 1, '#000');
        drawPixelRect(11, 8, 1, 1, '#000');
    }
    
    ctx.restore();
}

// Draw Dog
function drawDog() {
    if (!dog) return;
    
    const x = Math.floor(dog.x);
    const y = Math.floor(dog.y);
    
    ctx.save();
    ctx.translate(x - 16, y - 32);
    
    // Dog colors
    const brown = '#C84C0C';
    const lightBrown = '#E69C5C';
    const white = '#FFF';
    const black = '#000';
    
    if (dog.state === 'sniffing') {
        const frame = Math.floor(dog.animTimer / 10) % 2;
        // Body
        drawPixelRect(8, 16, 16, 12, brown);
        // Head
        drawPixelRect(20, 8, 10, 10, brown);
        // Ears
        drawPixelRect(22, 6, 4, 4, brown);
        drawPixelRect(26, 6, 4, 4, brown);
        // Snout
        drawPixelRect(28, 12, 6, 6, lightBrown);
        drawPixelRect(32, 14, 2, 2, black); // nose
        // Legs
        drawPixelRect(10, 26, 4, 6, brown);
        drawPixelRect(18, 26, 4, 6, brown);
        // Tail
        drawPixelRect(4, 14, 4, 4, brown);
        // Sniff animation
        if (frame === 0) {
            drawPixelRect(30, 18, 2, 2, white); // breath
        }
    } else if (dog.state === 'jumping') {
        // Jumping up with duck
        const jumpY = -Math.sin(dog.animTimer * 0.1) * 20;
        ctx.translate(0, jumpY);
        
        // Body
        drawPixelRect(8, 16, 16, 12, brown);
        // Head (happy)
        drawPixelRect(20, 8, 10, 10, brown);
        drawPixelRect(22, 6, 4, 4, brown);
        drawPixelRect(26, 6, 4, 4, brown);
        drawPixelRect(28, 12, 6, 6, lightBrown);
        // Happy eyes
        drawPixelRect(24, 10, 2, 2, black);
        drawPixelRect(28, 10, 2, 2, black);
        // Legs (bent)
        drawPixelRect(10, 26, 4, 4, brown);
        drawPixelRect(18, 26, 4, 4, brown);
        // Duck in mouth
        drawPixelRect(32, 10, 8, 6, '#000');
        drawPixelRect(36, 8, 4, 3, '#FFF');
    } else if (dog.state === 'laughing') {
        // Laughing
        const laughFrame = Math.floor(dog.animTimer / 5) % 2;
        
        // Body
        drawPixelRect(8, 16, 16, 12, brown);
        // Head
        drawPixelRect(20, 8, 10, 10, brown);
        drawPixelRect(22, 6, 4, 4, brown);
        drawPixelRect(26, 6, 4, 4, brown);
        drawPixelRect(28, 12, 6, 6, lightBrown);
        // Laughing eyes
        if (laughFrame === 0) {
            drawPixelRect(24, 10, 2, 2, black);
            drawPixelRect(28, 10, 2, 2, black);
        } else {
            drawPixelRect(23, 10, 4, 2, black);
            drawPixelRect(27, 10, 4, 2, black);
        }
        // Open mouth
        drawPixelRect(26, 14, 4, 4, black);
        drawPixelRect(27, 15, 2, 2, '#FF6B00');
        // Legs
        drawPixelRect(10, 26, 4, 6, brown);
        drawPixelRect(18, 26, 4, 6, brown);
    }
    
    ctx.restore();
}

// Draw Background
function drawBackground() {
    // Sky
    drawPixelRect(0, 0, GAME_WIDTH, GAME_HEIGHT - GRASS_HEIGHT, SKY_COLOR);
    
    // Clouds
    drawCloud(40, 40, 30);
    drawCloud(150, 25, 25);
    drawCloud(200, 60, 20);
    
    // Grass
    const grassY = GAME_HEIGHT - GRASS_HEIGHT;
    drawPixelRect(0, grassY, GAME_WIDTH, GRASS_HEIGHT / 2, GRASS_COLOR_TOP);
    drawPixelRect(0, grassY + GRASS_HEIGHT / 2, GAME_WIDTH, GRASS_HEIGHT / 2, GRASS_COLOR_BOTTOM);
    
    // Grass details
    for (let i = 0; i < GAME_WIDTH; i += 8) {
        if ((i + Math.floor(grassY / 10)) % 3 === 0) {
            drawPixelRect(i, grassY, 2, 4, '#007000');
        }
    }
    
    // Bush
    drawBush(20, grassY - 8);
    drawBush(200, grassY - 6);
}

function drawCloud(x, y, size) {
    drawPixelCircle(x, y, size * 0.6, '#FFF');
    drawPixelCircle(x - size * 0.3, y + 5, size * 0.4, '#FFF');
    drawPixelCircle(x + size * 0.3, y + 5, size * 0.4, '#FFF');
}

function drawBush(x, y) {
    drawPixelCircle(x, y, 12, '#00A800');
    drawPixelCircle(x + 8, y - 2, 10, '#00A800');
    drawPixelCircle(x + 16, y, 8, '#00A800');
}

// Draw Particles (feathers)
function drawParticles() {
    for (let p of particles) {
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
    }
}

// Create feather particles
function createFeathers(x, y, color) {
    const featherColor = color === 'black' ? '#888' : 
                         color === 'red' ? '#E69C5C' : '#5CFC5C';
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 3,
            vy: (Math.random() - 0.5) * 3,
            size: 2 + Math.random() * 2,
            color: featherColor,
            life: 30
        });
    }
}

// Game Logic
class Duck {
    constructor() {
        // Start from bottom of screen (grass area)
        this.x = 30 + Math.random() * (GAME_WIDTH - 60);
        this.y = GAME_HEIGHT - GRASS_HEIGHT + 10;
        
        // Random flight duration (3-8 seconds worth of frames at 60fps)
        this.flightTime = 180 + Math.random() * 300;
        this.flightTimer = 0;
        
        // Initial velocity - fly upward and at an angle
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8; // Upward with spread
        const speed = 1.5 + round * 0.2;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        
        // Turn timing
        this.nextTurnTime = 60 + Math.random() * 120;
        this.turnTimer = 0;
        
        // Track if duck is leaving the screen
        this.leaving = false;
        
        this.state = 'flying';
        this.frame = 0;
        this.frameTimer = 0;
        this.color = ['black', 'red', 'blue'][Math.floor(Math.random() * 3)];
        this.width = 20;
        this.height = 20;
    }
    
    update() {
        if (this.state === 'flying') {
            this.x += this.vx;
            this.y += this.vy;
            this.flightTimer++;
            this.turnTimer++;
            
            // Random turns
            if (this.turnTimer >= this.nextTurnTime) {
                this.turnTimer = 0;
                this.nextTurnTime = 40 + Math.random() * 100;
                
                // Change direction randomly
                const turnAmount = (Math.random() - 0.5) * 1.5;
                const currentAngle = Math.atan2(this.vy, this.vx);
                const newAngle = currentAngle + turnAmount;
                const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
                this.vx = Math.cos(newAngle) * speed;
                this.vy = Math.sin(newAngle) * speed;
            }
            
            // Bounce off edges
            if (this.y < 30) {
                this.y = 30;
                this.vy = Math.abs(this.vy);
            }
            if (this.x < 20) {
                this.x = 20;
                this.vx = Math.abs(this.vx);
            }
            if (this.x > GAME_WIDTH - 20) {
                this.x = GAME_WIDTH - 20;
                this.vx = -Math.abs(this.vx);
            }
            
            // Animation
            this.frameTimer++;
            if (this.frameTimer > 8) {
                this.frameTimer = 0;
                this.frame = (this.frame + 1) % 3;
            }
            
            // Fly away after flight time expires - head off screen
            if (this.flightTimer >= this.flightTime && !this.leaving) {
                this.leaving = true;
                // Randomly choose exit direction: left, right, or top
                const exitChoice = Math.random();
                if (exitChoice < 0.33) {
                    // Exit left
                    this.vx = -2 - Math.random();
                    this.vy = (Math.random() - 0.5) * 2;
                } else if (exitChoice < 0.66) {
                    // Exit right
                    this.vx = 2 + Math.random();
                    this.vy = (Math.random() - 0.5) * 2;
                } else {
                    // Exit top
                    this.vx = (Math.random() - 0.5) * 2;
                    this.vy = -2 - Math.random();
                }
            }
            
            // Remove if off screen
            if (this.x < -50 || this.x > GAME_WIDTH + 50 || this.y < -50 || this.y > GAME_HEIGHT - GRASS_HEIGHT + 20) {
                return false; // Remove duck
            }
        } else if (this.state === 'hit') {
            this.vy += 0.15;
            this.y += this.vy;
            
            if (this.y > GAME_HEIGHT - GRASS_HEIGHT - 10) {
                this.y = GAME_HEIGHT - GRASS_HEIGHT - 10;
                return false; // Remove duck
            }
        }
        
        return true;
    }
    
    hit() {
        if (this.state === 'flying') {
            this.state = 'hit';
            this.vx = 0;
            this.vy = -2;
            createFeathers(this.x + 10, this.y, this.color);
            playSound('hit');
            setTimeout(() => playSound('fall'), 100);
            return true;
        }
        return false;
    }
}

class DogClass {
    constructor() {
        this.x = GAME_WIDTH / 2;
        this.y = GAME_HEIGHT - GRASS_HEIGHT + 10;
        this.state = 'hidden';
        this.animTimer = 0;
        this.targetX = GAME_WIDTH / 2;
    }
    
    update() {
        this.animTimer++;
        
        if (this.state === 'sniffing') {
            // Move towards target
            if (Math.abs(this.x - this.targetX) > 2) {
                this.x += (this.targetX - this.x) * 0.05;
            }
            
            if (this.animTimer > 60) {
                this.state = 'hidden';
            }
        } else if (this.state === 'jumping') {
            if (this.animTimer > 60) {
                this.state = 'hidden';
            }
        } else if (this.state === 'laughing') {
            if (this.animTimer > 90) {
                this.state = 'hidden';
            }
        }
    }
    
    showWithDuck(duckX) {
        this.x = duckX;
        this.state = 'jumping';
        this.animTimer = 0;
        playSound('bark');
    }
    
    laugh() {
        this.x = GAME_WIDTH / 2;
        this.state = 'laughing';
        this.animTimer = 0;
        playSound('laugh');
    }
    
    sniff() {
        this.targetX = 30 + Math.random() * (GAME_WIDTH - 60);
        this.state = 'sniffing';
        this.animTimer = 0;
    }
}

// Input handling
function handleInput(e) {
    if (gameState !== 'playing') return;
    if (!canShoot) return;
    
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    let clientX, clientY;
    if (e.type.includes('touch')) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    shoot(x, y);
}

function shoot(x, y) {
    if (shots <= 0) return;
    
    shots--;
    updateUI();
    playSound('shoot');
    
    // Flash effect
    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.getElementById('game-container').appendChild(flash);
    setTimeout(() => flash.remove(), 100);
    
    // Check hits
    let hit = false;
    for (let duck of ducks) {
        const dx = x - duck.x;
        const dy = y - duck.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 20 && duck.state === 'flying') {
            if (duck.hit()) {
                hit = true;
                score += 100 * round;
                ducksHit++;
                shots = 3; // Reset shots for next target
                updateUI();
                
                // Dog shows duck
                setTimeout(() => {
                    dog.showWithDuck(duck.x);
                }, 500);
            }
        }
    }
    
    if (shots === 0 && ducks.some(d => d.state === 'flying')) {
        canShoot = false;
        // Duck flies away after missing all shots
        // The update loop will handle removing the duck and resetting shots
    }
}

function spawnDuck() {
    if (ducks.length === 0 && ducksSpawned < 10) {
        const duck = new Duck();
        ducks.push(duck);
        ducksSpawned++;
        playSound('quack');
    }
}

function showRoundScreen(perfect = false) {
    const roundScreen = document.getElementById('round-screen');
    const roundText = document.getElementById('round-text');
    
    if (perfect) {
        roundText.textContent = 'PERFECT!!';
        roundText.style.color = '#00FF00';
    } else {
        roundText.textContent = `ROUND ${round}`;
        roundText.style.color = '#FF6B00';
    }
    
    roundScreen.classList.remove('hidden');
    
    // Hide after 2 seconds and start the round
    setTimeout(() => {
        roundScreen.classList.add('hidden');
        gameState = 'playing';
        // Dog sniff to start
        setTimeout(() => dog.sniff(), 500);
    }, 2000);
}

function endRound() {
    // Clear remaining ducks
    ducks = [];
    
    const passLine = getPassLine(round);
    const isPerfect = ducksHit === 10;
    
    if (ducksHit >= passLine) {
        // Perfect round bonus
        if (isPerfect) {
            score += 1000; // PERFECT bonus
        }
        
        // Advance to next round
        round++;
        ducksHit = 0;
        ducksSpawned = 0;
        shots = 3;
        canShoot = true;
        updateUI();
        
        // Show round announcement (with perfect bonus if applicable)
        gameState = 'round_transition';
        showRoundScreen(isPerfect);
    } else {
        // Game over
        gameState = 'game_over';
        document.getElementById('final-score').textContent = `Final Score: ${score}`;
        document.getElementById('game-over-screen').classList.remove('hidden');
        
        // Show leaderboard
        displayLeaderboard();
        
        // Check for high score
        const initialsEntry = document.getElementById('initials-entry');
        if (isHighScore(score)) {
            initialsEntry.classList.remove('hidden');
            document.getElementById('initials-input').focus();
        } else {
            initialsEntry.classList.add('hidden');
        }
    }
}

function updateUI() {
    const passLine = getPassLine(round);
    document.getElementById('score').textContent = `SCORE: ${score}`;
    document.getElementById('round').textContent = `ROUND: ${round}`;
    document.getElementById('shots').textContent = `SHOTS: ${shots}`;
    document.getElementById('ducks-hit').textContent = `HIT: ${ducksHit}/10 (NEED ${passLine})`;
    
    // Update pass line marker position
    const marker = document.getElementById('pass-line-marker');
    if (marker) {
        const position = (passLine / 10) * 100;
        marker.style.left = `${position}%`;
    }
}

function update(dt) {
    if (gameState !== 'playing') return;

    roundTimer += dt;

    // Spawn ducks
    duckSpawnTimer += dt;
    if (duckSpawnTimer > 2000 && ducks.length === 0 && ducksSpawned < 10 && canShoot) {
        spawnDuck();
        duckSpawnTimer = 0;
    }

    // Update dog
    if (dog) dog.update();

    // Update particles
    particles = particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        return p.life > 0;
    });

    // Update ducks and handle shot reset when ducks are removed
    const prevDuckCount = ducks.length;
    ducks = ducks.filter(duck => duck.update());

    // If a duck was removed and we haven't processed all 10, reset shots for next duck
    if (ducks.length < prevDuckCount && ducksSpawned < 10) {
        shots = 3;
        canShoot = true;
        updateUI();
    }

    // Check if round should end (all 10 ducks processed and none on screen)
    if (ducksSpawned >= 10 && ducks.length === 0) {
        endRound();
    }
}

function draw() {
    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    
    // Background
    drawBackground();
    
    // Draw dog (behind grass if hidden)
    if (dog && dog.state !== 'hidden') {
        drawDog();
    }
    
    // Draw ducks
    for (let duck of ducks) {
        drawDuck(duck);
    }
    
    // Draw particles
    drawParticles();
}

function gameLoop(timestamp) {
    const dt = timestamp - lastTime;
    lastTime = timestamp;
    
    update(dt);
    draw();
    
    requestAnimationFrame(gameLoop);
}

// Start game
function startGame() {
    initAudio();
    gameState = 'round_transition';
    score = 0;
    round = 1;
    ducksHit = 0;
    ducksSpawned = 0;
    shots = 3;
    ducks = [];
    particles = [];
    canShoot = true;
    roundTimer = 0;
    duckSpawnTimer = 0;
    
    dog = new DogClass();
    
    updateUI();
    
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    // Show round 1 announcement
    showRoundScreen();
}

// Event listeners
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

// Save score button
document.getElementById('save-score-btn').addEventListener('click', () => {
    const input = document.getElementById('initials-input');
    const initials = input.value.trim() || 'AAA';
    addToLeaderboard(initials, score);
    displayLeaderboard();
    document.getElementById('initials-entry').classList.add('hidden');
});

// Allow Enter key to save score
document.getElementById('initials-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('save-score-btn').click();
    }
});

// Load leaderboard on startup
loadLeaderboard();

canvas.addEventListener('mousedown', handleInput);
canvas.addEventListener('touchstart', handleInput, { passive: false });

window.addEventListener('resize', resizeCanvas);

// Initialize
resizeCanvas();
requestAnimationFrame(gameLoop);