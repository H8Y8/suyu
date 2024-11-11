import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

class Game {
  constructor() {
    // 初始化基本屬性
    this.score = 0;
    this.timeLeft = 30.0;
    this.isPlaying = false;
    this.particles = [];
    this.leaderboard = [];

    // 獲取 DOM 元素
    this.gameArea = document.getElementById("game-area");
    this.scoreElement = document.getElementById("score");
    this.timerElement = document.getElementById("timer");
    this.startButton = document.getElementById("start-button");
    this.hitSound = document.getElementById("hit-sound");
    this.countdownElement = document.getElementById("countdown");
    this.nameInputModal = document.getElementById("name-input-modal");
    this.finalScoreElement = document.getElementById("final-score");
    this.playerNameInput = document.getElementById("player-name");
    this.submitScoreButton = document.getElementById("submit-score");

    // 設置遊戲難度
    this.difficulty = { value: "hard" };
    this.difficultySettings = {
      hard: {
        moveInterval: 500,
        points: 15,
      },
    };

    // 設置 API 基礎 URL
    this.apiBaseUrl = "http://localhost/你的專案目錄"; // 根據實際情況修改

    // 初始化 canvas
    this.initializeCanvas();

    // 初始化計時器顯示
    this.initializeCountdownTimer();

    // 添加事件監聽器
    this.addEventListeners();

    // 修改 Firebase 資料庫初始化，使用新的節點
    this.database = getDatabase();
    this.leaderboardRef = ref(this.database, "leaderboard_v2"); // 改用新的節點名稱

    // 修改監聽排行榜變化
    const leaderboardQuery = query(
      this.leaderboardRef,
      orderByChild("score"),
      limitToLast(5)
    );

    onValue(leaderboardQuery, (snapshot) => {
      this.updateLeaderboard(snapshot);
    });

    // 修改排行榜切換按鈕事件監聽
    const toggleBtn = document.getElementById("toggle-leaderboard");
    const mobileLeaderboard = document.querySelector(".mobile-leaderboard");
    const startButton = document.getElementById("start-button");

    if (toggleBtn && mobileLeaderboard) {
      toggleBtn.addEventListener("click", () => {
        mobileLeaderboard.classList.toggle("collapsed");

        // 切換開始按鈕的顯示狀態
        if (mobileLeaderboard.classList.contains("collapsed")) {
          startButton.style.display = "block";
          toggleBtn.textContent = "顯示排行榜 ▲";
        } else {
          startButton.style.display = "none";
          toggleBtn.textContent = "隱藏排行榜 ▼";
        }
      });
    }

    this.isLocalMode = true;
    this.localLeaderboard = [];
    this.onlineLeaderboard = [];

    // 初始化切換按鈕
    this.initLeaderboardSwitches();

    // 載入本地排行榜
    this.loadLocalLeaderboard();

    // 開始監聽線上排行榜
    this.startOnlineLeaderboardListener();

    // 連擊設置
    this.comboSettings = {
      timeWindow: 1000, // 1秒內連擊
      multiplier: {
        3: 1.5, // 3連擊 1.5倍
        5: 2, // 5連擊 2倍
        10: 3, // 10連擊 3倍
      },
    };

    // 添加連擊顯示元素
    this.createComboDisplay();

    // 添加點擊統計
    this.totalClicks = 0;
    this.successfulClicks = 0;
  }

  initializeCanvas() {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "particle-canvas";
    this.ctx = this.canvas.getContext("2d");
    this.gameArea.appendChild(this.canvas);
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = this.gameArea.clientWidth;
    this.canvas.height = this.gameArea.clientHeight;
  }

  initializeCountdownTimer() {
    this.countdownTimerElement = document.createElement("div");
    this.countdownTimerElement.className = "countdown-timer";
    this.gameArea.appendChild(this.countdownTimerElement);
  }

  addEventListeners() {
    this.startButton.addEventListener("click", () => this.startGame());
    this.submitScoreButton.addEventListener("click", () => this.submitScore());
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  async startGame() {
    this.countdownElement.classList.remove("hidden");
    for (let i = 3; i > 0; i--) {
      this.countdownElement.textContent = i;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.countdownElement.classList.add("hidden");

    this.score = 0;
    this.timeLeft = 30.0;
    this.isPlaying = true;
    this.updateScore();

    const existingTargets = this.gameArea.querySelectorAll(".target");
    existingTargets.forEach((target) => target.remove());

    this.startButton.style.display = "none";

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

    // 重置點擊統計
    this.totalClicks = 0;
    this.successfulClicks = 0;

    // 添加遊戲區域點擊監聽
    this.gameArea.addEventListener(
      "click",
      this.handleGameAreaClick.bind(this)
    );
  }

  spawnTarget() {
    if (!this.isPlaying) return;

    const target = document.createElement("div");
    target.className = "target";

    const img = document.createElement("img");
    img.src = "suyu.jpg";

    // 金色目標的處理
    const isGolden = Math.random() < 0.1; // 10%機率生成金色目標
    if (isGolden) {
      img.classList.add("golden"); // 將 golden 類別加到 img 而不是 target
      target.dataset.golden = "true"; // 用於識別金色目標
    }

    target.appendChild(img);

    const maxX = this.gameArea.clientWidth - 65;
    const maxY = this.gameArea.clientHeight - 65;

    target.style.opacity = "0";
    target.style.left = Math.random() * maxX + "px";
    target.style.top = Math.random() * maxY + "px";

    target.addEventListener("click", () => this.hitTarget(target));

    this.gameArea.appendChild(target);

    requestAnimationFrame(() => {
      target.style.transition = "opacity 0.2s ease";
      target.style.opacity = "1";
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

      target.style.opacity = "0";
      target.style.transition = "none";
      target.style.left = Math.random() * maxX + "px";
      target.style.top = Math.random() * maxY + "px";

      target.offsetHeight;
      target.style.transition = "opacity 0.2s ease";
      target.style.opacity = "1";
    }, this.difficultySettings.hard.moveInterval);
  }

  hitTarget(target) {
    if (!this.isPlaying) return;

    this.totalClicks++;
    this.successfulClicks++;

    // 計算連擊
    const now = Date.now();
    if (now - this.lastHitTime < this.comboSettings.timeWindow) {
      this.combo++;
    } else {
      this.combo = 1;
    }
    this.lastHitTime = now;

    // 計算分數倍率
    let multiplier = 1;
    Object.entries(this.comboSettings.multiplier)
      .reverse()
      .some(([combo, mult]) => {
        if (this.combo >= parseInt(combo)) {
          multiplier = mult;
          return true;
        }
        return false;
      });

    // 計算基礎分數
    let points = this.difficultySettings.hard.points;

    // 如果是金色目標，額外加分
    if (target.dataset.golden === "true") {
      points *= 2;
    }

    // 應用連擊倍率
    points *= multiplier;

    this.score += points;
    this.updateScore();
    this.updateComboDisplay();

    target.style.pointerEvents = "none";

    const rect = target.getBoundingClientRect();
    const gameAreaRect = this.gameArea.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - gameAreaRect.left;
    const y = rect.top + rect.height / 2 - gameAreaRect.top;

    target.remove();
    this.createParticles(x, y);
    this.hitSound.currentTime = 0;
    this.hitSound.play();

    setTimeout(() => {
      this.spawnTarget();
    }, 50);
  }

  createParticles(x, y) {
    const particleCount = 12;
    const baseSize = 20;

    for (let i = 0; i < particleCount; i++) {
      const angle = ((Math.PI * 2) / particleCount) * i;
      const velocity = 3;

      const img = new Image();
      img.src = "suyu.jpg";

      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        rotation: Math.random() * 360,
        size: baseSize,
        life: 1,
        img: img,
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
      this.ctx.rotate((p.rotation * Math.PI) / 180);
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

    const existingTargets = this.gameArea.querySelectorAll(".target");
    existingTargets.forEach((target) => target.remove());

    // 移除遊戲區域點擊監聽
    this.gameArea.removeEventListener(
      "click",
      this.handleGameAreaClick.bind(this)
    );

    // 重置連擊相關數據和顯示
    this.combo = 0;
    this.lastHitTime = 0;
    this.comboDisplay.classList.add("hidden");
    this.comboDisplay.style.animation = "none";

    // 檢查是否為手機版
    if (window.innerWidth <= 768) {
      // 在手機版中，保持開始按鈕隱藏
      this.startButton.style.display = "none";
    } else {
      // 在桌面版中，檢查排行榜狀態
      const mobileLeaderboard = document.querySelector(".mobile-leaderboard");
      if (
        mobileLeaderboard &&
        !mobileLeaderboard.classList.contains("collapsed")
      ) {
        this.startButton.style.display = "none";
      } else {
        this.startButton.style.display = "block";
      }
    }

    // 計算命中率
    const accuracy =
      this.totalClicks > 0
        ? ((this.successfulClicks / this.totalClicks) * 100).toFixed(1)
        : 0;

    // 更新最終得分顯示，加入命率資訊
    this.finalScoreElement.innerHTML = `
      <div>最終得分：${this.score}</div>
      <div class="accuracy-stats">
        <div>總點擊次數：${this.totalClicks}</div>
        <div>成功點擊：${this.successfulClicks}</div>
        <div>命中率：${accuracy}%</div>
      </div>
    `;

    this.nameInputModal.classList.remove("hidden");
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
    const playerName = this.playerNameInput.value.trim() || "匿名玩家";

    const scoreEntry = {
      player_name: playerName,
      score: this.score,
      play_date: new Date().toISOString(),
      version: "2.0", // 添加版本標記
    };

    // 儲存到本地
    this.localLeaderboard.push({ ...scoreEntry });
    this.localLeaderboard.sort((a, b) => b.score - a.score);
    this.localLeaderboard = this.localLeaderboard.slice(0, 5);
    localStorage.setItem(
      "gameLeaderboard_v2", // 修改本地儲存的 key
      JSON.stringify(this.localLeaderboard)
    );

    // 儲存到線上
    try {
      await push(ref(this.database, "leaderboard_v2"), scoreEntry);
    } catch (error) {
      console.error("Error saving online score:", error);
    }

    this.nameInputModal.classList.add("hidden");
    this.playerNameInput.value = "";

    // 檢查是否為手機版
    if (window.innerWidth <= 768) {
      // 檢查排行榜是否展開
      const mobileLeaderboard = document.querySelector(".mobile-leaderboard");
      if (
        mobileLeaderboard &&
        !mobileLeaderboard.classList.contains("collapsed")
      ) {
        this.startButton.style.display = "none";
      } else {
        this.startButton.style.display = "block";
      }
    } else {
      this.startButton.style.display = "block";
    }

    this.displayLeaderboard();
  }

  // 顯示排行榜
  displayLeaderboard() {
    const desktopList = document.getElementById("leaderboard-list");
    const mobileList = document.getElementById("leaderboard-list-mobile");

    const currentLeaderboard = this.isLocalMode
      ? this.localLeaderboard.slice(0, 5)
      : this.onlineLeaderboard;

    const updateList = (list) => {
      if (!list) return;
      list.innerHTML = "";

      currentLeaderboard.forEach((entry, index) => {
        const li = document.createElement("li");
        const date = new Date(entry.play_date);
        const formattedDate = `${date.getFullYear()}-${String(
          date.getMonth() + 1
        ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(
          date.getHours()
        ).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

        li.innerHTML = `
          <span class="rank">第 ${index + 1} 名</span>
          <span class="name">${entry.player_name}</span>
          <span class="score">${entry.score} 分</span>
          <span class="date">${formattedDate}</span>
        `;
        list.appendChild(li);
      });
    };

    updateList(desktopList);
    updateList(mobileList);
  }

  initLeaderboardSwitches() {
    // 桌面版切換按鈕
    const localBtn = document.getElementById("local-btn");
    const onlineBtn = document.getElementById("online-btn");

    // 手機版切換按鈕
    const localBtnMobile = document.getElementById("local-btn-mobile");
    const onlineBtnMobile = document.getElementById("online-btn-mobile");

    const switchButtons = [
      [localBtn, onlineBtn],
      [localBtnMobile, onlineBtnMobile],
    ];

    switchButtons.forEach(([localButton, onlineButton]) => {
      if (localButton && onlineButton) {
        localButton.addEventListener("click", () => {
          this.isLocalMode = true;
          localButton.classList.add("active");
          onlineButton.classList.remove("active");
          this.displayLeaderboard();
        });

        onlineButton.addEventListener("click", () => {
          this.isLocalMode = false;
          onlineButton.classList.add("active");
          localButton.classList.remove("active");
          this.displayLeaderboard();
        });
      }
    });
  }

  loadLocalLeaderboard() {
    const saved = localStorage.getItem("gameLeaderboard_v2"); // 修改本地儲存的 key
    this.localLeaderboard = saved ? JSON.parse(saved) : [];
  }

  startOnlineLeaderboardListener() {
    const leaderboardRef = ref(this.database, "leaderboard_v2"); // 使用新的節點
    onValue(leaderboardRef, (snapshot) => {
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

  createComboDisplay() {
    this.comboDisplay = document.createElement("div");
    this.comboDisplay.className = "combo-display hidden";
    this.gameArea.appendChild(this.comboDisplay);
  }

  updateComboDisplay() {
    if (this.combo > 1) {
      this.comboDisplay.textContent = `${this.combo}連擊！`;
      this.comboDisplay.classList.remove("hidden");
      this.comboDisplay.style.animation = "none";
      this.comboDisplay.offsetHeight; // 觸發重排
      this.comboDisplay.style.animation = "comboPopup 0.5s ease";
    } else {
