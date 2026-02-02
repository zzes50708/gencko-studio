import { ZYG, CALC_TYPES, GENE_DEFINITIONS } from '../../data/genes.js';
import { calculateGenetics } from './utils.js';

// --- 計算機操作邏輯模組 ---
export const calculatorLogic = {
    methods: {
        // UI 互動：切換選擇器 (公/母)
        calc_toggleSelector(sex) {
            if (this.calc_activeSelector === sex) {
                this.calc_activeSelector = null;
            } else {
                this.calc_activeSelector = sex;
                this.calc_expandType = null;
                this.calc_expandGroup = null;
            }
        },
        // UI 互動：切換基因分類 (顯性/隱性...)
        calc_toggleType(type) {
            this.calc_expandType = (this.calc_expandType === type) ? null : type;
            this.calc_expandGroup = null;
        },
        // UI 互動：切換品系群組 (川普白化...)
        calc_toggleComboGroup(group) {
            this.calc_expandGroup = (this.calc_expandGroup === group) ? null : group;
        },
        // 檢查基因是否已選取 (防止重複)
        calc_isGeneDisabled(geneId, sex) {
            const list = sex === 'Male' ? this.calc_male : this.calc_female;
            return list.some(g => g.geneId === geneId);
        },
        // 新增基因
        calc_addGene(geneId, sex) {
            const list = sex === 'Male' ? this.calc_male : this.calc_female;
            const def = this.calc_currentDefs.find(d => d.id === geneId);
            let zyg = ZYG.VIS;
            
            // 預設基因型
            if (def.type === CALC_TYPES.REC) zyg = ZYG.VIS;
            if (def.type === CALC_TYPES.CODOM) zyg = ZYG.SGL;
            
            list.push({ geneId, zygosity: zyg });
            this.calc_activeSelector = null; // 關閉選單
            this.calc_expandType = null;
            this.calc_run(); // 觸發計算
        },
        // 移除基因
        calc_removeGene(index, sex) {
            const list = sex === 'Male' ? this.calc_male : this.calc_female;
            list.splice(index, 1);
            this.calc_run();
        },
        // 更新基因型 (例如 Single -> Super)
        calc_updateZygosity(e, index, sex) {
            const list = sex === 'Male' ? this.calc_male : this.calc_female;
            list[index].zygosity = e.target.value;
            this.calc_run();
        },
        // 切換 Het (隱性帶基因)
        calc_toggleHet(e, index, sex) {
            const list = sex === 'Male' ? this.calc_male : this.calc_female;
            list[index].zygosity = e.target.checked ? ZYG.HET : ZYG.VIS;
            this.calc_run();
        },
        // 取得機率顯示文字
        calc_getProbFraction(prob) {
            if (prob >= 0.99) return '必中';
            const frac = Math.round(1 / prob);
            return `1 / ${frac}`;
        },
        // 執行計算 (呼叫 utils)
        calc_run() {
            // 如果沒有基因，清空結果
            if (this.calc_male.length === 0 && this.calc_female.length === 0) {
                this.calc_result = null;
                return;
            }
            // 呼叫純函式進行計算
            this.calc_result = calculateGenetics(
                this.calc_sp, 
                JSON.parse(JSON.stringify(this.calc_male)), // 深拷貝以防副作用
                JSON.parse(JSON.stringify(this.calc_female)), 
                this.calc_currentDefs
            );
        }
    },
    computed: {
        // 取得當前物種的基因定義
        calc_currentDefs() {
            return GENE_DEFINITIONS[this.calc_sp] || [];
        },
        // 將基因依類型分組 (用於下拉選單)
        calc_groupedGenes() {
            const groups = {};
            this.calc_currentDefs.forEach(g => {
                if (!groups[g.type]) groups[g.type] = [];
                groups[g.type].push(g);
            });
            return groups;
        },
        // 定義顯示順序
        calc_typeOrder() { 
            return [CALC_TYPES.DOM, CALC_TYPES.REC, CALC_TYPES.CODOM, CALC_TYPES.POLY, CALC_TYPES.COMBO, CALC_TYPES.BLOOD]; 
        },
        // 定義 Combo 群組
        calc_comboGroups() { 
            return ['川普白化', '貝爾白化', '雨水白化', '無白化']; 
        }
    }
};