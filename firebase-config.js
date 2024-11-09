// 你的 Firebase 配置
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";

const firebaseConfig = {
    apiKey: "AIzaSyClONxw5yKFXhFwbNQUwo99p1j1uh6sz48",
    authDomain: "suyu-59622.firebaseapp.com",
    databaseURL: "https://suyu-59622-default-rtdb.firebaseio.com",
    projectId: "suyu-59622",
    storageBucket: "suyu-59622.firebasestorage.app",
    messagingSenderId: "839195622579",
    appId: "1:839195622579:web:0ec8f0fcfa53ae8e26c4c6",
    measurementId: "G-1E690WXWFV"
  };

// 初始化 Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);