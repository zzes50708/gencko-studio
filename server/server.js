const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

const apiRoutes = require('./routes/api');

app.use(cors());
app.use(express.json());
// 關鍵：將 ../public 設定為靜態資源目錄
app.use(express.static(path.join(__dirname, '../public')));

// 掛載 API
app.use('/api', apiRoutes);

// 所有未匹配路由導向 index.html (SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// 僅在本地開發時啟動 Port 監聽 (Vercel 會自動處理請求，不需要 app.listen)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// 必須匯出 app 供 Vercel (api/index.js) 使用
module.exports = app;