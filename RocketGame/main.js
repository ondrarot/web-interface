// ==========================================
// 1. PHYSICS ENGINE (Ported from rocket.py)
// ==========================================

class Vector2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    add(v) {
        return new Vector2D(this.x + v.x, this.y + v.y);
    }
    iadd(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    mul(scalar) {
        return new Vector2D(this.x * scalar, this.y * scalar);
    }
    imul(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
    rotate(angle) {
        // Complex number rotation equivalent to cmath.exp(angle*1j)
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        return new Vector2D(
            this.x * cosA - this.y * sinA,
            this.x * sinA + this.y * cosA
        );
    }
}

class Rocket {
    constructor(world_width, world_height, initial_x_position) {
        this.world_width = world_width;
        this.world_height = world_height;
        this.buildings = []; // Store obstacles
        this.start_offset = 0; // Will be set by simulator
        this.land_offset = 0;
        this.set_touchdown_position(initial_x_position || 0.0);
    }

    set_touchdown_position(x_position) {
        this.position = new Vector2D(x_position, 0);
        this.velocity = new Vector2D(0, 0);
        this.acceleration = new Vector2D(0, 0);
        this.rotation = 0.0;
        this.rotation_speed = 0.0;
        this.rotation_acceleration = 0.0;
        this.crashed = false;
        this.invalid_landing = false;
        this.touchdown = true;
        this.engine_throttle = 0.0;
        this.right_thruster_on = false;
        this.left_thruster_on = false;
    }

    update() {
        this.velocity.iadd(this.acceleration);
        this.position.iadd(this.velocity);
        this.acceleration.imul(0);
        
        this.rotation = (this.rotation + this.rotation_speed) % (2 * Math.PI);
        if (this.rotation < 0) this.rotation += 2 * Math.PI; // Handle negative modulo in JS
        
        this.rotation_speed += this.rotation_acceleration;
        this.rotation_acceleration = 0.0;

        // Collision with ground or platforms
        if (this.position.y <= 0) {
            let startX = this.start_offset - (this.world_width / 2);
            let landingX = (this.world_width - this.land_offset) - (this.world_width / 2);
            
            // Dynamic platform hitbox (8% of world width)
            let platformHalfWidth = (this.world_width * 0.08) / 2; 

            let isOnLandingPlatform = Math.abs(this.position.x - landingX) < platformHalfWidth;
            let isOnStartPlatform = Math.abs(this.position.x - startX) < platformHalfWidth;

            let isSafeSpeedAndRotation = (this.velocity.length > 0 && this.velocity.length < 2) && 
                                         (this.rotation < 0.15 || this.rotation > ((2 * Math.PI) - 0.15));

            if (isOnLandingPlatform && isSafeSpeedAndRotation) {
                // Safe touchdown on RIGHT platform
                this.set_touchdown_position(this.position.x);
            } else if (isOnStartPlatform && isSafeSpeedAndRotation && !initialPosition) {
                // Safe touchdown on START platform (but it's not allowed)
                this.invalid_landing = true;
            } else if (this.velocity.length > 0) {
                // Crash if landing too fast, tilted, OR on the wrong platform
                this.crashed = true;
            }
        }

        // --- NEW: Collision with buildings ---
        for (let b of this.buildings) {
            let halfW = b.w / 2;
            // Rocket width is 24, so half is 12. Using 10 as a safe margin.
            if (Math.abs(this.position.x - b.x) < (halfW + 10) && 
                this.position.y < b.h) {
                this.crashed = true;
            }
        }
        
        this.touchdown = (this.position.y <= 0 && this.velocity.length === 0);
        
        if (this.position.x <= -this.world_width / 2 || this.position.x >= this.world_width / 2 || this.position.y >= this.world_height) {
            this.crashed = true;
        }
    }

    apply_force(force) {
        this.acceleration.iadd(force);
    }

    apply_rotation(force) {
        if (!this.touchdown) {
            this.rotation_acceleration += force;
        }
    }

    apply_gravity(gravity) {
        if (!this.touchdown) {
            this.apply_force(new Vector2D(0, -gravity));
        }
    }
}

class RocketSimulator {
    constructor() {
        this.currentLevel = 1;
        this.gravity = 0.1;
    }

    setup(width, height) {
        this.cwidth = width;
        this.cheight = height;
        
        // --- LEVEL CONFIGURATIONS ---
        if (this.currentLevel === 1) {
            this.launchpad_offset = this.cwidth / 6;
            this.land_offset = this.cwidth / 6;
            this.gravity = 0.1;
        } else if (this.currentLevel === 2) {
            this.launchpad_offset = this.cwidth / 6; 
            this.land_offset = this.cwidth / 3.9; // Moved further left
            this.gravity = 0.1;
        } else if (this.currentLevel === 3) {
            this.launchpad_offset = this.cwidth / 4;
            this.land_offset = this.cwidth / 4;
            this.gravity = 0.05;
        }

        this.initial_x_pos = this.launchpad_offset - this.cwidth / 2;
        this.rocket = new Rocket(this.cwidth, this.cheight, this.initial_x_pos);
        this.rocket.start_offset = this.launchpad_offset;
        this.rocket.land_offset = this.land_offset;

        // Add buildings for Level 2
        if (this.currentLevel === 2) {
            let sx = this.cwidth / 1200; // Reference width scale
            let sy = this.cheight / 800; // Reference height scale

            this.rocket.buildings = [
                { x: -230 * sx, w: 100 * sx, h: 250 * sy, type: 'apartment' }, 
                { x: 50 * sx, w: 140 * sx, h: 400 * sy, type: 'office' },
                { x: 500 * sx, w: 80 * sx, h: 70 * sy, type: 'family_house' }
            ];
        }

        this.framecounter = 0;
        this.timerStarted = false; // --- NEW: Timer starts only on first thrust ---
    }

    update() {
        if (this.rocket.engine_throttle > 0.01) {
            this.timerStarted = true; // --- Start timer on significant engine throttle ---
        }
        
        if (this.timerStarted) {
            this.framecounter += 1;
        }

        if (this.rocket.engine_throttle > 0) {
            let engine_force = new Vector2D(0, 0.2 * this.rocket.engine_throttle).rotate(this.rocket.rotation);
            this.rocket.apply_force(engine_force);
        }
        if (this.rocket.right_thruster_on) {
            this.rocket.apply_rotation(0.005);
        }
        if (this.rocket.left_thruster_on) {
            this.rocket.apply_rotation(-0.005);
        }
        this.rocket.apply_gravity(this.gravity);
        this.rocket.update();
    }
}

// ==========================================
// 2. FRONTEND LOGIC (Adapted from main.js)
// ==========================================

const simulator = new RocketSimulator();

// UI Elements
const statusApk = document.querySelector('#status');
const heightApk = document.querySelector('#rexY');
const widthApk = document.querySelector('#rexX');
const xApk = document.querySelector('#x');
const yApk = document.querySelector('#y');
const vxApk = document.querySelector('#vx');
const vyApk = document.querySelector('#vy');
const rotationApk = document.querySelector('#rotation');
const inairApk = document.querySelector('#inair');
const touchdownApk = document.querySelector('#touchdown');
const crashedApk = document.querySelector('#crashed');
const timeApk = document.querySelector('#time');
const levelSelect = document.getElementById('levelSelect');
const btnLevel1 = document.getElementById('btnLevel1');
const btnLevel2 = document.getElementById('btnLevel2');

function updateLevelButtons() {
    if (btnLevel1 && btnLevel2) {
        btnLevel1.classList.toggle('active-level', simulator.currentLevel === 1);
        btnLevel2.classList.toggle('active-level', simulator.currentLevel === 2);
    }
}

if (btnLevel1) {
    btnLevel1.addEventListener('click', () => {
        simulator.currentLevel = 1;
        updateLevelButtons();
        resetScene();
    });
}

if (btnLevel2) {
    btnLevel2.addEventListener('click', () => {
        simulator.currentLevel = 2;
        updateLevelButtons();
        resetScene();
    });
}

// --- Level Selection Listener (Old Dropdown - removed or kept for safety) ---
if (levelSelect) {
    levelSelect.addEventListener('change', (e) => {
        simulator.currentLevel = parseInt(e.target.value);
        updateLevelButtons();
        resetScene();
    });
}

// --- Modal Button Logic ---
const startGameModalBtn = document.getElementById('startGameModalBtn');

let engineThrottle = 1;
let simulationStarted = true;
let initialPosition = true;

// SVG Variables
let svg = document.getElementById('svg');
let svgWidth, svgHeight, centerX, centerY;
let rocketHeight = 48, rocketWidth = 24, rotationHeight = 15, thrusterHeight = 42;
let launchpadHeight, launchpadWidth;

function setSvgSize() {
    // Measure the parent container instead of the SVG itself
    const container = svg.parentElement;
    
    // Calculate width and height (subtracting 20px to account for the 10px padding on each side)
    svgWidth = container.clientWidth - 20;
    svgHeight = container.clientHeight - 20;
    
    svg.setAttribute("width", svgWidth);
    svg.setAttribute("height", svgHeight);
    
    centerX = svgWidth / 2;
    centerY = svgHeight;
    
    if (heightApk) heightApk.textContent = svgHeight;
    if (widthApk) widthApk.textContent = svgWidth;

    // --- NEW DYNAMIC PLATFORM SIZES ---
    // Width is 10% of the screen, height is 2% of the screen
    launchpadWidth = svgWidth * 0.08; 
    launchpadHeight = svgHeight * 0.02;

    // Initialize Simulator with new dimensions
    simulator.setup(svgWidth, svgHeight);
    
    // Force the screen to draw immediately upon resizing or loading
    updateUI(); 
}

window.addEventListener('load', setSvgSize);
document.addEventListener('DOMContentLoaded', setSvgSize);

// When we click the button in the pop-up, apply the new size and start!
startGameModalBtn.addEventListener('click', () => {
    setSvgSize();
    resetScene();
    hideInfoFunction();
});

// When the window is resized, pause the game and show the pop-up
window.addEventListener('resize', () => {
    simulationStarted = false; // Pause the game
    infoFunction("Window Resized", "Click 'Start Game' to adjust the screen and resume.", "start");
});

// When the page first loads, show the pop-up instead of starting immediately
window.addEventListener('load', () => {
    simulationStarted = false;
    // Don't calculate the size until they click start
    infoFunction("Welcome to Rocket Landing", "Click 'Start Game' to begin.", "start");
});

function resetScene() {
    initialPosition = true;
    simulationStarted = true;
    simulator.setup(svgWidth, svgHeight);
}

function updateUI() {
    let r = simulator.rocket;
    
    // Update Status text
    if (r.crashed) {
        statusApk.textContent = "Horribly Crashed!";
        statusApk.style.color = "red";
    } else if (r.invalid_landing) {
        statusApk.textContent = "Invalid attempt!";
        statusApk.style.color = "orange";
    } else if (r.touchdown && !initialPosition) {
        statusApk.textContent = "Successfully Landed!";
        statusApk.style.color = "lime";
    } else if (!simulationStarted) {
        statusApk.textContent = "Paused";
        statusApk.style.color = "orange";
    } else {
        statusApk.textContent = "Running...";
        statusApk.style.color = "white";
    }

    // Convert physics coords to screen coords
    let screenX = r.position.x + centerX;
    let screenY = centerY - r.position.y - launchpadHeight;
    
    xApk.textContent = r.position.x.toFixed(2);
    yApk.textContent = r.position.y.toFixed(2);
    
    // Safely update these only if they exist in the HTML
    if (vxApk) vxApk.textContent = r.velocity.x.toFixed(2);
    if (vyApk) vyApk.textContent = r.velocity.y.toFixed(2);
    if (rotationApk) rotationApk.textContent = (r.rotation * (180 / Math.PI)).toFixed(2);
    
    let inAir = r.position.y > 10;
    if(inAir) initialPosition = false;

    // --- ADD THE TIMER UPDATE ---
    let timeInSeconds = (simulator.framecounter * 0.02).toFixed(2);
    if (timeApk) timeApk.textContent = timeInSeconds;
    
    // Update live timer in SVG scene
    const liveTimer = document.getElementById('liveTimer');
    if (liveTimer) liveTimer.textContent = timeInSeconds + "s";
    
    inairApk.textContent = inAir;
    touchdownApk.textContent = r.touchdown;
    crashedApk.textContent = r.crashed;

    placeObjects(screenX, screenY, -r.rotation);
    barGraphs(r.velocity.x, r.velocity.y);
    svgSpeedArrow(r.velocity.x, r.velocity.y);
    rocketState();
}

// Main game loop
function gameLoop() {
    let hasLanded = simulator.rocket.touchdown && !initialPosition;
    let isInvalid = simulator.rocket.invalid_landing;
    if (!simulator.rocket.crashed && !hasLanded && !isInvalid && simulationStarted) {
        simulator.update();
    }
    updateUI();
}

// --- Drawing Functions ---
function drawRocket() { 
    let rocket = document.createElementNS("http://www.w3.org/2000/svg", "g");
    
    let rocketBody = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rocketBody.setAttribute("x", -1 * (rocketWidth/2));
    rocketBody.setAttribute("y", 0 - rocketHeight);
    rocketBody.setAttribute("width", rocketWidth);
    rocketBody.setAttribute("height", rocketHeight);
    rocketBody.setAttribute("fill", "#16162a");
    rocket.appendChild(rocketBody);

    let rocketTop = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    let points = (-1* (rocketWidth/2)) + "," + (1 - rocketHeight) + " " +
                 (0) + "," + (0 - rocketHeight - 20) + " " +
                 (rocketWidth/2) + "," + (1 - rocketHeight);
    rocketTop.setAttribute("points", points);
    rocketTop.setAttribute("fill", "#16162a");
    rocket.appendChild(rocketTop);

    // Rocket Window (Circular)
    let rocketWindow = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rocketWindow.setAttribute("cx", 0);
    rocketWindow.setAttribute("cy", -rocketHeight + 8); // Positioned near the top of the body
    rocketWindow.setAttribute("r", 5); // Radius of 5px
    rocketWindow.setAttribute("fill", "#b0ddeb"); // Light blue
    rocketWindow.setAttribute("stroke", "#353434"); // White border
    rocketWindow.setAttribute("stroke-width", "1");
    rocket.appendChild(rocketWindow);

    let rotationCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    rotationCircle.setAttribute("cx", 0);
    rotationCircle.setAttribute("cy", -rotationHeight);
    rotationCircle.setAttribute("r", 1);
    rotationCircle.setAttribute("fill", "#6f0cc6");
    rocket.appendChild(rotationCircle);

    let leftEnd = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    leftEnd.setAttribute("x", (-1 * (rocketWidth/2)) - 5);
    leftEnd.setAttribute("y", -13);
    leftEnd.setAttribute("width", 6);
    leftEnd.setAttribute("height", 13);
    leftEnd.setAttribute("fill", "#16162a");
    rocket.appendChild(leftEnd);
 
    let rightEnd = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rightEnd.setAttribute("x", rocketWidth/2 - 1);
    rightEnd.setAttribute("y", -13);
    rightEnd.setAttribute("width", 6);
    rightEnd.setAttribute("height", 13);
    rightEnd.setAttribute("fill", "#16162a");
    rocket.appendChild(rightEnd);
 
    if (simulator.rocket.engine_throttle > 0){
        let flame = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        let flamePts = (-rocketWidth/2) + "," + (0) + " " + 
                     (0) + "," + (0 + rocketHeight / 4) + " " + 
                     (rocketWidth/2) + "," + (0);
        flame.setAttribute("points", flamePts);
        flame.setAttribute("fill", "#ffa500");
        rocket.appendChild(flame);
    }
 
    if (simulator.rocket.left_thruster_on){
        let leftThruster = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        let ltPts = (-rocketWidth / 2) + "," + (0 - thrusterHeight - 4) + " " +
                     (-rocketWidth / 2) + "," + (0 - thrusterHeight + 4) + " " +
                     (-rocketWidth / 2 - 8) + "," + (0 - thrusterHeight);
        leftThruster.setAttribute("points", ltPts);
        leftThruster.setAttribute("fill", "#ffa500");
        rocket.appendChild(leftThruster);
    }
 
    if (simulator.rocket.right_thruster_on){
        let rightThruster = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        let rtPts = (rocketWidth / 2) + "," + (0 - thrusterHeight - 4) + " " +
                     (rocketWidth / 2) + "," + (0 - thrusterHeight + 4) + " " +
                     (rocketWidth / 2 + 8) + "," + (0 - thrusterHeight);
        rightThruster.setAttribute("points", rtPts);
        rightThruster.setAttribute("fill", "#ffa500");
        rocket.appendChild(rightThruster);
    }

    return rocket;
}

function placePlatforms(){
    let platforms = document.createElementNS("http://www.w3.org/2000/svg", "g");
    let startOffset = simulator.launchpad_offset;
    let landOffset = simulator.land_offset;

    // --- GRASS ---
    let grass = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    grass.setAttribute("x", 0);
    grass.setAttribute("y", svgHeight - launchpadHeight);
    grass.setAttribute("width", svgWidth);
    grass.setAttribute("height", launchpadHeight);
    grass.setAttribute("fill", "#2d8a2d"); // Grass green
    platforms.appendChild(grass);

    // --- BUILDINGS (Obstacles) ---
    if (simulator.rocket.buildings) {
        for (let b of simulator.rocket.buildings) {
            let bX = centerX + b.x - b.w / 2;
            let bY = centerY - b.h - launchpadHeight;

            // Building body
            let building = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            building.setAttribute("x", bX);
            building.setAttribute("y", bY);
            building.setAttribute("width", b.w);
            building.setAttribute("height", b.h);
            
            let color = "#4a4a4a"; // Default gray
            if (b.type === 'office') color = "#33475b";
            if (b.type === 'family_house') color = "#d2b48c"; // Tan/Beige
            
            building.setAttribute("fill", color);
            building.setAttribute("stroke", "#000000");
            building.setAttribute("stroke-width", "2");
            platforms.appendChild(building);

            if (b.type === 'apartment' || b.type === 'family_house') {
                // Triangle Roof
                let roof = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                let roofHeight = b.type === 'family_house' ? 30 : 40;
                let roofPoints = (bX - 5) + "," + bY + " " + 
                                 (bX + b.w / 2) + "," + (bY - roofHeight) + " " + 
                                 (bX + b.w + 5) + "," + bY;
                roof.setAttribute("points", roofPoints);
                roof.setAttribute("fill", b.type === 'family_house' ? "#8b4513" : "#8B0000"); 
                roof.setAttribute("stroke", "#000000");
                roof.setAttribute("stroke-width", "2");
                platforms.appendChild(roof);

                // Brown Door
                let doorW = b.type === 'family_house' ? 15 : 20;
                let doorH = b.type === 'family_house' ? 25 : 30;
                let door = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                door.setAttribute("x", bX + (b.w - doorW) / 2);
                door.setAttribute("y", bY + b.h - doorH);
                door.setAttribute("width", doorW);
                door.setAttribute("height", doorH);
                door.setAttribute("fill", "#5d4037");
                door.setAttribute("stroke", "#000000");
                platforms.appendChild(door);
            } else if (b.type === 'office') {
                // Office Roof (Flat/Mechanical)
                let mech = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                mech.setAttribute("x", bX + b.w * 0.2);
                mech.setAttribute("y", bY - 10);
                mech.setAttribute("width", b.w * 0.6);
                mech.setAttribute("height", 10);
                mech.setAttribute("fill", "#2c3e50");
                mech.setAttribute("stroke", "#000000");
                platforms.appendChild(mech);

                // Blue Glass Double Door
                let doorW = 35, doorH = 25;
                let doorX = bX + (b.w - doorW) / 2;
                let doorY = bY + b.h - doorH;
                
                let door = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                door.setAttribute("x", doorX);
                door.setAttribute("y", doorY);
                door.setAttribute("width", doorW);
                door.setAttribute("height", doorH);
                door.setAttribute("fill", "#add8e6"); // Glass blue
                door.setAttribute("stroke", "#000000");
                door.setAttribute("stroke-width", "2");
                platforms.appendChild(door);

                // Middle line for double door
                let line = document.createElementNS("http://www.w3.org/2000/svg", "line");
                line.setAttribute("x1", doorX + doorW/2);
                line.setAttribute("y1", doorY);
                line.setAttribute("x2", doorX + doorW/2);
                line.setAttribute("y2", doorY + doorH);
                line.setAttribute("stroke", "#000000");
                line.setAttribute("stroke-width", "1.5");
                platforms.appendChild(line);
            }

            // Windows (Aligned based on type)
            if (b.type !== 'family_house') {
                let winW = 10, winH = 15;
                let paddingX = 15, paddingY = 20;
                let cols = b.type === 'office' ? 4 : 3;
                let horizontalSpacing = (b.w - (2 * paddingX) - (cols * winW)) / (cols - 1);
                let bottomMargin = b.type === 'apartment' ? 30 : 15;
                
                for (let wy = bY + paddingY; wy < bY + b.h - paddingY - bottomMargin; wy += winH + paddingY) {
                    for (let i = 0; i < cols; i++) {
                        let wx = bX + paddingX + i * (winW + horizontalSpacing);
                        let win = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                        win.setAttribute("x", wx);
                        win.setAttribute("y", wy);
                        win.setAttribute("width", winW);
                        win.setAttribute("height", winH);
                        win.setAttribute("fill", b.type === 'office' ? "#add8e6" : "#ffff99");
                        win.setAttribute("stroke", "#000000");
                        platforms.appendChild(win);
                    }
                }
            } else {
                // Family house windows (fewer, larger)
                let winW = 15, winH = 15;
                let winY = bY + 20;
                [bX + 10, bX + b.w - 25].forEach(wx => {
                    let win = document.createElementNS("http://www.w3.org/2000/svg", "rect");
                    win.setAttribute("x", wx);
                    win.setAttribute("y", winY);
                    win.setAttribute("width", winW);
                    win.setAttribute("height", winH);
                    win.setAttribute("fill", "#ffff99");
                    win.setAttribute("stroke", "#000000");
                    platforms.appendChild(win);
                });
            }
        }
    }

    let startPlatform = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    startPlatform.setAttribute("x", startOffset - launchpadWidth/2); // centered properly
    startPlatform.setAttribute("y", svgHeight - launchpadHeight);
    startPlatform.setAttribute("width", launchpadWidth);
    startPlatform.setAttribute("height", launchpadHeight);
    startPlatform.setAttribute("fill", "#ff00ff");
    startPlatform.setAttribute("stroke", "#000000");
    startPlatform.setAttribute("stroke-width", "1");
    platforms.appendChild(startPlatform);

    let landPlatform = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    landPlatform.setAttribute("x", svgWidth - landOffset - launchpadWidth/2);
    landPlatform.setAttribute("y", svgHeight - launchpadHeight);
    landPlatform.setAttribute("width", launchpadWidth);
    landPlatform.setAttribute("height", launchpadHeight);
    landPlatform.setAttribute("fill", "#ff00ff");
    landPlatform.setAttribute("stroke", "#000000");
    landPlatform.setAttribute("stroke-width", "1");
    platforms.appendChild(landPlatform);

    return platforms;
}

function placeObjects(x, y, rotation) {
    let existingPlatforms = document.getElementById('platforms');
    if (existingPlatforms) svg.removeChild(existingPlatforms);

    let existingRocket = document.getElementById('rocket');
    if (existingRocket) svg.removeChild(existingRocket);
    
    let platforms = placePlatforms();
    platforms.setAttribute("id", "platforms");
    svg.appendChild(platforms);

    let rocket = drawRocket();
    rocket.setAttribute("id", "rocket");
    let rotationInDegrees = rotation * (180 / Math.PI);
    rocket.setAttribute("transform", "translate(" + x + "," + y + ") rotate(" + rotationInDegrees + " " + 0 + " " + -rotationHeight + ")");
    svg.appendChild(rocket);
}

// --- UI Feedback ---
function infoFunction(info, detailsText, type, bgColor) {
    const infoDisplay = document.getElementById('infoDisplay');
    const infoName = document.getElementById('infoName');
    const infoDetails = document.getElementById('infoDetails');
    const modalContent = document.querySelector('.modal-content');

    infoName.textContent = info;
    infoDetails.innerHTML = detailsText; // Changed from textContent to innerHTML to allow <br>
    
    // Set background color if provided, otherwise default to white
    if (modalContent) {
        modalContent.style.backgroundColor = bgColor || "#fffafa";
    }

    // Show the "Start Game" button only when we are starting/resizing
    if (type === "start") {
        startGameModalBtn.style.display = "inline-block";
    } else {
        startGameModalBtn.style.display = "none";
    }
    
    infoDisplay.style.display = 'block';
}

function hideInfoFunction() {
    document.getElementById('infoDisplay').style.display = 'none';
}

function rocketState() {
    if (simulator.rocket.crashed) {
        infoFunction("Rocket has crashed!", "Press R to try again.", "crash", "#e05f5f"); // Light red
    } else if (simulator.rocket.invalid_landing) {
        infoFunction("Invalid attempt!", "You need to land on the second platform.<br><br>Press R to play again.", "invalid", "#ffe5b4"); // Light orange
    } else if (simulator.rocket.touchdown && !initialPosition) {
        let timeInSeconds = (simulator.framecounter * 0.02).toFixed(2);
        infoFunction("Rocket has landed!", "<span style='font-size: 22px;'>Time: " + timeInSeconds + "s</span><br><br>Great job! Press R to play again.", "touchdown", "#ccffcc"); // Light green
    } else if (!simulationStarted) {
        // Keeps the modal up if the game is paused
    } else {
        hideInfoFunction();
    }
}

// --- Controls ---
const throttleDisplay = document.getElementById('throttle');
const throttleSlider = document.getElementById('throttleSlider');

function updateThrottle(value) {
    const numValue = parseFloat(value).toFixed(1);
    throttleDisplay.textContent = numValue;
    engineThrottle = parseFloat(numValue);
    if(simulator.rocket.engine_throttle > 0) {
        simulator.rocket.engine_throttle = engineThrottle;
    }
}

// Handle slider input
if (throttleSlider) {
    throttleSlider.addEventListener('input', function() {
        updateThrottle(this.value);
    });
}

const leftKey = document.getElementById('left');
const upKey = document.getElementById('up');
const rightKey = document.getElementById('right');
const resetButton = document.getElementById('reset');

// Keyboard mapping
document.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR') {
        resetScene();
    }
    
    let hasLanded = simulator.rocket.touchdown && !initialPosition;
    let isInvalid = simulator.rocket.invalid_landing;

    // Toggle Pause with 'P'
    if (event.code === 'KeyP') {
        if (!simulator.rocket.crashed && !hasLanded && !isInvalid) {
            simulationStarted = !simulationStarted;
            if (!simulationStarted) {
                infoFunction("Game is Paused!", "Press P to continue.", "pause", "#ffe5b4"); // Light orange
            } else {
                hideInfoFunction();
            }
        }
    }

    if (simulationStarted && !simulator.rocket.crashed && !hasLanded && !isInvalid) {
        if (event.code === 'ArrowUp' || event.code === 'KeyW') {
            upKey.classList.add('active');
            simulator.rocket.engine_throttle = engineThrottle;
            event.preventDefault();
        }
        if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
            leftKey.classList.add('active');
            simulator.rocket.right_thruster_on = true;
            event.preventDefault();
        }
        if (event.code === 'ArrowRight' || event.code === 'KeyD') {
            rightKey.classList.add('active');
            simulator.rocket.left_thruster_on = true;
            event.preventDefault();
        }
    }
});

document.addEventListener('keyup', (event) => {
    event.preventDefault();
    if (event.code === 'ArrowUp' || event.code === 'KeyW') {
        upKey.classList.remove('active');
        simulator.rocket.engine_throttle = 0;
    }
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') {
        leftKey.classList.remove('active');
        simulator.rocket.right_thruster_on = false;
    }
    if (event.code === 'ArrowRight' || event.code === 'KeyD') {
        rightKey.classList.remove('active');
        simulator.rocket.left_thruster_on = false;
    }
});

// Mouse mapping (Removed flying controls, kept only Reset button if it exists)
if (resetButton) resetButton.addEventListener('mousedown', resetScene);

// Removed mouse event listeners for upKey, leftKey, and rightKey to disable mouse flying.
// They will still change color via the classList.add('active') in the keydown listener.

// --- Graphs ---
function barGraphs(vx, vy) {
    const svgBarGraph = document.getElementById('svgBarGraph');
    const barWidth = 150, barHeight = 20;
    const barY = (svgBarGraph.clientHeight - barHeight) / 2;
    const graphCenterX = svgBarGraph.clientWidth / 2;
    const barSpacing = barHeight;

    svgBarGraph.innerHTML = '';

    const createText = (text, y) => {
        let t = document.createElementNS("http://www.w3.org/2000/svg", "text");
        t.setAttribute("x", graphCenterX);
        t.setAttribute("y", y);
        t.setAttribute("text-anchor", "middle");
        t.textContent = text;
        return t;
    };

    svgBarGraph.appendChild(createText(vx > 0 ? "vx +" : vx < 0 ? "- vx" : "vx", barY + barSpacing + barHeight + 15));
    svgBarGraph.appendChild(createText(vy > 0 ? "vy +" : vy < 0 ? "- vy" : "vy", barY - barSpacing - 5));

    const drawBar = (val, yPos, colorPos, colorNeg) => {
        let w = Math.min(Math.abs(val) * 5, barWidth / 2);
        let x = val >= 0 ? graphCenterX : graphCenterX - w;
        let rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x);
        rect.setAttribute("y", yPos);
        rect.setAttribute("width", w);
        rect.setAttribute("height", barHeight);
        rect.setAttribute("fill", val >= 0 ? colorPos : colorNeg);
        svgBarGraph.appendChild(rect);
    };

    drawBar(vy, barY - barSpacing, "green", "red");
    drawBar(vx, barY + barSpacing, "DarkGreen", "DarkRed");
}

function svgSpeedArrow(vx, vy) {
    const svgArrow = document.getElementById('svgArrow');
    const w = svgArrow.clientWidth, h = svgArrow.clientHeight;
    const length = Math.sqrt(vx * vx + vy * vy) / 2;
    const headLength = 7;

    let x = w / 2, y = h / 2;
    let endX = x + vx * length, endY = y - vy * length;

    if (vx === 0 && vy === 0) { endX = x; endY = y; }

    const angle = Math.atan2(vy, vx) - Math.PI/2;
    let x1 = endX + headLength * Math.sin(angle - Math.PI / 6);
    let y1 = endY + headLength * Math.cos(angle - Math.PI / 6);
    let x2 = endX + headLength * Math.sin(angle + Math.PI / 6);
    let y2 = endY + headLength * Math.cos(angle + Math.PI / 6);

    svgArrow.innerHTML = '';
    const drawLine = (x1, y1, x2, y2) => {
        let l = document.createElementNS("http://www.w3.org/2000/svg", "line");
        l.setAttribute("x1", x1); l.setAttribute("y1", y1);
        l.setAttribute("x2", x2); l.setAttribute("y2", y2);
        l.setAttribute("stroke", "#252422"); l.setAttribute("stroke-width", "2");
        svgArrow.appendChild(l);
    };
    drawLine(x, y, endX, endY);
    drawLine(endX, endY, x1, y1);
    drawLine(endX, endY, x2, y2);
}

// Start simulation
statusApk.textContent = "Local Physics Engine Running";
setInterval(gameLoop, 20);