import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ===== Zombie 類別 =====
class Zombie {
    constructor(columnIndex, y, speed) {
        this.columnIndex = columnIndex; // 0, 1, 2 (left, center, right)
        this.y = y;
        this.speed = speed; // pixels per second
        this.isAlive = true;
        this.size = 50; // zombie size
    }
}

// ===== ShotZombie 遊戲類別 =====
class ShotZombieGame {
    constructor() {
        console.log('🚀 Creating ShotZombie Game...');

        // 遊戲狀態
        this.gameState = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeLeft = 60; // seconds
        this.zombies = [];
        this.lastSpawnTime = 0;
        this.spawnInterval = 900; // ms
        this.lastFrameTime = 0;

        // Canvas 設定
        this.canvas = document.getElementById('game-canvas');
        if (!this.canvas) {
            console.error('Canvas not found!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvasWidth = 360;
        this.canvasHeight = 640;
        this.columnCount = 3;
        this.columnWidth = this.canvasWidth / this.columnCount;
        this.bottomLine = this.canvasHeight - 80; // 底線位置

        // DOM 元素
        this.menuScreen = document.getElementById('menu-screen');
        this.gameScreen = document.getElementById('game-screen');
        this.gameoverScreen = document.getElementById('gameover-screen');
        this.leaderboardScreen = document.getElementById('leaderboard-screen');
        this.scoreElement = document.getElementById('score');
        this.comboElement = document.getElementById('combo');
        this.comboDisplay = document.getElementById('combo-display');
        this.timeLeftElement = document.getElementById('time-left');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalComboElement = document.getElementById('final-combo');
        this.playerNameInput = document.getElementById('player-name');
        this.hitSound = document.getElementById('hit-sound');

        // 圖片資源
        this.zombieImg = new Image();
        this.zombieImg.src = 'suyu.jpg';

        // Firebase (may fail, that's OK)
        try {
            this.database = getDatabase();
            this.leaderboardRef = ref(this.database, 'shotzombie-leaderboard');
        } catch (error) {
            console.warn('Firebase not available:', error);
            this.database = null;
            this.leaderboardRef = null;
        }

        this.isLocalMode = true;
        this.localLeaderboard = [];
        this.onlineLeaderboard = [];

        this.init();
    }

    init() {
        console.log('🎮 ShotZombie Game Initializing...');

        // 按鈕事件
        const startBtn = document.getElementById('start-button');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                console.log('Start button clicked');
                this.startGame();
            });
        }

        const leaderboardBtn = document.getElementById('show-leaderboard');
        if (leaderboardBtn) {
            leaderboardBtn.addEventListener('click', () => this.showLeaderboard());
        }

        const submitBtn = document.getElementById('submit-score');
        if (submitBtn) {
            submitBtn.addEventListener('click', () => this.submitScore());
        }

        const playAgainBtn = document.getElementById('play-again');
        if (playAgainBtn) {
            playAgainBtn.addEventListener('click', () => this.restartGame());
        }

        const backBtn = document.getElementById('back-to-menu');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.showMenu());
        }

        const pauseBtn = document.getElementById('pause-button');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.togglePause());
        }

        // 射擊按鈕
        const shotButtons = document.querySelectorAll('.shot-button');
        console.log(`Found ${shotButtons.length} shot buttons`);
        shotButtons.forEach((btn, index) => {
            btn.addEventListener('click', (e) => {
                const column = parseInt(e.currentTarget.getAttribute('data-column'));
                console.log(`Shot button ${column} clicked`);
                this.handleShot(column);
            });
        });

        // 排行榜切換
        const localBtn = document.getElementById('local-btn');
        const onlineBtn = document.getElementById('online-btn');
        if (localBtn) localBtn.addEventListener('click', () => this.switchLeaderboard(true));
        if (onlineBtn) onlineBtn.addEventListener('click', () => this.switchLeaderboard(false));

        // 載入排行榜
        this.loadLocalLeaderboard();

        // Firebase 可能失敗，不阻塞遊戲
        try {
            this.startOnlineLeaderboardListener();
        } catch (error) {
            console.warn('Firebase initialization failed, using local leaderboard only', error);
        }

        // 繪製初始畫面
        this.drawLanes();

        console.log('✅ Game initialized successfully');
    }

    // ===== 畫面切換 =====
    showScreen(screen) {
        this.menuScreen.classList.add('hidden');
        this.gameScreen.classList.add('hidden');
        this.gameoverScreen.classList.add('hidden');
        this.leaderboardScreen.classList.add('hidden');
        screen.classList.remove('hidden');
    }

    showMenu() {
        this.showScreen(this.menuScreen);
        this.gameState = 'menu';
    }

    showLeaderboard() {
        this.showScreen(this.leaderboardScreen);
        this.displayLeaderboard();
    }

    // ===== 遊戲開始 =====
    startGame() {
        this.showScreen(this.gameScreen);
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeLeft = 60;
        this.zombies = [];
        this.lastSpawnTime = 0;
        this.lastFrameTime = performance.now();
        this.updateUI();
        this.gameLoop();
    }

    restartGame() {
        this.startGame();
    }

    togglePause() {
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            document.getElementById('pause-button').textContent = '▶️';
        } else if (this.gameState === 'paused') {
            this.gameState = 'playing';
            document.getElementById('pause-button').textContent = '⏸️';
            this.lastFrameTime = performance.now();
            this.gameLoop();
        }
    }

    // ===== 主遊戲循環 =====
    gameLoop() {
        if (this.gameState !== 'playing') return;

        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastFrameTime) / 1000; // convert to seconds
        this.lastFrameTime = currentTime;

        // 更新時間
        this.timeLeft -= deltaTime;
        if (this.timeLeft <= 0) {
            this.endGame();
            return;
        }

        // 生成殭屍
        if (currentTime - this.lastSpawnTime > this.spawnInterval) {
            this.spawnZombie();
            this.lastSpawnTime = currentTime;
        }

        // 更新殭屍位置
        this.updateZombies(deltaTime);

        // 檢查殭屍是否到達底線
        this.checkZombiesReachBottom();

        // 繪製畫面
        this.draw();

        // 更新UI
        this.updateUI();

        // 繼續循環
        requestAnimationFrame(() => this.gameLoop());
    }

    // ===== 殭屍生成 =====
    spawnZombie() {
        const columnIndex = Math.floor(Math.random() * this.columnCount);
        const speed = 80 + Math.random() * 40; // 80-120 px/s
        const zombie = new Zombie(columnIndex, 0, speed);
        this.zombies.push(zombie);
    }

    // ===== 更新殭屍 =====
    updateZombies(deltaTime) {
        this.zombies.forEach(zombie => {
            if (zombie.isAlive) {
                zombie.y += zombie.speed * deltaTime;
            }
        });
    }

    // ===== 檢查殭屍到達底線 =====
    checkZombiesReachBottom() {
        this.zombies.forEach(zombie => {
            if (zombie.isAlive && zombie.y >= this.bottomLine) {
                zombie.isAlive = false;
                // 扣時間
                this.timeLeft = Math.max(0, this.timeLeft - 2);
                // 顯示懲罰效果
                this.showPenalty(zombie.columnIndex);
            }
        });

        // 移除已死亡且超出畫面的殭屍
        this.zombies = this.zombies.filter(z => z.isAlive || z.y < this.canvasHeight + 100);
    }

    // ===== 找出全域最接近底線的殭屍 =====
    getGlobalNearestZombie() {
        let nearest = null;
        let minDistance = Infinity;

        this.zombies.forEach(zombie => {
            if (!zombie.isAlive) return;
            const distance = this.bottomLine - zombie.y;
            if (distance >= 0 && distance < minDistance) {
                minDistance = distance;
                nearest = zombie;
            }
        });

        return nearest;
    }

    // ===== 找出指定欄位最接近底線的殭屍 =====
    getColumnNearestZombie(columnIndex) {
        let nearest = null;
        let minDistance = Infinity;

        this.zombies.forEach(zombie => {
            if (!zombie.isAlive || zombie.columnIndex !== columnIndex) return;
            const distance = this.bottomLine - zombie.y;
            if (distance >= 0 && distance < minDistance) {
                minDistance = distance;
                nearest = zombie;
            }
        });

        return nearest;
    }

    // ===== 射擊處理 =====
    handleShot(columnIndex) {
        if (this.gameState !== 'playing') return;

        // 找出全域最近的殭屍
        const globalNearest = this.getGlobalNearestZombie();
        if (!globalNearest) {
            // 沒有殭屍，視為miss
            this.miss(columnIndex);
            return;
        }

        // 找出該欄最近的殭屍
        const columnNearest = this.getColumnNearestZombie(columnIndex);
        if (!columnNearest) {
            // 該欄沒有殭屍，miss
            this.miss(columnIndex);
            return;
        }

        // 判斷是否命中
        if (globalNearest === columnNearest && globalNearest.columnIndex === columnIndex) {
            this.hit(columnNearest, columnIndex);
        } else {
            this.miss(columnIndex);
        }
    }

    // ===== 命中 =====
    hit(zombie, columnIndex) {
        // 消除殭屍
        zombie.isAlive = false;

        // 播放音效
        this.hitSound.currentTime = 0;
        this.hitSound.play().catch(() => {});

        // 增加combo
        this.combo++;
        this.maxCombo = Math.max(this.maxCombo, this.combo);

        // 計算倍率
        const multiplier = 1 + Math.floor(this.combo / 5) * 0.5;

        // 增加分數
        const points = Math.floor(10 * multiplier);
        this.score += points;

        // 顯示命中效果
        this.showHitEffect(columnIndex, points);

        // 更新combo顯示
        if (this.combo > 0) {
            this.comboDisplay.classList.add('active');
        }
    }

    // ===== 失誤 =====
    miss(columnIndex) {
        // 扣分
        this.score = Math.max(0, this.score - 5);

        // 清空combo
        this.combo = 0;
        this.comboDisplay.classList.remove('active');

        // 顯示miss效果
        this.showMissEffect(columnIndex);
    }

    // ===== 顯示命中效果 =====
    showHitEffect(columnIndex, points) {
        const button = document.querySelector(`.shot-button[data-column="${columnIndex}"]`);
        button.classList.add('hit');
        setTimeout(() => button.classList.remove('hit'), 200);

        // 顯示分數飄字
        this.showFloatingText(columnIndex, `+${points}`, '#00ff00');
    }

    // ===== 顯示失誤效果 =====
    showMissEffect(columnIndex) {
        const button = document.querySelector(`.shot-button[data-column="${columnIndex}"]`);
        button.classList.add('miss');
        setTimeout(() => button.classList.remove('miss'), 200);

        // 顯示失誤飄字
        this.showFloatingText(columnIndex, 'MISS!', '#ff0000');
    }

    // ===== 顯示懲罰效果 =====
    showPenalty(columnIndex) {
        this.showFloatingText(columnIndex, '-2s', '#ff6600');
    }

    // ===== 顯示飄字 =====
    showFloatingText(columnIndex, text, color) {
        const x = (columnIndex + 0.5) * this.columnWidth;
        const y = this.bottomLine;

        const textElement = document.createElement('div');
        textElement.className = 'floating-text';
        textElement.textContent = text;
        textElement.style.left = x + 'px';
        textElement.style.top = y + 'px';
        textElement.style.color = color;

        const container = document.querySelector('.canvas-container');
        container.appendChild(textElement);

        setTimeout(() => textElement.remove(), 1000);
    }

    // ===== 繪製 =====
    draw() {
        // 清空畫面
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

        // 繪製欄位分隔線
        this.drawLanes();

        // 繪製底線
        this.drawBottomLine();

        // 繪製殭屍
        this.drawZombies();

        // 標記最接近的殭屍
        this.highlightNearestZombie();
    }

    drawLanes() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.lineWidth = 2;

        for (let i = 1; i < this.columnCount; i++) {
            const x = i * this.columnWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }
    }

    drawBottomLine() {
        const gradient = this.ctx.createLinearGradient(0, this.bottomLine - 10, 0, this.bottomLine + 10);
        gradient.addColorStop(0, 'rgba(255, 0, 0, 0)');
        gradient.addColorStop(0.5, 'rgba(255, 0, 0, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, this.bottomLine - 10, this.canvasWidth, 20);
    }

    drawZombies() {
        this.zombies.forEach(zombie => {
            if (!zombie.isAlive) return;

            const x = (zombie.columnIndex + 0.5) * this.columnWidth;
            const y = zombie.y;

            // 繪製殭屍
            this.ctx.save();
            this.ctx.translate(x, y);

            // 殭屍圓形邊框
            this.ctx.beginPath();
            this.ctx.arc(0, 0, zombie.size / 2, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(139, 0, 0, 0.8)';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            this.ctx.clip();

            // 繪製殭屍圖片
            this.ctx.drawImage(
                this.zombieImg,
                -zombie.size / 2,
                -zombie.size / 2,
                zombie.size,
                zombie.size
            );

            this.ctx.restore();
        });
    }

    highlightNearestZombie() {
        const nearest = this.getGlobalNearestZombie();
        if (!nearest) return;

        const x = (nearest.columnIndex + 0.5) * this.columnWidth;
        const y = nearest.y;

        // 繪製高亮圈
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, nearest.size / 2 + 5, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
        this.ctx.restore();

        // 繪製指示箭頭
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        this.ctx.font = 'bold 30px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('▼', x, this.bottomLine + 40);
        this.ctx.restore();
    }

    // ===== 更新UI =====
    updateUI() {
        this.scoreElement.textContent = this.score;
        this.comboElement.textContent = this.combo;
        this.timeLeftElement.textContent = Math.ceil(this.timeLeft);
    }

    // ===== 遊戲結束 =====
    endGame() {
        this.gameState = 'gameover';
        this.finalScoreElement.textContent = this.score;
        this.finalComboElement.textContent = this.maxCombo;
        this.showScreen(this.gameoverScreen);
    }

    // ===== 排行榜 =====
    switchLeaderboard(isLocal) {
        this.isLocalMode = isLocal;
        document.getElementById('local-btn').classList.toggle('active', isLocal);
        document.getElementById('online-btn').classList.toggle('active', !isLocal);
        this.displayLeaderboard();
    }

    loadLocalLeaderboard() {
        const saved = localStorage.getItem('shotzombieLeaderboard');
        this.localLeaderboard = saved ? JSON.parse(saved) : [];
    }

    startOnlineLeaderboardListener() {
        if (!this.database || !this.leaderboardRef) {
            console.warn('Firebase not available, skipping online leaderboard');
            return;
        }

        try {
            const leaderboardQuery = query(
                this.leaderboardRef,
                orderByChild('score'),
                limitToLast(10)
            );

            onValue(leaderboardQuery, (snapshot) => {
                this.onlineLeaderboard = [];
                snapshot.forEach((childSnapshot) => {
                    this.onlineLeaderboard.push(childSnapshot.val());
                });
                this.onlineLeaderboard.sort((a, b) => b.score - a.score);
            });
        } catch (error) {
            console.error('Failed to setup online leaderboard listener:', error);
        }
    }

    displayLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        const currentLeaderboard = this.isLocalMode ?
            this.localLeaderboard.slice(0, 10) :
            this.onlineLeaderboard.slice(0, 10);

        list.innerHTML = '';

        currentLeaderboard.forEach((entry, index) => {
            const li = document.createElement('li');
            const date = new Date(entry.play_date);
            const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

            li.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name">${entry.player_name}</span>
                <span class="score">${entry.score} 分 (${entry.combo} combo)</span>
                <span class="date">${formattedDate}</span>
            `;
            list.appendChild(li);
        });
    }

    async submitScore() {
        const playerName = this.playerNameInput.value.trim() || '匿名玩家';
        const scoreEntry = {
            player_name: playerName,
            score: this.score,
            combo: this.maxCombo,
            play_date: new Date().toISOString()
        };

        // 保存到本地
        this.localLeaderboard.push({...scoreEntry});
        this.localLeaderboard.sort((a, b) => b.score - a.score);
        this.localLeaderboard = this.localLeaderboard.slice(0, 10);
        localStorage.setItem('shotzombieLeaderboard', JSON.stringify(this.localLeaderboard));

        // 保存到線上
        if (this.database && this.leaderboardRef) {
            try {
                await push(this.leaderboardRef, scoreEntry);
                console.log('Score saved to online leaderboard');
            } catch (error) {
                console.error('Error saving online score:', error);
            }
        }

        this.playerNameInput.value = '';
        this.showMenu();
    }
}

// 初始化遊戲
document.addEventListener('DOMContentLoaded', () => {
    new ShotZombieGame();
});
