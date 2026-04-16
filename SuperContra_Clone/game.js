// ============================================
// SUPER CONTRA CLONE - NES Style Run-and-Gun
// ============================================
// VERSION 2 - Fixed enemy spawning

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

// Game Constants
const WIDTH = 512;
const HEIGHT = 448;
const GRAVITY = 0.6;
const PLAYER_SPEED = 3;
const JUMP_POWER = 12;
const BULLET_SPEED = 8;
const LASER_SPEED = 16;

// Game State
let gameState = 'menu'; // menu, playing, gameover
let frameCount = 0;
let score = 0;
let lives = 3;

// Input
const keys = {};
const keysPressed = {};

// Player
let player = {
    x: 50,
    y: 300,
    vx: 0,
    vy: 0,
    width: 20,
    height: 36,
    facing: 1, // 1 = right, -1 = left
    aiming: 0, // -1 = up, 0 = forward, 1 = down
    onGround: false,
    shooting: false,
    shootCooldown: 0,
    invulnerable: 0,
    weapon: 'normal' // normal, spread, laser, fire
};

// Bullets
let bullets = [];
let enemyBullets = [];

// Enemies
let enemies = [];

// Platforms/Level
let platforms = [];

// Power-ups
let powerups = [];

// Flying capsules (weapon drops)
let capsules = [];

// Boss
let boss = null;

// Particles for visual effects
let particles = [];

// Screen shake effect
let screenShake = 0;

// Sound effects (using Web Audio API)
let audioCtx = null;
function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSound(type) {
    if (!audioCtx) initAudio();
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    switch(type) {
        case 'shoot':
            osc.frequency.setValueAtTime(800, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.1);
            break;
        case 'enemyShoot':
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.15);
            break;
        case 'explosion':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
            break;
        case 'powerup':
            osc.type = 'square';
            osc.frequency.setValueAtTime(400, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, audioCtx.currentTime + 0.1);
            osc.frequency.linearRampToValueAtTime(1200, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.3);
            break;
        case 'jump':
            osc.frequency.setValueAtTime(200, audioCtx.currentTime);
            osc.frequency.linearRampToValueAtTime(400, audioCtx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.1);
            break;
        case 'hit':
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(150, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.2);
            break;
    }
}

// ============================================
// INPUT HANDLING
// ============================================

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Track key press events (for single-shot actions)
    if (!keysPressed[key]) {
        keysPressed[key] = true;
    }

    // Restart on R during victory
    if (key === 'r' && gameState === 'victory') {
        restartGame();
    }

    // Prevent default for game keys to stop page scrolling
    if (['z','x','arrowup','arrowdown','arrowleft','arrowright',' '].includes(key)) {
        e.preventDefault();
        e.stopPropagation();
    }
});

document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = false;
    keysPressed[key] = false;
});

// ============================================
// INITIALIZATION
// ============================================

function init() {
    generateLevel();
    requestAnimationFrame(gameLoop);
}

function generateLevel() {
    platforms = [];
    enemies = [];
    powerups = [];
    capsules = [];
    
    console.log('Generating level...');
    boss = null;

    // Ground platforms - extended for boss arena
    for (let x = 0; x < 3000; x += 64) {
        platforms.push({
            x: x,
            y: 400,
            width: 64,
            height: 48
        });
    }

    // Elevated platforms
    platforms.push({ x: 200, y: 320, width: 128, height: 16 });
    platforms.push({ x: 400, y: 260, width: 96, height: 16 });
    platforms.push({ x: 600, y: 320, width: 128, height: 16 });
    platforms.push({ x: 800, y: 200, width: 64, height: 16 });
    platforms.push({ x: 1000, y: 280, width: 160, height: 16 });
    platforms.push({ x: 1200, y: 220, width: 96, height: 16 });
    platforms.push({ x: 1400, y: 300, width: 128, height: 16 });
    platforms.push({ x: 1600, y: 180, width: 80, height: 16 });
    platforms.push({ x: 2000, y: 320, width: 128, height: 16 });
    platforms.push({ x: 2200, y: 260, width: 96, height: 16 });
    platforms.push({ x: 2400, y: 340, width: 160, height: 16 });

    // Boss arena platform
    platforms.push({ x: 2700, y: 300, width: 300, height: 16 });

    // Spawn enemies with progressive difficulty
    // Early game: First enemy at x: 450, well ahead of player start position
    enemies.push({ x: 450, y: 364, vx: 0, vy: 0, type: 'soldier', hp: 1, facing: -1, shootTimer: 0 });
    
    // Mid game (x: 900-1500): Add turrets and more soldiers
    enemies.push({ x: 950, y: 364, vx: 0, vy: 0, type: 'soldier', hp: 1, facing: -1, shootTimer: 0 });
    enemies.push({ x: 1050, y: 244, vx: 0, vy: 0, type: 'turret', hp: 3, facing: -1, shootTimer: 0 });
    enemies.push({ x: 1250, y: 364, vx: 0, vy: 0, type: 'soldier', hp: 1, facing: -1, shootTimer: 0 });
    
    // Late game (x: 1600-2400): Runners, flyers, more variety
    enemies.push({ x: 1650, y: 144, vx: 0, vy: 0, type: 'soldier', hp: 1, facing: -1, shootTimer: 0 });
    enemies.push({ x: 1750, y: 364, vx: -2, vy: 0, type: 'runner', hp: 1, facing: -1, shootTimer: 0 });
    enemies.push({ x: 1900, y: 364, vx: 0, vy: 0, type: 'soldier', hp: 1, facing: -1, shootTimer: 0 });
    enemies.push({ x: 2050, y: 284, vx: 0, vy: 0, type: 'turret', hp: 3, facing: -1, shootTimer: 0 });
    enemies.push({ x: 2150, y: 364, vx: -2, vy: 0, type: 'runner', hp: 1, facing: -1, shootTimer: 0 });
    enemies.push({ x: 2300, y: 364, vx: -2, vy: 0, type: 'runner', hp: 1, facing: -1, shootTimer: 0 });
    
    // Add flyers at safe positions (far to the right)
    enemies.push({ x: 1800, y: 150, vx: -1.5, vy: 0, type: 'flyer', hp: 2, facing: -1, shootTimer: 0 });
    enemies.push({ x: 2400, y: 120, vx: -1.5, vy: 0, type: 'flyer', hp: 2, facing: -1, shootTimer: 0 });
    
    // Remove any enemies that somehow spawned left of player start (safety check)
    const beforeFilter = enemies.length;
    enemies = enemies.filter(e => e.x >= 200);
    if (enemies.length < beforeFilter) {
        console.log('REMOVED', beforeFilter - enemies.length, 'enemies that were left of x: 200');
    }
    
    console.log('FINAL ENEMY COUNT:', enemies.length);
    enemies.forEach((e, i) => console.log(`Enemy ${i}: ${e.type} at x:${e.x} y:${e.y}`));

    // Spawn capsules (flying weapon drops) - spread throughout level
    capsules.push({ x: 600, y: 100, vx: 1, type: 'spread', active: true });
    capsules.push({ x: 1200, y: 80, vx: 1, type: 'laser', active: true });
    capsules.push({ x: 1800, y: 90, vx: 1, type: 'fire', active: true });
    capsules.push({ x: 2400, y: 100, vx: 1, type: 'spread', active: true });
}

// ============================================
// GAME LOOP
// ============================================

function gameLoop() {
    update();
    draw();
    frameCount++;
    requestAnimationFrame(gameLoop);
}

// ============================================
// UPDATE LOGIC
// ============================================

function update() {
    if (gameState === 'menu' || gameState === 'gameover') return;

    updatePlayer();
    updateBullets();
    updateEnemies();
    updateCapsules();
    updateBoss();
    updateParticles();
    updateCamera();
    updateUI();

    // Check for boss spawn
    if (!boss && player.x > 2600) {
        spawnBoss();
    }

    // Check for level complete
    if (boss && boss.hp <= 0 && gameState !== 'victory') {
        gameState = 'victory';
        score += 5000;
        // Victory explosion effect
        for (let i = 0; i < 50; i++) {
            createParticle(boss.x, boss.y, 'explosion');
        }
    }

    // Reset key press tracking
    for (let key in keysPressed) {
        if (!keys[key]) keysPressed[key] = false;
    }
}

function createParticle(x, y, type) {
    let color = '#ffff00';
    let speed = 3;
    let life = 30;

    if (type === 'explosion') {
        color = Math.random() > 0.5 ? '#ff4400' : '#ff8800';
        speed = 2 + Math.random() * 4;
        life = 40 + Math.random() * 20;
    } else if (type === 'spark') {
        color = '#ffff00';
        speed = 1 + Math.random() * 2;
        life = 15;
    } else if (type === 'bosshit') {
        color = '#ff0000';
        speed = 2 + Math.random() * 3;
        life = 25;
    }

    let angle = Math.random() * Math.PI * 2;
    particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: life,
        maxLife: life,
        color: color,
        size: 2 + Math.random() * 3
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gravity
        p.life--;

        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function spawnBoss() {
    boss = {
        x: 2850,
        y: 250,
        vx: 0,
        vy: 0,
        hp: 50,
        maxHp: 50,
        phase: 1,
        shootTimer: 0,
        moveTimer: 0,
        facing: -1
    };
}

function updateBoss() {
    if (!boss) return;

    let dx = player.x - boss.x;
    let dy = player.y - boss.y;
    let dist = Math.sqrt(dx*dx + dy*dy);

    boss.facing = dx > 0 ? 1 : -1;
    boss.shootTimer++;
    boss.moveTimer++;

    // Boss movement pattern
    if (boss.moveTimer < 120) {
        boss.vx = boss.facing * 1.5;
    } else if (boss.moveTimer < 180) {
        boss.vx = 0;
    } else {
        boss.moveTimer = 0;
    }

    // Boss vertical movement
    if (boss.y < 200) boss.vy = 1;
    else if (boss.y > 350) boss.vy = -1;
    else boss.vy = Math.sin(frameCount * 0.02) * 0.5;

    boss.x += boss.vx;
    boss.y += boss.vy;

    // Boss shooting patterns
    if (boss.shootTimer > 40) {
        boss.shootTimer = 0;

        if (boss.hp > 25) {
            // Phase 1: Spread shot
            for (let i = -2; i <= 2; i++) {
                let angle = Math.atan2(dy, dx) + i * 0.2;
                enemyBullets.push({
                    x: boss.x,
                    y: boss.y,
                    vx: Math.cos(angle) * 5,
                    vy: Math.sin(angle) * 5,
                    life: 150
                });
            }
        } else {
            // Phase 2: Rapid fire + aimed shots
            for (let i = 0; i < 3; i++) {
                enemyBullets.push({
                    x: boss.x + (i - 1) * 20,
                    y: boss.y,
                    vx: (dx / dist) * 6,
                    vy: (dy / dist) * 6,
                    life: 150
                });
            }
        }
    }

    // Boss collision with player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        if (Math.abs(b.x - boss.x) < 40 && Math.abs(b.y - boss.y) < 50) {
            let damage = b.type === 'fire' ? 2 : 1;
            boss.hp -= damage;
            // Hit particles
            for (let k = 0; k < 3; k++) {
                createParticle(b.x, b.y, 'bosshit');
            }
            if (b.type !== 'laser') bullets.splice(i, 1);
        }
    }

    // Boss collision with player
    if (player.invulnerable <= 0 &&
        Math.abs(player.x - boss.x) < 40 &&
        Math.abs(player.y - boss.y) < 50) {
        playerDeath();
    }
}

function updatePlayer() {
    // Horizontal movement
    player.vx = 0;
    if (keys['arrowleft']) {
        player.vx = -PLAYER_SPEED;
        player.facing = -1;
    }
    if (keys['arrowright']) {
        player.vx = PLAYER_SPEED;
        player.facing = 1;
    }

    // Aiming - cycles through angles: 0° → 45° → 90° with each press
    // Aiming persists until changed with up/down keys
    if (keysPressed['arrowup']) {
        if (player.aiming === 0) player.aiming = -0.5;      // 0° → 45° up
        else if (player.aiming === -0.5) player.aiming = -1;  // 45° up → 90° up
        else if (player.aiming === -1) player.aiming = 0;     // 90° up → 0°
        else if (player.aiming === 0.5) player.aiming = 0;    // 45° down → 0°
        else if (player.aiming === 1) player.aiming = 0;      // 90° down → 0°
        keysPressed['arrowup'] = false; // consume the press
    }
    if (keysPressed['arrowdown']) {
        if (player.aiming === 0) player.aiming = 0.5;       // 0° → 45° down
        else if (player.aiming === 0.5) player.aiming = 1;   // 45° down → 90° down
        else if (player.aiming === 1) player.aiming = 0;     // 90° down → 0°
        else if (player.aiming === -0.5) player.aiming = 0;  // 45° up → 0°
        else if (player.aiming === -1) player.aiming = 0;    // 90° up → 0°
        keysPressed['arrowdown'] = false; // consume the press
    }

    // Jump
    if (keysPressed['z'] && player.onGround) {
        player.vy = -JUMP_POWER;
        player.onGround = false;
        playSound('jump');
    }

    // Shoot
    if (keys['x'] && player.shootCooldown <= 0) {
        shootBullet();
        player.shootCooldown = player.weapon === 'laser' ? 15 : 10;
        playSound('shoot');
    }
    if (player.shootCooldown > 0) player.shootCooldown--;

    // Apply gravity
    player.vy += GRAVITY;

    // Update position
    player.x += player.vx;
    player.y += player.vy;

    // Platform collision
    player.onGround = false;
    for (let plat of platforms) {
        // Check if player is above platform and falling
        if (player.vy > 0 &&
            player.x + player.width/2 > plat.x &&
            player.x - player.width/2 < plat.x + plat.width &&
            player.y + player.height/2 >= plat.y &&
            player.y + player.height/2 <= plat.y + plat.height + player.vy) {

            player.y = plat.y - player.height/2;
            player.vy = 0;
            player.onGround = true;
        }
    }

    // Screen boundaries
    if (player.x < 20) player.x = 20;
    if (player.x > 1980) player.x = 1980;

    // Invulnerability countdown
    if (player.invulnerable > 0) player.invulnerable--;

    // Fall off screen
    if (player.y > HEIGHT + 50) {
        playerDeath();
    }
}

function shootBullet() {
    let bx = player.x + player.facing * 15;
    let by = player.y - 5;
    let bvx = BULLET_SPEED * player.facing;
    let bvy = 0;
    let life = 60;
    let color = '#ffff00';

    // Adjust for aiming - now supports 0, 45, and 90 degrees
    if (player.aiming === -1) {
        // 90° up
        by = player.y - 20;
        bvx = 0;
        bvy = -BULLET_SPEED;
    } else if (player.aiming === -0.5) {
        // 45° diagonal up
        by = player.y - 15;
        bvx = BULLET_SPEED * player.facing * 0.707; // cos(45°)
        bvy = -BULLET_SPEED * 0.707; // sin(45°)
    } else if (player.aiming === 0.5) {
        // 45° diagonal down
        by = player.y + 5;
        bvx = BULLET_SPEED * player.facing * 0.707; // cos(45°)
        bvy = BULLET_SPEED * 0.707; // sin(45°)
    } else if (player.aiming === 1) {
        // 90° down
        by = player.y + 10;
        bvx = 0;
        bvy = BULLET_SPEED;
    }

    // Weapon types
    if (player.weapon === 'normal') {
        bullets.push({ x: bx, y: by, vx: bvx, vy: bvy, life: life, color: color, type: 'normal' });
    } else if (player.weapon === 'spread') {
        // 3-way spread - adjust for diagonal aiming
        if (Math.abs(player.aiming) === 0.5) {
            // Diagonal spread
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy - 2, life: life, color: '#ff8800', type: 'spread' });
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy, life: life, color: '#ff8800', type: 'spread' });
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy + 2, life: life, color: '#ff8800', type: 'spread' });
        } else {
            // Normal spread
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy - 3, life: life, color: '#ff8800', type: 'spread' });
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy, life: life, color: '#ff8800', type: 'spread' });
            bullets.push({ x: bx, y: by, vx: bvx, vy: bvy + 3, life: life, color: '#ff8800', type: 'spread' });
        }
    } else if (player.weapon === 'laser') {
        // Fast laser beam - handle all aiming angles
        let laserVx = LASER_SPEED * player.facing;
        let laserVy = 0;
        let laserWidth = 24;
        let laserHeight = 4;
        
        if (player.aiming === -1) {
            laserVx = 0;
            laserVy = -LASER_SPEED;
            laserWidth = 4;
            laserHeight = 24;
        } else if (player.aiming === -0.5) {
            laserVx = LASER_SPEED * player.facing * 0.707;
            laserVy = -LASER_SPEED * 0.707;
            laserWidth = 8;
            laserHeight = 8;
        } else if (player.aiming === 0.5) {
            laserVx = LASER_SPEED * player.facing * 0.707;
            laserVy = LASER_SPEED * 0.707;
            laserWidth = 8;
            laserHeight = 8;
        } else if (player.aiming === 1) {
            laserVx = 0;
            laserVy = LASER_SPEED;
            laserWidth = 4;
            laserHeight = 24;
        }
        
        bullets.push({
            x: bx,
            y: by,
            vx: laserVx,
            vy: laserVy,
            life: 40,
            color: '#00ffff',
            type: 'laser',
            width: laserWidth,
            height: laserHeight
        });
    } else if (player.weapon === 'fire') {
        // Fire ball - explodes and does area damage
        bullets.push({
            x: bx,
            y: by,
            vx: bvx * 0.7,
            vy: bvy * 0.7,
            life: 90,
            color: '#ff4400',
            type: 'fire',
            size: 8
        });
    }
}

function updateBullets() {
    // Player bullets
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Fire ball grows over time
        if (b.type === 'fire' && b.size < 16) {
            b.size += 0.2;
        }

        // Check enemy hits
        for (let j = enemies.length - 1; j >= 0; j--) {
            let e = enemies[j];
            let hitDist = b.type === 'fire' ? b.size + 12 : (b.type === 'laser' ? 20 : 16);
            if (Math.abs(b.x - e.x) < hitDist && Math.abs(b.y - e.y) < hitDist) {
                // Fire does more damage
                let damage = b.type === 'fire' ? 2 : 1;
                e.hp -= damage;

                // Only destroy bullet if not laser (laser penetrates)
                if (b.type !== 'laser') {
                    bullets.splice(i, 1);
                }

                if (e.hp <= 0) {
                    enemies.splice(j, 1);
                    score += e.type === 'turret' ? 300 : (e.type === 'flyer' ? 200 : 100);
                    playSound('explosion');
                    // Explosion particles
                    for (let k = 0; k < 8; k++) {
                        createParticle(e.x, e.y, 'explosion');
                    }
                } else {
                    // Hit spark
                    createParticle(b.x, b.y, 'spark');
                }
                if (b.type !== 'laser') break;
            }
        }

        // Check capsule hits - shoot them down to make them fall
        for (let c of capsules) {
            if (!c.active || c.falling) continue;
            if (Math.abs(b.x - c.x) < 20 && Math.abs(b.y - c.y) < 20) {
                // Shot the capsule - make it fall
                c.falling = true;
                c.vx = 0;
                c.vy = 0;
                playSound('hit');
                createParticle(c.x, c.y, 'spark');
                if (b.type !== 'laser') {
                    bullets.splice(i, 1);
                    break;
                }
            }
        }

        if (b.life <= 0) bullets.splice(i, 1);
    }

    // Enemy bullets
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        let b = enemyBullets[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life--;

        // Check player hit
        if (player.invulnerable <= 0 &&
            Math.abs(b.x - player.x) < 15 &&
            Math.abs(b.y - player.y) < 20) {
            playerDeath();
            enemyBullets.splice(i, 1);
            playSound('hit');
            continue;
        }

        if (b.life <= 0) enemyBullets.splice(i, 1);
    }
}

function updateEnemies() {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        let dx = player.x - e.x;
        let dy = player.y - e.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        // Face player
        e.facing = dx > 0 ? 1 : -1;

        if (e.type === 'runner') {
            // Runners move back and forth
            e.x += e.vx;
            if (e.x < 100 || e.x > 1900) e.vx *= -1;
            e.facing = e.vx > 0 ? 1 : -1;
        } else if (e.type === 'flyer') {
            // Flyers move in sine wave pattern
            e.x += e.vx;
            e.y += Math.sin(frameCount * 0.05) * 1;
            if (e.x < 100 || e.x > 1900) e.vx *= -1;
            e.facing = e.vx > 0 ? 1 : -1;
        }

        // Shooting AI - only shoot if enemy is on screen
        e.shootTimer++;
        let shootChance = e.type === 'turret' ? 0.02 : 0.008;
        let shootRange = e.type === 'turret' ? 350 : 250;
        let onScreen = e.x > camera.x - 50 && e.x < camera.x + WIDTH + 50;

        if (onScreen && dist < shootRange && e.shootTimer > 60 && Math.random() < shootChance) {
            e.shootTimer = 0;
            let speed = e.type === 'turret' ? 5 : 4;

            playSound('enemyShoot');

            if (e.type === 'flyer') {
                // Flyers shoot directly at player
                enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: (dx / dist) * speed,
                    vy: (dy / dist) * speed,
                    life: 150
                });
            } else {
                // Ground enemies shoot forward or at angle
                let angle = 0;
                if (player.y < e.y - 50) angle = -0.3;
                if (player.y > e.y + 50) angle = 0.3;

                enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: e.facing * Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 120
                });
            }
        }

        // Remove enemies far off screen
        if (e.x < camera.x - 100 || e.x > camera.x + WIDTH + 500) {
            if (e.type === 'runner' || e.type === 'flyer') {
                // Respawn runners/flyers ahead of player, never behind
                e.x = camera.x + WIDTH + 200;
                e.y = e.type === 'flyer' ? 120 + Math.random() * 80 : 364;
            }
        }
    }
}

function updateCapsules() {
    for (let c of capsules) {
        if (!c.active) continue;

        if (c.falling) {
            // Falling to ground
            c.vy += 0.3; // gravity
            c.y += c.vy;
            c.x += c.vx * 0.5; // slow horizontal movement

            // Check ground collision
            let groundY = 400 - 12; // ground level minus capsule height
            if (c.y >= groundY) {
                c.y = groundY;
                c.vy = 0;
                c.vx = 0;
                c.onGround = true;
            }
        } else {
            // Flying in sine wave
            c.x += c.vx;
            c.y += Math.sin(frameCount * 0.03) * 0.5;

            // Bounce off edges
            if (c.x < 100 || c.x > 1900) c.vx *= -1;
        }

        // Check collision with player
        let dx = player.x - c.x;
        let dy = player.y - c.y;
        let dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < 25) {
            // Collect capsule
            player.weapon = c.type;
            c.active = false;
            score += 50;
            playSound('powerup');
        }
    }
}

function updateCamera() {
    // Camera follows player
    let targetCamX = player.x - WIDTH / 3;
    camera.x += (targetCamX - camera.x) * 0.1;
    camera.x = Math.max(0, Math.min(camera.x, 3000 - WIDTH));
}

function updateUI() {
    document.getElementById('score').textContent = score.toString().padStart(6, '0');
    document.getElementById('lives').textContent = lives;
    document.getElementById('weapon').textContent = player.weapon.toUpperCase();
}

function playerDeath() {
    lives--;
    screenShake = 10; // Screen shake on damage
    if (lives <= 0) {
        gameState = 'gameover';
        document.getElementById('final-score').textContent = score;
        document.getElementById('game-over-screen').style.display = 'flex';
    } else {
        // Respawn
        player.x = camera.x + 50;
        player.y = 300;
        player.vx = 0;
        player.vy = 0;
        player.invulnerable = 120;
    }
}

// ============================================
// RENDERING
// ============================================

let camera = { x: 0 };

function draw() {
    // Clear - jungle background color
    ctx.fillStyle = '#1a3d1a';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    if (gameState === 'menu') return;

    // Apply screen shake
    let shakeX = 0, shakeY = 0;
    if (screenShake > 0) {
        shakeX = (Math.random() - 0.5) * screenShake;
        shakeY = (Math.random() - 0.5) * screenShake;
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }

    ctx.save();
    ctx.translate(-Math.floor(camera.x) + shakeX, shakeY);

    // Draw background mountains
    ctx.fillStyle = '#0d260d';
    for (let i = 0; i < 40; i++) {
        let mx = i * 100;
        ctx.beginPath();
        ctx.moveTo(mx, 400);
        ctx.lineTo(mx + 50, 250);
        ctx.lineTo(mx + 100, 400);
        ctx.fill();
    }

    // Draw platforms
    for (let plat of platforms) {
        // Platform body
        ctx.fillStyle = '#4a3728';
        ctx.fillRect(plat.x, plat.y, plat.width, plat.height);

        // Grass top
        ctx.fillStyle = '#228B22';
        ctx.fillRect(plat.x, plat.y, plat.width, 6);

        // Detail lines
        ctx.fillStyle = '#3d2e21';
        for (let i = 0; i < plat.width; i += 16) {
            ctx.fillRect(plat.x + i + 4, plat.y + 10, 8, 4);
        }
    }

    // Draw bullets
    for (let b of bullets) {
        ctx.fillStyle = b.color || '#ffff00';
        if (b.type === 'laser') {
            ctx.fillRect(b.x - b.width/2, b.y - b.height/2, b.width, b.height);
        } else if (b.type === 'fire') {
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.size || 6, 0, Math.PI * 2);
            ctx.fill();
            // Fire glow
            ctx.fillStyle = 'rgba(255, 100, 0, 0.5)';
            ctx.beginPath();
            ctx.arc(b.x, b.y, (b.size || 6) * 1.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (b.type === 'spread') {
            ctx.fillRect(b.x - 4, b.y - 3, 8, 6);
        } else {
            ctx.fillRect(b.x - 3, b.y - 2, 6, 4);
        }
    }

    // Draw enemy bullets
    ctx.fillStyle = '#ff4444';
    for (let b of enemyBullets) {
        ctx.fillRect(b.x - 3, b.y - 3, 6, 6);
        // Bullet trail
        ctx.fillStyle = 'rgba(255, 68, 68, 0.5)';
        ctx.fillRect(b.x - b.vx - 3, b.y - b.vy - 3, 6, 6);
        ctx.fillStyle = '#ff4444';
    }

    // Draw particles
    for (let p of particles) {
        let alpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    // Draw capsules
    for (let c of capsules) {
        if (c.active) drawCapsule(c);
    }

    // Draw enemies
    for (let e of enemies) {
        drawEnemy(e);
    }

    // Draw player
    if (player.invulnerable % 10 < 5) {
        drawPlayer();
    }

    // Draw boss
    if (boss) drawBoss();

    // Draw victory message
    if (gameState === 'victory') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(camera.x, 0, WIDTH, HEIGHT);

        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 48px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('MISSION COMPLETE!', camera.x + WIDTH/2, HEIGHT/2 - 50);

        ctx.fillStyle = '#ffffff';
        ctx.font = '24px monospace';
        ctx.fillText('Final Score: ' + score.toString().padStart(6, '0'), camera.x + WIDTH/2, HEIGHT/2 + 20);

        ctx.font = '18px monospace';
        ctx.fillText('Press R to restart', camera.x + WIDTH/2, HEIGHT/2 + 80);
    }

    ctx.restore();
}

function drawBoss() {
    ctx.save();
    ctx.translate(boss.x, boss.y);

    // Boss body - large alien creature
    ctx.fillStyle = boss.hp > 25 ? '#880000' : '#ff0000';
    ctx.beginPath();
    ctx.ellipse(0, 0, 40, 50, 0, 0, Math.PI * 2);
    ctx.fill();

    // Boss armor plates
    ctx.fillStyle = '#444444';
    ctx.fillRect(-30, -40, 60, 15);
    ctx.fillRect(-25, -20, 50, 12);
    ctx.fillRect(-20, 0, 40, 12);

    // Boss eyes
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(-15, -20, 8, 0, Math.PI * 2);
    ctx.arc(15, -20, 8, 0, Math.PI * 2);
    ctx.fill();

    // Eye pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-15 + boss.facing * 3, -20, 3, 0, Math.PI * 2);
    ctx.arc(15 + boss.facing * 3, -20, 3, 0, Math.PI * 2);
    ctx.fill();

    // Boss mouth
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.ellipse(0, 20, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#ffffff';
    for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5, 15);
        ctx.lineTo(i * 5 + 3, 25);
        ctx.lineTo(i * 5 - 3, 25);
        ctx.fill();
    }

    // Boss health bar
    ctx.fillStyle = '#333333';
    ctx.fillRect(-50, -70, 100, 12);
    ctx.fillStyle = boss.hp > 25 ? '#00ff00' : '#ff0000';
    ctx.fillRect(-48, -68, 96 * (boss.hp / boss.maxHp), 8);

    // Boss warning text
    if (boss.hp <= 25) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ENRAGED!', 0, -80);
    }

    ctx.restore();
}

function drawPlayer() {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(player.facing, 1);

    // Body
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-8, -18, 16, 20);

    // Pants
    ctx.fillStyle = '#4444ff';
    ctx.fillRect(-8, 2, 16, 14);

    // Head
    ctx.fillStyle = '#ffccaa';
    ctx.fillRect(-6, -28, 12, 10);

    // Bandana
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(-7, -26, 14, 4);

    // Gun - now supports 0°, 45°, and 90° angles
    ctx.fillStyle = '#888888';
    if (player.aiming === -1) {
        // 90° up
        ctx.fillRect(4, -25, 4, 12);
    } else if (player.aiming === -0.5) {
        // 45° up diagonal
        ctx.save();
        ctx.translate(4, -15);
        ctx.rotate(-Math.PI / 4);
        ctx.fillRect(0, -3, 14, 6);
        ctx.restore();
    } else if (player.aiming === 0.5) {
        // 45° down diagonal
        ctx.save();
        ctx.translate(4, 5);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(0, -3, 14, 6);
        ctx.restore();
    } else if (player.aiming === 1) {
        // 90° down
        ctx.fillRect(4, 5, 4, 12);
    } else {
        // 0° forward
        ctx.fillRect(4, -10, 16, 6);
    }

    ctx.restore();
}

function drawCapsule(c) {
    ctx.save();
    ctx.translate(c.x, c.y);

    // Capsule body
    ctx.fillStyle = '#888888';
    ctx.fillRect(-12, -8, 24, 16);

    // Color based on weapon type
    let color = '#ffff00';
    let letter = 'S';
    if (c.type === 'laser') { color = '#00ffff'; letter = 'L'; }
    if (c.type === 'fire') { color = '#ff4400'; letter = 'F'; }

    ctx.fillStyle = color;
    ctx.fillRect(-10, -6, 20, 12);

    // Letter
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(letter, 0, 4);

    // Glow effect
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(-12, -8, 24, 16);

    ctx.restore();
}

function drawEnemy(e) {
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.scale(e.facing, 1);

    if (e.type === 'soldier') {
        // Body
        ctx.fillStyle = '#666666';
        ctx.fillRect(-8, -16, 16, 18);

        // Head
        ctx.fillStyle = '#ffccaa';
        ctx.fillRect(-6, -24, 12, 8);

        // Helmet
        ctx.fillStyle = '#444444';
        ctx.fillRect(-7, -26, 14, 6);

        // Gun
        ctx.fillStyle = '#333333';
        ctx.fillRect(4, -8, 14, 4);
    } else if (e.type === 'turret') {
        // Base
        ctx.fillStyle = '#444444';
        ctx.fillRect(-12, -10, 24, 20);

        // Turret
        ctx.fillStyle = '#666666';
        ctx.beginPath();
        ctx.arc(0, -10, 12, 0, Math.PI * 2);
        ctx.fill();

        // Barrel
        ctx.fillStyle = '#333333';
        ctx.fillRect(4, -14, 20, 8);
    } else if (e.type === 'runner') {
        // Body - red for runner
        ctx.fillStyle = '#aa4444';
        ctx.fillRect(-8, -16, 16, 18);

        // Head
        ctx.fillStyle = '#ffccaa';
        ctx.fillRect(-6, -24, 12, 8);

        // Helmet
        ctx.fillStyle = '#662222';
        ctx.fillRect(-7, -26, 14, 6);

        // Gun
        ctx.fillStyle = '#333333';
        ctx.fillRect(4, -8, 14, 4);
    } else if (e.type === 'flyer') {
        // Flying enemy - green alien style
        ctx.fillStyle = '#44aa44';
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wings
        ctx.fillStyle = '#338833';
        ctx.beginPath();
        ctx.moveTo(-10, -5);
        ctx.lineTo(-20, -15 + Math.sin(frameCount * 0.2) * 5);
        ctx.lineTo(-5, 0);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(10, -5);
        ctx.lineTo(20, -15 + Math.sin(frameCount * 0.2) * 5);
        ctx.lineTo(5, 0);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.arc(6, -2, 4, 0, Math.PI * 2);
        ctx.fill();
    }

    ctx.restore();
}

// ============================================
// GAME CONTROL
// ============================================

function startGame() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    gameState = 'playing';

    // Initialize audio context on user interaction
    initAudio();

    // Reset game
    score = 0;
    lives = 3;
    bullets = [];
    enemyBullets = [];
    particles = [];

    // Reset player
    player.x = 50;
    player.y = 300;
    player.vx = 0;
    player.vy = 0;
    player.facing = 1;
    player.weapon = 'normal';
    player.invulnerable = 0;

    camera.x = 0;

    generateLevel();
}

function restartGame() {
    document.getElementById('game-over-screen').style.display = 'none';
    startGame();
}

// Start
init();
