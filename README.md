# 🧟 ShotZombie - 孫叔殭屍射擊遊戲

一個基於經典 **ShotZombie** 玩法的網頁反應速度遊戲。測試你的眼力和反應！

**核心玩法：點擊最接近底線的殭屍所在欄位！**

---

## 🎮 遊戲規則

### 核心機制
這是一個「比誰先找到最近殭屍」的反應力遊戲：

1. **3條垂直欄位** (LEFT / CENTER / RIGHT)
2. 殭屍在每條欄位**排隊等待**，靜止不動
3. 每條欄位初始有 **5 隻殭屍**，間隔 50px
4. 系統會自動標記**最接近底線的殭屍** (黃色高亮圈 + 底部黃色箭頭 ▼)
5. 玩家要點擊對應欄位的 **SHOT 按鈕**
6. **60秒**挑戰你的極限分數！

### 判定規則

#### ✅ 命中 (HIT)
- 點擊按鈕時，該欄位的殭屍 = 全場最接近底線的殭屍
- **移除該殭屍**，該欄位所有殭屍往前移動 50px
- **生成 1 隻新殭屍**在隨機欄位的最後方
- 得分：**+10 × Combo倍率**
- Combo +1
- 按鈕閃綠光 + 音效
- 顯示得分飄字

#### ❌ 失誤 (MISS)
- 點擊錯誤欄位
- 該欄位沒有殭屍
- **正確的殭屍會跳動**（往上跳 25px 後落回）
- 扣分：**-5分** (不低於0)
- **Combo歸零**
- 按鈕搖晃 + 灰色
- 顯示 MISS 飄字

### Combo 系統

**每 5 Combo 增加 0.5 倍分數倍率**

| Combo 數 | 倍率 | 每次得分 |
|----------|------|---------|
| 1-4      | 1x   | 10分    |
| 5-9      | 1.5x | 15分    |
| 10-14    | 2x   | 20分    |
| 15-19    | 2.5x | 25分    |
| 20+      | 3x   | 30分    |

**提示**：保持連續命中才能獲得高分！

---

## 🎯 遊戲特色

### 視覺提示系統
- 🟡 **黃色高亮圈**：標記最接近底線的殭屍
- 🔻 **黃色箭頭**：在底線位置指示正確欄位
- 🔴 **紅色底線**：危險區域，殭屍到達會扣時間
- ⚪ **欄位分隔線**：清楚區分三個欄位

### 即時反饋
- ✅ 命中：按鈕變綠 + 分數飄字
- ❌ 失誤：按鈕抖動變灰 + MISS 飄字
- ⏱️ 懲罰：扣時間飄字

### 排行榜系統
- 📊 **本地排行榜**：儲存在瀏覽器
- 🌐 **線上排行榜**：Firebase 雲端同步
- 🏆 記錄最高分數和 Combo

---

## 📋 詳細遊戲規格

### 基本參數
```javascript
遊戲時間：60 秒
欄位數量：3 條 (LEFT, CENTER, RIGHT)
初始殭屍數：每欄位 5 隻
隊列間距：50px (等於殭屍高度)
殭屍大小：50 × 50 px
底線位置：距離底部 80px
新殭屍生成：每次命中生成 1 隻（隨機欄位）
跳動動畫：25px (殭屍高度的一半)，持續 300ms
```

### 計分公式
```
命中得分 = 10 × (1 + floor(combo / 5) × 0.5)
失誤扣分 = -5 (不低於 0)
```

### 殭屍行為（隊列系統）
1. **靜態排隊**：殭屍不會自動往下移動
2. **消滅機制**：
   - 點擊正確按鈕時，該欄位最前方的殭屍被移除
   - 該欄位所有剩餘殭屍往前移動 50px
   - 在隨機欄位最後方生成 1 隻新殭屍
3. **錯誤懲罰**：
   - 點擊錯誤按鈕時，正確的殭屍會跳動（往上 25px，0.3秒後落回）
   - 扣 5 分，Combo 歸零
4. **平滑動畫**：殭屍移動到目標位置時有平滑的過渡效果

---

## 🎨 界面說明

### 主選單畫面
- 遊戲標題和規則說明
- **開始遊戲** 按鈕
- **查看排行榜** 按鈕

### 遊戲畫面
```
┌─────────────────────────────┐
│ ⏱️ 60s  💀 120  COMBO × 5    │ ← 頂部資訊欄
├─────────────────────────────┤
│  LEFT  │ CENTER │  RIGHT    │ ← 欄位標籤
│    │      │         │        │
│   🧟    │      🧟      │     │
│    │     🧟        │     🧟   │ ← Canvas遊戲區
│    │      │    🟡🧟←    │     │ ← 黃圈 = 最近
│    │      │    ▼    │     │   │ ← 箭頭指示
│─ ─ ─ ─ ─ ─紅色底線─ ─ ─ ─ ─│
├─────────────────────────────┤
│ [LEFT]  [CENTER]  [RIGHT]   │ ← SHOT按鈕
│  SHOT     SHOT      SHOT     │
└─────────────────────────────┘
```

### 結束畫面
- 最終得分
- 最高 Combo
- 名字輸入框
- **提交分數** 按鈕
- **再玩一次** 按鈕

---

## 🚀 部署方式

### 方法一：GitHub Pages（推薦）

1. Fork 或 Clone 這個倉庫
2. 推送到你的 GitHub
3. 前往 Settings > Pages
4. Source 選擇 `main` 分支
5. 等待部署完成
6. 訪問 `https://[your-username].github.io/[repo-name]/`

### 方法二：本地測試

```bash
# 使用 Python 簡易伺服器
python -m http.server 8000

# 或使用 Node.js http-server
npm install -g http-server
http-server

# 或使用 VS Code Live Server 擴充
```

訪問 `http://localhost:8000` 即可遊玩

---

## 🔧 技術細節

### 技術棧
- **純原生 JavaScript (ES6+)**：無依賴框架
- **Canvas 2D API**：殭屍渲染和動畫
- **Firebase Realtime Database**：線上排行榜
- **LocalStorage**：本地排行榜
- **CSS3 動畫**：按鈕效果和飄字

### 核心算法

#### 1. 找出最接近底線的殭屍（隊列系統）
```javascript
getGlobalNearestZombie() {
  let nearest = null;
  let maxY = -Infinity;

  // 遍歷三條欄位的隊列
  zombieQueues.forEach((queue, colIndex) => {
    if (queue.length > 0) {
      // 隊列最前方的殭屍（Y座標最大的）
      const frontZombie = queue[queue.length - 1];
      if (frontZombie.y > maxY) {
        maxY = frontZombie.y;
        nearest = { zombie: frontZombie, columnIndex: colIndex };
      }
    }
  });

  return nearest;
}
```

#### 2. 射擊判定與隊列更新邏輯
```javascript
handleShot(columnIndex) {
  const nearestInfo = getGlobalNearestZombie();

  if (nearestInfo && nearestInfo.columnIndex === columnIndex) {
    // 命中！移除殭屍並更新隊列
    const queue = zombieQueues[columnIndex];
    queue.pop(); // 移除最前方的殭屍

    // 所有剩餘殭屍往前移動
    queue.forEach(zombie => {
      zombie.targetY += queueSpacing; // +50px
    });

    // 生成新殭屍
    spawnNewZombie();
  } else {
    // 失誤！觸發跳動動畫
    miss(columnIndex, nearestInfo.columnIndex);
    showJumpAnimation(nearestInfo.columnIndex);
  }
}
```

#### 3. 遊戲循環 (requestAnimationFrame)
```javascript
gameLoop() {
  const deltaTime = (currentTime - lastFrameTime) / 1000;

  // 1. 更新時間
  timeLeft -= deltaTime;

  // 2. 更新殭屍動畫（平滑移動到目標位置）
  updateZombieAnimations(deltaTime);

  // 3. 繪製畫面
  draw();

  // 4. 更新UI
  updateUI();

  requestAnimationFrame(gameLoop);
}
```

---

## 🎓 遊戲技巧

### 新手提示
1. 👀 **專注看黃色標記**：不要自己猜，相信系統的高亮提示
2. 🎯 **看箭頭按按鈕**：底部黃色箭頭▼直接告訴你該按哪個
3. 🧠 **不要慌張**：寧可慢一點也不要按錯扣分

### 進階技巧
1. ⚡ **快速判斷**：看清黃色標記後立即按下對應按鈕
2. 🔄 **周邊視覺**：用餘光同時觀察三條欄位的殭屍隊列
3. 💪 **保持 Combo**：失誤一次損失很大，穩定比快更重要

### 高手策略
1. 🎮 **觀察隊列長度**：注意哪條欄位殭屍較多，預判下次可能出現的位置
2. 📐 **快速反應**：殭屍消除後新的最近殭屍可能立即出現在其他欄位
3. 🏆 **分數最大化**：5 Combo 後每次都是15分，盡量不中斷
4. 🧮 **數學計算**：
   - 初始 15 隻殭屍 (3條 × 5隻)
   - 每次命中生成 1 隻新殭屍
   - 60秒內理論最多可以命中數十隻
   - 全部命中且保持高Combo：理論最高分視反應速度而定

---

## 📊 難度分析

### 理論最高分計算（隊列系統）
```
假設全部命中，不失誤：
初始15隻殭屍 + 持續命中生成新殭屍

前4隻：10 × 4 = 40分
第5-9隻：15 × 5 = 75分
第10隻起：20+ 分

60秒估計可打 70-85 隻（更快的節奏）
理論最高分：約 1800-2200 分
```

### 實際難度
- **Easy (0-300分)**：學習階段
- **Normal (300-700分)**：掌握基本節奏
- **Hard (700-1200分)**：高 Combo 維持
- **Expert (1200-1600分)**：極少失誤
- **Master (1600+分)**：接近理論極限

---

## 🛠️ 自訂修改

### 調整遊戲參數

**修改遊戲時間** (game.js:22)
```javascript
this.timeLeft = 60; // 改成 90 秒更輕鬆
```

**修改生成速度** (game.js:27)
```javascript
this.spawnInterval = 700; // 改成 1000 更慢，500 更快
```

**修改殭屍速度** (game.js:238)
```javascript
const speed = 150 + Math.random() * 80; // 改成 100 + 50 更慢，200 + 100 更快
```

**修改時間懲罰** (game.js:204)
```javascript
this.timeLeft = Math.max(0, this.timeLeft - 2); // 改成 -1 更寬容
```

**修改 Combo 倍率** (game.js:290)
```javascript
const multiplier = 1 + Math.floor(this.combo / 5) * 0.5;
// 改成 / 3 更快加倍
// 改成 * 1.0 每次多加1倍
```

### 視覺自訂

**修改主題顏色** (styles.css:10)
```css
background: linear-gradient(135deg, #1a0000 0%, #4a0000 100%);
/* 改成藍色主題 */
background: linear-gradient(135deg, #001a3a 0%, #004a8a 100%);
```

**修改按鈕顏色** (styles.css:271)
```css
background: linear-gradient(145deg, #cc0000, #990000);
/* 改成綠色 */
background: linear-gradient(145deg, #00cc00, #009900);
```

---

## 🐛 常見問題

### Q: 殭屍不出現？
**A**: 檢查 `suyu.jpg` 是否存在且路徑正確

### Q: 音效不播放？
**A**: 某些瀏覽器需要用戶互動後才允許播放音效，點擊開始遊戲後即可

### Q: 排行榜不更新？
**A**: 檢查 Firebase 配置和網路連線

### Q: 手機版顯示異常？
**A**: 使用現代瀏覽器（Chrome/Safari），開啟全螢幕模式

### Q: Canvas 模糊？
**A**: 這是正常現象，遊戲設計為 360x640 解析度

---

## 📱 瀏覽器支援

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ iOS Safari 14+
- ✅ Android Chrome

---

## 🎮 版本歷史

### v3.0.0 (當前版本) - ShotZombie 模式
- 🎯 全新 ShotZombie 玩法
- 🎮 3欄位射擊機制
- 🟡 黃色高亮標記系統
- 🔻 底部箭頭指示
- 💯 Combo 倍率系統
- ⏱️ 60秒限時挑戰
- 🏆 本地/線上雙排行榜
- 📱 完整手機版支援

### v2.0.0 - 殭屍防禦模式
- 橫向移動殭屍
- 3條生命系統
- 波數難度遞增

### v1.0.0 - 追逐戰模式
- 30秒限時點擊
- 隨機位置跳躍

---

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

### 改進建議
- [ ] 添加音效開關
- [ ] 多種殭屍類型（快速/慢速/坦克）
- [ ] 道具系統（減速/炸彈/多倍分數）
- [ ] 成就系統
- [ ] 每日挑戰
- [ ] 多人對戰模式
- [ ] 觸覺反饋 (手機震動)
- [ ] 更多視覺特效

---

## 📄 授權

本專案採用 MIT 授權。

---

## 🙏 致謝

- 靈感來源：經典手機遊戲 **ShotZombie**
- 圖片素材：suyu.jpg
- 音效：god.mp3
- 框架：Firebase Realtime Database

---

**準備好挑戰你的反應速度了嗎？開始遊戲吧！** 🎮🧟

**遊戲網址**：https://h8y8.github.io/suyu/
