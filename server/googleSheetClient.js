const { google } = require('googleapis');
require('dotenv').config();

// ★ 關鍵修正：更強健的私鑰處理邏輯
// Vercel 介面上有時會把 \n 轉義，這裡將其還原為真正的換行符號
const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

// 檢查點：若沒有私鑰，印出錯誤 (不會洩漏金鑰，只報錯)
if (!privateKey) {
  console.error('❌ Fatal Error: GOOGLE_PRIVATE_KEY is missing or invalid.');
}

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    private_key: privateKey,
  },
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

module.exports = { sheets, SPREADSHEET_ID };