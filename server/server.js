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

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

// 為了 Vercel Serverless
module.exports = app;