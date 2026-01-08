import TileMap from './TileMap.js';
import Pacman from './Pacman.js';
import Ghost from './Ghost.js';
import InputManager from './InputManager.js';
import Leaderboard from './Leaderboard.js';
// Reusing global SoundManager for simplicity
const SoundManager = {
    ctx: null,
    init: function () {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },
    resume: function () {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },
    playTone: function (freq, type, duration) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },
    playStart: function () {
        this.init(); this.resume();
        this.playTone(600, 'square', 0.1);
        setTimeout(() => this.playTone(800, 'square', 0.2), 100);
    },
    playEat: function () {
        if (!this.ctx) return;
        this.playTone(400, 'sine', 0.05);
    },
    playPowerUp: function () {
        this.init(); this.resume();
        this.playTone(300, 'sawtooth', 0.1);
        setTimeout(() => this.playTone(500, 'sawtooth', 0.1), 100);
        setTimeout(() => this.playTone(800, 'sawtooth', 0.2), 200);
    },
    playDie: function () {
        this.playTone(200, 'sawtooth', 0.5);
        setTimeout(() => this.playTone(100, 'sawtooth', 0.5), 400);
    }
};
export default class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreEl = document.getElementById('score');
        // UI Elements
        this.startScreen = document.getElementById('start-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.leaderboardList = document.getElementById('leaderboard-list');
        // Buttons
        document.getElementById('btn-start').onclick = () => this.startGame();
        document.getElementById('btn-leaderboard').onclick = () => this.showLeaderboard();
        document.getElementById('btn-restart').onclick = () => this.resetToMenu();
        document.getElementById('btn-submit').onclick = () => this.submitScore();
        document.getElementById('btn-back').onclick = () => this.resetToMenu();
        // Managers
        this.tileSize = 32;
        this.tileMap = new TileMap(this.tileSize);
        this.pacman = new Pacman(this.tileSize, this.tileMap);
        this.ghosts = [];
        this.inputManager = new InputManager(); // Initialize Touch
        this.leaderboard = new Leaderboard();
        this.score = 0;
        this.state = 'MENU'; // MENU, PLAYING, GAMEOVER
        this.resizeCanvas();
        document.addEventListener('score', (e) => {
            this.score += e.detail;
            this.scoreEl.innerText = this.score;
            SoundManager.playEat();
        });
        document.addEventListener('power', (e) => {
            this.score += e.detail;
            this.scoreEl.innerText = this.score;
            SoundManager.playPowerUp();
            this.ghosts.forEach(g => g.makeScared());
        });
        // Load Leaderboard on Init
        this.fetchMiniLeaderboard();
        this.gameLoop();
    }
    // Fetch and display a mini ranking on the start screen if desired
    async fetchMiniLeaderboard() {
        console.log("Fetching global scores...");
        const scores = await this.leaderboard.getScores();
        console.log("Top scores:", scores);
    }
    resizeCanvas() {
        // Maintain Aspect Ratio but fit width
        // Pacman standard resolution or just grid based
        this.canvas.width = this.tileMap.map[0].length * this.tileSize;
        this.canvas.height = this.tileMap.map.length * this.tileSize;
    }
    resetToMenu() {
        this.state = 'MENU';
        this.hideAllOverlays();
        this.startScreen.classList.add('visible');
        // Refresh scores when returning to menu
        this.fetchMiniLeaderboard();
    }
    startGame() {
        SoundManager.playStart();
        this.state = 'PLAYING';
        this.score = 0;
        this.scoreEl.innerText = this.score;
        this.hideAllOverlays();
        this.tileMap.reset();
        this.pacman.reset();
        const spawns = this.tileMap.getGhostSpawns();
        const s1 = spawns[0] || { x: 1, y: 1 };
        const s2 = spawns[1] || { x: 19, y: 1 };
        const s3 = spawns[2] || { x: 1, y: 19 };
        const s4 = spawns[3] || { x: 19, y: 19 };
        this.ghosts = [
            new Ghost(this.tileSize, this.tileMap, 'red', s1.x, s1.y),
            new Ghost(this.tileSize, this.tileMap, 'pink', s2.x, s2.y),
            new Ghost(this.tileSize, this.tileMap, 'cyan', s3.x, s3.y),
            new Ghost(this.tileSize, this.tileMap, 'orange', s4.x, s4.y)
        ];
    }
    hideAllOverlays() {
        document.querySelectorAll('.overlay').forEach(el => el.classList.remove('visible'));
    }
    gameOver() {
        this.state = 'GAMEOVER';
        SoundManager.playDie();
        this.hideAllOverlays();
        this.gameoverScreen.classList.add('visible');
        document.getElementById('final-score').innerText = `Score: ${this.score}`;
    }
    async showLeaderboard() {
        this.hideAllOverlays();
        this.leaderboardScreen.classList.add('visible');
        this.leaderboardList.innerHTML = '<li>Loading Global Scores...</li>';
        const scores = await this.leaderboard.getScores();
        this.renderLeaderboard(scores);
    }
    async submitScore() {
        const nameInput = document.getElementById('player-name');
        const name = nameInput.value || "Anonymous";
        nameInput.disabled = true;
        document.getElementById('btn-submit').innerText = "Submitting to Cloud...";
        await this.leaderboard.submitScore(name, this.score);
        nameInput.disabled = false;
        document.getElementById('btn-submit').innerText = "SUBMIT SCORE";
        nameInput.value = "";
        this.showLeaderboard();
    }
    renderLeaderboard(scores) {
        this.leaderboardList.innerHTML = '';
        if (scores.length === 0) {
            this.leaderboardList.innerHTML = '<li>No scores yet / Offline</li>';
            return;
        }
        scores.forEach((s, i) => {
            const li = document.createElement('li');
            li.innerHTML = `<span>#${i + 1} ${s.name}</span><span>${s.score}</span>`;
            this.leaderboardList.appendChild(li);
        });
    }
    gameLoop() {
        if (this.state === 'PLAYING') {
            this.update();
            this.draw();
        } else {
            // Draw pure black background or pause screen behind overlays
            // Optional: Draw last frame dimmed
            this.draw();
        }
        requestAnimationFrame(() => this.gameLoop());
    }
    update() {
        this.pacman.update(this.ghosts);
        this.ghosts.forEach(ghost => ghost.update(this.pacman));
        this.checkCollisions();
        if (this.tileMap.didWin()) {
            this.gameOver(); // Reuse game over flow for now, or add Win specific
        }
    }
    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.tileMap.draw(this.ctx);
        this.pacman.draw(this.ctx);
        this.ghosts.forEach(ghost => {
            if (!ghost.dead) ghost.draw(this.ctx);
        });
    }
    checkCollisions() {
        const pacCenter = { x: this.pacman.x + 16, y: this.pacman.y + 16 };
        this.ghosts.forEach(ghost => {
            if (ghost.dead) return;
            const ghostCenter = { x: ghost.x + 16, y: ghost.y + 16 };
            const dist = Math.hypot(pacCenter.x - ghostCenter.x, pacCenter.y - ghostCenter.y);
            // Fixed Collision Radius: 30px
            if (dist < 30) {
                if (ghost.scared) {
                    this.score += 200;
                    this.scoreEl.innerText = this.score;
                    SoundManager.playEat();
                    SoundManager.playPowerUp();
                    ghost.die();
                } else {
                    this.gameOver();
                }
            }
        });
    }
}
const game = new Game();