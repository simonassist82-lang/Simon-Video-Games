// Excitebike - NES Style
// Side-scrolling motocross racing

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Game settings
const WIDTH = 512;
const HEIGHT = 384;
const GROUND_Y = 280;
const GRAVITY = 0.4;

// Game state
let gameState = 'menu';
let player = null;
let opponents = [];
let obstacles = [];
let speed = 0;
let distance = 0;
let position = 1;
let keys = {};

// Initialize
function init() {
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    
    document.addEventListener('keydown', (e) => keys[e.key] = true);
    document.addEventListener('keyup', (e) => keys[e.key] = false);
    
    document.getElementById('btn-solo').onclick = startGame;
    document.getElementById('btn-race').onclick = startGame;
    document.getElementById('btn-restart').onclick = () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        startGame();
    };
    document.getElementById('btn-menu').onclick = () => {
        document.getElementById('game-over-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
        gameState = 'menu';
    };
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    document.getElementById('start-screen').classList.add('hidden');
    
    // Player bike
    player = { 
        x: 120, 
        y: GROUND_Y - 25, 
        vy: 0, 
        onGround: true,
        angle: 0,
        color: '#00AA00'
    };
    
    // AI opponents
    opponents = [];
    for (let i = 0; i < 4; i++) {
        opponents.push({
            x: 80 + i * 60,
            y: GROUND_Y - 25,
            vy: 0,
            onGround: true,
            angle: 0,
            speed: 3 + Math.random() * 2,
            color: i === 0 ? '#AA0000' : i === 1 ? '#AA5500' : i === 2 ? '#AA00AA' : '#00AAAA'
        });
    }
    
    // Generate track
    obstacles = [];
    for (let i = 0; i < 50; i++) {
        obstacles.push({
            x: 400 + i * 300 + Math.random() * 200,
            type: Math.random() < 0.6 ? 'ramp' : 'mud'
        });
    }
    
    speed = 0;
    distance = 0;
    position = 5;
    gameState = 'playing';
}

function update() {
    if (gameState !== 'playing' || !player) return;
    
    // Player controls
    if (keys['ArrowRight']) speed += 0.15;
    if (keys['ArrowLeft']) speed -= 0.25;
    speed = Math.max(0, Math.min(speed, 7));
    speed *= 0.985;
    
    // Jump
    if ((keys['ArrowUp'] || keys[' ']) && player.onGround) {
        player.vy = -10;
        player.onGround = false;
    }
    
    // Lean forward/back
    if (keys['ArrowDown']) player.angle += 0.05;
    if (keys['ArrowUp']) player.angle -= 0.05;
    player.angle = Math.max(-0.5, Math.min(0.5, player.angle));
    
    // Physics
    player.vy += GRAVITY;
    player.y += player.vy;
    
    // Ground collision
    let groundHeight = GROUND_Y;
    
    // Check obstacles
    for (let obs of obstacles) {
        let obsScreenX = obs.x - distance;
        if (obs.type === 'ramp' && obsScreenX > player.x - 30 && obsScreenX < player.x + 30) {
            if (player.y > GROUND_Y - 60) {
                groundHeight = GROUND_Y - 40;
                if (player.onGround && speed > 3) {
                    player.vy = -12;
                    player.onGround = false;
                }
            }
        }
    }
    
    if (player.y >= groundHeight - 25) {
        player.y = groundHeight - 25;
        player.vy = 0;
        player.onGround = true;
        player.angle *= 0.9;
    }
    
    // Move track
    distance += speed;
    
    // Update opponents
    for (let opp of opponents) {
        // AI movement
        opp.x += opp.speed - speed * 0.5;
        
        // Keep in bounds
        if (opp.x < 50) opp.x = 50;
        if (opp.x > WIDTH - 50) opp.x = WIDTH - 50;
        
        // Simple jump AI
        for (let obs of obstacles) {
            let obsX = obs.x - distance;
            if (obs.type === 'ramp' && obsX > opp.x && obsX < opp.x + 100 && opp.onGround) {
                if (Math.random() < 0.1) {
                    opp.vy = -10;
                    opp.onGround = false;
                }
            }
        }
        
        opp.vy += GRAVITY;
        opp.y += opp.vy;
        if (opp.y >= GROUND_Y - 25) {
            opp.y = GROUND_Y - 25;
            opp.vy = 0;
            opp.onGround = true;
        }
    }
    
    // Calculate position
    let ahead = 0;
    for (let opp of opponents) {
        if (opp.x > player.x) ahead++;
    }
    position = ahead + 1;
    
    // Update UI
    document.getElementById('speed-meter').textContent = 'SPEED: ' + Math.floor(speed * 10);
    document.getElementById('temp-meter').textContent = position + ['st', 'nd', 'rd', 'th', 'th'][position - 1] + ' PLACE';
}

function drawBike(bike, isPlayer) {
    ctx.save();
    ctx.translate(bike.x, bike.y + 25);
    ctx.rotate(bike.angle);
    
    // Bike color
    const color = bike.color || '#00AA00';
    
    // Rear wheel
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(-12, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(-12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Front wheel
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(12, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(12, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Bike body
    ctx.fillStyle = color;
    ctx.fillRect(-14, -12, 28, 10);
    
    // Seat
    ctx.fillStyle = '#222';
    ctx.fillRect(-12, -16, 10, 5);
    
    // Handlebars
    ctx.fillStyle = '#888';
    ctx.fillRect(8, -20, 3, 10);
    ctx.fillRect(6, -20, 8, 3);
    
    // Rider body
    ctx.fillStyle = '#FFF';
    ctx.fillRect(-8, -28, 14, 14);
    
    // Rider head
    ctx.fillStyle = '#FFF';
    ctx.beginPath();
    ctx.arc(0, -32, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Helmet stripe
    ctx.fillStyle = color;
    ctx.fillRect(-7, -35, 14, 3);
    
    // Visor
    ctx.fillStyle = '#111';
    ctx.fillRect(-4, -33, 8, 3);
    
    ctx.restore();
}

function draw() {
    // Sky
    ctx.fillStyle = '#5C94FC';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    
    if (gameState === 'menu') return;
    
    // Mountains in background
    ctx.fillStyle = '#4682B4';
    for (let i = 0; i < 6; i++) {
        let x = (i * 100 - distance * 0.1) % (WIDTH + 100);
        if (x < -50) x += WIDTH + 100;
        ctx.beginPath();
        ctx.moveTo(x, GROUND_Y);
        ctx.lineTo(x + 50, GROUND_Y - 80);
        ctx.lineTo(x + 100, GROUND_Y);
        ctx.fill();
    }
    
    // Ground (dirt)
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y);
    
    // Grass top
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, GROUND_Y - 8, WIDTH, 8);
    
    // Track lines
    ctx.strokeStyle = '#B8860B';
    ctx.setLineDash([15, 15]);
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y + i * 25);
        ctx.lineTo(WIDTH, GROUND_Y + i * 25);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    
    // Draw obstacles
    for (let obs of obstacles) {
        let x = obs.x - distance;
        if (x < -100 || x > WIDTH + 100) continue;
        
        if (obs.type === 'ramp') {
            // Ramp
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.moveTo(x, GROUND_Y);
            ctx.lineTo(x + 50, GROUND_Y);
            ctx.lineTo(x + 25, GROUND_Y - 50);
            ctx.closePath();
            ctx.fill();
            // Grass on ramp
            ctx.fillStyle = '#228B22';
            ctx.fillRect(x, GROUND_Y - 50, 50, 5);
        } else if (obs.type === 'mud') {
            // Mud
            ctx.fillStyle = '#4a3728';
            ctx.beginPath();
            ctx.ellipse(x + 25, GROUND_Y, 25, 8, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // Draw all bikes (sort by Y for depth)
    let allBikes = [...opponents, player].sort((a, b) => a.y - b.y);
    for (let bike of allBikes) {
        drawBike(bike, bike === player);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

init();
