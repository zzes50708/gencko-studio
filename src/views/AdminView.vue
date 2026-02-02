<script>
export default {
    name: 'AdminView',
    props: {
        // 資料與狀態
        loading: { type: Boolean, default: false },
        dash: { type: Object, required: true },
        adminList: { type: Array, default: () => [] },
        morphHis: { type: Array, default: () => [] },
        db: { type: Object, default: () => ({}) },
        // 編輯器狀態
        editMode: { type: Boolean, default: false },
        newI: { type: Object, required: true },
        // 搜尋狀態
        aKw: { type: String, default: '' },
        aFil: { type: String, default: 'All' }
    },
    emits: [
        'update:newI', 'update:aKw', 'update:aFil', 'update:editMode',
        'submit', 'cancel-edit', 'check-status', 'update-item', 'duplicate-item', 'delete-item',
        'open-lightbox'
    ],
    methods: {
        convertLink(url) {
            if (!url) return '';
            const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
            const match = url.match(driveRegex);
            let target = url;
            if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
            return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
        },
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
            if(!i) return '';
            if(i.GenderType==='公'||(i.GenderType==='溫度'&& +i.GenderValue>=30))return 'male';
            if(i.GenderType==='母'||(i.GenderType==='溫度'&& +i.GenderValue<=27))return 'female';
            return 'mix';
        }
    }
}
</script>

<template>
    <div class="admin-box">
        <h2 style="color:var(--pri);border-bottom:1px solid #333;padding-bottom:10px;margin-bottom:20px;">🛠️ 後台管理系統</h2>
        
        <!-- Dashboard Stats -->
        <div class="dash">
            <div class="d-item"><div style="font-size:0.8rem;color:#888">庫存總成本</div><div class="d-val">${{dash.cost}}</div></div>
            <div class="d-item"><div style="font-size:0.8rem;color:#888">營業額</div><div class="d-val" style="color:var(--pri)">${{dash.val}}</div></div>
            <div class="d-item"><div style="font-size:0.8rem;color:#888">在庫數</div><div class="d-val" style="color:#2196F3">{{dash.count}}</div></div>
        </div>

        <!-- Editor Form (3-Column Grid) -->
        <div class="admin-editor-panel">
            <div class="admin-panel-head" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                <h3 style="color:#eee; margin:0;">{{ editMode ? '編輯模式: ' + newI.ID : '新增個體' }}</h3>
                <button v-if="editMode" @click="$emit('cancel-edit')" style="background:#444;border:none;color:#fff;padding:6px 12px;border-radius:4px;cursor:pointer;">取消編輯</button>
            </div>

            <div class="admin-form-grid">
                <!-- Column 1: Basic Info -->
                <div class="af-col">
                    <label class="af-lbl">物種 & 品系</label>
                    <div class="tabs" style="margin-bottom:10px;">
                        <div class="tab" :class="{active:newI.Species==='豹紋守宮'}" @click="newI.Species='豹紋守宮'">豹紋守宮</div>
                        <div class="tab" :class="{active:newI.Species==='肥尾守宮'}" @click="newI.Species='肥尾守宮'">肥尾守宮</div>
                    </div>
                    <input class="inp" v-model="newI.Morph" list="his" placeholder="品系名稱 (Morph)">
                    <datalist id="his"><option v-for="m in morphHis" :key="m" :value="m"></option></datalist>

                    <label class="af-lbl" style="margin-top:15px;">性別 & 生日</label>
                    <div class="af-gender-group">
                        <label><input type="radio" value="公" v-model="newI.GenderType"> 公</label>
                        <label><input type="radio" value="母" v-model="newI.GenderType"> 母</label>
                        <label><input type="radio" value="溫度" v-model="newI.GenderType"> 溫</label>
                        <input v-if="newI.GenderType==='溫度'" type="number" class="inp" v-model="newI.GenderValue" placeholder="°C" style="width:70px;padding:5px;">
                    </div>
                    <input type="date" class="inp" v-model="newI.Birthday">
                </div>

                <!-- Column 2: Pricing & Details -->
                <div class="af-col">
                    <label class="af-lbl">價格設定</label>
                    <div style="display:flex; gap:10px;">
                        <div style="flex:1">
                            <small style="color:#888">進貨成本</small>
                            <div class="symbol-wrap">
                                <span>$</span>
                                <input type="number" class="inp" v-model="newI.CostPrice">
                            </div>
                        </div>
                        <div style="flex:1">
                            <small style="color:#888">上架價格</small>
                            <div class="symbol-wrap">
                                <span>$</span>
                                <input type="number" class="inp" v-model="newI.ListingPrice">
                            </div>
                        </div>
                    </div>

                    <label class="af-lbl" style="margin-top:15px;">圖片 & 備註</label>
                    <input class="inp" v-model="newI.ImageURL" placeholder="圖片連結 (URL)" style="margin-bottom:10px;">
                    <textarea class="inp" v-model="newI.Note" placeholder="備註..." rows="2" style="font-family:inherit;"></textarea>

                    <div class="af-hot-box">
                        <label style="color:#FF5722; cursor:pointer; display:flex; align-items:center; gap:5px; font-weight:bold;">
                            <input type="checkbox" v-model="newI.IsHot" true-value="Hot" false-value="">
                            🔥 設定為熱門精選 (Hot)
                        </label>
                    </div>
                </div>

                <!-- Column 3: Genes -->
                <div class="af-col">
                    <label class="af-lbl">基因標籤選擇</label>
                    <div class="admin-gene-box">
                        <div v-for="(l,c) in db[newI.Species]" :key="c" style="margin-bottom:10px;">
                            <div style="color:#aaa;font-size:0.8rem;border-bottom:1px solid #ddd;margin-bottom:5px;font-weight:bold;">{{c}}</div>
                            <div style="display:flex;flex-wrap:wrap;gap:5px;">
                                <label v-for="g in l" :key="g" class="gene-chk-tag" style="display:inline-block;padding:2px 8px;border:1px solid #ccc;cursor:pointer;font-size:0.85rem;border-radius:4px;">
                                    <input type="checkbox" :value="g" v-model="newI.Genes" style="vertical-align:middle;"> {{g}}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <button class="tab active" style="width:100%;margin-top:20px;background:var(--pri);border:none;padding:15px;font-size:1.1rem;cursor:pointer;" @click="$emit('submit')" :disabled="loading">
                {{loading?'處理中...':(editMode?'💾 儲存修改':'🚀 確認上架')}}
            </button>
        </div>

        <!-- Inventory List (Compact Expandable Grid) -->
        <h3 style="margin-top:40px;border-bottom:1px solid #333;padding-bottom:10px;color:#eee">庫存列表 ({{adminList.length}})</h3>
        <div style="display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;">
            <input class="inp" :value="aKw" @input="$emit('update:aKw', $event.target.value)" placeholder="🔍 搜尋 ID / 品系 / 備註..." style="flex:2;min-width:200px;">
            <select class="inp" :value="aFil" @change="$emit('update:aFil', $event.target.value)" style="flex:1;min-width:140px;"><option value="All">全部</option><option value="ForSale">販售中</option><option value="Sold">已售出</option><option value="Trash">垃圾桶</option></select>
        </div>

        <div class="admin-card-grid">
            <div v-for="i in adminList" :key="i.ID" class="admin-card" :class="{sold: i.Status==='Sold'}">
                <!-- Top: Compact Row -->
                <div class="ac-compact-row">
                    <div class="ac-img-thumb" @click="$emit('open-lightbox', i)">
                        <img v-if="i.ImageURL" :src="convertLink(i.ImageURL)" loading="lazy">
                        <div v-else>🦎</div>
                        <div v-if="i.IsHot==='Hot'" class="ac-hot-dot">🔥</div>
                    </div>
                    
                    <div class="ac-main-info">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
                            <span class="ac-id">{{i.ID}}</span>
                            <span :class="getSexCls(i)" style="font-size:0.8rem;font-weight:bold;">{{fmtSex(i)}}</span>
                        </div>
                        <!-- Direct Input for Morph -->
                        <input class="ac-morph-inp" v-model.lazy="i.Morph" @change="$emit('update-item', i)" placeholder="品系名稱...">
                        
                        <div style="display:flex;gap:5px;margin-top:4px;align-items:center;">
                            <select v-model="i.Status" @change="$emit('check-status', i)" class="ac-mini-select" :class="'st-'+i.Status">
                                <option value="ForSale">販售</option>
                                <option value="Sold">售出</option>
                                <option value="NotForSale">自留</option>
                            </select>
                            <div class="symbol-wrap mini">
                                <span>$</span>
                                <input type="number" v-model.lazy="i.ListingPrice" @change="$emit('update-item', i)" class="ac-mini-price">
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom: Expandable Details -->
                <details class="ac-details">
                    <summary class="ac-summary">
                        <span>詳細資料 / 編輯</span>
                        <span class="arrow">▼</span>
                    </summary>
                    <div class="ac-expand-box">
                        <div class="ac-grid-2">
                            <div>
                                <label>進貨成本</label>
                                <input type="number" v-model.lazy="i.CostPrice" @change="$emit('update-item', i)" class="ac-edit-inp">
                            </div>
                            <div>
                                <label>生日</label>
                                <input type="date" v-model.lazy="i.Birthday" @change="$emit('update-item', i)" class="ac-edit-inp">
                            </div>
                        </div>
                        
                        <div style="margin-top:8px;">
                            <label>備註 (Note)</label>
                            <textarea v-model.lazy="i.Note" @change="$emit('update-item', i)" class="ac-edit-inp" rows="2"></textarea>
                        </div>

                        <div style="margin-top:8px; display:flex; gap:10px; align-items:center; background:rgba(255,255,255,0.05); padding:8px; border-radius:4px;">
                            <label style="display:flex;align-items:center;gap:5px;cursor:pointer;flex:1;color:#eee;font-size:0.85rem;">
                                <input type="checkbox" :checked="i.IsHot==='Hot'" @change="i.IsHot = $event.target.checked ? 'Hot' : ''; $emit('update-item', i)">
                                🔥 熱門精選 (HOT)
                            </label>
                        </div>

                        <div class="ac-action-row">
                            <div style="flex:1"></div>
                            <div style="display:flex;gap:5px;">
                                <button class="btn-icon copy" @click="$emit('duplicate-item', i)" title="複製">⎘</button>
                                <button class="btn-icon del" @click="$emit('delete-item', i)" title="刪除">🗑</button>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    </div>
</template>