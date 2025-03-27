class Tank {
    constructor(x, y, color, controls, isPlayer = true) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.color = color;
        this.angle = 0;
        this.speed = 0;
        this.rotationSpeed = 3;
        this.maxSpeed = 5;
        this.bullets = [];
        this.controls = controls;
        this.health = 100;
        this.isPlayer = isPlayer;
        this.bulletDamage = 10;
        this.bulletSpeed = 10;
        this.reloadSpeed = 500; // milliseconds
        this.lastShootTime = 0;
        this.score = 0;
    }

    update() {
        if (this.isPlayer) {
            // Player controls
            if (keys[this.controls.forward]) {
                this.speed = Math.min(this.speed + 0.2, this.maxSpeed);
            } else if (keys[this.controls.backward]) {
                this.speed = Math.max(this.speed - 0.2, -this.maxSpeed);
            } else {
                this.speed *= 0.95;
            }

            if (keys[this.controls.left]) {
                this.angle -= this.rotationSpeed * (Math.PI / 180);
            }
            if (keys[this.controls.right]) {
                this.angle += this.rotationSpeed * (Math.PI / 180);
            }
        } else {
            // NPC AI behavior
            this.updateAI();
        }

        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;

        this.x = Math.max(this.width/2, Math.min(canvas.width - this.width/2, this.x));
        this.y = Math.max(this.height/2, Math.min(canvas.height - this.height/2, this.y));

        this.bullets = this.bullets.filter(bullet => bullet.isActive());
        this.bullets.forEach(bullet => bullet.update());
    }

    updateAI() {
        // Find nearest player
        const nearestPlayer = players.reduce((nearest, player) => {
            const dist = Math.hypot(player.x - this.x, player.y - this.y);
            return (!nearest || dist < nearest.dist) ? {tank: player, dist: dist} : nearest;
        }, null);

        if (nearestPlayer) {
            // Calculate angle to player
            const dx = nearestPlayer.tank.x - this.x;
            const dy = nearestPlayer.tank.y - this.y;
            const targetAngle = Math.atan2(dx, -dy);
            
            // Rotate towards player
            const angleDiff = (targetAngle - this.angle + Math.PI * 3) % (Math.PI * 2) - Math.PI;
            this.angle += Math.sign(angleDiff) * this.rotationSpeed * (Math.PI / 180);

            // Move towards player while maintaining distance
            if (nearestPlayer.dist > 200) {
                this.speed = Math.min(this.speed + 0.1, this.maxSpeed);
            } else if (nearestPlayer.dist < 150) {
                this.speed = Math.max(this.speed - 0.1, -this.maxSpeed);
            }

            // Shoot at player
            if (Math.abs(angleDiff) < 0.1 && Math.random() < 0.05) {
                this.shoot();
            }
        }

        this.speed *= 0.98; // Apply friction
    }

    shoot() {
        const currentTime = Date.now();
        if (currentTime - this.lastShootTime >= this.reloadSpeed && this.bullets.length < 5) {
            this.bullets.push(new Bullet(
                this.x + Math.sin(this.angle) * this.width,
                this.y - Math.cos(this.angle) * this.width,
                this.angle,
                this.bulletSpeed,
                this.bulletDamage,
                this.isPlayer
            ));
            this.lastShootTime = currentTime;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Draw tank body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Draw tank cannon (now pointing forward)
        ctx.fillStyle = '#333';
        ctx.fillRect(0, -5, this.width/2, 10);
        
        ctx.restore();

        this.bullets.forEach(bullet => bullet.draw(ctx));

        // Draw health bar
        ctx.fillStyle = '#ddd';
        ctx.fillRect(this.x - 25, this.y - 40, 50, 5);
        ctx.fillStyle = this.health > 50 ? '#4CAF50' : '#f44336';
        ctx.fillRect(this.x - 25, this.y - 40, (this.health/100) * 50, 5);
    }

    applyUpgrade(type) {
        switch(type) {
            case 'damage':
                this.bulletDamage += 5;
                break;
            case 'speed':
                this.maxSpeed += 1;
                break;
            case 'reload':
                this.reloadSpeed = Math.max(100, this.reloadSpeed - 50);
                break;
            case 'health':
                this.health = Math.min(100, this.health + 30);
                break;
        }
    }
}

class Bullet {
    constructor(x, y, angle, speed, damage, isPlayerBullet) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = speed;
        this.size = 4;
        this.active = true;
        this.distanceTraveled = 0;
        this.maxDistance = 500;
        this.damage = damage;
        this.isPlayerBullet = isPlayerBullet;
    }

    update() {
        this.x += Math.sin(this.angle) * this.speed;
        this.y -= Math.cos(this.angle) * this.speed;
        this.distanceTraveled += this.speed;
        
        if (this.distanceTraveled > this.maxDistance || 
            this.x < 0 || this.x > canvas.width ||
            this.y < 0 || this.y > canvas.height) {
            this.active = false;
        }
    }

    isActive() {
        return this.active;
    }

    draw(ctx) {
        ctx.fillStyle = this.isPlayerBullet ? '#333' : '#f44336';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game controls
const keys = {};
const controls = {
    player1: {
        forward: 'w',
        backward: 's',
        left: 'a',
        right: 'd',
        shoot: ' '
    },
    player2: {
        forward: 'ArrowUp',
        backward: 'ArrowDown',
        left: 'ArrowLeft',
        right: 'ArrowRight',
        shoot: 'Enter'
    }
};

// Game state
let gameMode = 'menu'; // 'menu', 'pvp', 'coop', 'upgrade'
let wave = 1;
let enemies = [];
let players = [];
let upgradeOptions = [];
const WAVE_ENEMY_COUNT = 3;

// Create players
const tank1 = new Tank(100, canvas.height/2, '#2196F3', controls.player1);
const tank2 = new Tank(canvas.width - 100, canvas.height/2, '#FF5722', controls.player2);
players = [tank1, tank2];

function spawnEnemies() {
    for (let i = 0; i < WAVE_ENEMY_COUNT + Math.floor(wave/2); i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() < 0.5 ? -50 : canvas.height + 50;
        enemies.push(new Tank(x, y, '#E91E63', null, false));
    }
}

function generateUpgrades() {
    const upgrades = [
        { type: 'damage', name: 'Increased Damage' },
        { type: 'speed', name: 'Faster Movement' },
        { type: 'reload', name: 'Faster Reload' },
        { type: 'health', name: 'Health Restore' }
    ];
    upgradeOptions = upgrades.sort(() => Math.random() - 0.5).slice(0, 3);
}

// Input handling
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
    if (gameMode === 'menu') {
        if (e.key === '1') gameMode = 'pvp';
        if (e.key === '2') {
            gameMode = 'coop';
            spawnEnemies();
        }
    } else if (gameMode === 'upgrade') {
        if (e.key >= '1' && e.key <= '3') {
            const upgradeIndex = parseInt(e.key) - 1;
            if (upgradeIndex < upgradeOptions.length) {
                players.forEach(player => player.applyUpgrade(upgradeOptions[upgradeIndex].type));
                gameMode = 'coop';
                wave++;
                spawnEnemies();
            }
        }
    }
    if (e.key === controls.player1.shoot) tank1.shoot();
    if (e.key === controls.player2.shoot) tank2.shoot();
    e.preventDefault();
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
    e.preventDefault();
});

function checkCollisions() {
    // Player bullets hitting enemies
    players.forEach(player => {
        player.bullets.forEach(bullet => {
            enemies.forEach(enemy => {
                if (checkBulletCollision(bullet, enemy)) {
                    bullet.active = false;
                    enemy.health -= bullet.damage;
                    if (enemy.health <= 0) {
                        player.score += 100;
                    }
                }
            });
        });
    });

    // Enemy bullets hitting players
    enemies.forEach(enemy => {
        enemy.bullets.forEach(bullet => {
            players.forEach(player => {
                if (checkBulletCollision(bullet, player)) {
                    bullet.active = false;
                    player.health -= bullet.damage;
                }
            });
        });
    });
}

function checkBulletCollision(bullet, tank) {
    const dx = bullet.x - tank.x;
    const dy = bullet.y - tank.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < tank.width/2;
}

function drawMenu() {
    ctx.fillStyle = '#333';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Tank Battle', canvas.width/2, canvas.height/2 - 50);
    ctx.font = '24px Arial';
    ctx.fillText('Press 1 for PvP Mode', canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('Press 2 for Co-op Mode', canvas.width/2, canvas.height/2 + 60);
}

function drawUpgradeScreen() {
    ctx.fillStyle = '#333';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Wave ' + wave + ' Completed!', canvas.width/2, canvas.height/3);
    ctx.fillText('Choose an upgrade (1-3):', canvas.width/2, canvas.height/3 + 50);
    
    upgradeOptions.forEach((upgrade, index) => {
        ctx.font = '24px Arial';
        ctx.fillText((index + 1) + '. ' + upgrade.name, canvas.width/2, canvas.height/2 + index * 40);
    });
}

function gameLoop() {
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameMode === 'menu') {
        drawMenu();
    } else if (gameMode === 'upgrade') {
        drawUpgradeScreen();
    } else {
        // Update and draw players
        players.forEach(player => {
            if (player.health > 0) {
                player.update();
                player.draw(ctx);
            }
        });

        if (gameMode === 'coop') {
            // Update and draw enemies
            enemies = enemies.filter(enemy => enemy.health > 0);
            enemies.forEach(enemy => {
                enemy.update();
                enemy.draw(ctx);
            });

            checkCollisions();

            // Check if wave is complete
            if (enemies.length === 0) {
                gameMode = 'upgrade';
                generateUpgrades();
            }
        }

        // Draw scores and wave info
        ctx.fillStyle = '#333';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Player 1: ${tank1.score}`, 20, 30);
        ctx.fillText(`Player 2: ${tank2.score}`, canvas.width - 150, 30);
        
        if (gameMode === 'coop') {
            ctx.textAlign = 'center';
            ctx.fillText(`Wave ${wave} - Enemies: ${enemies.length}`, canvas.width/2, 30);
        }

        // Check for game over
        if (gameMode === 'pvp' && (tank1.health <= 0 || tank2.health <= 0)) {
            const winner = tank1.health <= 0 ? 'Player 2' : 'Player 1';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${winner} Wins!`, canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText('Press R to restart', canvas.width/2, canvas.height/2 + 50);
            return;
        } else if (gameMode === 'coop' && players.every(p => p.health <= 0)) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width/2, canvas.height/2);
            ctx.font = '24px Arial';
            ctx.fillText(`Wave ${wave} - Final Score: ${players.reduce((sum, p) => sum + p.score, 0)}`, canvas.width/2, canvas.height/2 + 50);
            return;
        }
    }

    requestAnimationFrame(gameLoop);
}

// Start the game
gameLoop(); 