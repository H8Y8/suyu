import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// ===== Zombie 類別 =====
class Zombie {
    constructor(columnIndex, y) {
        this.columnIndex = columnIndex; // 0, 1, 2 (left, center, right)
        this.y = y; // Y position
        this.targetY = y; // Target Y position for animation
        this.size = 50; // zombie size (also used as spacing)
        this.isAnimating = false;
    }
}

// ===== ShotZombie 遊戲類別 =====
class ShotZombieGame {
    constructor() {
        console.log('🚀 Creating ShotZombie Game v3.0.0 - Queue System');

        // 遊戲狀態
        this.gameState = 'menu'; // 'menu' | 'playing' | 'paused' | 'gameover'
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeLeft = 60; // seconds

        // 新的队列系统
        this.zombieQueues = [[], [], []]; // 三条栏位的僵尸队列
        this.zombieSize = 50; // 僵尸大小
        this.queueSpacing = 50; // 队列间距（等于僵尸高度）
        this.initialQueueLength = 5; // 初始队列长度

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
        this.zombieImgLoaded = false;
        this.zombieImg.onload = () => {
            console.log('✅ Zombie image loaded successfully');
            this.zombieImgLoaded = true;
        };
        this.zombieImg.onerror = () => {
            console.error('❌ Failed to load zombie image');
        };

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
        console.log('🎮 Starting new game with queue system');
        this.showScreen(this.gameScreen);
        this.gameState = 'playing';
        this.score = 0;
        this.combo = 0;
        this.maxCombo = 0;
        this.timeLeft = 60;

        // 初始化三条队列
        this.initializeQueues();

        this.lastFrameTime = performance.now();
        this.updateUI();
        this.gameLoop();
    }

    // ===== 初始化队列 =====
    initializeQueues() {
        this.zombieQueues = [[], [], []];

        // 每条栏位生成5只僵尸
        for (let col = 0; col < this.columnCount; col++) {
            for (let i = 0; i < this.initialQueueLength; i++) {
                // 从底线往上排列
                // 最靠近底线的：bottomLine - zombieSize/2
                // 第二个：bottomLine - zombieSize/2 - queueSpacing
                // 依此类推
                const y = this.bottomLine - this.zombieSize / 2 - (i * this.queueSpacing);
                const zombie = new Zombie(col, y);
                zombie.targetY = y;
                this.zombieQueues[col].push(zombie);
            }
        }

        console.log('✅ Initialized queues:', this.zombieQueues.map(q => q.length));
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

        // 更新僵尸动画（平滑移动到目标位置）
        this.updateZombieAnimations(deltaTime);

        // 繪製畫面
        this.draw();

        // 更新UI
        this.updateUI();

        // 繼續循環
        requestAnimationFrame(() => this.gameLoop());
    }

    // ===== 更新僵尸动画 =====
    updateZombieAnimations(deltaTime) {
        const moveSpeed = 500; // pixels per second (fast smooth movement)

        this.zombieQueues.forEach(queue => {
            queue.forEach(zombie => {
                if (Math.abs(zombie.y - zombie.targetY) > 1) {
                    zombie.isAnimating = true;
                    const direction = zombie.targetY > zombie.y ? 1 : -1;
                    const moveDistance = moveSpeed * deltaTime;
                    zombie.y += direction * moveDistance;

                    // Clamp to target
                    if (direction > 0 && zombie.y >= zombie.targetY) {
                        zombie.y = zombie.targetY;
                        zombie.isAnimating = false;
                    } else if (direction < 0 && zombie.y <= zombie.targetY) {
                        zombie.y = zombie.targetY;
                        zombie.isAnimating = false;
                    }
                } else {
                    zombie.y = zombie.targetY;
                    zombie.isAnimating = false;
                }
            });
        });
    }

    // ===== 找出全域最接近底線的殭屍 =====
    getGlobalNearestZombie() {
        let nearest = null;
        let maxY = -Infinity;

        this.zombieQueues.forEach((queue, colIndex) => {
            if (queue.length > 0) {
                // 队列中最前面的（Y最大的）
                const frontZombie = queue[queue.length - 1];
                if (frontZombie.y > maxY) {
                    maxY = frontZombie.y;
                    nearest = { zombie: frontZombie, columnIndex: colIndex };
                }
            }
        });

        return nearest;
    }

    // ===== 射擊處理 =====
    handleShot(columnIndex) {
        if (this.gameState !== 'playing') return;

        const nearestInfo = this.getGlobalNearestZombie();
        if (!nearestInfo) {
            // 没有僵尸
            this.miss(columnIndex);
            return;
        }

        // 判断是否点击正确的栏位
        if (nearestInfo.columnIndex === columnIndex) {
            this.hit(columnIndex);
        } else {
            this.miss(columnIndex, nearestInfo.columnIndex);
        }
    }

    // ===== 命中 =====
    hit(columnIndex) {
        console.log(`✅ HIT column ${columnIndex}`);

        const queue = this.zombieQueues[columnIndex];
        if (queue.length === 0) return;

        // 移除最前面的僵尸
        const hitZombie = queue.pop();

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

        // 所有剩余僵尸往前移动一格
        queue.forEach(zombie => {
            zombie.targetY += this.queueSpacing;
        });

        // 生成新僵尸
        this.spawnNewZombie();

        // 顯示命中效果
        this.showHitEffect(columnIndex, points);

        // 更新combo顯示
        if (this.combo > 0) {
            this.comboDisplay.classList.add('active');
        }
    }

    // ===== 失誤 =====
    miss(columnIndex, correctColumn = null) {
        console.log(`❌ MISS - pressed ${columnIndex}, correct is ${correctColumn}`);

        // 扣分
        this.score = Math.max(0, this.score - 5);

        // 清空combo
        this.combo = 0;
        this.comboDisplay.classList.remove('active');

        // 顯示miss效果
        this.showMissEffect(columnIndex);

        // 如果知道正确的栏位，让正确的僵尸跳动
        if (correctColumn !== null) {
            this.showJumpAnimation(correctColumn);
        }
    }

    // ===== 生成新僵尸 =====
    spawnNewZombie() {
        // 随机选择一条栏位
        const columnIndex = Math.floor(Math.random() * this.columnCount);
        const queue = this.zombieQueues[columnIndex];

        // 计算新僵尸的位置（在队列最后，即最上方）
        let newY;
        if (queue.length === 0) {
            // 如果队列为空，从底线开始
            newY = this.bottomLine - this.zombieSize / 2;
        } else {
            // 在最后一个僵尸上方
            const lastZombie = queue[0];
            newY = lastZombie.targetY - this.queueSpacing;
        }

        const zombie = new Zombie(columnIndex, newY);
        zombie.targetY = newY;
        queue.unshift(zombie); // 添加到队列开头（最上方）

        console.log(`🧟 Spawned new zombie in column ${columnIndex}, queue length: ${queue.length}`);
    }

    // ===== 跳动动画 =====
    showJumpAnimation(columnIndex) {
        const queue = this.zombieQueues[columnIndex];
        if (queue.length === 0) return;

        const zombie = queue[queue.length - 1]; // 最前面的僵尸
        const originalY = zombie.targetY;
        const jumpHeight = this.zombieSize / 2; // 跳动高度 = 僵尸高度的一半

        // 跳起
        zombie.targetY = originalY - jumpHeight;

        // 0.3秒后落回
        setTimeout(() => {
            zombie.targetY = originalY;
        }, 300);
    }

    // ===== 顯示命中效果 =====
    showHitEffect(columnIndex, points) {
        const button = document.querySelector(`.shot-button[data-column="${columnIndex}"]`);
        if (button) {
            button.classList.add('hit');
            setTimeout(() => button.classList.remove('hit'), 200);
        }

        // 顯示分數飄字
        this.showFloatingText(columnIndex, `+${points}`, '#00ff00');
    }

    // ===== 顯示失誤效果 =====
    showMissEffect(columnIndex) {
        const button = document.querySelector(`.shot-button[data-column="${columnIndex}"]`);
        if (button) {
            button.classList.add('miss');
            setTimeout(() => button.classList.remove('miss'), 200);
        }

        // 顯示失誤飄字
        this.showFloatingText(columnIndex, 'MISS!', '#ff0000');
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
        if (container) {
            container.appendChild(textElement);
            setTimeout(() => textElement.remove(), 1000);
        }
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
        this.zombieQueues.forEach((queue, colIndex) => {
            const x = (colIndex + 0.5) * this.columnWidth;

            queue.forEach(zombie => {
                // 繪製殭屍
                this.ctx.save();
                this.ctx.translate(x, zombie.y);

                // 繪製殭屍圖片（如果已加載）
                if (this.zombieImgLoaded && this.zombieImg.complete) {
                    // 殭屍圓形邊框
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, zombie.size / 2, 0, Math.PI * 2);
                    this.ctx.strokeStyle = 'rgba(139, 0, 0, 0.8)';
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                    this.ctx.clip();

                    this.ctx.drawImage(
                        this.zombieImg,
                        -zombie.size / 2,
                        -zombie.size / 2,
                        zombie.size,
                        zombie.size
                    );
                } else {
                    // 如果圖片未加載，繪製紅色圓形作為佔位符
                    this.ctx.beginPath();
                    this.ctx.arc(0, 0, zombie.size / 2, 0, Math.PI * 2);
                    this.ctx.fillStyle = '#8B0000';
                    this.ctx.fill();
                    this.ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                    this.ctx.lineWidth = 3;
                    this.ctx.stroke();
                }

                this.ctx.restore();
            });
        });
    }

    highlightNearestZombie() {
        const nearestInfo = this.getGlobalNearestZombie();
        if (!nearestInfo) return;

        const zombie = nearestInfo.zombie;
        const x = (nearestInfo.columnIndex + 0.5) * this.columnWidth;
        const y = zombie.y;

        // 繪製高亮圈
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.arc(x, y, zombie.size / 2 + 5, 0, Math.PI * 2);
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

        if (!list) return;
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
