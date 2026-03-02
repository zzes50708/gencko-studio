import { createWriteStream } from 'fs';
import { SitemapStream, streamToPromise } from 'sitemap';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

// --- 設定區 (請填入與 src/supabase.js 相同的資訊) ---
const SUPABASE_URL = 'https://sfndneptcwhblvrxykcy.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmbmRuZXB0Y3doYmx2cnh5a2N5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MjYxMTcsImV4cCI6MjA4NTMwMjExN30.dN4MHhwjEM26coS9eZAW_eIQJplF8j9YHT9WyFypK3I';
const SITE_URL = 'https://www.gencko.tw'; // 您的正式網域

// 初始化 Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 定義靜態路由 (權重 1.0 = 最高, 0.8 = 次要)
const staticRoutes = [
  { url: '/', changefreq: 'daily', priority: 1.0 },
  { url: '/shop', changefreq: 'hourly', priority: 0.9 },
  { url: '/articles', changefreq: 'daily', priority: 0.9 },
  { url: '/genes', changefreq: 'weekly', priority: 0.8 },
  { url: '/calculator', changefreq: 'monthly', priority: 0.8 },
  { url: '/hospital', changefreq: 'monthly', priority: 0.8 },
  { url: '/about', changefreq: 'monthly', priority: 0.5 },
  { url: '/care', changefreq: 'monthly', priority: 0.6 },
  { url: '/faq', changefreq: 'monthly', priority: 0.5 },
  { url: '/breeders', changefreq: 'monthly', priority: 0.7 },
  { url: '/merch', changefreq: 'weekly', priority: 0.8 },
];

async function generateSitemap() {
  console.log('🗺️  開始生成 Sitemap...');
  
  const smStream = new SitemapStream({ hostname: SITE_URL });
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // 輸出到 public 資料夾，這樣 Vite 打包時會直接複製到根目錄
  const writePath = path.resolve(__dirname, '../public/sitemap.xml');
  const writeStream = createWriteStream(writePath);

  smStream.pipe(writeStream);

  // 1. 寫入靜態路由
  staticRoutes.forEach(route => smStream.write(route));

  try {
    // 2. 抓取商品 (Inventory)
    console.log('📦 正在抓取商品資料...');
    const { data: products } = await supabase
      .from('inventory')
      .select('id, updated_at, status');
    
    if (products) {
      products.forEach(p => {
        // 只收錄未售出或高價值的頁面，這裡全收錄
        smStream.write({
          url: `/product/${p.id}`,
          changefreq: 'weekly',
          priority: p.status === 'ForSale' ? 0.8 : 0.6,
          lastmod: p.updated_at
        });
      });
    }

    // 3. 抓取文章 (Articles)
    console.log('📝 正在抓取文章資料...');
    const { data: articles } = await supabase
      .from('articles')
      .select('id, publish_date, status')
      .eq('status', 'Published'); // 只抓已發布

    if (articles) {
      articles.forEach(a => {
        smStream.write({
          url: `/articles/${a.id}`,
          changefreq: 'monthly',
          priority: 0.7,
          lastmod: a.publish_date
        });
      });
    }

    // 4. 抓取基因圖鑑 (Genes)
    console.log('🧬 正在抓取基因圖鑑...');
    const { data: genes } = await supabase
      .from('genetic_pages')
      .select('name');

    if (genes) {
      genes.forEach(g => {
        smStream.write({
          url: `/genes/${encodeURIComponent(g.name)}`,
          changefreq: 'monthly',
          priority: 0.7
        });
      });
    }

    // 5. 抓取周邊商品 (Merch)
    console.log('🛍️ 正在抓取周邊商品...');
    const { data: merch } = await supabase
        .from('merchandise')
        .select('item_id');
    
    if (merch) {
        merch.forEach(m => {
            smStream.write({
                url: `/merch/${m.item_id}`,
                changefreq: 'weekly',
                priority: 0.7
            });
        });
    }

  } catch (error) {
    console.error('❌ Sitemap 生成失敗:', error);
  } finally {
    smStream.end();
    await streamToPromise(smStream);
    console.log('✅ Sitemap 生成完畢！路徑:', writePath);
  }
}

generateSitemap();