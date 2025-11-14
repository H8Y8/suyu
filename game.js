import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

class ZombieGame {
    constructor() {
        // 游戏基本属性
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.isPlaying = false;
        this.zombies = [];
        this.particles = [];

        // 游戏难度设置
        this.zombieSpeed = 2; // 像素/帧
        this.spawnInterval = 2000; // 毫秒
        this.lanes = 3; // 行数
        this.laneHeight = 0;

        // DOM 元素
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.waveElement = document.getElementById('wave');
        this.startButton = document.getElementById('start-button');
        this.hitSound = document.getElementById('hit-sound');
        this.countdownElement = document.getElementById('countdown');
        this.nameInputModal = document.getElementById('name-input-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.finalWaveElement = document.getElementById('final-wave');
        this.playerNameInput = document.getElementById('player-name');
        this.submitScoreButton = document.getElementById('submit-score');

        // 初始化
        this.initializeCanvas();
        this.addEventListeners();
        this.setupFirebase();
        this.setupLeaderboard();
    }

    initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'particle-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.gameArea.appendChild(this.canvas);
        this.resizeCanvas();

        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        this.canvas.width = this.gameArea.clientWidth;
        this.canvas.height = this.gameArea.clientHeight;
        this.laneHeight = this.canvas.height / this.lanes;
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.submitScoreButton.addEventListener('click', () => this.submitScore());

        // 排行榜切换按钮
        const toggleBtn = document.getElementById('toggle-leaderboard');
        const mobileLeaderboard = document.querySelector('.mobile-leaderboard');
        const startButton = document.getElementById('start-button');

        if (toggleBtn && mobileLeaderboard) {
            toggleBtn.addEventListener('click', () => {
                mobileLeaderboard.classList.toggle('collapsed');
                startButton.classList.toggle('hidden-mobile');
                toggleBtn.textContent = mobileLeaderboard.classList.contains('collapsed')
                    ? '顯示排行榜 ▲'
                    : '隱藏排行榜 ▼';
            });
        }
    }

    async startGame() {
        // 倒计时
        this.countdownElement.classList.remove('hidden');
        for (let i = 3; i > 0; i--) {
            this.countdownElement.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.countdownElement.classList.add('hidden');

        // 重置游戏状态
        this.score = 0;
        this.lives = 3;
        this.wave = 1;
        this.isPlaying = true;
        this.zombies = [];
        this.particles = [];
        this.zombieSpeed = 2;
        this.spawnInterval = 2000;

        this.updateUI();
        this.startButton.style.display = 'none';

        // 开始游戏循环
        this.spawnZombies();
        this.gameLoop();
    }

    spawnZombies() {
        if (!this.isPlaying) return;

        // 随机选择一条路径
        const lane = Math.floor(Math.random() * this.lanes);

        // 创建僵尸
        const zombie = document.createElement('div');
        zombie.className = 'zombie';

        const img = document.createElement('img');
        img.src = 'suyu.jpg';
        zombie.appendChild(img);

        // 设置位置（从右边开始）
        const startX = this.gameArea.clientWidth;
        const startY = lane * this.laneHeight + (this.laneHeight - 60) / 2;

        zombie.style.left = startX + 'px';
        zombie.style.top = startY + 'px';

        // 添加点击事件
        zombie.addEventListener('click', () => this.hitZombie(zombie));

        this.gameArea.appendChild(zombie);

        // 保存僵尸数据
        this.zombies.push({
            element: zombie,
            x: startX,
            y: startY,
            lane: lane,
            speed: this.zombieSpeed
        });

        // 继续生成下一个僵尸
        this.spawnTimeout = setTimeout(() => this.spawnZombies(), this.spawnInterval);
    }

    gameLoop() {
        if (!this.isPlaying) return;

        // 移动所有僵尸
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.x -= zombie.speed;
            zombie.element.style.left = zombie.x + 'px';

            // 检查是否到达左边（防线被突破）
            if (zombie.x < -60) {
                this.zombies.splice(i, 1);
                zombie.element.remove();
                this.loseLife();
            }
        }

        // 绘制粒子效果
        this.animateParticles();

        // 继续循环
        this.animationFrame = requestAnimationFrame(() => this.gameLoop());
    }

    hitZombie(zombieElement) {
        if (!this.isPlaying) return;

        // 找到对应的僵尸数据
        const index = this.zombies.findIndex(z => z.element === zombieElement);
        if (index === -1) return;

        const zombie = this.zombies[index];

        // 播放音效
        this.hitSound.currentTime = 0;
        this.hitSound.play();

        // 创建粒子效果
        const rect = zombieElement.getBoundingClientRect();
        const gameAreaRect = this.gameArea.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - gameAreaRect.left;
        const y = rect.top + rect.height / 2 - gameAreaRect.top;
        this.createParticles(x, y);

        // 移除僵尸
        this.zombies.splice(index, 1);
        zombieElement.remove();

        // 增加分数
        this.score++;
        this.updateUI();

        // 检查是否升级波数
        if (this.score % 10 === 0) {
            this.nextWave();
        }
    }

    loseLife() {
        this.lives--;
        this.updateUI();

        if (this.lives <= 0) {
            this.endGame();
        }
    }

    nextWave() {
        this.wave++;
        this.zombieSpeed += 0.5; // 增加速度
        this.spawnInterval = Math.max(800, this.spawnInterval - 200); // 加快生成速度
        this.updateUI();
    }

    updateUI() {
        this.scoreElement.textContent = this.score;
        this.livesElement.textContent = this.lives;
        this.waveElement.textContent = this.wave;
    }

    endGame() {
        this.isPlaying = false;

        // 清除定时器
        if (this.spawnTimeout) clearTimeout(this.spawnTimeout);
        if (this.animationFrame) cancelAnimationFrame(this.animationFrame);

        // 移除所有僵尸
        this.zombies.forEach(zombie => zombie.element.remove());
        this.zombies = [];

        // 显示结束弹窗
        this.finalScoreElement.textContent = this.score;
        this.finalWaveElement.textContent = this.wave;
        this.nameInputModal.classList.remove('hidden');
        this.startButton.style.display = 'block';
    }

    createParticles(x, y) {
        const particleCount = 12;
        const baseSize = 20;

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 / particleCount) * i;
            const velocity = 3;

            const img = new Image();
            img.src = 'suyu.jpg';

            this.particles.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * velocity,
                vy: Math.sin(angle) * velocity,
                rotation: Math.random() * 360,
                size: baseSize,
                life: 1,
                img: img
            });
        }
    }

    animateParticles() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.rotation += 5;
            p.life -= 0.02;
            p.size *= 0.99;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            this.ctx.save();
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation * Math.PI / 180);
            this.ctx.globalAlpha = p.life;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            this.ctx.clip();
            this.ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
            this.ctx.restore();
        }
    }

    setupFirebase() {
        this.database = getDatabase();
        this.leaderboardRef = ref(this.database, 'zombie-leaderboard');
    }

    setupLeaderboard() {
        this.isLocalMode = true;
        this.localLeaderboard = [];
        this.onlineLeaderboard = [];

        this.initLeaderboardSwitches();
        this.loadLocalLeaderboard();
        this.startOnlineLeaderboardListener();
    }

    initLeaderboardSwitches() {
        const localBtn = document.getElementById('local-btn');
        const onlineBtn = document.getElementById('online-btn');
        const localBtnMobile = document.getElementById('local-btn-mobile');
        const onlineBtnMobile = document.getElementById('online-btn-mobile');

        const switchButtons = [
            [localBtn, onlineBtn],
            [localBtnMobile, onlineBtnMobile]
        ];

        switchButtons.forEach(([localButton, onlineButton]) => {
            if (localButton && onlineButton) {
                localButton.addEventListener('click', () => {
                    this.isLocalMode = true;
                    localButton.classList.add('active');
                    onlineButton.classList.remove('active');
                    this.displayLeaderboard();
                });

                onlineButton.addEventListener('click', () => {
                    this.isLocalMode = false;
                    onlineButton.classList.add('active');
                    localButton.classList.remove('active');
                    this.displayLeaderboard();
                });
            }
        });
    }

    loadLocalLeaderboard() {
        const saved = localStorage.getItem('zombieGameLeaderboard');
        this.localLeaderboard = saved ? JSON.parse(saved) : [];
        this.displayLeaderboard();
    }

    startOnlineLeaderboardListener() {
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
            if (!this.isLocalMode) {
                this.displayLeaderboard();
            }
        });
    }

    displayLeaderboard() {
        const desktopList = document.getElementById('leaderboard-list');
        const mobileList = document.getElementById('leaderboard-list-mobile');

        const currentLeaderboard = this.isLocalMode ?
            this.localLeaderboard.slice(0, 5) :
            this.onlineLeaderboard.slice(0, 5);

        const updateList = (list) => {
            if (!list) return;
            list.innerHTML = '';

            currentLeaderboard.forEach((entry, index) => {
                const li = document.createElement('li');
                const date = new Date(entry.play_date);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                li.innerHTML = `
                    <span class="rank">第 ${index + 1} 名</span>
                    <span class="name">${entry.player_name}</span>
                    <span class="score">${entry.score} 隻 (${entry.wave}波)</span>
                    <span class="date">${formattedDate}</span>
                `;
                list.appendChild(li);
            });
        };

        updateList(desktopList);
        updateList(mobileList);
    }

    async submitScore() {
        const playerName = this.playerNameInput.value.trim() || '匿名玩家';
        const scoreEntry = {
            player_name: playerName,
            score: this.score,
            wave: this.wave,
            play_date: new Date().toISOString()
        };

        // 保存到本地
        this.localLeaderboard.push({...scoreEntry});
        this.localLeaderboard.sort((a, b) => b.score - a.score);
        this.localLeaderboard = this.localLeaderboard.slice(0, 10);
        localStorage.setItem('zombieGameLeaderboard', JSON.stringify(this.localLeaderboard));

        // 保存到线上
        try {
            await push(this.leaderboardRef, scoreEntry);
        } catch (error) {
            console.error('Error saving online score:', error);
        }

        this.nameInputModal.classList.add('hidden');
        this.playerNameInput.value = '';
        this.displayLeaderboard();
    }
}

// 初始化游戏
export function initGame() {
    const game = new ZombieGame();
}

document.addEventListener('DOMContentLoaded', initGame);
