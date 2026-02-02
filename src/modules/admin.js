import { store } from '../store.js';
import { _supabase } from '../supabase.js';

export const adminLogic = {
    data() {
        return {
            newI: {Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:'', IsHot: ''},
            editMode: false,
            aKw: '', 
            aFil: 'All'
        };
    },
    computed: {
        adminList() {
            let l = store.inv;
            // 1. Status Filter
            if(this.aFil !== 'All') l = l.filter(i => i.Status === this.aFil);
            
            // 2. Keyword Search (ID, Morph, Note)
            if(this.aKw) {
                const k = this.aKw.toLowerCase();
                l = l.filter(i => 
                    (i.ID && i.ID.toLowerCase().includes(k)) || 
                    (i.Morph && i.Morph.toLowerCase().includes(k)) || 
                    (i.Note && i.Note.toLowerCase().includes(k))
                );
            }

            // 3. Sorting: Image First -> Cost Desc
            return l.sort((a, b) => {
                const hasImgA = a.ImageURL ? 1 : 0;
                const hasImgB = b.ImageURL ? 1 : 0;
                // Priority 1: Has Image
                if(hasImgA !== hasImgB) return hasImgB - hasImgA;
                // Priority 2: Cost Price (High to Low)
                return (Number(b.CostPrice)||0) - (Number(a.CostPrice)||0);
            });
        },
        dash() {
            const c = store.inv.reduce((s,i) => s + (+i.CostPrice||0), 0);
            const v = store.inv.filter(i => i.Status === 'Sold').reduce((s,i) => s + (+i.SoldPrice||0), 0);
            const cnt = store.inv.filter(i => i.Status === 'ForSale' || i.Status === 'NotForSale').length;
            return { cost: c, val: v, count: cnt };
        },
        morphHis() { return [...new Set(store.inv.map(i => i.Morph))]; }
    },
    methods: {
        // --- 新增 / 編輯商品 ---
        async submit(){
            if(!this.newI.Morph) return alert('請填寫品系');
            store.loading = true;
            try {
                const payload = {
                    source: (this.newI.CostPrice > 0) ? '進貨' : '自繁',
                    species: this.newI.Species,
                    morph: this.newI.Morph,
                    genes: JSON.stringify(this.newI.Genes),
                    gender_type: this.newI.GenderType,
                    gender_value: this.newI.GenderValue,
                    birthday: this.newI.Birthday,
                    cost_price: this.newI.CostPrice,
                    listing_price: this.newI.ListingPrice,
                    status: this.newI.ListingPrice ? 'ForSale' : 'NotForSale',
                    note: this.newI.Note || '',
                    image_url: this.newI.ImageURL || '',
                    is_hot: this.newI.IsHot || ''
                };

                if (this.editMode) {
                    const { error } = await _supabase
                        .from('inventory')
                        .update(payload)
                        .eq('id', this.newI.ID);
                    if(error) throw error;
                    alert('修改成功');
                } else {
                    const prefix = (this.newI.CostPrice > 0) ? 'P-' : 'S-';
                    const newID = prefix + Math.floor(10000 + Math.random() * 90000);
                    payload.id = newID;
                    payload.status = 'NotForSale';
                    
                    const { error } = await _supabase.from('inventory').insert([payload]);
                    if(error) throw error;
                    alert('上架成功 (ID: '+newID+')');
                }
                if(this.loadDataFromAPI) await this.loadDataFromAPI();
                this.cancelEdit();
            } catch(e) { alert('失敗: ' + e.message); }
            store.loading = false;
        },
        edit(i) { 
            this.newI = JSON.parse(JSON.stringify(i)); 
            this.editMode = true; 
            // 若切換到編輯模式，自動捲動到編輯器
            const editor = document.querySelector('.admin-editor-panel');
            if(editor) editor.scrollIntoView({behavior:'smooth'}); 
        },
        cancelEdit() { this.editMode = false; this.resetForm(); },
        resetForm() { 
            this.newI = {Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:'', IsHot:''}; 
        },
        
        // --- 狀態更新 ---
        async chkStat(i){
             let newStatus = i.Status;
             let soldPrice = i.SoldPrice;
             if(newStatus==='Sold'){
                const p = prompt('成交價', i.ListingPrice);
                if(p){ soldPrice=p; } 
                else { i.Status='ForSale'; return; }
             }
             try {
                 const { error } = await _supabase
                    .from('inventory')
                    .update({ status: newStatus, listing_price: i.ListingPrice, sold_price: soldPrice })
                    .eq('id', i.ID);
                 if(error) throw error;
             } catch(e) {
                 alert('更新失敗: ' + e.message);
                 if(this.loadDataFromAPI) this.loadDataFromAPI();
             }
        },

        // --- 快速更新 (原地編輯支援) ---
        async upd(i) {
            try {
                const cleanID = String(i.ID).trim();
                const updateData = {
                    morph: i.Morph,
                    cost_price: i.CostPrice,
                    listing_price: i.ListingPrice,
                    birthday: i.Birthday,
                    note: i.Note,
                    is_hot: i.IsHot || ''
                };
                const { error } = await _supabase.from('inventory').update(updateData).eq('id', cleanID);
                if(error) throw error;
                
                // 本地同步更新熱門列表 (Store)
                if (i.IsHot === 'Hot') {
                    if (!store.hotList.find(h => h.ID === i.ID)) store.hotList.push(i);
                } else {
                    store.hotList = store.hotList.filter(h => h.ID !== i.ID);
                }
            } catch(e) { alert('更新失敗: ' + e.message); }
        },

        // --- 複製商品 ---
        async dup(i){ 
            if(!confirm('複製?')) return;
            try {
                const prefix = (i.CostPrice > 0) ? 'P-' : 'S-';
                const newID = prefix + Math.floor(10000 + Math.random() * 90000);
                const payload = {
                    id: newID,
                    source: i.Source,
                    species: i.Species,
                    morph: i.Morph,
                    genes: JSON.stringify(i.Genes),
                    gender_type: i.GenderType,
                    gender_value: i.GenderValue,
                    birthday: i.Birthday,
                    cost_price: i.CostPrice,
                    listing_price: i.ListingPrice,
                    status: 'NotForSale',
                    note: i.Note || '',
                    image_url: i.ImageURL || '',
                    is_hot: i.IsHot || ''
                };
                const { error } = await _supabase.from('inventory').insert([payload]);
                if(error) throw error;
                alert('複製成功 (ID: '+newID+')');
                if(this.loadDataFromAPI) this.loadDataFromAPI();
            } catch(e) { alert(e.message); }
        },

        // --- 刪除商品 ---
        async del(i){ 
            if(!confirm('刪除至垃圾桶?')) return;
            try {
                const { error } = await _supabase.from('inventory').update({status:'Trash'}).eq('id', i.ID);
                if(error) throw error;
                if(this.loadDataFromAPI) this.loadDataFromAPI();
            } catch(e) { alert(e.message); }
        }
    }
};