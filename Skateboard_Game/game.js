// Game canvas setup
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Set canvas size
function resizeCanvas() {
    const container = document.getElementById('game-container');
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Set initial skater position on ground
const initialGroundY = canvas.height * 0.6;

// Game state
const game = {
    running: true,
    score: 0,
    highScore: localStorage.getItem('skateHighScore') || 0,
    groundY: initialGroundY,
    scrollSpeed: 5,
    baseSpeed: 5,
    distance: 0,
    scrollOffset: 0,
    cameraY: 0, // Vertical camera offset to keep skater visible
    bailed: false,
    bailMessage: null,
    leaderboard: JSON.parse(localStorage.getItem('skateLeaderboard')) || [],
    enteringInitials: false,
    currentInitials: '',
    finalScore: 0,
    startSlope: {
        active: true,
        length: 2400, // Shorter total length
        height: 350,  // Slightly lower start height
        jumpHeight: 320, // Big jump for massive air
        downhillLength: 2000, // Length of downhill portion
        jumpLength: 400, // Length of jump ramp
        landingLength: 500, // Length of landing ramp
        speedBoost: 0   // accumulates as we go downhill
    }
};

// Skater object
const skater = {
    x: 150,
    y: 0,
    width: 40,
    height: 60,
    velocityY: 0,
    jumping: false,
    onGround: true,
    grinding: false,
    grindTimer: 0,
    manualing: false,
    manualTimer: 0,
    manualAngle: 0,
    kickflipping: false,
    kickflipRotation: 0,
    kickflipSpeed: 0,
    rotation: 0,
    wheelRotation: 0,
    kickflipAxisRotation: 0,
    doing180: false,
    rotation180: 0,
    doing360: false,
    rotation360: 0,
    doingBackflip: false,
    backflipRotation: 0,
    facingBack: false
};

// Initialize skater at the TOP of the start slope
// Calculate ground Y at skater's starting X position on the slope
const slope = game.startSlope;
const skaterStartX = skater.x + skater.width / 2;
// Ground at start is at the full height (top of slope)
const groundAtStart = initialGroundY - slope.height;
// Position skater on the ground
skater.y = groundAtStart - skater.height;
// Start at the very beginning of the slope
game.scrollOffset = 0;

// Objects array for ramps and obstacles
let objects = [];
let clouds = [];
let birds = [];

// Initialize clouds
for (let i = 0; i < 5; i++) {
    clouds.push({
        x: Math.random() * 2000,
        y: 50 + Math.random() * 150,
        width: 80 + Math.random() * 60,
        speed: 0.5 + Math.random() * 0.5
    });
}

// Initialize birds
for (let i = 0; i < 3; i++) {
    birds.push({
        x: Math.random() * 3000,
        y: 30 + Math.random() * 100,
        speed: 1 + Math.random() * 0.5,
        wingPhase: Math.random() * Math.PI * 2,
        size: 2 + Math.random() * 2
    });
}

// Spawn ramp function
function spawnRamp() {
    const wheelOffset = 10; // Distance from board bottom to wheel bottom
    const spawnX = canvas.width + 100;
    const minDistanceFromRail = 300;
    const minDistanceFromRamp = 250; // Minimum distance between ramps
    
    // Check if there's a rail nearby - don't spawn ramp too close to rails
    for (let obj of objects) {
        if (obj.type === 'rail') {
            const railLeft = obj.x;
            const railRight = obj.x + obj.width;
            const rampLeft = spawnX;
            const rampRight = spawnX + 200;
            if (rampRight > railLeft - minDistanceFromRail && rampLeft < railRight + minDistanceFromRail) {
                return;
            }
        }
    }
    
    // Check if there's another ramp nearby - don't spawn ramp too close to other ramps
    for (let obj of objects) {
        if (obj.type === 'ramp') {
            const otherRampLeft = obj.x;
            const otherRampRight = obj.x + obj.width + 50; // include platform
            const rampLeft = spawnX;
            const rampRight = spawnX + 200;
            if (rampRight > otherRampLeft - minDistanceFromRamp && rampLeft < otherRampRight + minDistanceFromRamp) {
                return;
            }
        }
    }
    
    // Randomly choose ramp size: 30% small, 40% medium, 30% large
    const rampType = Math.random();
    let rampWidth, rampHeight;
    
    if (rampType < 0.3) {
        // Small ramp (original size)
        rampWidth = 100 + Math.random() * 50;
        rampHeight = 60 + Math.random() * 40;
    } else if (rampType < 0.7) {
        // Medium ramp (bigger)
        rampWidth = 140 + Math.random() * 60;
        rampHeight = 100 + Math.random() * 60;
    } else {
        // Large ramp (moderate air)
        rampWidth = 160 + Math.random() * 60;
        rampHeight = 100 + Math.random() * 50;
    }
    
    const rampX = canvas.width + 100;
    objects.push({
        type: 'ramp',
        x: rampX,
        y: game.groundY - rampHeight - wheelOffset,
        width: rampWidth,
        height: rampHeight,
        passed: false
    });
    
    // 30% chance to spawn a pit with spikes after the ramp
    if (Math.random() < 0.3) {
        const pitWidth = 80 + Math.random() * 60;
        const pitDepth = 60 + Math.random() * 40;
        objects.push({
            type: 'pit',
            x: rampX + rampWidth + 20 + Math.random() * 30,
            y: game.groundY,
            width: pitWidth,
            height: pitDepth,
            passed: false
        });
    }
}

// Spawn rail function
function spawnRail() {
    const spawnX = canvas.width + 100;
    const minDistanceFromRamp = 300;
    const minDistanceFromRail = 400; // Minimum distance between rails
    
    // Check if there's a ramp nearby - don't spawn rail too close to ramps
    for (let obj of objects) {
        if (obj.type === 'ramp') {
            const rampLeft = obj.x;
            const rampRight = obj.x + obj.width + 50; // include platform
            if (spawnX < rampRight + minDistanceFromRamp && spawnX + 200 > rampLeft - minDistanceFromRamp) {
                return;
            }
        }
    }
    
    // Check if there's another rail nearby - don't spawn rail too close to other rails
    for (let obj of objects) {
        if (obj.type === 'rail') {
            const railLeft = obj.x;
            const railRight = obj.x + obj.width;
            // Need clearance before and after existing rails
            if (spawnX < railRight + minDistanceFromRail && spawnX + 200 > railLeft - minDistanceFromRail) {
                return;
            }
        }
    }
    
    // Rails get longer as distance increases
    // Base length: 350-550px (even longer), increases by up to 10px per 1000 distance units
    const distanceBonus = Math.min(game.distance * 1.0, 600); // Cap at +600px
    const baseWidth = 350 + Math.random() * 200;
    const railWidth = baseWidth + distanceBonus;
    const railHeight = 30 + Math.random() * 40; // higher elevation off ground
    objects.push({
        type: 'rail',
        x: canvas.width + 100,
        y: game.groundY - railHeight,
        width: railWidth,
        height: railHeight,
        passed: false
    });
}

// Check if skater is on a ramp
function getRampAtSkater() {
    const skaterCenterX = skater.x + skater.width / 2;
    const wheelOffset = 10;
    for (let obj of objects) {
        if (obj.type === 'ramp') {
            // New curved ramp: starts at obj.x, curves up to obj.x + obj.width
            const rampStartX = obj.x;
            const rampEndX = obj.x + obj.width;
            
            if (skaterCenterX >= rampStartX && skaterCenterX <= rampEndX) {
                // Calculate position on the quadratic curve
                // Curve goes from (rampStartX, groundLevel) to (rampEndX, rampTopY)
                // Control point is at (rampStartX + width*0.15, groundLevel - height*0.05)
                const t = (skaterCenterX - rampStartX) / (rampEndX - rampStartX);
                
                // Quadratic Bezier curve formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                const groundLevel = game.groundY;
                const p0y = groundLevel;
                const p1y = groundLevel - obj.height * 0.05;
                const p2y = obj.y;
                
                const heightAtPosition = (1-t)*(1-t)*p0y + 2*(1-t)*t*p1y + t*t*p2y;
                
                // Return the Y position adjusted for wheel offset
                return heightAtPosition - wheelOffset;
            }
        }
    }
    return null;
}

// Check if skater is on a rail (for grinding)
function getRailAtSkater() {
    const skaterCenterX = skater.x + skater.width / 2;
    const skaterBottom = skater.y + skater.height;
    const wheelOffset = 10; // Distance from board to wheels
    const groundLevel = game.groundY;
    
    for (let obj of objects) {
        if (obj.type === 'rail') {
            // Wider horizontal detection zone - easier to start grinding
            const grindStartZone = 30; // pixels before rail starts
            const grindEndZone = 30; // pixels after rail ends
            if (skaterCenterX >= obj.x - grindStartZone && skaterCenterX <= obj.x + obj.width + grindEndZone) {
                const railTop = obj.y;
                const railBottom = obj.y + 12; // rail height
                
                // Determine if this is a "high rail" (requires jump to reach)
                // Low rails are at ground wheel level (~groundY - wheelOffset)
                // High rails are higher up
                const lowRailThreshold = groundLevel - wheelOffset - 25; // ~25px above wheel level max
                const isHighRail = railTop < lowRailThreshold;
                
                // For high rails, you must be in the air (jumping) to grind
                // For low rails, you can grind from ground level
                if (isHighRail) {
                    // High rail: must be in the air and at rail height
                    if (!skater.onGround && skaterBottom >= railTop - 40 && skaterBottom <= railBottom + 60) {
                        return obj;
                    }
                } else {
                    // Low rail: can grind from ground or air
                    if (skaterBottom >= railTop - 40 && skaterBottom <= railBottom + 60) {
                        return obj;
                    }
                }
            }
        }
    }
    return null;
}

// Check if skater falls into a pit
function checkPitCollision() {
    const skaterCenterX = skater.x + skater.width / 2;
    const skaterBottom = skater.y + skater.height;
    
    for (let obj of objects) {
        if (obj.type === 'pit') {
            // Check if skater is horizontally over the pit
            if (skaterCenterX >= obj.x && skaterCenterX <= obj.x + obj.width) {
                // Check if skater has fallen into the pit (below ground level)
                if (skaterBottom > game.groundY + 10) {
                    return true;
                }
            }
        }
    }
    return false;
}

// Check if skater collides with a rail (for crashing)
function checkRailCollision() {
    const skaterLeft = skater.x;
    const skaterRight = skater.x + skater.width;
    const skaterBottom = skater.y + skater.height;
    const skaterTop = skater.y;
    const wheelOffset = 10;
    const groundLevel = game.groundY;
    
    for (let obj of objects) {
        if (obj.type === 'rail') {
            // Check if skater is horizontally overlapping with rail
            const railLeft = obj.x;
            const railRight = obj.x + obj.width;
            const railTop = obj.y;
            const railBottom = obj.y + 12; // rail bar height
            
            // Horizontal overlap check
            const horizontalOverlap = skaterRight > railLeft && skaterLeft < railRight;
            
            if (horizontalOverlap) {
                // Determine if this is a "high rail"
                const lowRailThreshold = groundLevel - wheelOffset - 25;
                const isHighRail = railTop < lowRailThreshold;
                
                // Check if skater's body hits the rail
                const clearanceHeight = railTop - 5; // small buffer
                
                // If skater's bottom is below the clearance height and top is below rail top
                // (meaning he's not jumping over it), check for collision
                if (skaterBottom > clearanceHeight && skaterTop < railBottom) {
                    // If pressing G to start grinding, check if they can actually grind
                    if (keysPressed['KeyG']) {
                        // Only avoid bail if they're actually at rail height to grind
                        const railAtSkater = getRailAtSkater();
                        if (railAtSkater) {
                            return false; // Let them start grinding
                        }
                        // Otherwise, they crash into the rail (holding G but not at right height)
                    }
                    
                    if (isHighRail) {
                        // High rail: crash if on ground (can't grind without jumping)
                        // Also crash if not grinding while in the air at wrong height
                        if (skater.onGround) {
                            return true; // Crash into high rail from ground
                        }
                        // In air but not grinding properly
                        if (!skater.grinding) {
                            return true;
                        }
                    } else {
                        // Low rail: crash if not grinding and not high enough to jump over
                        if (!skater.grinding) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    return false;
}

// Don't spawn initial ramps - wait until after start slope

// Floating text array for score popups
let floatingTexts = [];

function createFloatingText(text, x, y) {
    floatingTexts.push({
        text: text,
        x: x,
        y: y,
        life: 60, // frames to live
        opacity: 1
    });
}

// Input handling
const keys = {};
const keysPressed = {}; // Tracks single press (true only on first keydown frame)

window.addEventListener('keydown', (e) => {
    // Track single press - only true if key wasn't already held
    if (!keys[e.code]) {
        keysPressed[e.code] = true;
    }
    keys[e.code] = true;
    
    if (e.code === 'Space') e.preventDefault();
    
    // Handle initials entry when bailed with high score
    if (game.bailed && game.enteringInitials) {
        if (e.key.length === 1 && e.key.match(/[a-zA-Z]/) && game.currentInitials.length < 3) {
            game.currentInitials += e.key.toUpperCase();
        } else if (e.key === 'Backspace' && game.currentInitials.length > 0) {
            game.currentInitials = game.currentInitials.slice(0, -1);
        } else if (e.key === 'Enter' && game.currentInitials.length > 0) {
            // Save the score to leaderboard but stay on bail screen
            saveHighScore();
        }
    }
});
window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    keysPressed[e.code] = false;
});



// Game loop
function update() {
    // Handle restart when bailed - check this first before the running check
    if (game.bailed && keys['KeyR'] && !game.enteringInitials) {
        restartGame();
        return;
    }
    
    if (!game.running) return;

    // Calculate ground position (60% down the screen)
    game.groundY = canvas.height * 0.6;

    // Jump (Space or Up Arrow) - only if not bailed, single press only
    if ((keysPressed['Space'] || keysPressed['ArrowUp']) && skater.onGround && !skater.jumping) {
        skater.velocityY = -15;
        skater.jumping = true;
        skater.onGround = false;
    }

    // Gravity
    skater.velocityY += 0.6;
    skater.y += skater.velocityY;

    // Check for rail collision (crash if not jumping over or grinding)
    if (checkRailCollision()) {
        bail();
        return;
    }

    // Check for pit collision (fall into pit with spikes)
    if (checkPitCollision()) {
        bail();
        return;
    }

    // Check if skater is over a pit (no ground collision)
    const skaterCenterX = skater.x + skater.width / 2;
    let overPit = false;
    for (let obj of objects) {
        if (obj.type === 'pit') {
            if (skaterCenterX >= obj.x && skaterCenterX <= obj.x + obj.width) {
                overPit = true;
                break;
            }
        }
    }

    // Calculate speed BEFORE collision checks so ramp launch uses boosted speed
    // Gradually increase base speed as distance increases
    // Start at speed 5 and ramp up gradually based on distance
    // Speed increases by 0.004 per distance unit, max speed of 12
    const speedIncrease = Math.min(game.distance * 0.004, 7);
    // Add slope speed boost during start sequence
    const slopeBoost = game.startSlope.active ? game.startSlope.speedBoost : 0;
    game.baseSpeed = 5 + speedIncrease + slopeBoost;

    // Speed up (ArrowRight or KeyD)
    if (keys['ArrowRight'] || keys['KeyD']) {
        game.scrollSpeed = game.baseSpeed * 1.5;
    } else {
        game.scrollSpeed = game.baseSpeed;
    }

    // Start slope collision (massive downhill with jump)
    let slopeGroundY = null;
    let onSlope = false;
    if (game.startSlope.active) {
        const slope = game.startSlope;
        const slopeEndX = slope.length - game.scrollOffset;
        const jumpStartX = slopeEndX - slope.jumpLength;
        const landingEndX = slopeEndX + slope.landingLength;
        const curveStartX = jumpStartX - 250; // Start curve 250px before jump
        const skaterScreenX = skater.x + skater.width / 2;
        
        // Check if skater is on the slope system
        if (skaterScreenX < landingEndX) {
            onSlope = true;
            
            if (skaterScreenX < curveStartX) {
                // On the main downhill - linear slope
                const t = skaterScreenX / curveStartX;
                // Linear interpolation from top height down to curve start height
                // Curve start is 80px above ground (elevated, not at ground level)
                const curveStartHeight = 80;
                slopeGroundY = (game.groundY - slope.height) + (t * (slope.height - curveStartHeight));
                
                // SPEED GAIN: Accumulate speed boost based on how far down we've gone
                const speedGain = t * 5;
                slope.speedBoost = Math.max(slope.speedBoost, speedGain);
                
                // Add downward velocity boost from gravity
                if (skater.onGround) {
                    const gravityBoost = 0.15 + (t * 0.5);
                    skater.velocityY += gravityBoost;
                }
            } else if (skaterScreenX < jumpStartX) {
                // CURVE ZONE: Smooth quadratic curve from downhill into jump ramp
                const t = (skaterScreenX - curveStartX) / (jumpStartX - curveStartX);
                // Quadratic bezier: start elevated, curve down smoothly to ground
                const startY = game.groundY - 80; // 80px above ground
                const controlY = game.groundY - 20; // Control point pulls down gently
                const endY = game.groundY; // Ground level at jump start
                slopeGroundY = (1-t)*(1-t)*startY + 2*(1-t)*t*controlY + t*t*endY;
                
                // Continue speed gain
                slope.speedBoost = Math.max(slope.speedBoost, 5);
            } else if (skaterScreenX < slopeEndX) {
                // On the jump ramp (going up) - LINEAR RAMP
                const t = (skaterScreenX - jumpStartX) / slope.jumpLength;
                // Linear interpolation from ground level to jump height
                slopeGroundY = game.groundY - (t * slope.jumpHeight);
            } else if (skaterScreenX < landingEndX) {
                // On the landing ramp (going down) - LINEAR LANDING
                const t = (skaterScreenX - slopeEndX) / slope.landingLength;
                // Linear interpolation from jump height back to ground
                slopeGroundY = (game.groundY - slope.jumpHeight) + (t * slope.jumpHeight);
            }
        } else {
            // Past the slope, deactivate it
            game.startSlope.active = false;
        }
    }

    // Ground/ramp collision
    const skaterBottom = skater.y + skater.height;
    const rampY = getRampAtSkater();
    const onRamp = rampY !== null;
    
    // Determine ground level - prioritize slope, then ramp, then regular ground
    let groundLevel;
    if (slopeGroundY !== null) {
        groundLevel = slopeGroundY;
    } else if (onRamp) {
        groundLevel = rampY;
    } else {
        groundLevel = game.groundY;
    }
    
    // AUTO-LAUNCH: Check if on the jump ramp of the start slope
    let shouldAutoLaunch = false;
    let launchVelocity = 0;
    if (game.startSlope.active && onSlope) {
        const slope = game.startSlope;
        const slopeEndX = slope.length - game.scrollOffset;
        const jumpStartX = slopeEndX - slope.jumpLength;
        const skaterScreenX = skater.x + skater.width / 2;
        
        // On the jump ramp (between jumpStartX and slopeEndX)
        if (skaterScreenX >= jumpStartX && skaterScreenX < slopeEndX) {
            const t = (skaterScreenX - jumpStartX) / slope.jumpLength;
            // Launch when past 85% of the jump ramp (near the peak)
            if (t > 0.85 && skater.onGround) {
                shouldAutoLaunch = true;
                // Calculate launch velocity based on accumulated speed boost
                const speedRatio = Math.max(0, (game.scrollSpeed - 5) / 15);
                launchVelocity = -14 - (speedRatio * 16); // -14 to -30 based on speed
            }
        }
    }
    
    // AUTO-LAUNCH: Check if launching off regular ramp
    if (onRamp && skater.onGround && !shouldAutoLaunch) {
        const centerX = skater.x + skater.width / 2;
        const ramp = objects.find(obj => {
            if (obj.type !== 'ramp') return false;
            const rampStartX = obj.x;
            const rampEndX = obj.x + obj.width;
            return centerX >= rampStartX && centerX <= rampEndX;
        });
        
        if (ramp) {
            const t = (centerX - ramp.x) / ramp.width;
            // Launch when near the end (t > 0.75) to get air off the lip
            if (t > 0.75) {
                shouldAutoLaunch = true;
                const speedRatio = Math.max(0, (game.scrollSpeed - 5) / 13);
                launchVelocity = -8 - (speedRatio * 10); // -8 to -18 based on speed
            }
        }
    }
    
    // Check if bailing (kickflipping when hitting ground)
    if (skater.kickflipping && !overPit && skaterBottom >= groundLevel) {
        bail();
        return;
    }
    
    // GROUND FOLLOWING: Always snap to ground when close (not just when falling through)
    // This ensures the skater follows the ground contour smoothly
    // BUT: Don't snap to ground if grinding (skater should stay on rail)
    const groundSnapThreshold = 50; // pixels - snap to ground if within this distance (increased for better landing)
    // Allow landing if: not over pit, not grinding, within threshold, and falling OR on ground
    const shouldSnapToGround = !overPit && !skater.grinding && skaterBottom >= groundLevel - groundSnapThreshold && 
        (skater.velocityY >= 0 || skater.onGround); // Falling down or already on ground
    
    if (shouldSnapToGround) {
        // Auto-launch if conditions met (only if we're actually on the upward ramp)
        if (shouldAutoLaunch) {
            skater.velocityY = launchVelocity;
            skater.jumping = true;
            skater.onGround = false;
        } else {
            // Position skater on ground - ramp is already adjusted for wheel height
            skater.y = groundLevel - skater.height;
            skater.velocityY = 0;
            skater.jumping = false;
            skater.onGround = true;
        }
        
        // Rotate skater to match ramp or slope angle
        if (onRamp) {
            const centerX = skater.x + skater.width / 2;
            const ramp = objects.find(obj => {
                if (obj.type !== 'ramp') return false;
                const rampStartX = obj.x;
                const rampEndX = obj.x + obj.width;
                return centerX >= rampStartX && centerX <= rampEndX;
            });
            if (ramp) {
                // Calculate angle of the quadratic curve at skater's position
                const t = (centerX - ramp.x) / ramp.width;
                // Derivative of quadratic Bezier: 2(1-t)(P1-P0) + 2t(P2-P1)
                const groundLevel = game.groundY;
                const p0y = groundLevel;
                const p1y = groundLevel - ramp.height * 0.05;
                const p2y = ramp.y;
                const dy = 2*(1-t)*(p1y - p0y) + 2*t*(p2y - p1y);
                const dx = ramp.width;
                const rampAngle = Math.atan2(dy, dx);
                skater.rotation = rampAngle;
            }
        } else if (onSlope && game.startSlope.active) {
            // Rotate skater to match start slope angle
            const slope = game.startSlope;
            const slopeEndX = slope.length - game.scrollOffset;
            const jumpStartX = slopeEndX - slope.jumpLength;
            const landingEndX = slopeEndX + slope.landingLength;
            const curveStartX = jumpStartX - 250;
            const skaterScreenX = skater.x + skater.width / 2;
            
            if (skaterScreenX < curveStartX) {
                // On the main downhill - constant angle
                const dy = slope.height - 80; // Ends 80px above ground
                const dx = curveStartX;
                skater.rotation = Math.atan2(dy, dx);
            } else if (skaterScreenX < jumpStartX) {
                // In the curve zone - calculate angle of quadratic curve
                const t = (skaterScreenX - curveStartX) / (jumpStartX - curveStartX);
                // Quadratic bezier derivative: 2(1-t)(P1-P0) + 2t(P2-P1)
                const p0y = game.groundY - 80;
                const p1y = game.groundY - 20;
                const p2y = game.groundY;
                const dy = 2*(1-t)*(p1y - p0y) + 2*t*(p2y - p1y);
                const dx = jumpStartX - curveStartX;
                skater.rotation = Math.atan2(dy, dx);
            } else if (skaterScreenX < slopeEndX) {
                // On the jump ramp - constant upward angle
                const dy = -slope.jumpHeight;
                const dx = slope.jumpLength;
                skater.rotation = Math.atan2(dy, dx);
            } else if (skaterScreenX < landingEndX) {
                // On the landing ramp - constant downward angle
                const dy = slope.jumpHeight;
                const dx = slope.landingLength;
                skater.rotation = Math.atan2(dy, dx);
            }
        } else {
            skater.rotation = 0;
        }
    } else {
        // In the air - mark as not on ground
        skater.onGround = false;
    }

    // Update scroll offset for parallax
    game.scrollOffset += game.scrollSpeed;
    game.distance += game.scrollSpeed / 100;

    // Update wheel rotation
    skater.wheelRotation += game.scrollSpeed * 0.1;

    // Update clouds (parallax - slower)
    clouds.forEach(cloud => {
        cloud.x -= cloud.speed;
        if (cloud.x + cloud.width < 0) {
            cloud.x = canvas.width + Math.random() * 500;
            cloud.y = 50 + Math.random() * 150;
        }
    });

    // Update birds (fly across sky, slower than clouds)
    birds.forEach(bird => {
        bird.x -= bird.speed;
        bird.wingPhase += 0.15; // Flap wings
        if (bird.x + 20 < 0) {
            bird.x = canvas.width + 100 + Math.random() * 500;
            bird.y = 30 + Math.random() * 100;
        }
    });

    // Update objects (ramps)
    objects.forEach(obj => {
        obj.x -= game.scrollSpeed;
    });

    // Remove off-screen objects
    objects = objects.filter(obj => obj.x + obj.width > -100);

    // Update camera to follow skater vertically (keep entire skater visible)
    // When skater goes UP (lower Y value), camera should go UP (negative offset)
    // Target: keep skater positioned at 40% from top of screen
    const targetSkaterScreenY = canvas.height * 0.4;
    const targetCameraY = skater.y - targetSkaterScreenY;
    game.cameraY += (targetCameraY - game.cameraY) * 0.1; // Smooth follow
    // Clamp camera so we don't see too far above or below
    const minCameraY = -300; // Don't show more than 300px above start
    const maxCameraY = game.groundY - canvas.height * 0.6; // Keep ground visible
    game.cameraY = Math.max(minCameraY, Math.min(maxCameraY, game.cameraY));

    // Spawn new ramps and rails - more ramps, fewer rails (not during start slope)
    if (!game.startSlope.active && (objects.length === 0 || objects[objects.length - 1].x < canvas.width - 400)) {
        const rand = Math.random();
        if (rand < 0.025) {
            spawnRamp();
        } else if (rand < 0.035) {
            spawnRail();
        }
    }

    // Kickflip - single press only (can do while grinding or in air!)
    const canDoTrick = !skater.onGround || skater.grinding;
    if (keysPressed['KeyF'] && canDoTrick && !skater.kickflipping && !skater.doing180) {
        skater.kickflipping = true;
        skater.kickflipAxisRotation = 0;
        skater.kickflipSpeed = 12; // degrees per frame
        // If grinding, pop off the rail to do the trick
        if (skater.grinding) {
            skater.grinding = false;
            skater.velocityY = -8; // Pop up for the trick
            skater.jumping = true;
        }
    }

    // Update kickflip animation - board flips along its long axis
    if (skater.kickflipping) {
        skater.kickflipAxisRotation += skater.kickflipSpeed;
        
        // Complete kickflip after 360 degrees
        if (skater.kickflipAxisRotation >= 360) {
            skater.kickflipAxisRotation = 0;
            skater.kickflipping = false;
            
            // Award points
            game.score += 100;
            createFloatingText('+100', skater.x, skater.y - 50);
        }
    }

    // 180 trick - press T while in the air OR while grinding, single press only
    if (keysPressed['KeyT'] && canDoTrick && !skater.doing180 && !skater.kickflipping) {
        skater.doing180 = true;
        skater.rotation180 = 0;
        skater.rotation180Speed = 10; // degrees per frame
        // If grinding, pop off the rail to do the trick
        if (skater.grinding) {
            skater.grinding = false;
            skater.velocityY = -8; // Pop up for the trick
            skater.jumping = true;
        }
    }

    // Update 180 animation
    if (skater.doing180) {
        skater.rotation180 += skater.rotation180Speed;
        
        // At 90 degrees, skater is facing away (back to us)
        if (skater.rotation180 >= 90 && skater.rotation180 < 270) {
            skater.facingBack = true;
        } else {
            skater.facingBack = false;
        }
        
        // Complete 180 after 180 degrees
        if (skater.rotation180 >= 180) {
            skater.rotation180 = 0;
            skater.doing180 = false;
            skater.facingBack = true; // Stay facing back after 180
            
            // Award points
            game.score += 90;
            createFloatingText('+90', skater.x, skater.y - 50);
        }
    }

    // 360 trick - press Y while in the air OR while grinding, single press only
    if (keysPressed['KeyY'] && canDoTrick && !skater.doing360 && !skater.kickflipping && !skater.doing180) {
        skater.doing360 = true;
        skater.rotation360 = 0;
        skater.rotation360Speed = 12; // degrees per frame
        // If grinding, pop off the rail to do the trick
        if (skater.grinding) {
            skater.grinding = false;
            skater.velocityY = -8; // Pop up for the trick
            skater.jumping = true;
        }
    }

    // Update 360 animation
    if (skater.doing360) {
        skater.rotation360 += skater.rotation360Speed;
        
        // At 90-270 degrees, skater is facing away (back to us)
        const normalizedRotation = skater.rotation360 % 360;
        if (normalizedRotation >= 90 && normalizedRotation < 270) {
            skater.facingBack = true;
        } else {
            skater.facingBack = false;
        }
        
        // Complete 360 after 360 degrees
        if (skater.rotation360 >= 360) {
            skater.rotation360 = 0;
            skater.doing360 = false;
            skater.facingBack = false; // Back to facing forward after 360
            
            // Award points
            game.score += 180;
            createFloatingText('+180', skater.x, skater.y - 50);
        }
    }

    // Backflip trick - press B while in the air, single press only
    // HARDER: Must have enough height and can't be doing other tricks
    if (keysPressed['KeyB'] && !skater.onGround && !skater.doingBackflip && !skater.kickflipping && !skater.doing180 && !skater.doing360) {
        // HARDER: Need to be high enough to complete the flip (at least 100px above ground)
        const groundLevel = getRampAtSkater() || game.groundY;
        const heightAboveGround = groundLevel - (skater.y + skater.height);
        
        if (heightAboveGround >= 100) {
            skater.doingBackflip = true;
            skater.backflipRotation = 0;
            skater.backflipSpeed = 12; // HARDER: Slower rotation (was 15)
            skater.backflipStartedHigh = true;
        }
    }

    // Update backflip animation
    if (skater.doingBackflip) {
        skater.backflipRotation += skater.backflipSpeed;
        
        // HARDER: Check if we're landing during the flip (between 90-270 degrees = upside down)
        const normalizedRotation = skater.backflipRotation % 360;
        const isUpsideDown = normalizedRotation > 90 && normalizedRotation < 270;
        
        // Check if hitting ground while upside down = BAIL
        if (isUpsideDown && skater.onGround) {
            bail();
            return;
        }
        
        // Complete backflip after 360 degrees
        if (skater.backflipRotation >= 360) {
            skater.backflipRotation = 0;
            skater.doingBackflip = false;
            
            // Award points if still in air (landed successfully)
            if (!skater.onGround) {
                game.score += 250;
                createFloatingText('+250', skater.x, skater.y - 50);
            }
        }
    }

    // Grinding
    const rail = getRailAtSkater();
    
    // Start grinding - press G when near/on a rail
    // Can start from ground OR from air (jump onto rail)
    if (keysPressed['KeyG'] && rail && !skater.grinding) {
        skater.grinding = true;
        skater.grindTimer = 0;
        skater.canGrindOnThisRail = true;
        skater.jumping = false; // Stop jumping state when grinding starts
    }
    
    if (skater.grinding) {
        // Check if still on the rail
        const stillOnRail = rail !== null;
        
        // Press G again to stop grinding (toggle off)
        const toggleOff = keysPressed['KeyG'] && skater.grindTimer > 10; // Small delay to prevent instant toggle
        
        // Press Space to jump off and do tricks
        const jumpOff = keysPressed['Space'];
        
        if (jumpOff) {
            // Jump off rail to do tricks
            skater.grinding = false;
            skater.velocityY = -12; // Big ollie off rail
            skater.jumping = true;
            skater.onGround = false;
            
            // Bonus for grinding before jumping
            if (skater.grindTimer > 20) {
                game.score += 30;
                createFloatingText('+30', skater.x, skater.y - 50);
            }
        } else if (toggleOff || !stillOnRail) {
            // Stop grinding (toggled off or fell off end of rail)
            skater.grinding = false;
            skater.velocityY = -5; // Small drop
            skater.jumping = true;
            skater.onGround = false;
            
            // Bonus for grinding
            if (skater.grindTimer > 30) {
                game.score += 50;
                createFloatingText('+50', skater.x, skater.y - 50);
            }
        } else {
            // Continue grinding - snap to rail position
            skater.grindTimer++;
            skater.y = rail.y - skater.height + 5; // Sit on top of rail
            skater.velocityY = 0;
            skater.rotation = 0; // Keep level while grinding
            skater.onGround = false; // Not on ground while grinding
            
            // Score points every 10 frames (about 1/6 second)
            if (skater.grindTimer % 10 === 0) {
                game.score += 5;
            }
        }
    }
    // Manual (Wheelie)
    if (keys['KeyH'] && skater.onGround && !skater.manualing && !skater.grinding) {
        skater.manualing = true;
        skater.manualTimer = 0;
        skater.manualAngle = 0;
    }
    
    if (skater.manualing) {
        if (keys['KeyH'] && skater.onGround) {
            // Continue manual - lean back more over time
            skater.manualTimer++;
            skater.manualAngle = Math.min(skater.manualTimer * 0.5, 30); // Max 30 degrees
            
            // Score points while holding manual
            if (skater.manualTimer % 15 === 0) {
                game.score += 2;
            }
            
            // Loop out if held too long (bail)
            if (skater.manualTimer > 120) { // 2 seconds at 60fps
                bail();
                return;
            }
        } else {
            // Drop manual
            skater.manualing = false;
            skater.manualAngle = 0;
            
            // Bonus for long manual
            if (skater.manualTimer > 45) {
                game.score += 25;
                createFloatingText('+25', skater.x, skater.y - 50);
            }
        }
    }
    
    // Reset single-press keys after processing (they must be released and pressed again)
    keysPressed['Space'] = false;
    keysPressed['ArrowUp'] = false;
    keysPressed['KeyF'] = false;
    keysPressed['KeyT'] = false;
    keysPressed['KeyY'] = false;
    keysPressed['KeyB'] = false;
}

function bail() {
    game.bailed = true;
    game.running = false;
    skater.kickflipping = false;
    skater.kickflipRotation = 0;
    skater.kickflipAxisRotation = 0;
    skater.grinding = false;
    skater.grindTimer = 0;
    skater.manualing = false;
    skater.manualTimer = 0;
    skater.manualAngle = 0;
    skater.doing180 = false;
    skater.rotation180 = 0;
    skater.doing360 = false;
    skater.rotation360 = 0;
    skater.doingBackflip = false;
    skater.backflipRotation = 0;
    skater.facingBack = false;
    
    // Save final score for display (don't reset yet)
    game.finalScore = game.score;
    
    // Check if score qualifies for top 3
    const isHighScore = game.leaderboard.length < 3 || game.score > game.leaderboard[game.leaderboard.length - 1]?.score;
    game.enteringInitials = isHighScore;
    game.currentInitials = '';
    
    // Create bail message
    game.bailMessage = {
        text: 'BAIL!',
        subtext: isHighScore ? 'NEW HIGH SCORE! Enter initials:' : 'Press R to restart',
        opacity: 0,
        fadeIn: true,
        finalScore: game.finalScore,
        isHighScore: isHighScore
    };
}

function saveHighScore() {
    // Save high score to leaderboard
    if (game.currentInitials.length > 0) {
        game.leaderboard.push({
            initials: game.currentInitials.toUpperCase(),
            score: game.finalScore
        });
        // Sort by score descending and keep top 3
        game.leaderboard.sort((a, b) => b.score - a.score);
        game.leaderboard = game.leaderboard.slice(0, 3);
        // Save to localStorage
        localStorage.setItem('skateLeaderboard', JSON.stringify(game.leaderboard));
    }
    // Exit initials entry mode but stay on bail screen
    game.enteringInitials = false;
}

function restartGame() {
    game.bailed = false;
    game.running = true;
    game.bailMessage = null;
    game.score = 0;
    game.enteringInitials = false;
    game.currentInitials = '';
    game.finalScore = 0;
    game.scrollSpeed = game.baseSpeed;
    game.scrollOffset = 0;
    game.cameraY = 0;
    game.startSlope.active = true;
    game.startSlope.speedBoost = 0;
    
    // Reset skater position at top of slope
    skater.x = 150;
    // Ground at start is at the full height (top of slope)
    const groundAtStart = game.groundY - game.startSlope.height;
    skater.y = groundAtStart - skater.height;
    skater.velocityY = 0;
    skater.jumping = false;
    skater.onGround = true;
    skater.rotation = 0;
    skater.kickflipping = false;
    skater.kickflipRotation = 0;
    skater.kickflipAxisRotation = 0;
    skater.grinding = false;
    skater.grindTimer = 0;
    skater.manualing = false;
    skater.manualTimer = 0;
    skater.manualAngle = 0;
    skater.doing180 = false;
    skater.rotation180 = 0;
    skater.doing360 = false;
    skater.rotation360 = 0;
    skater.doingBackflip = false;
    skater.backflipRotation = 0;
    skater.facingBack = false;
    
    // Clear objects (don't spawn any ramps until after the start slope)
    objects = [];
    
    // Clear keys to prevent immediate actions
    keys['KeyR'] = false;
    
    // Clear floating texts
    floatingTexts = [];
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky (fixed, doesn't move with camera)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.6, '#FFE4B5');
    gradient.addColorStop(0.6, '#8B7355');
    gradient.addColorStop(1, '#654321');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform for everything else
    ctx.save();
    ctx.translate(0, -game.cameraY);

    // Draw clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    clouds.forEach(cloud => {
        ctx.beginPath();
        ctx.arc(cloud.x, cloud.y, cloud.width / 3, 0, Math.PI * 2);
        ctx.arc(cloud.x + cloud.width / 4, cloud.y - 10, cloud.width / 4, 0, Math.PI * 2);
        ctx.arc(cloud.x - cloud.width / 4, cloud.y - 5, cloud.width / 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw birds (small silhouettes in the distance)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    birds.forEach(bird => {
        const wingY = Math.sin(bird.wingPhase) * bird.size * 2;
        ctx.beginPath();
        // Left wing
        ctx.moveTo(bird.x - bird.size * 3, bird.y + wingY);
        ctx.quadraticCurveTo(bird.x - bird.size, bird.y - bird.size, bird.x, bird.y);
        // Right wing
        ctx.quadraticCurveTo(bird.x + bird.size, bird.y - bird.size, bird.x + bird.size * 3, bird.y + wingY);
        ctx.stroke();
    });

    // Draw realistic layered mountains with atmospheric perspective
    const mountainOffset = (game.scrollOffset * 0.2) % (canvas.width + 800);
    
    // Far mountains (lightest, slowest parallax) - smaller, gentler slopes
    const farOffset = (game.scrollOffset * 0.1) % (canvas.width + 600);
    ctx.fillStyle = '#9aa5b1'; // Light blue-gray
    for (let i = -1; i < 4; i++) {
        const baseX = i * 350 - farOffset;
        // Generate smaller jagged mountain peaks
        ctx.beginPath();
        ctx.moveTo(baseX - 100, game.groundY);
        ctx.lineTo(baseX + 30, game.groundY - 80);
        ctx.lineTo(baseX + 80, game.groundY - 110);
        ctx.lineTo(baseX + 120, game.groundY - 70);
        ctx.lineTo(baseX + 180, game.groundY - 120);
        ctx.lineTo(baseX + 250, game.groundY - 90);
        ctx.lineTo(baseX + 320, game.groundY - 100);
        ctx.lineTo(baseX + 400, game.groundY - 60);
        ctx.lineTo(baseX + 480, game.groundY - 80);
        ctx.lineTo(baseX + 550, game.groundY);
        ctx.closePath();
        ctx.fill();
        
        // Snow on far peaks
        ctx.fillStyle = '#d4dde5';
        ctx.beginPath();
        ctx.moveTo(baseX + 70, game.groundY - 100);
        ctx.lineTo(baseX + 80, game.groundY - 110);
        ctx.lineTo(baseX + 95, game.groundY - 95);
        ctx.lineTo(baseX + 85, game.groundY - 92);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#9aa5b1';
    }
    
    // Mid-distance mountains (medium color) - medium height
    const midOffset = (game.scrollOffset * 0.15) % (canvas.width + 700);
    ctx.fillStyle = '#6b7b8c'; // Medium blue-gray
    for (let i = -1; i < 4; i++) {
        const baseX = i * 400 - midOffset;
        ctx.beginPath();
        ctx.moveTo(baseX - 80, game.groundY);
        ctx.lineTo(baseX + 50, game.groundY - 100);
        ctx.lineTo(baseX + 100, game.groundY - 140);
        ctx.lineTo(baseX + 160, game.groundY - 120);
        ctx.lineTo(baseX + 220, game.groundY - 160);
        ctx.lineTo(baseX + 300, game.groundY - 130);
        ctx.lineTo(baseX + 380, game.groundY - 145);
        ctx.lineTo(baseX + 450, game.groundY - 110);
        ctx.lineTo(baseX + 520, game.groundY - 125);
        ctx.lineTo(baseX + 600, game.groundY);
        ctx.closePath();
        ctx.fill();
        
        // Snow caps on mid mountains
        ctx.fillStyle = '#e8eef2';
        ctx.beginPath();
        ctx.moveTo(baseX + 90, game.groundY - 130);
        ctx.lineTo(baseX + 100, game.groundY - 140);
        ctx.lineTo(baseX + 120, game.groundY - 132);
        ctx.lineTo(baseX + 110, game.groundY - 127);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(baseX + 210, game.groundY - 150);
        ctx.lineTo(baseX + 220, game.groundY - 160);
        ctx.lineTo(baseX + 245, game.groundY - 152);
        ctx.lineTo(baseX + 235, game.groundY - 147);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#6b7b8c';
    }
    
    // Near mountains (darkest, most detailed) - tallest but still visible
    const nearOffset = (game.scrollOffset * 0.25) % (canvas.width + 800);
    ctx.fillStyle = '#3d4852'; // Dark blue-gray
    for (let i = -1; i < 4; i++) {
        const baseX = i * 450 - nearOffset;
        
        // Main mountain body with rocky peaks - reduced height
        ctx.beginPath();
        ctx.moveTo(baseX - 50, game.groundY);
        ctx.lineTo(baseX + 80, game.groundY - 80);
        ctx.lineTo(baseX + 130, game.groundY - 140);
        ctx.lineTo(baseX + 180, game.groundY - 175);
        ctx.lineTo(baseX + 220, game.groundY - 160);
        ctx.lineTo(baseX + 280, game.groundY - 190);
        ctx.lineTo(baseX + 350, game.groundY - 170);
        ctx.lineTo(baseX + 420, game.groundY - 145);
        ctx.lineTo(baseX + 480, game.groundY - 165);
        ctx.lineTo(baseX + 550, game.groundY - 135);
        ctx.lineTo(baseX + 620, game.groundY - 155);
        ctx.lineTo(baseX + 700, game.groundY);
        ctx.closePath();
        ctx.fill();
        
        // Rocky texture/shading on near mountains
        ctx.fillStyle = '#2d353d';
        ctx.beginPath();
        ctx.moveTo(baseX + 130, game.groundY - 140);
        ctx.lineTo(baseX + 180, game.groundY - 175);
        ctx.lineTo(baseX + 200, game.groundY - 150);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(baseX + 280, game.groundY - 190);
        ctx.lineTo(baseX + 350, game.groundY - 170);
        ctx.lineTo(baseX + 330, game.groundY - 160);
        ctx.closePath();
        ctx.fill();
        
        // Snow caps on near mountains (brightest)
        ctx.fillStyle = '#f5f7f9';
        ctx.beginPath();
        ctx.moveTo(baseX + 150, game.groundY - 165);
        ctx.lineTo(baseX + 180, game.groundY - 175);
        ctx.lineTo(baseX + 200, game.groundY - 168);
        ctx.lineTo(baseX + 185, game.groundY - 162);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(baseX + 260, game.groundY - 180);
        ctx.lineTo(baseX + 280, game.groundY - 190);
        ctx.lineTo(baseX + 310, game.groundY - 182);
        ctx.lineTo(baseX + 295, game.groundY - 175);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#3d4852';
    }

    // Draw start slope (massive downhill with jump) FIRST
    if (game.startSlope.active) {
        const slope = game.startSlope;
        const slopeEndX = slope.length - game.scrollOffset;
        const jumpStartX = slopeEndX - slope.jumpLength;
        const landingEndX = slopeEndX + slope.landingLength;
        
        // Only draw if visible on screen
        if (slopeEndX > -800) {
            ctx.fillStyle = '#8B7355'; // Ground color
            ctx.strokeStyle = '#4a3728';
            ctx.lineWidth = 4;
            
            // Main slope surface with smooth curve into jump ramp
            const curveStartX = jumpStartX - 250; // 250px curve zone
            
            ctx.beginPath();
            ctx.moveTo(-100, game.groundY - slope.height); // Start high
            
            // Downhill - straight line to curve start (80px above ground)
            ctx.lineTo(curveStartX, game.groundY - 80);
            
            // CURVE: Smooth quadratic curve from downhill into jump ramp
            // Control point creates a gentle curve down to ground
            const curveControlX = curveStartX + (jumpStartX - curveStartX) / 2;
            const curveControlY = game.groundY - 20; // Just slightly above ground
            ctx.quadraticCurveTo(curveControlX, curveControlY, jumpStartX, game.groundY);
            
            // Jump ramp up - straight line to peak
            ctx.lineTo(slopeEndX, game.groundY - slope.jumpHeight);
            
            // Landing ramp down - straight line to ground
            ctx.lineTo(landingEndX, game.groundY);
            
            // Bottom edge
            ctx.lineTo(landingEndX, game.groundY + 200);
            ctx.lineTo(-100, game.groundY + 200);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Speed indicator - show player they're gaining speed
            if (game.scrollOffset > 200 && game.scrollOffset < slope.length) {
                const progress = game.scrollOffset / slope.length;
                const speedPercent = Math.floor(progress * 100);
                ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + progress * 0.5})`;
                ctx.font = 'bold 20px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`SPEED: +${speedPercent}%`, skater.x, skater.y - 80);
            }
            
            // "GET READY!" text at start
            if (game.scrollOffset < 150) {
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 28px Arial';
                ctx.textAlign = 'center';
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 3;
                ctx.strokeText('GET READY!', 200, game.groundY - slope.height - 50);
                ctx.fillText('GET READY!', 200, game.groundY - slope.height - 50);
                ctx.font = 'bold 22px Arial';
                ctx.fillStyle = '#FFD700';
                ctx.strokeText('MASSIVE AIR AHEAD!', 200, game.groundY - slope.height - 20);
                ctx.fillText('MASSIVE AIR AHEAD!', 200, game.groundY - slope.height - 20);
            }
        }
    }

    // Draw ground (only where slope isn't)
    ctx.fillStyle = '#8B7355';
    if (game.startSlope.active) {
        const slope = game.startSlope;
        const landingEndX = slope.length - game.scrollOffset + slope.landingLength;
        if (landingEndX < canvas.width) {
            ctx.fillRect(landingEndX, game.groundY, canvas.width - landingEndX, canvas.height - game.groundY);
        }
    } else {
        ctx.fillRect(0, game.groundY, canvas.width, canvas.height - game.groundY);
    }
    
    // Draw ground texture (moving lines for speed effect) - only where slope isn't
    ctx.strokeStyle = '#6b5a45';
    ctx.lineWidth = 2;
    const groundPatternOffset = game.scrollOffset % 100;
    const patternStartX = game.startSlope.active ? 
        Math.max(0, game.startSlope.length - game.scrollOffset + game.startSlope.landingLength - 100) : 0;
    for (let i = patternStartX - 100; i < canvas.width + 100; i += 100) {
        if (i >= patternStartX) {
            ctx.beginPath();
            ctx.moveTo(i - groundPatternOffset, game.groundY + 20);
            ctx.lineTo(i - groundPatternOffset + 50, game.groundY + 80);
            ctx.stroke();
        }
    }

    // Draw ground line (only where slope isn't)
    ctx.strokeStyle = '#4a3728';
    ctx.lineWidth = 4;
    if (game.startSlope.active) {
        const slopeEndX = game.startSlope.length - game.scrollOffset + 400; // Extended to match new landing
        if (slopeEndX < canvas.width) {
            ctx.beginPath();
            ctx.moveTo(slopeEndX, game.groundY);
            ctx.lineTo(canvas.width, game.groundY);
            ctx.stroke();
        }
    } else {
        ctx.beginPath();
        ctx.moveTo(0, game.groundY);
        ctx.lineTo(canvas.width, game.groundY);
        ctx.stroke();
    }

    // Draw skater
    ctx.save();
    ctx.translate(skater.x + skater.width / 2, skater.y + skater.height / 2);
    
    // Apply manual rotation (wheelie) - rotates entire skater around back wheels
    if (skater.manualing) {
        ctx.rotate(-skater.manualAngle * Math.PI / 180);
    }
    
    // Apply backflip rotation - rotates entire skater backward
    if (skater.doingBackflip) {
        ctx.rotate(-skater.backflipRotation * Math.PI / 180);
    }
    
    ctx.rotate(skater.rotation);
    
    // Apply kickflip rotation to the board only - rotates along the board's long axis
    ctx.save();
    if (skater.kickflipping) {
        // Rotate around the X-axis (along the length of the board) for kickflip
        const flipAngle = skater.kickflipAxisRotation * Math.PI / 180;
        // Use scale to simulate 3D rotation - compresses the board vertically
        ctx.scale(1, Math.cos(flipAngle));
        // Shift slightly to keep rotation centered
        if (Math.cos(flipAngle) < 0) {
            // Board is upside down during flip
            ctx.translate(0, -skater.height / 2 - 10);
        }
    }
    
    // Skateboard deck with wood texture and shape
    ctx.fillStyle = '#8B4513';
    ctx.beginPath();
    ctx.roundRect(-skater.width / 2 - 8, skater.height / 2 - 4, skater.width + 16, 10, 4);
    ctx.fill();
    
    // Deck highlight
    ctx.fillStyle = '#A0522D';
    ctx.fillRect(-skater.width / 2 - 4, skater.height / 2 - 2, skater.width + 8, 3);
    
    // Grip tape
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(-skater.width / 2 - 6, skater.height / 2 - 5, skater.width + 12, 4, 2);
    ctx.fill();
    
    // Trucks (metal)
    ctx.fillStyle = '#C0C0C0';
    ctx.fillRect(-skater.width / 2 - 2, skater.height / 2 + 4, 8, 6);
    ctx.fillRect(skater.width / 2 - 6, skater.height / 2 + 4, 8, 6);
    
    // Wheels (animated, white like in the image)
    ctx.fillStyle = '#f0f0f0';
    const wheelOffset = Math.sin(skater.wheelRotation) * 2;
    ctx.beginPath();
    ctx.arc(-skater.width / 2 + 2, skater.height / 2 + 10 + wheelOffset, 7, 0, Math.PI * 2);
    ctx.arc(skater.width / 2 - 2, skater.height / 2 + 10 - wheelOffset, 7, 0, Math.PI * 2);
    ctx.fill();
    
    // Wheel hubs
    ctx.fillStyle = '#888';
    ctx.beginPath();
    ctx.arc(-skater.width / 2 + 2, skater.height / 2 + 10 + wheelOffset, 3, 0, Math.PI * 2);
    ctx.arc(skater.width / 2 - 2, skater.height / 2 + 10 - wheelOffset, 3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore(); // End board rotation
    
    // Apply 180 rotation to skater body
    if (skater.doing180) {
        const rotate180 = skater.rotation180 * Math.PI / 180;
        // Scale X to simulate rotation (1 = front, -1 = back, 0 = side)
        const scaleX = Math.cos(rotate180);
        ctx.scale(scaleX, 1);
    } else if (skater.facingBack) {
        // Facing away after completing 180
        ctx.scale(-1, 1);
    }
    
    if (skater.facingBack || (skater.doing180 && skater.rotation180 > 90)) {
        // BACK VIEW - Full plaid shirt (we see his back)
        
        // Main shirt body - full plaid
        ctx.fillStyle = '#B22222'; // Red base
        ctx.fillRect(-skater.width / 2, -skater.height / 2, skater.width, skater.height * 0.6);
        
        // Plaid pattern (horizontal stripes) - more prominent on back
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        for (let i = 0; i < 5; i++) {
            ctx.fillRect(-skater.width / 2, -skater.height / 2 + i * 8, skater.width, 4);
        }
        
        // Plaid pattern (vertical stripes) - more prominent on back
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(-skater.width / 2 + 6, -skater.height / 2, 5, skater.height * 0.6);
        ctx.fillRect(-skater.width / 2 + 18, -skater.height / 2, 5, skater.height * 0.6);
        ctx.fillRect(skater.width / 2 - 11, -skater.height / 2, 5, skater.height * 0.6);
        
        // Shirt collar (back view - higher neck)
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(-10, -skater.height / 2, 20, 6);
        
        // Arms (skin tone) - positioned slightly differently from back
        ctx.fillStyle = '#fdbf60';
        // Left arm (appears on right from back view due to scale)
        ctx.fillRect(-skater.width / 2 - 6, -skater.height / 2 + 8, 7, 22);
        // Right arm
        ctx.fillRect(skater.width / 2 - 1, -skater.height / 2 + 8, 7, 22);
        
        // Hands
        ctx.beginPath();
        ctx.arc(-skater.width / 2 - 2, -skater.height / 2 + 30, 4, 0, Math.PI * 2);
        ctx.arc(skater.width / 2 + 2, -skater.height / 2 + 30, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Jeans (blue) - back view
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(-skater.width / 2 + 2, -skater.height / 2 + skater.height * 0.6, skater.width - 4, skater.height * 0.4);
        
        // Back pocket details
        ctx.fillStyle = '#1a3a3a';
        ctx.fillRect(-skater.width / 2 + 5, -skater.height / 2 + skater.height * 0.6 + 5, 10, 8);
        ctx.fillRect(skater.width / 2 - 15, -skater.height / 2 + skater.height * 0.6 + 5, 10, 8);
        
        // Shoes
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-skater.width / 2 - 2, skater.height / 2 - 6, 16, 8);
        ctx.fillRect(skater.width / 2 - 14, skater.height / 2 - 6, 16, 8);
        
        // Skater head - back view
        ctx.fillStyle = '#fdbf60';
        ctx.beginPath();
        ctx.arc(0, -skater.height / 2 - 12, 13, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair - back of head (more visible)
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(0, -skater.height / 2 - 14, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-14, -skater.height / 2 - 16, 28, 10);
        
    } else {
        // FRONT VIEW - Original appearance
        
        // Skater body - Plaid shirt
        // Main shirt body
        ctx.fillStyle = '#B22222'; // Red base
        ctx.fillRect(-skater.width / 2, -skater.height / 2, skater.width, skater.height * 0.6);
        
        // Plaid pattern (horizontal stripes)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(-skater.width / 2, -skater.height / 2 + i * 10, skater.width, 3);
        }
        
        // Plaid pattern (vertical stripes)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(-skater.width / 2 + 8, -skater.height / 2, 4, skater.height * 0.6);
        ctx.fillRect(skater.width / 2 - 12, -skater.height / 2, 4, skater.height * 0.6);
        
        // Shirt collar
        ctx.fillStyle = '#8B0000';
        ctx.beginPath();
        ctx.moveTo(-8, -skater.height / 2);
        ctx.lineTo(0, -skater.height / 2 + 8);
        ctx.lineTo(8, -skater.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // White undershirt
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(-4, -skater.height / 2 + 2, 8, 12);
        
        // Arms (skin tone)
        ctx.fillStyle = '#fdbf60';
        // Left arm
        ctx.fillRect(-skater.width / 2 - 8, -skater.height / 2 + 5, 8, 25);
        // Right arm
        ctx.fillRect(skater.width / 2, -skater.height / 2 + 5, 8, 25);
        
        // Hands
        ctx.beginPath();
        ctx.arc(-skater.width / 2 - 4, -skater.height / 2 + 32, 5, 0, Math.PI * 2);
        ctx.arc(skater.width / 2 + 4, -skater.height / 2 + 32, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Jeans (blue)
        ctx.fillStyle = '#2F4F4F';
        ctx.fillRect(-skater.width / 2 + 2, -skater.height / 2 + skater.height * 0.6, skater.width - 4, skater.height * 0.4);
        
        // Jeans detail (pockets/seams)
        ctx.strokeStyle = '#1a3a3a';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, -skater.height / 2 + skater.height * 0.6);
        ctx.lineTo(0, skater.height / 2);
        ctx.stroke();
        
        // Shoes
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-skater.width / 2 - 2, skater.height / 2 - 6, 16, 8);
        ctx.fillRect(skater.width / 2 - 14, skater.height / 2 - 6, 16, 8);
        
        // Shoe laces/detail
        ctx.fillStyle = '#654321';
        ctx.fillRect(-skater.width / 2, skater.height / 2 - 4, 10, 2);
        ctx.fillRect(skater.width / 2 - 10, skater.height / 2 - 4, 10, 2);
        
        // Skater head
        ctx.fillStyle = '#fdbf60';
        ctx.beginPath();
        ctx.arc(0, -skater.height / 2 - 12, 13, 0, Math.PI * 2);
        ctx.fill();
        
        // Hair
        ctx.fillStyle = '#4a3728';
        ctx.beginPath();
        ctx.arc(0, -skater.height / 2 - 16, 13, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(-12, -skater.height / 2 - 18, 24, 6);
        
        // Face details
        ctx.fillStyle = '#333';
        // Eyes
        ctx.beginPath();
        ctx.arc(-4, -skater.height / 2 - 14, 2, 0, Math.PI * 2);
        ctx.arc(4, -skater.height / 2 - 14, 2, 0, Math.PI * 2);
        ctx.fill();
        
    } // End front view
    
    ctx.restore();

    // Draw grinding sparks
    if (skater.grinding) {
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 5; i++) {
            const sparkX = skater.x + Math.random() * skater.width;
            const sparkY = skater.y + skater.height + Math.random() * 10;
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 2 + Math.random() * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Draw ramps (in foreground, after skater)
    objects.forEach(obj => {
        if (obj.type === 'ramp') {
            const wheelOffset = 10;
            const rampTopY = obj.y;
            const rampHeight = obj.height;
            const rampWidth = obj.width;
            const groundLevel = game.groundY + wheelOffset;
            
            // Wood colors for the ramp
            const woodLight = '#d4a574';
            const woodMedium = '#c4956a';
            const woodDark = '#8b6914';
            const woodShadow = '#6b4e0a';
            
            // Draw the main ramp structure (quarter pipe shape with more curve)
            ctx.fillStyle = woodMedium;
            ctx.beginPath();
            // Start at bottom left
            ctx.moveTo(obj.x, groundLevel);
            // Curve up to the top (steeper quarter pipe transition)
            // Control point is lower and further out for a more pronounced curve
            ctx.quadraticCurveTo(
                obj.x + rampWidth * 0.15, groundLevel - rampHeight * 0.05,
                obj.x + rampWidth, rampTopY
            );
            // Top edge
            ctx.lineTo(obj.x + rampWidth + 15, rampTopY);
            // Down the back
            ctx.lineTo(obj.x + rampWidth + 15, groundLevel);
            // Close at bottom
            ctx.lineTo(obj.x, groundLevel);
            ctx.closePath();
            ctx.fill();
            
            // Wood grain/layers effect - simple horizontal lines within ramp bounds
            ctx.strokeStyle = woodDark;
            ctx.lineWidth = 1;
            ctx.save();
            // Clip to ramp shape so lines don't stick out
            ctx.beginPath();
            ctx.moveTo(obj.x, groundLevel);
            ctx.quadraticCurveTo(
                obj.x + rampWidth * 0.15, groundLevel - rampHeight * 0.05,
                obj.x + rampWidth, rampTopY
            );
            ctx.lineTo(obj.x + rampWidth + 15, rampTopY);
            ctx.lineTo(obj.x + rampWidth + 15, groundLevel);
            ctx.lineTo(obj.x, groundLevel);
            ctx.closePath();
            ctx.clip();
            
            // Draw horizontal lines
            for (let i = 1; i < 8; i++) {
                const lineY = groundLevel - (i * rampHeight / 8);
                ctx.beginPath();
                ctx.moveTo(obj.x - 10, lineY);
                ctx.lineTo(obj.x + rampWidth + 25, lineY);
                ctx.stroke();
            }
            ctx.restore();
            
            // Side panels (darker wood on edges)
            ctx.fillStyle = woodShadow;
            ctx.fillRect(obj.x - 3, groundLevel - 5, 6, 5);
            ctx.fillRect(obj.x + rampWidth + 12, groundLevel - rampHeight - 5, 6, rampHeight + 10);
            
            // The riding surface (smooth light wood with pronounced curve)
            ctx.strokeStyle = woodLight;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.moveTo(obj.x, groundLevel);
            ctx.quadraticCurveTo(
                obj.x + rampWidth * 0.15, groundLevel - rampHeight * 0.05,
                obj.x + rampWidth, rampTopY
            );
            ctx.stroke();
            
            // Metal coping on top (silver pipe)
            const copingY = rampTopY - 3;
            const copingX = obj.x + rampWidth;
            
            // Coping shadow
            ctx.fillStyle = '#404040';
            ctx.fillRect(copingX - 2, copingY + 2, 16, 8);
            
            // Coping main body
            ctx.fillStyle = '#a0a0a0';
            ctx.beginPath();
            ctx.arc(copingX + 6, copingY + 5, 6, 0, Math.PI * 2);
            ctx.fill();
            
            // Coping highlight
            ctx.fillStyle = '#d0d0d0';
            ctx.beginPath();
            ctx.arc(copingX + 6, copingY + 3, 3, 0, Math.PI * 2);
            ctx.fill();
            
            // Platform/deck on top (flat surface)
            ctx.fillStyle = woodDark;
            ctx.fillRect(obj.x + rampWidth + 10, rampTopY - 8, 40, 8);
            
            // Deck surface
            ctx.fillStyle = woodMedium;
            ctx.fillRect(obj.x + rampWidth + 10, rampTopY - 10, 40, 4);
        }
        
        if (obj.type === 'pit') {
            const pitDepth = obj.height;
            const spikeCount = Math.floor(obj.width / 15);
            const groundLevel = game.groundY;
            
            // Dark pit background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(obj.x, obj.y, obj.width, pitDepth);
            
            // Pit border/edges
            ctx.fillStyle = '#4a3728';
            ctx.fillRect(obj.x - 3, obj.y, 3, 10);
            ctx.fillRect(obj.x + obj.width, obj.y, 3, 10);
            
            // Spikes at bottom of pit
            ctx.fillStyle = '#c0c0c0';
            for (let i = 0; i < spikeCount; i++) {
                const spikeX = obj.x + 10 + i * 15;
                const spikeBaseY = obj.y + pitDepth;
                
                // Draw spike (triangle pointing up)
                ctx.beginPath();
                ctx.moveTo(spikeX - 4, spikeBaseY);
                ctx.lineTo(spikeX, spikeBaseY - 25);
                ctx.lineTo(spikeX + 4, spikeBaseY);
                ctx.closePath();
                ctx.fill();
                
                // Spike highlight
                ctx.strokeStyle = '#e0e0e0';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(spikeX - 2, spikeBaseY - 2);
                ctx.lineTo(spikeX, spikeBaseY - 20);
                ctx.stroke();
            }
        }
        
        if (obj.type === 'rail') {
            // Rail posts
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(obj.x + 5, obj.y + 10, 8, obj.height - 10);
            ctx.fillRect(obj.x + obj.width - 15, obj.y + 10, 8, obj.height - 10);
            
            // Rail bar (cylinder effect)
            ctx.fillStyle = '#c0c0c0';
            ctx.fillRect(obj.x, obj.y, obj.width, 12);
            
            // Rail highlight
            ctx.fillStyle = '#e8e8e8';
            ctx.fillRect(obj.x, obj.y + 2, obj.width, 4);
            
            // Rail shadow
            ctx.fillStyle = '#808080';
            ctx.fillRect(obj.x, obj.y + 8, obj.width, 4);
        }
    });

    // Draw floating texts
    floatingTexts.forEach(ft => {
        ctx.save();
        ctx.globalAlpha = ft.opacity;
        ctx.fillStyle = '#FFD700';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.font = 'bold 24px Arial';
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
    });

    // Draw speed lines when going fast
    if (game.scrollSpeed > game.baseSpeed) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 5; i++) {
            const lineX = Math.random() * canvas.width;
            const lineY = Math.random() * canvas.height;
            ctx.beginPath();
            ctx.moveTo(lineX, lineY);
            ctx.lineTo(lineX - 50 - Math.random() * 50, lineY);
            ctx.stroke();
        }
    }

    // Update floating texts
    floatingTexts.forEach(ft => {
        ft.y -= 1; // float up
        ft.life--;
        ft.opacity = ft.life / 60;
    });
    floatingTexts = floatingTexts.filter(ft => ft.life > 0);

    // Update score display
    document.getElementById('score').textContent = `Score: ${game.score}`;
    
    // Restore camera transform before drawing UI
    ctx.restore();
    
    // Draw bail message if game is paused (screen-space, not affected by camera)
    if (game.bailed && game.bailMessage) {
        // Fade in animation
        if (game.bailMessage.fadeIn) {
            game.bailMessage.opacity += 0.05;
            if (game.bailMessage.opacity >= 1) {
                game.bailMessage.opacity = 1;
                game.bailMessage.fadeIn = false;
            }
        }
        
        ctx.save();
        ctx.globalAlpha = game.bailMessage.opacity;
        
        // Dark overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // BAIL! text
        ctx.fillStyle = '#ff4444';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 6;
        ctx.font = 'bold 80px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText(game.bailMessage.text, canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText(game.bailMessage.text, canvas.width / 2, canvas.height / 2 - 20);
        
        // Subtext - show appropriate message based on state
        ctx.fillStyle = '#fff';
        ctx.font = '24px Arial';
        const subtext = game.enteringInitials ? 'NEW HIGH SCORE! Enter initials:' : 'Press R to restart';
        ctx.fillText(subtext, canvas.width / 2, canvas.height / 2 + 40);
        
        // Show final score
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Final Score: ${game.bailMessage.finalScore}`, canvas.width / 2, canvas.height / 2 + 90);
        
        // Show initials entry if high score
        if (game.enteringInitials) {
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#00ff00';
            const initialsDisplay = game.currentInitials.padEnd(3, '_');
            ctx.fillText(initialsDisplay, canvas.width / 2, canvas.height / 2 + 140);
            
            ctx.font = '18px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Type 3 letters, then press ENTER', canvas.width / 2, canvas.height / 2 + 170);
        }
        
        // Draw leaderboard on the LEFT side
        const leaderboardX = 80;
        let leaderboardY = game.enteringInitials ? canvas.height / 2 + 100 : canvas.height / 2 + 60;
        ctx.textAlign = 'left';
        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#fff';
        ctx.fillText('🏆 TOP SCORES', leaderboardX, leaderboardY);
        
        leaderboardY += 30;
        ctx.font = '18px Arial';
        
        // Show current leaderboard
        for (let i = 0; i < 3; i++) {
            const entry = game.leaderboard[i];
            if (entry) {
                // Check if this is the new entry being added
                const isNewEntry = game.enteringInitials && 
                    i === game.leaderboard.findIndex(e => e.score === game.finalScore && !e.initials);
                
                if (isNewEntry) {
                    ctx.fillStyle = '#00ff00'; // Highlight new entry
                } else if (i === 0) {
                    ctx.fillStyle = '#FFD700'; // Gold
                } else if (i === 1) {
                    ctx.fillStyle = '#C0C0C0'; // Silver
                } else {
                    ctx.fillStyle = '#CD7F32'; // Bronze
                }
                ctx.fillText(`${i + 1}. ${entry.initials || game.currentInitials || '???'} - ${entry.score}`, leaderboardX, leaderboardY);
            } else {
                ctx.fillStyle = '#666';
                ctx.fillText(`${i + 1}. ---`, leaderboardX, leaderboardY);
            }
            leaderboardY += 26;
        }
        
        // Reset text align
        ctx.textAlign = 'center';
        
        // Show restart instruction if not entering initials
        if (!game.enteringInitials) {
            ctx.font = '18px Arial';
            ctx.fillStyle = '#aaa';
            ctx.fillText('Press R to restart', canvas.width / 2, leaderboardY + 20);
        }
        
        ctx.restore();
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
gameLoop();