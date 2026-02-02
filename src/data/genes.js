// --- 基因計算機常數定義 ---
export const CALC_SPECIES = { LG: '豹紋守宮', AFT: '肥尾守宮' };
export const CALC_TYPES = { DOM: '顯性', REC: '隱性', CODOM: '共顯性', POLY: '多遺傳', COMBO: '品系', BLOOD: '血系' };
export const ZYG = { VIS: 'Visual', HET: 'Het', SUP: 'Super', SGL: 'Single' };

// 基因資料庫
export const GENE_DEFINITIONS = {
    [CALC_SPECIES.LG]: [
        { id: 'tremper', name: '川普白化 (Tremper Albino)', type: CALC_TYPES.REC },
        { id: 'bell', name: '貝爾白化 (Bell Albino)', type: CALC_TYPES.REC },
        { id: 'rainwater', name: '雨水白化 (Rainwater Albino)', type: CALC_TYPES.REC },
        { id: 'eclipse', name: '日蝕 (Eclipse)', type: CALC_TYPES.REC },
        { id: 'blizzard', name: '暴風雪 (Blizzard)', type: CALC_TYPES.REC },
        { id: 'patternless', name: '莫菲無紋 (Murphy Patternless)', type: CALC_TYPES.REC },
        { id: 'marbleeye', name: '大理石眼 (Marble Eye)', type: CALC_TYPES.REC },
        { id: 'ndbe', name: '慾望黑眼 (NDBE)', type: CALC_TYPES.REC },
        { id: 'supergiant', name: '超級巨人 (Super Giant)', type: CALC_TYPES.REC },
        { id: 'macksnow', name: '馬克雪花 (Mack Snow)', type: CALC_TYPES.CODOM },
        { id: 'lemonfrost', name: '檸檬霜 (Lemon Frost)', type: CALC_TYPES.CODOM },
        { id: 'enigman', name: '謎 (Enigma)', type: CALC_TYPES.DOM },
        { id: 'whiteandyellow', name: '白黃 (White & Yellow)', type: CALC_TYPES.DOM },
        { id: 'tugsnow', name: '奧本雪花 (TUG Snow)', type: CALC_TYPES.DOM },
        { id: 'gemsnow', name: '寶石雪花 (Gem Snow)', type: CALC_TYPES.DOM },
        { id: 'pastel', name: '蠟筆 (Pastel)', type: CALC_TYPES.DOM },
        { id: 'tangerine', name: '橘化 (Tangerine)', type: CALC_TYPES.POLY },
        { id: 'hypo', name: '少斑 (Hypo)', type: CALC_TYPES.POLY },
        { id: 'superhypo', name: '超級少斑 (Super Hypo)', type: CALC_TYPES.POLY },
        { id: 'bold', name: '粗直線 (Bold Stripe)', type: CALC_TYPES.POLY },
        { id: 'jungle', name: '叢林 (Jungle)', type: CALC_TYPES.POLY },
        { id: 'aberrant', name: '亂紋 (Aberrant)', type: CALC_TYPES.POLY },
        { id: 'blacknight', name: '黑夜 (Black Night)', type: CALC_TYPES.POLY },
        { id: 'bandit', name: '土匪 (Bandit)', type: CALC_TYPES.POLY },
        { id: 'highyellow', name: '高黃 (High Yellow)', type: CALC_TYPES.POLY },
        { id: 'patternless_stripe', name: '無紋直線 (Patternless Stripe)', type: CALC_TYPES.POLY },
        { id: 'carrottail', name: '蘿蔔尾 (Carrot-tail)', type: CALC_TYPES.POLY },
        { id: 'carrothead', name: '蘿蔔頭 (Carrot-head)', type: CALC_TYPES.POLY },
        { id: 'lavender', name: '薰衣草 (Lavender)', type: CALC_TYPES.POLY },
        { id: 'melanistic', name: '黑化 (Melanistic)', type: CALC_TYPES.POLY },
        { id: 'stripe', name: '直線 (Stripe)', type: CALC_TYPES.POLY },
        { id: 'reversestripe', name: '反直線 (Reverse Stripe)', type: CALC_TYPES.POLY },
        { id: 'mandarine', name: '蜜橘 (Mandarin)', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
        { id: 'blood', name: '血橘 (Blood)', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
        { id: 'inferno', name: '地獄 (Inferno)', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
        { id: 'electric', name: '電橘 (Electric)', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
        { id: 'stonewash', name: '石洗 (Stonewash)', type: CALC_TYPES.BLOOD, baseGeneId: 'tangerine', group: '橘化血系' },
        
        // Combos
        { id: 'raptor', name: '紅眼暴龍 (RAPTOR)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'aptor', name: '暴龍 (APTOR)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'sunglow', name: '日焰 (Sunglow)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'superhypo',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'diabloblanco', name: '惡魔白酒 (Diablo Blanco)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'ember', name: '灰燼 (Ember)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'red_diamond', name: '紅鑽石 (Red Diamond)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'electric',type:'Visual'},{geneId:'bandit',type:'Visual'}] },
        { id: 'radar', name: '雷達 (Radar)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'bell',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'whiteknight', name: '白騎士 (White Knight)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'bell',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'aurora', name: '極光 (Aurora)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'whiteandyellow',type:'Visual'},{geneId:'bell',type:'Visual'}] },
        { id: 'typhoon', name: '颱風 (Typhoon)', type: CALC_TYPES.COMBO, group: '雨水白化', components: [{geneId:'rainwater',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'}] },
        { id: 'cyclone', name: '旋風 (Cyclone)', type: CALC_TYPES.COMBO, group: '雨水白化', components: [{geneId:'rainwater',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'supersnow', name: '超級雪花 (Super Snow)', type: CALC_TYPES.COMBO, group: '無白化', components: [{geneId:'macksnow',type:'Super'}] },
        { id: 'galaxy', name: '銀河 (Galaxy)', type: CALC_TYPES.COMBO, group: '無白化', components: [{geneId:'macksnow',type:'Super'},{geneId:'eclipse',type:'Visual'}] }
    ],
    [CALC_SPECIES.AFT]: [
        { id: 'aft_albino', name: '橘白化 (Amel/Albino)', type: CALC_TYPES.REC },
        { id: 'aft_oreo', name: '奧利奧 (Oreo)', type: CALC_TYPES.REC },
        { id: 'aft_zulu', name: '祖魯 (Zulu)', type: CALC_TYPES.REC },
        { id: 'aft_ghost', name: '幽靈 (Ghost)', type: CALC_TYPES.REC },
        { id: 'aft_patternless', name: '無紋 (Patternless)', type: CALC_TYPES.REC },
        { id: 'aft_caramel', name: '焦糖 (Caramel)', type: CALC_TYPES.REC },
        { id: 'aft_whiteout', name: '立可白 (White Out)', type: CALC_TYPES.CODOM },
        { id: 'aft_zero', name: '零 (Zero)', type: CALC_TYPES.CODOM },
        { id: 'aft_straight', name: '直線 (Straight)', type: CALC_TYPES.DOM }
    ]
};

// 組合規則
export const CALC_COMBO_RULES = [
    { name: '紅鑽石 (Red Diamond)', required: [{id:'tremper', z:ZYG.VIS}, {id:'electric', z:'Any'}, {id:'bandit', z:'Any'}] },
    { name: '超級雪花白騎士', required: [{id:'macksnow', z:ZYG.SUP}, {id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花白騎士', required: [{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '白騎士', required: [{id:'bell', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '方解石', required: [{id:'whiteandyellow', z:ZYG.VIS}, {id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'enigman', z:ZYG.VIS}] },
    { name: '聲納', required: [{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'enigman', z:ZYG.VIS}] },
    { name: '超級雷達', required: [{id:'macksnow', z:ZYG.SUP}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花雷達', required: [{id:'macksnow', z:ZYG.SGL}, {id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雷達', required: [{id:'bell', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '超級颱風', required: [{id:'macksnow', z:ZYG.SUP}, {id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '雪花颱風', required: [{id:'macksnow', z:ZYG.SGL}, {id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '颱風', required: [{id:'rainwater', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'patternless_stripe', z:'Any'}] },
    { name: '超級雪花惡魔白酒', required: [{id:'macksnow', z:ZYG.SUP}, {id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '雪花惡魔白酒', required: [{id:'macksnow', z:ZYG.SGL}, {id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '惡魔白酒', required: [{id:'tremper', z:ZYG.VIS}, {id:'blizzard', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}] },
    { name: '紅眼暴龍 (RAPTOR)', required: [{id:'tremper', z:ZYG.VIS}, {id:'eclipse', z:ZYG.VIS}, {id:'tangerine', z:'Any'}] },
    { name: '暴龍 (APTOR)', required: [{id:'tremper', z:ZYG.VIS}, {id:'tangerine', z:'Any'}] },
    { name: '超級暴風雪', required: [{id:'blizzard', z:ZYG.VIS}, {id:'tremper', z:ZYG.VIS}] },
    { name: '日焰 (Sunglow)', required: [{id:'tremper', z:ZYG.VIS}, {id:'superhypo', z:'Any'}, {id:'tangerine', z:'Any'}] },
    { name: '超級雪花', required: [{id:'macksnow', z:ZYG.SUP}] },
    { name: '超級立可白 (致死)', required: [{id:'aft_whiteout', z:ZYG.SUP}] }
];