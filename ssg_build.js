require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const { create } = require('xmlbuilder2');

const API_URL = process.env.GAS_API_URL + '?action=getAllData';
const DIST_DIR = path.join(__dirname, 'dist');
const TEMPLATE_PATH = path.join(__dirname, 'index.html');

async function build() {
    console.log('🚀 Starting SSG Build...');

    // 1. 準備目錄
    await fs.emptyDir(DIST_DIR);
    await fs.ensureDir(path.join(DIST_DIR, 'product'));
    await fs.ensureDir(path.join(DIST_DIR, 'articles'));
    await fs.ensureDir(path.join(DIST_DIR, 'genes'));
    await fs.ensureDir(path.join(DIST_DIR, 'merch'));
    
    // 複製靜態資源
    await fs.copy(path.join(__dirname, 'js'), path.join(DIST_DIR, 'js'));
    await fs.copy(path.join(__dirname, 'css'), path.join(DIST_DIR, 'css'));
    await fs.copy(path.join(__dirname, 'genes.json'), path.join(DIST_DIR, 'genes.json'));

    // 2. 抓取資料
    console.log('📥 Fetching data from GAS...');
    const { data: apiRes } = await axios.get(API_URL);
    if(apiRes.status !== 'success') throw new Error('API Error');
    const db = apiRes.data;

    const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');

    // 3. 生成首頁
    await generatePage('/', db, template, {
        title: 'Gencko Studio｜專業豹紋守宮選育',
        desc: '專注於豹紋守宮與肥尾守宮的選育與推廣。'
    });

    // 4. 生成商品頁 (Product)
    console.log(`🦎 Generating ${db.inventory.length} product pages...`);
    for (const item of db.inventory) {
        if(item.Status === 'Trash') continue;
        const meta = {
            title: `${item.Morph}｜Gencko Studio`,
            desc: `${item.Morph} (${item.Genes}) - ${item.Status}`,
            image: convertLink(item.ImageURL)
        };
        await generatePage(`/product/${item.ID}`, db, template, meta);
    }

    // 5. 生成文章頁 (Articles)
    console.log(`📝 Generating ${db.articles.length} article pages...`);
    for (const art of db.articles) {
        const meta = {
            title: `${art.Title}｜Gencko Studio`,
            desc: art.Summary.substring(0, 150),
            image: convertLink(art.ImageURL)
        };
        await generatePage(`/articles/${art.ID}`, db, template, meta);
    }

    // 6. 生成基因圖鑑頁 (Genes)
    console.log(`🧬 Generating ${db.genes.length} gene pages...`);
    for (const g of db.genes) {
        let name = g.Name.replace(/ \((豹紋|肥尾)\)$/, ''); // URL 友善化
        // 處理特殊字元
        const safeName = encodeURIComponent(g.Name);
        const meta = {
            title: `${g.Name} 基因介紹｜Gencko Studio`,
            desc: g.Brief,
            image: convertLink(g.ImageURL)
        };
        await generatePage(`/genes/${safeName}`, db, template, meta);
    }

    // 7. 生成周邊商品頁 (Merch)
    for (const m of db.merchandise) {
        const meta = {
            title: `${m.Name}｜周邊商品`,
            desc: m.Description,
            image: convertLink(m.ImageURL)
        };
        await generatePage(`/merch/${m.ItemID}`, db, template, meta);
    }

    // 8. 生成其他靜態頁面
    const staticPages = ['about', 'care', 'shop', 'articles', 'genes', 'merch', 'faq', 'breeders', 'qs', 'health', 'hospital', 'calculator'];
    for (const p of staticPages) {
        await generatePage(`/${p}`, db, template, {
            title: `${p.toUpperCase()}｜Gencko Studio`
        });
    }

    // 9. 生成 Sitemap
    const sitemap = create({ version: '1.0', encoding: 'UTF-8' })
        .ele('urlset', { xmlns: 'http://www.sitemaps.org/schemas/sitemap/0.9' });
    
    // Add all generated paths to sitemap (simplified logic)
    // 實務上應在 generatePage 時收集 URL
    sitemap.ele('url').ele('loc').txt('https://gencko.vercel.app/').up().up();
    
    const xml = sitemap.end({ prettyPrint: true });
    await fs.writeFile(path.join(DIST_DIR, 'sitemap.xml'), xml);

    console.log('✅ Build Complete!');
}

async function generatePage(urlPath, data, template, meta) {
    // 替換 Meta Tags
    let html = template
        .replace('<!-- SEO_META -->', `
            <title>${meta.title}</title>
            <meta name="description" content="${meta.desc || ''}">
            <meta property="og:title" content="${meta.title}">
            <meta property="og:description" content="${meta.desc || ''}">
            <meta property="og:image" content="${meta.image || ''}">
            <meta property="og:url" content="https://gencko.vercel.app${urlPath}">
        `)
        .replace('<!-- INITIAL_DATA_PLACEHOLDER -->', `
            <script>window.INITIAL_DATA = ${JSON.stringify(data)};</script>
        `);
    
    // 處理路徑
    let outDir = DIST_DIR;
    if (urlPath !== '/') {
        // remove leading slash, split
        // Decode URI for gene names
        const parts = decodeURIComponent(urlPath).split('/').filter(p => p);
        outDir = path.join(DIST_DIR, ...parts);
    }
    
    await fs.ensureDir(outDir);
    await fs.writeFile(path.join(outDir, 'index.html'), html);
}

function convertLink(url) {
    if (!url) return '';
    const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
    const match = url.match(driveRegex);
    let target = url;
    if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
    return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
}

build().catch(console.error);