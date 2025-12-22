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

// 【修改處】僅在「非」模組引用時（也就是本地執行 node server/server.js 時）才啟動監聽
// Vercel 環境中，這個檔案是被 require 的，所以不會執行這裡，避免佔用 Port 導致錯誤
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

// 【新增處】必須匯出 app，讓 api/index.js 可以接收
module.exports = app;