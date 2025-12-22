const express = require('express');
const router = express.Router();
const { sheets, SPREADSHEET_ID } = require('../googleSheetClient');

const handleError = (res, err) => {
    console.error('API Error:', err);
    res.status(500).json({ error: err.toString() });
};

// GET: Config/Announcement
router.get('/announcement', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Config!A1:B',
        });
        const rows = response.data.values || [];
        const list = rows.filter(row => row[0]).map(row => ({ text: row[0], url: row[1] || '' }));
        res.json({ status: 'success', list });
    } catch (err) { handleError(res, err); }
});

// GET: Articles
router.get('/articles', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Articles!A2:I',
        });
        const rows = response.data.values || [];
        const articles = rows
            .filter(row => row[0] && row[1])
            .map(row => ({
                ID: row[0], Title: row[1], Category: row[2], Summary: row[3],
                Content: row[4], ImageURL: row[5], Author: row[6], Status: row[7],
                PublishDate: row[8] || ''
            }));
        const published = articles.filter(i => i.Status === 'Published').reverse();
        res.json({ status: 'success', data: published });
    } catch (err) { handleError(res, err); }
});

// GET: Inventory
router.get('/inventory', async (req, res) => {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Inventory!A2:P',
        });
        const rows = response.data.values || [];
        const products = rows.map(row => ({
            ID: row[0], Source: row[1], Species: row[2], Morph: row[3],
            Genes: row[4], GenderType: row[5], GenderValue: row[6], Birthday: row[7],
            CostPrice: row[8], ListingPrice: row[9], SoldPrice: row[10], Status: row[11],
            Note: row[12], ImageURL: row[13], CreatedDate: row[14], PromoEndDate: row[15]
        }));
        res.json({ status: 'success', data: products });
    } catch (err) { handleError(res, err); }
});

// POST: Add Product
router.post('/product', async (req, res) => {
    try {
        const item = req.body;
        const prefix = (item.CostPrice && Number(item.CostPrice) > 0) ? 'P-' : 'S-';
        const newID = prefix + Math.floor(10000 + Math.random() * 90000);
        const genesStr = Array.isArray(item.Genes) ? JSON.stringify(item.Genes) : item.Genes;
        let status = (!item.ListingPrice || item.ListingPrice == 0) ? 'NotForSale' : 'ForSale';
        
        const row = [
            newID, (item.CostPrice > 0) ? '進貨' : '自繁', item.Species, item.Morph,
            genesStr, item.GenderType, item.GenderValue, item.Birthday, item.CostPrice,
            item.ListingPrice, '', status, item.Note, item.ImageURL || '',
            new Date().toISOString(), ''
        ];

        await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Inventory',
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });
        res.json({ status: 'success', id: newID });
    } catch (err) { handleError(res, err); }
});

// PUT: Update Product
router.put('/product', async (req, res) => {
    try {
        const item = req.body;
        if (!item.ID) throw new Error('No ID provided');
        
        const idResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: 'Inventory!A:A',
        });
        const idList = idResponse.data.values ? idResponse.data.values.flat() : [];
        const rowIndex = idList.indexOf(item.ID) + 1;

        if (rowIndex <= 1) return res.json({ status: 'error', message: 'ID not found' });

        const updates = [];
        const addUpdate = (col, val) => updates.push({ range: `Inventory!${col}${rowIndex}`, values: [[val]] });

        if (item.Genes !== undefined) addUpdate('E', typeof item.Genes === 'object' ? JSON.stringify(item.Genes) : item.Genes);
        if (item.ListingPrice !== undefined) addUpdate('J', item.ListingPrice);
        if (item.SoldPrice !== undefined) addUpdate('K', item.SoldPrice);
        if (item.Status !== undefined) addUpdate('L', item.Status);
        if (item.ImageURL !== undefined) addUpdate('N', item.ImageURL);

        if (updates.length > 0) {
            await sheets.spreadsheets.values.batchUpdate({
                spreadsheetId: SPREADSHEET_ID,
                resource: { valueInputOption: 'USER_ENTERED', data: updates }
            });
        }
        
        if (item.Status === 'Sold' && item.SoldPrice) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'SalesLog', valueInputOption: 'USER_ENTERED',
                resource: { values: [[item.ID, item.SoldPrice, item.CustomerInfo || '', new Date().toISOString()]] }
            });
        }
        res.json({ status: 'success' });
    } catch (err) { handleError(res, err); }
});

// POST: Search Log
router.post('/search', async (req, res) => {
    try {
        if (req.body.keyword) {
            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID, range: 'SearchAnalytics', valueInputOption: 'USER_ENTERED',
                resource: { values: [[req.body.keyword, 1, new Date().toISOString()]] }
            });
        }
        res.json({ status: 'logged' });
    } catch (err) { handleError(res, err); }
});

// POST: Blacklist
router.post('/blacklist', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.json({ isBlacklisted: false });
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: 'Blacklist!A:C',
        });
        const rows = response.data.values || [];
        const found = rows.find(row => row[0] == phone);
        res.json({ isBlacklisted: !!found, reason: found ? found[2] : '' });
    } catch (err) { handleError(res, err); }
});

module.exports = router;