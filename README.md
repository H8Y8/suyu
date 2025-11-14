# 孫叔殭屍防禦戰 (Suyu Zombie Defense)

一個有趣的網頁塔防射擊遊戲，玩家需要點擊消滅從右邊來襲的殭屍，保衛左側防線。

## 遊戲特色

### 核心玩法
- 🧟 殭屍從右邊生成，沿著3條路徑向左移動
- 🎯 點擊殭屍消滅它們，獲得分數
- ❤️ 3條生命值，殭屍突破防線扣1條命
- 📈 難度遞增：每消滅10隻殭屍升級一波，速度加快
- 💥 點擊特效和音效反饋

### 遊戲系統
- ⏱️ 無限生存模式（直到生命耗盡）
- 🏆 本地/線上排行榜系統
- 📱 完美支援手機和電腦
- 🎨 炫酷的粒子爆炸效果
- 🔥 使用 Firebase 實現多人排行榜

## 遊戲規則

### 得分系統
- 消滅一隻殭屍：+1 分
- 每 10 隻殭屍：升級一波

### 難度遞增
- **初始速度**：2 像素/幀
- **生成間隔**：2 秒
- **每波提升**：
  - 速度 +0.5 像素/幀
  - 生成間隔 -0.2 秒（最快 0.8 秒）

### 生命系統
- 初始 3 條生命 ❤️
- 殭屍到達左側防線 = -1 生命
- 生命歸零 = 遊戲結束

## 遊戲截圖說明

遊戲畫面包含：
- **頂部資訊欄**：顯示消滅數、生命、波數
- **遊戲區域**：3條橫向路徑
- **紅色防線**：左側閃爍的警戒線
- **殭屍**：帶紅色光暈的移動目標
- **排行榜**：桌面版固定顯示，手機版可折疊

## 部署步驟

### 1. 準備檔案
確保你有以下檔案：
- index.html - 主頁面
- game.js - 遊戲邏輯
- styles.css - 樣式表
- firebase-config.js - Firebase 配置
- suyu.jpg - 殭屍圖片（60x60px）
- god.mp3 - 音效檔案
- favicon.png - 網站圖標
- manifest.json - PWA 配置

### 2. Firebase 設置

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 創建新專案或使用現有專案
3. 啟用 Realtime Database
   - 選擇 "測試模式" 或配置安全規則
   - 選擇最近的地區
4. 複製 Firebase 配置到 `firebase-config.js`

**安全規則建議**：
```json
{
  "rules": {
    "zombie-leaderboard": {
      ".read": true,
      ".write": true,
      ".indexOn": ["score"]
    }
  }
}
```

### 3. 部署方式

#### 方法一：GitHub Pages（推薦）
1. 在 GitHub 創建儲存庫
2. 上傳所有檔案
3. 前往 Settings > Pages
4. 選擇分支（main 或 zombie-game）
5. 等待部署完成

#### 方法二：其他託管服務
- Netlify - 拖放部署
- Vercel - GitHub 自動部署
- Firebase Hosting - `firebase deploy`
- Cloudflare Pages - Git 整合

#### 方法三：本地測試
1. 安裝 VS Code
2. 安裝 Live Server 擴充
3. 右鍵 index.html > Open with Live Server

## 技術細節

### 遊戲架構
```javascript
class ZombieGame {
  - 遊戲狀態管理
  - 殭屍生成和移動
  - 碰撞檢測
  - 粒子效果系統
  - 排行榜整合
}
```

### 核心算法
- **遊戲循環**：使用 `requestAnimationFrame`
- **殭屍移動**：每幀減少 X 座標
- **路徑分配**：隨機選擇 3 條路徑之一
- **難度調整**：基於分數動態調整

### 性能優化
- Canvas 粒子系統
- DOM 元素重用
- 事件委託
- 防抖動處理

## 自訂修改

### 調整遊戲難度

**修改初始速度**（game.js:14）：
```javascript
this.zombieSpeed = 2; // 改為 3 更難，1 更簡單
```

**修改生成間隔**（game.js:15）：
```javascript
this.spawnInterval = 2000; // 毫秒，改為 1000 更快
```

**修改路徑數量**（game.js:16）：
```javascript
this.lanes = 3; // 改為 5 增加複雜度
```

**修改生命數**（game.js:7）：
```javascript
this.lives = 3; // 改為 5 更簡單
```

### 自訂視覺效果

**修改殭屍顏色**（styles.css:56）：
```css
border: 3px solid rgba(0, 255, 0, 0.5); /* 綠色殭屍 */
```

**修改防線顏色**（styles.css:77-82）：
```css
background: linear-gradient(...,
    rgba(0, 0, 255, 0.8) 50%, /* 藍色防線 */
    ...);
```

## 版本歷史

### v2.0.0 (當前版本)
- 🎮 全新殭屍防禦玩法
- 🧟 3 條路徑系統
- 📊 波數難度系統
- ❤️ 生命值機制
- 🏆 獨立排行榜（zombie-leaderboard）

### v1.0.1 (原版追逐戰)
- 點擊追逐玩法
- 30 秒限時
- 本地/線上排行榜

## 遊戲技巧

### 初學者
1. 優先點擊最接近防線的殭屍
2. 保持冷靜，不要慌亂點擊
3. 注意觀察多條路徑

### 進階玩家
1. 預判殭屍移動路線
2. 在高波數時專注於威脅最大的目標
3. 利用殭屍重疊時一次消滅多個

### 高手技巧
1. 計算殭屍到達時間，優化點擊順序
2. 在第 5 波前儘量提升分數
3. 保持連續點擊節奏

## 問題排解

### 殭屍不出現
1. 檢查瀏覽器控制台錯誤
2. 確認 suyu.jpg 存在
3. 清除瀏覽器快取（Ctrl + F5）

### 排行榜不更新
1. 檢查 Firebase 配置
2. 確認網路連接
3. 查看 Firebase 安全規則

### 遊戲卡頓
1. 關閉其他瀏覽器分頁
2. 降低殭屍生成速度
3. 檢查電腦 CPU 使用率

### 手機版問題
1. 確保使用現代瀏覽器（Chrome/Safari）
2. 關閉省電模式
3. 橫向模式可能效果更好

## 開發說明

### 檔案結構
```
/
├── index.html          # 主頁面
├── game.js            # 遊戲邏輯（427行）
├── styles.css         # 樣式表
├── firebase-config.js # Firebase 配置
├── manifest.json      # PWA 配置
├── suyu.jpg          # 殭屍圖片
├── god.mp3           # 音效
└── README.md         # 說明文件
```

### 依賴項
- Firebase SDK 11.0.1
  - firebase-app
  - firebase-database
  - firebase-analytics

### 瀏覽器支援
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 貢獻指南

歡迎提交 Issue 和 Pull Request！

### 建議改進方向
- [ ] 添加音效開關
- [ ] 多種殭屍類型（快速、坦克型等）
- [ ] 道具系統（減速、炸彈等）
- [ ] 成就系統
- [ ] 多語言支援
- [ ] 更多視覺特效

## 授權

本專案採用 MIT 授權。

## 聯絡方式

如有任何問題或建議，歡迎：
- 提出 Issue
- 發送 Pull Request
- 討論遊戲改進

---

**遊戲愉快！祝你能守住防線！** 🧟‍♂️🎯
