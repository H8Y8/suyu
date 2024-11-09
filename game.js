import { getDatabase, ref, push, onValue, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

class Game {
    constructor() {
        // 初始化基本屬性
        this.score = 0;
        this.timeLeft = 30.0;
        this.isPlaying = false;
        this.particles = [];
        this.leaderboard = [];

        // 獲取 DOM 元素
        this.gameArea = document.getElementById('game-area');
        this.scoreElement = document.getElementById('score');
        this.timerElement = document.getElementById('timer');
        this.startButton = document.getElementById('start-button');
        this.hitSound = document.getElementById('hit-sound');
        this.countdownElement = document.getElementById('countdown');
        this.nameInputModal = document.getElementById('name-input-modal');
        this.finalScoreElement = document.getElementById('final-score');
        this.playerNameInput = document.getElementById('player-name');
        this.submitScoreButton = document.getElementById('submit-score');

        // 設置遊戲難度
        this.difficulty = { value: 'hard' };
        this.difficultySettings = {
            hard: { 
                moveInterval: 350,
                points: 15 
            }
        };

        // 設置 API 基礎 URL
        this.apiBaseUrl = 'http://localhost/你的專案目錄'; // 根據實際情況修改

        // 初始化 canvas
        this.initializeCanvas();

        // 初始化計時器顯示
        this.initializeCountdownTimer();

        // 添加事件監聽器
        this.addEventListeners();

        // 修改 Firebase 資料庫初始化
        this.database = getDatabase();
        this.leaderboardRef = ref(this.database, 'leaderboard');
        
        // 修改監聽排行榜變化
        const leaderboardQuery = query(
            this.leaderboardRef,
            orderByChild('score'),
            limitToLast(5)
        );
        
        onValue(leaderboardQuery, (snapshot) => {
            this.updateLeaderboard(snapshot);
        });

        // 修改排行榜切換按鈕事件監聽
        const toggleBtn = document.getElementById('toggle-leaderboard');
        const mobileLeaderboard = document.querySelector('.mobile-leaderboard');
        const startButton = document.getElementById('start-button');
        
        if (toggleBtn && mobileLeaderboard) {
            toggleBtn.addEventListener('click', () => {
                mobileLeaderboard.classList.toggle('collapsed');
                // 切換開始按鈕的顯示狀態
                startButton.classList.toggle('hidden-mobile');
                
                toggleBtn.textContent = mobileLeaderboard.classList.contains('collapsed') 
                    ? '顯示排行榜 ▲' 
                    : '隱藏排行榜 ▼';
            });
        }
    }

    initializeCanvas() {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'particle-canvas';
        this.ctx = this.canvas.getContext('2d');
        this.gameArea.appendChild(this.canvas);
        this.resizeCanvas();
    }

    resizeCanvas() {
        this.canvas.width = this.gameArea.clientWidth;
        this.canvas.height = this.gameArea.clientHeight;
    }

    initializeCountdownTimer() {
        this.countdownTimerElement = document.createElement('div');
        this.countdownTimerElement.className = 'countdown-timer';
        this.gameArea.appendChild(this.countdownTimerElement);
    }

    addEventListeners() {
        this.startButton.addEventListener('click', () => this.startGame());
        this.submitScoreButton.addEventListener('click', () => this.submitScore());
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    async startGame() {
        this.countdownElement.classList.remove('hidden');
        for (let i = 3; i > 0; i--) {
            this.countdownElement.textContent = i;
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        this.countdownElement.classList.add('hidden');

        this.score = 0;
        this.timeLeft = 30.0;
        this.isPlaying = true;
        this.updateScore();
        
        const existingTargets = this.gameArea.querySelectorAll('.target');
        existingTargets.forEach(target => target.remove());
        
        this.startButton.disabled = true;
        
        if (!this.gameArea.contains(this.canvas)) {
            this.gameArea.appendChild(this.canvas);
        }
        this.resizeCanvas();
        
        if (!this.gameArea.contains(this.countdownTimerElement)) {
            this.gameArea.appendChild(this.countdownTimerElement);
        }
        
        this.gameTimer = setInterval(() => {
            this.timeLeft -= 0.1;
            const displayTime = Math.max(0, Math.round(this.timeLeft * 10) / 10);
            
            this.countdownTimerElement.textContent = displayTime.toFixed(1);
            
            if (this.timeLeft <= 0) {
                this.endGame();
            }
        }, 100);

        this.spawnTarget();
        this.animateParticles();
    }

    spawnTarget() {
        if (!this.isPlaying) return;

        const target = document.createElement('div');
        target.className = 'target';
        
        const img = document.createElement('img');
        img.src = 'suyu.jpg';
        target.appendChild(img);

        const maxX = this.gameArea.clientWidth - 65;
        const maxY = this.gameArea.clientHeight - 65;
        
        target.style.opacity = '0';
        target.style.left = Math.random() * maxX + 'px';
        target.style.top = Math.random() * maxY + 'px';

        target.addEventListener('click', () => this.hitTarget(target));
        
        this.gameArea.appendChild(target);
        
        requestAnimationFrame(() => {
            target.style.transition = 'opacity 0.2s ease';
            target.style.opacity = '1';
        });

        this.moveTarget(target);
    }

    moveTarget(target) {
        const moveInterval = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(moveInterval);
                return;
            }

            const maxX = this.gameArea.clientWidth - 65;
            const maxY = this.gameArea.clientHeight - 65;
            
            target.style.opacity = '0';
            target.style.transition = 'none';
            target.style.left = Math.random() * maxX + 'px';
            target.style.top = Math.random() * maxY + 'px';
            
            target.offsetHeight;
            target.style.transition = 'opacity 0.2s ease';
            target.style.opacity = '1';
        }, this.difficultySettings.hard.moveInterval);
    }

    hitTarget(target) {
        if (!this.isPlaying) return;
        
        const rect = target.getBoundingClientRect();
        const gameAreaRect = this.gameArea.getBoundingClientRect();
        const x = rect.left + rect.width / 2 - gameAreaRect.left;
        const y = rect.top + rect.height / 2 - gameAreaRect.top;
        
        target.remove();
        this.createParticles(x, y);
        this.hitSound.currentTime = 0;
        this.hitSound.play();
        
        this.score += this.difficultySettings.hard.points;
        this.updateScore();
        
        setTimeout(() => {
            this.spawnTarget();
        }, 100);
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
        if (!this.isPlaying) return;

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

        requestAnimationFrame(() => this.animateParticles());
    }

    updateScore() {
        this.scoreElement.textContent = this.score;
    }

    endGame() {
        this.isPlaying = false;
        clearInterval(this.gameTimer);
        
        const existingTargets = this.gameArea.querySelectorAll('.target');
        existingTargets.forEach(target => target.remove());
        
        this.startButton.disabled = false;
        
        this.finalScoreElement.textContent = this.score;
        this.nameInputModal.classList.remove('hidden');
    }

    // 更新排行榜顯示
    updateLeaderboard(snapshot) {
        const leaderboardData = [];
        snapshot.forEach((childSnapshot) => {
            leaderboardData.push(childSnapshot.val());
        });
        
        // 排序並反轉，使最高分在前
        this.leaderboard = leaderboardData
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
            
        this.displayLeaderboard();
    }

    // 修改提交分數方法
    async submitScore() {
        const playerName = this.playerNameInput.value.trim() || '匿名玩家';
        const newScore = {
            player_name: playerName,
            score: this.score,
            play_date: new Date().toISOString()
        };

        try {
            // 修改推送新分數到 Firebase 的方式
            await push(this.leaderboardRef, newScore);
        } catch (error) {
            console.error('Error saving score:', error);
        }

        this.nameInputModal.classList.add('hidden');
        this.playerNameInput.value = '';
    }

    // 顯示排行榜
    displayLeaderboard() {
        const desktopList = document.getElementById('leaderboard-list');
        const mobileList = document.getElementById('leaderboard-list-mobile');
        
        const updateList = (list) => {
            if (!list) return;
            list.innerHTML = '';
            
            this.leaderboard.forEach((entry, index) => {
                const li = document.createElement('li');
                const date = new Date(entry.play_date);
                const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                
                li.innerHTML = `
                    <span class="rank">第 ${index + 1} 名</span>
                    <span class="name">${entry.player_name}</span>
                    <span class="score">${entry.score} 分</span>
                    <span class="date">${formattedDate}</span>
                `;
                list.appendChild(li);
            });
        };

        // 更新兩個排行榜
        updateList(desktopList);
        updateList(mobileList);
    }
}

// 修改初始化方式
export function initGame() {
    const game = new Game();
}

// 等待 DOM 完全加載後再初始化遊戲
document.addEventListener('DOMContentLoaded', initGame);
