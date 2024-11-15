# 孫叔追逐戰 (Suyu Chase Game)

一個簡單有趣的網頁遊戲，玩家需要在限時內點擊移動的頭像來獲得分數。

## 最新更新 (v1.0.1)

### 新功能
- 添加本地/線上排行榜切換功能
- 改進排行榜顯示方式
- 優化手機版界面
- 添加網站圖標（favicon）

### 界面優化
- 改進切換按鈕設計
- 優化手機版排行榜展示
- 加大手機版提交按鈕
- 防止手機版頁面捲動
- 美化本地/線上切換按鈕樣式

### 性能優化
- 加快目標消失和重生速度
- 優化動畫效果
- 改進快取控制

### 問題修復
- 修復手機版排行榜顯示問題
- 修復開始按鈕顯示問題
- 改進版本更新機制

## 遊戲特色

- 30秒限時遊戲
- 即時更新的排行榜系統
- 支援電腦和手機版面
- 點擊特效和音效
- 使用 Firebase 實現多人排行榜
- 本地/線上排行榜切換

## 部署步驟

### 1. 準備檔案
確保你有以下檔案：
- index.html
- styles.css
- game.js
- firebase-config.js
- suyu.jpg (頭像圖片)
- god.mp3 (音效檔案)
- favicon.png (網站圖標)
- manifest.json

### 2. Firebase 設置
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 創建新專案（可以不啟用 Google Analytics）
3. 在專案中創建 Realtime Database
   - 選擇 "測試模式" 開始
   - 選擇最近的地區
4. 在專案設定中獲取 Firebase 配置
5. 將配置資訊填入 firebase-config.js

### 3. 部署方式

#### 方法一：使用 GitHub Pages（推薦）
1. 在 GitHub 創建新儲存庫
2. 上傳所有檔案
3. 前往儲存庫設定 > Pages
4. 選擇分支（通常是 main）並保存
5. 等待部署完成

#### 方法二：使用其他靜態網頁託管服務
- Netlify
- Vercel
- Firebase Hosting
- Cloudflare Pages

#### 方法三：使用本地伺服器測試
1. 安裝 Visual Studio Code
2. 安裝 Live Server 擴充功能
3. 右鍵 index.html 選擇 "Open with Live Server"

## 版本控制
- 使用版本號管理更新
- 添加快取控制
- 自動部署到 Cloudflare

## 注意事項

1. 確保所有檔案名稱正確且區分大小寫
2. firebase-config.js 中的配置資訊需要替換成你自己的
3. 檢查檔案路徑是否正確
4. 確保音效和圖片檔案存在
5. 每次更新後清除快取

## 自訂修改

如果要修改遊戲設定，可以調整以下參數：
- game.js 中的 moveInterval 可以調整移動速度
- 遊戲時間可以在 timeLeft 變數中修改
- styles.css 中可以調整畫面樣式

## 問題排解

如果遇到問題：
1. 檢查瀏覽器控制台是否有錯誤訊息
2. 確認 Firebase 設定是否正確
3. 確保所有檔案都正確上傳
4. 檢查檔案路徑是否正確
5. 使用強制刷新（Ctrl + F5）清除快取

## 授權

本專案採用 MIT 授權。

## 聯絡方式

如有任何問題，歡迎提出 Issue 或 Pull Request。 
