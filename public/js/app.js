window.addEventListener('load', function() {
    const {createApp} = Vue;
    createApp({
        data(){return{
            showToast: false,
            lightboxItem: null,
            careImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png', 
            aboutImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png',
            
            curTab: 'about',
            openGene: null,
            logoUrl: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E5%8E%BB%E8%83%8C.png', 
            admin:false, loading:false, kw:'', sp:'豹紋守宮', editMode:false,
            aKw:'', aFil:'All',
            lineLink:'https://line.me/R/ti/p/@219abdzn', 
            
            marqueeList: [{text:'📢 載入中...', url:''}],
            
            wishlist: [],
            history: [],
            sortOrder: 'default',
            showOnlyFav: false,
            showOnlyHistory: false,
            showBackTop: false,

            // Articles Variables
            articlesList: [],
            readingArticle: null,
            articlesLoaded: false,
            artCat: 'All',

            inv:[],
            newI:{Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:''},
            db:{
                '豹紋守宮':{'顯性':['白黃','奧本雪花','寶石雪花','謎','蠟筆'],'隱性':['川普白化','貝爾白化','雨水白化','日蝕','暴風雪','莫菲無紋','慾望黑眼','超級巨人'],'共顯性':['馬克雪花','檸檬霜'],'多遺傳':['土匪','反直線','直線','亂紋','高黃','橘化','黑夜','薰衣草']},
                '肥尾守宮':{'顯性':['直線'],'隱性':['幽靈','祖魯','無紋','焦糖','橘白','奧利奧'],'共顯性':['立可白','零']}
            },
            tags:{'豹紋守宮':['黑夜','蜜橘','紅鑽石','土匪'],'肥尾守宮':['幽靈','橘白','無紋','立可白']},
            geneInfo: {
                '白黃': 'White&Yellow，又稱WY。能夠顯著淡化守宮的體色，增加白色和黃色調，使整體顏色更明亮。少數WY會有搖頭晃腦的症狀。',
                '奧本雪花': 'TUG Snow，出生時黑白分明，成年後體色底色仍較白。由加拿大奧本繁殖場培育出的雪花，即在野生種群中把缺黄個體選育的雪花個體。',
                '寶石雪花': 'Gem Snow，出生時黑白分明，成年後體色底色仍較白。由Reptilian Gems培育出的雪花，和其它雪花相比，寶石雪花的黑斑會更大一點。',
                '謎': '神經系統的先天發育不全，會導致動作不協調甚至翻滾。體色部分會抑制蘿蔔尾的表現，增強聚色及改變紋路。與部分基因結合的會有特殊眼。',
                '蠟筆': '有較為鮮豔的色塊表現，有很好的提亮效果。可以單親代影響性狀，也可能是多遺傳基因。',
                '川普白化': '是市場上出現的第一種白化豹紋守宮,顔色較深,花紋接近於淺咖啡色。',
                '貝爾白化': '是第三個被繁殖出來的白化基因。顔色相較其他兩種是最深的，且身上帶有點狀花紋。眼睛的顔色也是最紅的。',
                '雨水白化': '是第二個被繁殖出來的白化基因，顔色較淺，眼睛色素較深。',
                '日蝕': '色素對虹膜的覆蓋，使眼睛有部分（蛇眼）或全部實心（實心眼）的表現，有白鼻頭及白手套，一般會使體色變淡。',
                '暴風雪': '出生身體就是無紋。幼體為灰色，逐漸轉變為灰白色或夾帶黃色。',
                '莫菲無紋': '出生時有紋路，隨著成長而消失。成體多為黃色或淡黃色，抑制蘿蔔尾表現。',
                '慾望黑眼': 'NDBE，特殊眼，可以提供更濃郁的體色。眼部會隨著成長逐漸萎縮，母多不孕。',
                '超級巨人': '已由川普爺爺證實為隱性基因。雄性的體重可達110公克，而雌性的體重可達90公克以上。',
                '馬克雪花': '超級模式為超級雪花。幼體剛出生時是黑白相間，黑色部分會逐漸變紫，白色部分會轉變成黃色。',
                '檸檬霜': '體色呈現濃郁的螢光黃，是一種色素細胞突變，全身上下都是異常增生的虹膜細胞，隨時可能會長腫瘤。',
                '土匪': '鼻子有明顯黑斑或橫紋。依照頭部或身體的不同表現會有不同路線。',
                '反直線': '除紋路以外留下的區域會形成明顯的直線。',
                '直線': '深色條紋從背部到尾延伸。(肥尾守宮：直線)',
                '亂紋': '斑紋不規則、斷裂。',
                '高黃': '黃色底色明亮，斑點較少。',
                '橘化': '體色呈鮮橘色調，常與其他基因結合。',
                '黑夜': '黑色素覆蓋部分或全部身體。',
                '薰衣草': '體色呈淡紫色。',
                '幽靈': '這個基因使得黑色素極度減少，但是並不能完全的消除。極端個體可以表現出鮮豔的淡紫色。母為顯性則不孕。',
                '祖魯': '背上的直線閃電紋形成了類似肥尾守宮原產地土著捕獵工具”祖魯”的矛頭而得名。',
                '無紋': '顏色可呈現深棕色、褐色，整體單色調，沒有明顯橫紋斑紋。',
                '焦糖': '以金黃、淺棕、橘棕為主色調，整體溫暖柔和。母為顯性則不孕。',
                '橘白': '由不同色度的橙色黃色和桃色等暖色調橫斑覆蓋在淺色身體上。',
                '奧利奧': '是一種抑制紅色與黃色基因控制的性狀，使守宮呈現黑白體色。',
                '立可白': '奶白或米白為底色，上覆橘棕至深棕色的碎斑、塊狀或渲染花紋，幾乎看不到原本的整齊環帶。超級模式致死。',
                '零': '缺乏或者根本沒有淺色橫帶紋在身體中部，深色的橫帶連接成一體。'
            },
            geneImages: { '黑夜': '', '立可白': '' },
            
            faqList: [
                {title:'Q1：購買前的須知與權益？ (必讀)', ans:'Gencko 工作室出貨前皆確認個體 100% 健康。\n購買視同同意以下事項：\n1. 開箱請全程錄影。\n2. 購買前請做足功課，本社群與官方皆可無償教學。'},
                {title:'Q2：運送方式與包裝安全嗎？', ans:'我們提供黑貓宅配與面交服務。\n宅配使用專業紙箱與穩固緩衝包材，確保內部透氣與穩定，讓個體安全抵達。\n(視情況使用暖暖包/冰袋)'},
                {title:'Q3：運送風險與退款機制？', ans:'若收件後開箱錄影發現個體死亡，我們將全額退款或補寄等值個體。\n請務必在收件後 24 小時內回報，逾期將無法受理。'},
                {title:'Q4：收到後發現有缺陷或問題？', ans:'若個體有缺陷且本工作室無事先告知，經提供錄影證明無調包嫌疑後，本方無條件退款。'},
                {title:'Q5：選育個體長大後顏色不如預期？', ans:'本工作室不進行退換貨。\n守宮體色隨成長變化，若非常在意未來表現，建議購買已發色之成體。'},
                {title:'Q6：關於性別判斷準確率？', ans:'亞成體與成體性別判斷準確率極高。幼體我們會依照孵化溫度提供「機率」參考（如 90% 公），但不保證 100% 準確，購買幼體請知悉此風險。'},
                {title:'Q7：可以先付訂金保留嗎？', ans:'可以。支付 30% 訂金可保留 14 天。若超過保留期限未補足尾款，訂金恕不退還。'}
            ],
            
            reviewsList: [
                {text: '', author: '', img: ''},
                {text: '', author: '', img: ''},
                {text: '', author: '', img: ''}
            ]
        }},
        computed:{
            articleCats() {
                if(!this.articlesList.length) return [];
                return [...new Set(this.articlesList.map(i => i.Category).filter(c => c))];
            },
            filteredArticles() {
                if(this.artCat === 'All') return this.articlesList;
                return this.articlesList.filter(i => i.Category === this.artCat);
            },
            shopList(){
                let l=this.inv.filter(i=>i.Species===this.sp && i.Status!=='Trash' && i.Status!=='NotForSale');
                if(this.kw) l=l.filter(i=>JSON.stringify(i).toLowerCase().includes(this.kw.toLowerCase()));
                if(this.showOnlyFav) l=l.filter(i=>this.wishlist.includes(i.ID));
                if(this.showOnlyHistory) l=l.filter(i=>this.history.includes(i.ID));
                
                return l.sort((a,b)=>{
                    const statA = a.Status === 'Sold' ? 1 : 0;
                    const statB = b.Status === 'Sold' ? 1 : 0;
                    if(statA !== statB) return statA - statB;

                    const imgA = a.ImageURL ? 1 : 0;
                    const imgB = b.ImageURL ? 1 : 0;
                    if(imgA !== imgB) return imgB - imgA;

                    const priceA = Number(a.ListingPrice)||0;
                    const priceB = Number(b.ListingPrice)||0;
                    
                    if(this.sortOrder === 'price_asc') return priceA - priceB;
                    if(this.sortOrder === 'price_desc') return priceB - priceA;
                    
                    return priceB - priceA;
                });
            },
            breedersList(){
                let l = this.inv.filter(i => i.Species===this.sp && i.Status==='NotForSale' && i.Status!=='Trash');
                return l.sort((a,b)=> {
                    const imgA = a.ImageURL ? 1 : 0;
                    const imgB = b.ImageURL ? 1 : 0;
                    if(imgA !== imgB) return imgB - imgA; 
                    return new Date(b.CreatedDate) - new Date(a.CreatedDate); 
                });
            },
            adminList(){
                let l=this.inv;
                if(this.aFil!=='All') l=l.filter(i=>i.Status===this.aFil);
                if(this.aKw) l=l.filter(i=>i.ID.toLowerCase().includes(this.aKw.toLowerCase()));
                return l.sort((a,b)=>{
                    const aS=a.Status==='Sold'?1:0; const bS=b.Status==='Sold'?1:0;
                    if(aS!==bS) return aS-bS; return new Date(b.CreatedDate)-new Date(a.CreatedDate);
                });
            },
            dash(){
                const c=this.inv.reduce((s,i)=>s+(+i.CostPrice||0),0);
                const v=this.inv.filter(i=>i.Status==='Sold').reduce((s,i)=>s+(+i.SoldPrice||0),0);
                const cnt=this.inv.filter(i=>i.Status==='ForSale'||i.Status==='NotForSale').length;
                return {cost:c, val:v, count:cnt};
            },
            morphHis(){ return [...new Set(this.inv.map(i=>i.Morph))]; }
        },
        mounted(){ 
            this.load(); 
            const savedWish = localStorage.getItem('gencko_wishlist');
            if(savedWish) this.wishlist = JSON.parse(savedWish);
            const savedHist = localStorage.getItem('gencko_history');
            if(savedHist) this.history = JSON.parse(savedHist);
            this.loadConfig();
            
            setTimeout(() => {
                const loader = document.getElementById('loader');
                if(loader) loader.style.opacity = '0';
                setTimeout(() => { if(loader) loader.style.display = 'none'; }, 500);
            }, 1000);

            window.addEventListener('scroll', () => {
                this.showBackTop = window.scrollY > 300;
            });
        },
        methods:{
            // API Helper
            async api(url, method = 'GET', body = null) {
                const opts = { method, headers: { 'Content-Type': 'application/json' } };
                if (body) opts.body = JSON.stringify(body);
                try {
                    const res = await fetch(url, opts);
                    return await res.json();
                } catch (e) {
                    console.error('API Error:', e);
                    throw e;
                }
            },

            // --- Fetch Replacement Methods ---
            toArticles() {
                this.curTab = 'articles';
                this.readingArticle = null;
                if (!this.articlesLoaded) {
                    this.loadArticles();
                }
            },
            async loadArticles() {
                this.loading = true;
                try {
                    const r = await this.api('/api/articles');
                    if (r.status === 'success') {
                        this.articlesList = r.data;
                        this.articlesLoaded = true;
                    }
                } catch(e) {}
                this.loading = false;
            },
            openArticle(item) {
                this.readingArticle = item;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            closeArticle() {
                this.readingArticle = null;
                window.scrollTo({ top: 0, behavior: 'smooth' });
            },
            fmtDate(d) {
                if(!d) return '';
                try {
                    const date = new Date(d);
                    if(isNaN(date.getTime())) return '';
                    return date.toISOString().split('T')[0];
                } catch(e){ return ''; }
            },

            toShop() { this.curTab = 'shop'; this.sp = '豹紋守宮'; this.kw=''; }, 
            changeSpecies(s) { this.sp = s; this.kw = ''; },
            toggleTag(t) { this.kw = (this.kw === t) ? '' : t; },

            toggleGene(g) { if (this.openGene === g) { this.openGene = null; } else { this.openGene = g; } },
            getGeneInfo(g) { return this.geneInfo[g] || (g + " 的詳細介紹撰寫中..."); },
            getGeneImg(g) { return this.geneImages[g] || ''; }, 
            
            convertLink(url) {
                if (!url) return '';
                const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
                const match = url.match(driveRegex);
                if (match && match[1]) {
                    return 'https://lh3.googleusercontent.com/d/' + match[1];
                }
                return url;
            },
            toggleWishlist(id) {
                const idx = this.wishlist.indexOf(id);
                if(idx > -1) this.wishlist.splice(idx, 1);
                else this.wishlist.push(id);
                localStorage.setItem('gencko_wishlist', JSON.stringify(this.wishlist));
            },
            toggleHistoryMode() {
                this.showOnlyHistory = !this.showOnlyHistory;
                if(this.showOnlyHistory) this.showOnlyFav = false;
            },
            
            openLightbox(i) { 
                this.lightboxItem = i;
                if(!this.history.includes(i.ID)) {
                    this.history.unshift(i.ID);
                    if(this.history.length > 20) this.history.pop();
                    localStorage.setItem('gencko_history', JSON.stringify(this.history));
                }
            },
            closeLightbox() { 
                this.lightboxItem = null;
            },
            
            scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }); },

            async load(){
                this.loading=true;
                try {
                    const r = await this.api('/api/inventory');
                    if(r.status==='success') {
                        this.inv = r.data.map(i => {
                            try { i.Genes = JSON.parse(i.Genes) } catch(e) { i.Genes = [] } 
                            return i;
                        });
                    }
                } catch(e) { console.error(e); }
                this.loading=false;
                const loader = document.getElementById('loader');
                if(loader) { loader.style.opacity='0'; setTimeout(()=>loader.style.display='none', 500); }
            },
            async loadConfig() {
                try {
                    const r = await this.api('/api/announcement');
                    if(r.status === 'success' && r.list) this.marqueeList = r.list;
                } catch(e){}
            },

            async submit(){
                if(!this.newI.Morph) return alert('請填寫品系');
                this.loading=true;
                const payload = JSON.parse(JSON.stringify(this.newI));
                
                try {
                    if(this.editMode) {
                        await this.api('/api/product', 'PUT', payload);
                        alert('修改成功');
                        this.load();
                        this.cancelEdit();
                    } else {
                        const r = await this.api('/api/product', 'POST', payload);
                        if (r.status === 'success') {
                            alert('上架成功 ID:' + r.id);
                            this.load();
                            this.resetForm();
                        }
                    }
                } catch(e) { alert('操作失敗: ' + e); }
                this.loading=false;
            },
            edit(i) { this.newI = JSON.parse(JSON.stringify(i)); this.editMode = true; document.getElementById('form-top').scrollIntoView({behavior: 'smooth'}); },
            cancelEdit() { this.editMode = false; this.resetForm(); },
            resetForm() { this.newI = {Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:''}; },
            
            async upd(i){ 
                await this.api('/api/product', 'PUT', i);
            },
            async chkStat(i){
                if(i.Status==='Sold'){
                    const p = prompt('請輸入成交價格', i.ListingPrice);
                    if(p){ 
                        i.SoldPrice=p; const c=prompt('客戶資料'); i.CustomerInfo=c; 
                        if(c){ 
                            const r = await this.api('/api/blacklist', 'POST', { phone: c });
                            if(r.isBlacklisted) alert('⚠️ 黑名單警告！\n原因：'+r.reason);
                        }
                    } else { i.Status='ForSale'; }
                }
                this.upd(i);
            },
            async dup(i){ 
                if(confirm('複製?')){
                    let c=JSON.parse(JSON.stringify(i)); 
                    delete c.ID; delete c.CreatedDate; 
                    const r = await this.api('/api/product', 'POST', c);
                    if(r.status === 'success') {
                        alert('新ID:' + r.id);
                        this.load();
                    }
                } 
            },
            del(i){ if(confirm('移入垃圾桶?')){ i.Status='Trash'; this.upd(i); } },
            login(){ if(prompt('密碼')==='8888') this.admin=true; },
            
            copy(t){ 
                navigator.clipboard.writeText(t).then(() => {
                    this.showToast = true;
                    setTimeout(() => this.showToast = false, 2000);
                }); 
            },
            logSearch(){ if(this.kw) this.api('/api/search', 'POST', { keyword: this.kw }); },
            fmtG(g){ return Array.isArray(g)?g.join(' + '):g; },
            isNew(d){ return (new Date()-new Date(d))/86400000 < 7; },
            fmtSex(i){
                if(i.GenderType==='溫度'){
                    let t=+i.GenderValue;
                    if(t>=31)return t+'°C (90%公)'; if(t>=30)return t+'°C (75%公)';
                    if(t>=28)return t+'°C (均)'; if(t>=27)return t+'°C (75%母)';
                    return t+'°C (90%母)';
                }
                return i.GenderType;
            },
            getSexCls(i){
                if(i.GenderType==='公'||(i.GenderType==='溫度'&& +i.GenderValue>=30))return 'male';
                if(i.GenderType==='母'||(i.GenderType==='溫度'&& +i.GenderValue<=27))return 'female';
                return 'mix';
            }
        }
    }).mount('#app');
});