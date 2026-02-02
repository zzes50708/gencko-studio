<script>
// 從原本的位置引入 Mixin
import { calculatorLogic } from '../features/calculator/index.js';

export default {
    name: 'CalculatorView',
    mixins: [calculatorLogic],
    data() {
        return {
            // 將原本在 App.vue data() 中的 calculator 相關狀態移至此處
            calc_sp: '豹紋守宮',
            calc_male: [],
            calc_female: [],
            calc_result: null,
            calc_modalOpen: false,
            calc_activeInfo: null,
            calc_activeSelector: null,
            calc_expandType: null,
            calc_expandGroup: null,
        };
    },
    watch: {
        // 將原本在 App.vue watch 中的監聽器移至此處
        calc_male: { deep: true, handler: 'calc_run' },
        calc_female: { deep: true, handler: 'calc_run' },
        calc_sp() { 
            this.calc_male = []; this.calc_female = []; this.calc_result = null; 
            this.calc_activeSelector = null;
        }
    },
    mounted() {
        // 處理下拉選單點擊外部關閉的邏輯
        document.addEventListener('click', this.handleGlobalClick);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleGlobalClick);
    },
    methods: {
        handleGlobalClick(e) {
            if (this.calc_activeSelector && !e.target.closest('.calc-dropdown-container')) {
                this.calc_activeSelector = null;
                this.calc_expandType = null;
                this.calc_expandGroup = null;
            }
        }
    }
}
</script>

<template>
    <div class="calc-container">
        <div class="calc-header">
            <div class="seo-hint">Gencko 整理製作，歡迎分享給你的爬友</div>
            <div class="calc-sub-desc">專業的守宮基因計算機。非100%血系請統稱前綴(如橘化)。</div>
            
            <div class="tabs" style="margin: 20px 0;">
                <div class="tab" :class="{active: calc_sp==='豹紋守宮'}" @click="calc_sp='豹紋守宮'">豹紋守宮</div>
                <div class="tab" :class="{active: calc_sp==='肥尾守宮'}" @click="calc_sp='肥尾守宮'">肥尾守宮</div>
            </div>

            <div class="calc-helper-btns">
                <div class="calc-help-btn" @click="calc_activeInfo='types';calc_modalOpen=true">🎓 基因觀念</div>
                <div class="calc-help-btn" @click="calc_activeInfo='poly';calc_modalOpen=true">⚡ 選育介紹</div>
            </div>
        </div>

        <div class="calc-parent-grid">
            <!-- Male Card -->
            <div class="calc-parent-card">
                <div class="calc-p-header calc-sex-m">
                    <div class="calc-sex-icon">♂</div>
                    <div class="calc-p-title"><span>SELECTED PARENT</span><h3>MALE (公)</h3></div>
                </div>
                <div class="calc-p-body">
                    <!-- Dropdown Trigger -->
                    <div class="calc-dropdown-container" style="position:relative; z-index:20;">
                        <div class="calc-add-btn" :class="{open: calc_activeSelector==='Male'}" @click.stop="calc_toggleSelector('Male')">
                            <span>+ ADD GENE (新增)</span><span>▼</span>
                        </div>
                        <!-- Dropdown Menu -->
                        <div v-if="calc_activeSelector==='Male'" class="calc-dropdown-menu">
                            <div v-for="type in calc_typeOrder" :key="type">
                                <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click.stop="calc_toggleType(type)">
                                    {{type}} <span>></span>
                                </div>
                                <div v-if="calc_expandType===type" class="calc-dd-sub">
                                    <!-- Combo Sub-groups -->
                                    <template v-if="type === '品系'">
                                        <div v-for="group in calc_comboGroups" :key="group">
                                            <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                            <div v-if="calc_expandGroup===group">
                                                <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group)" 
                                                     class="calc-dd-item" 
                                                     :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                                     @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')">✓</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                    <!-- Normal List -->
                                    <template v-else>
                                        <div v-for="g in calc_groupedGenes[type]" 
                                             class="calc-dd-item"
                                             :class="{disabled: calc_isGeneDisabled(g.id, 'Male')}"
                                             @click.stop="!calc_isGeneDisabled(g.id, 'Male') && calc_addGene(g.id, 'Male')">
                                            {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Male')">✓</span>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Selected List -->
                    <div class="calc-selected-list">
                        <div v-if="calc_male.length === 0" class="calc-empty-msg">NO GENES SELECTED</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calc_male" :key="idx">
                            <div class="calc-gene-row">
                                <div>
                                    <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                    <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Male')">✕</button>
                            </div>
                            <!-- Recessive: Checkbox for Het -->
                            <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Male')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            <!-- Co-Dominant: Select -->
                            <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Male')">
                                    <option value="Single">單基因 (Single)</option>
                                    <option value="Super">超級 (Super)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Female Card -->
            <div class="calc-parent-card">
                <div class="calc-p-header calc-sex-f">
                    <div class="calc-sex-icon">♀</div>
                    <div class="calc-p-title"><span>SELECTED PARENT</span><h3>FEMALE (母)</h3></div>
                </div>
                <div class="calc-p-body">
                    <!-- Dropdown Trigger -->
                    <div class="calc-dropdown-container" style="position:relative; z-index:20;">
                        <div class="calc-add-btn" :class="{open: calc_activeSelector==='Female'}" @click.stop="calc_toggleSelector('Female')">
                            <span>+ ADD GENE (新增)</span><span>▼</span>
                        </div>
                        <!-- Dropdown Menu -->
                        <div v-if="calc_activeSelector==='Female'" class="calc-dropdown-menu">
                            <div v-for="type in calc_typeOrder" :key="type">
                                <div v-if="calc_groupedGenes[type]" class="calc-dd-group-btn" :class="{active: calc_expandType===type}" @click.stop="calc_toggleType(type)">
                                    {{type}} <span>></span>
                                </div>
                                <div v-if="calc_expandType===type" class="calc-dd-sub">
                                    <template v-if="type === '品系'">
                                        <div v-for="group in calc_comboGroups" :key="group">
                                            <div class="calc-dd-combo-group" @click.stop="calc_toggleComboGroup(group)">📁 {{group}}</div>
                                            <div v-if="calc_expandGroup===group">
                                                <div v-for="g in calc_groupedGenes[type].filter(x=>x.group===group)" 
                                                     class="calc-dd-item" 
                                                     :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                                     @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                                    {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')">✓</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <div v-for="g in calc_groupedGenes[type]" 
                                             class="calc-dd-item"
                                             :class="{disabled: calc_isGeneDisabled(g.id, 'Female')}"
                                             @click.stop="!calc_isGeneDisabled(g.id, 'Female') && calc_addGene(g.id, 'Female')">
                                            {{g.name}} <span v-if="calc_isGeneDisabled(g.id, 'Female')">✓</span>
                                        </div>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Selected List -->
                    <div class="calc-selected-list">
                        <div v-if="calc_female.length === 0" class="calc-empty-msg">NO GENES SELECTED</div>
                        <div v-else class="calc-gene-item" v-for="(g, idx) in calc_female" :key="idx">
                            <div class="calc-gene-row">
                                <div>
                                    <div class="calc-gene-name">{{calc_currentDefs.find(d=>d.id===g.geneId)?.name}}</div>
                                    <div class="calc-gene-type">{{calc_currentDefs.find(d=>d.id===g.geneId)?.type}}</div>
                                </div>
                                <button class="calc-btn-remove" @click="calc_removeGene(idx, 'Female')">✕</button>
                            </div>
                            <!-- Recessive: Checkbox for Het -->
                            <div v-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='隱性'">
                                <label class="calc-het-label">
                                    <input type="checkbox" class="calc-het-check" :checked="g.zygosity==='Het'" @change="calc_toggleHet($event, idx, 'Female')">
                                    Het (隱性帶基因)
                                </label>
                            </div>
                            <!-- Co-Dominant: Select -->
                            <div v-else-if="calc_currentDefs.find(d=>d.id===g.geneId)?.type==='共顯性'">
                                <select class="calc-zyg-select" :value="g.zygosity" @change="calc_updateZygosity($event, idx, 'Female')">
                                    <option value="Single">單基因 (Single)</option>
                                    <option value="Super">超級 (Super)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Results -->
        <div v-if="calc_result" class="calc-result-area">
            <div class="calc-res-header">
                <div class="calc-res-title">預測結果</div>
                <div class="calc-res-count">組合數: {{calc_result.totalCombos}}</div>
            </div>

            <div v-if="calc_result.warning" class="calc-warn">
                <div style="font-size:1.5rem">⚠️</div>
                <div style="white-space:pre-line">{{calc_result.warning}}</div>
            </div>

            <div v-if="calc_result.notices && calc_result.notices.length" class="calc-notice">
                <div style="font-size:1.5rem">ℹ️</div>
                <div>
                    <div v-for="n in calc_result.notices">• {{n}}</div>
                </div>
            </div>

            <div class="calc-res-card" v-for="(o, idx) in calc_result.outcomes" :key="idx" :class="{lethal: o.description.includes('致死')}">
                <div class="calc-prob-box">
                    <div class="calc-prob-val">{{Math.round(o.prob*100)}}<small style="font-size:0.8rem">%</small></div>
                    <div class="calc-prob-sub" style="font-size:0.8rem;color:#888;font-family:monospace" v-if="o.prob < 0.99">
                        {{ calc_getProbFraction(o.prob) }}
                    </div>
                </div>
                <div class="calc-res-info" style="display:flex; align-items:center;">
                     <div class="calc-res-name" style="margin:0; line-height:1.4;" v-html="o.fullLabel"></div>
                </div>
            </div>
        </div>

        <!-- Info Modal Overlay -->
        <div v-if="calc_modalOpen" class="lightbox-overlay" @click="calc_modalOpen=false" style="justify-content:center; padding:20px;">
            <div class="page-text-box" style="width:100%; max-width:600px; max-height:80vh; overflow-y:auto; position:relative;" @click.stop>
                <div class="lightbox-close" @click="calc_modalOpen=false" style="top:10px; right:10px; width:40px; height:40px; font-size:1.5rem;">✕</div>
                <h2 style="color:var(--pri); margin-top:0;">
                    {{ calc_activeInfo === 'types' ? '基因觀念' : '多遺傳 (選育)' }}
                </h2>
                
                <div v-if="calc_activeInfo==='types'">
                    <p style="color:#ff5252; font-weight:bold; border-left:4px solid #ff5252; padding-left:10px;">三大白化 (川普/貝爾/雨水) 為獨立隱性基因，不可互配。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">顯性 (Dominant)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">單一基因即可表現。如：謎、白黃。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">共顯性 (Co-Dominant)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">單基因 (Single) 與 雙基因 (Super) 表現不同。如：馬克雪花 -> 超級雪花。</p>
                    <h4 style="color:var(--txt); border-bottom:1px solid var(--bd); padding-bottom:5px; margin-top:20px;">隱性 (Recessive)</h4>
                    <p style="font-size:0.95rem; color:#ccc;">需父母雙方都帶有 (Het 或 Visual) 才會表現。如：日蝕、暴風雪。</p>
                </div>

                <div v-if="calc_activeInfo==='poly'">
                    <p style="border-left:4px solid var(--pri); padding-left:10px;">多遺傳基因 (Polygenic) 不是由單一開關控制，而是透過代代選育堆疊特徵。</p>
                    <div style="margin-top:20px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">橘化 (Tangerine)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0;">包含蜜橘、電橘、血橘等血系，本質皆為橘化選育。</p>
                    </div>
                    <div style="margin-top:10px; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px;">
                        <div style="color:var(--pri); font-weight:bold;">土匪 (Bandit)</div>
                        <p style="font-size:0.9rem; margin:5px 0 0 0;">由粗直線選育而來，特徵為鼻吻部橫帶與背部粗紋。</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>