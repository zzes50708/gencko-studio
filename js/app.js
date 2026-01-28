/**
 * 🦎 Gencko Studio Hybrid SSG Core (v3.0 - Full Integrated)
 * 整合：商城、文章、SSG、管理後台、基因計算機(含新警告邏輯)、特寵醫院地圖、健康/飼養評估(原生版)
 */

// --- 基因計算機常數定義 ---
const CALC_SPECIES = { LG: '豹紋守宮', AFT: '肥尾守宮' };
const CALC_TYPES = { DOM: '顯性', REC: '隱性', CODOM: '共顯性', POLY: '多遺傳', COMBO: '品系', BLOOD: '血系' };
const ZYG = { VIS: 'Visual', HET: 'Het', SUP: 'Super', SGL: 'Single' };

// 基因資料庫
const GENE_DEFINITIONS = {
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
        
        // Combos - 川普
        { id: 'raptor', name: '紅眼暴龍 (RAPTOR)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'aptor', name: '暴龍 (APTOR)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'sunglow', name: '日焰 (Sunglow)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'superhypo',type:'Visual'},{geneId:'tangerine',type:'Visual'},{geneId:'carrottail',type:'Visual'}] },
        { id: 'diabloblanco', name: '惡魔白酒 (Diablo Blanco)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'ember', name: '灰燼 (Ember)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'red_diamond', name: '紅鑽石 (Red Diamond)', type: CALC_TYPES.COMBO, group: '川普白化', components: [{geneId:'tremper',type:'Visual'},{geneId:'electric',type:'Visual'},{geneId:'bandit',type:'Visual'}] },
        
        // Combos - 貝爾
        { id: 'radar', name: '雷達 (Radar)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'bell',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'whiteknight', name: '白騎士 (White Knight)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'bell',type:'Visual'},{geneId:'blizzard',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },
        { id: 'aurora', name: '極光 (Aurora)', type: CALC_TYPES.COMBO, group: '貝爾白化', components: [{geneId:'whiteandyellow',type:'Visual'},{geneId:'bell',type:'Visual'}] },

        // Combos - 雨水
        { id: 'typhoon', name: '颱風 (Typhoon)', type: CALC_TYPES.COMBO, group: '雨水白化', components: [{geneId:'rainwater',type:'Visual'},{geneId:'eclipse',type:'Visual'},{geneId:'patternless_stripe',type:'Visual'}] },
        { id: 'cyclone', name: '旋風 (Cyclone)', type: CALC_TYPES.COMBO, group: '雨水白化', components: [{geneId:'rainwater',type:'Visual'},{geneId:'patternless',type:'Visual'},{geneId:'eclipse',type:'Visual'}] },

        // Combos - 無白化
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

// 組合規則 (計算機判斷邏輯)
const CALC_COMBO_RULES = [
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

// --- 特寵醫院地圖資料 ---
const HOSPITAL_REGIONS = {
    '北部區域': ['台北市', '新北市', '基隆市', '桃園市', '新竹市', '新竹縣', '宜蘭縣'],
    '中部區域': ['台中市', '苗栗縣', '彰化縣', '南投縣', '雲林縣'],
    '南部區域': ['高雄市', '台南市', '嘉義市', '嘉義縣', '屏東縣', '澎湖縣'],
    '東部區域': ['花蓮縣', '台東縣']
};

const HOSPITAL_DATA = [
  { id: '1', name: '不萊梅特殊寵物專科醫院', address: '台北市大同區民權西路227號', phone: '02-2599-3907', city: '台北市', district: '大同區', mapUrl: 'https://maps.app.goo.gl/Z9rXNgUPA3tnHfer5' },
  { id: '2', name: '牧光特殊寵物專科醫院', address: '台北市大同區民族西路65號', phone: '02-2592-6590', city: '台北市', district: '大同區' },
  { id: '3', name: '沐沐特殊寵物醫院', address: '台北市中山區龍江路78號', phone: '02-7713-7707', city: '台北市', district: '中山區' },
  { id: '4', name: '良醫動物醫院', address: '台北市松山區八德路四段188號', phone: '02-2761-5091', city: '台北市', district: '松山區' },
  { id: '5', name: '伊甸園動物醫院', address: '台北市中山區北安路554巷33號', phone: '02-8509-2579', city: '台北市', district: '中山區' },
  { id: '6', name: '國寶動物醫院', address: '台北市中山區八德路二段229-2號', phone: '02-2721-1798', city: '台北市', district: '中山區' },
  { id: '7', name: '國立台灣大學附設動物醫院', address: '台北市大安區基隆路三段153號', phone: '02-2739-6828', city: '台北市', district: '大安區' },
  { id: '8', name: '萊特特殊寵物醫院', address: '台北市大安區辛亥路一段50號', phone: '02-2365-8628', city: '台北市', district: '大安區' },
  { id: '9', name: '愛貓園動物醫院', address: '台北市大安區基隆路二段124號1樓', phone: '02-2735-8758', city: '台北市', district: '大安區' },
  { id: '10', name: '亞馬森特寵專科醫院', address: '台北市內湖區內湖路二段39之2號1樓', phone: '02-8792-3248', city: '台北市', district: '內湖區' },
  { id: '11', name: '中研動物醫院', address: '台北市南港區研究院路一段72號', phone: '02-2651-2100', city: '台北市', district: '南港區' },
  { id: '12', name: '亞各動物醫院', address: '台北市南港區研究院路一段101巷12號', phone: '02-2653-3636', city: '台北市', district: '南港區' },
  { id: '13', name: '馬達加斯加動物醫院', address: '新北市板橋區文化路二段500號1樓', phone: '02-8259-5001', city: '新北市', district: '板橋區' },
  { id: '14', name: '展翔動物醫院', address: '新北市板橋區南雅西路二段97號', phone: '02-8965-0318', city: '新北市', district: '板橋區' },
  { id: '15', name: '剛果非犬貓動物醫院', address: '新北市新店區中興路三段259號', phone: '02-8665-5702', city: '新北市', district: '新店區' },
  { id: '16', name: '金氏動物醫院', address: '新北市新店區中興路一段208號', phone: '02-8914-6999', city: '新北市', district: '新店區' },
  { id: '17', name: '綠野特殊寵物專科醫院', address: '新北市中和區景平路335-1號', phone: '02-2946-8818', city: '新北市', district: '中和區' },
  { id: '18', name: '獴獴加非犬貓專科動物醫院', address: '新北市三重區重新路四段20號1樓', phone: '02-2979-2232', city: '新北市', district: '三重區' },
  { id: '19', name: '小水豚特殊寵物醫院', address: '新北市新莊區幸福東路140號1樓', phone: '02-2990-6905', city: '新北市', district: '新莊區' },
  { id: '20', name: '嘉德動物醫院', address: '新北市汐止區福德一路206巷1號', phone: '02-2693-4809', city: '新北市', district: '汐止區' },
  { id: '21', name: '懷恩動物醫院', address: '新北市林口區中山路235號', phone: '02-8601-8432', city: '新北市', district: '林口區' },
  { id: '22', name: '頂點動物醫院', address: '新北市永和區仁愛路87號', phone: '02-8921-1700', city: '新北市', district: '永和區' },
  { id: '23', name: '普羅動物醫院', address: '桃園市桃園區泰成路15號', phone: '03-378-9900', city: '桃園市', district: '桃園區' },
  { id: '24', name: '原野動物專科醫院', address: '桃園市平鎮區廣德街12號', phone: '03-494-2020', city: '桃園市', district: '平鎮區' },
  { id: '25', name: '野森非犬貓專科醫院', address: '桃園市中壢區民權路332號', phone: '03-491-0302', city: '桃園市', district: '中壢區' },
  { id: '26', name: '琪欣動物醫院 龜山分院', address: '桃園市龜山區文化三路99號', phone: '03-397-9825', city: '桃園市', district: '龜山區' },
  { id: '27', name: '禾原動物醫院', address: '桃園市桃園區大有路159號', phone: '03-332-1695', city: '桃園市', district: '桃園區' },
  { id: '28', name: '新竺動物醫院', address: '新竹市北區竹光路98號', phone: '03-542-9961', city: '新竹市', district: '北區' },
  { id: '29', name: '大福小幸動物醫院', address: '新竹市香山區經國路三段92巷6號', phone: '03-530-0175', city: '新竹市', district: '香山區' },
  { id: '30', name: '度度鳥特殊寵物專科醫院', address: '新竹市東區西大路315巷7號1樓', phone: '0965-109-093', city: '新竹市', district: '東區' },
  { id: '31', name: '秘境野生動物專科醫院', address: '新竹縣竹北市自強六街15號', phone: '03-668-5559', city: '新竹縣', district: '竹北市' },
  { id: '32', name: '波比寵物專科醫院', address: '苗栗縣竹南鎮光復路436號', phone: '03-7550450', city: '苗栗縣', district: '竹南鎮' },
  { id: '33', name: '羽森林動物醫院', address: '台中市東區旱溪西路一段552號', phone: '04-2213-2373', city: '台中市', district: '東區' },
  { id: '34', name: '國立中興大學獸醫教學醫院', address: '台中市西區向上路一段21號', phone: '04-2287-0180', city: '台中市', district: '西區' },
  { id: '35', name: '侏儸紀野生動物專科醫院', address: '台中市西區英才路625號', phone: '04-2375-7808', city: '台中市', district: '西區' },
  { id: '36', name: '小島動物醫院', address: '台中市西區三民西路83號', phone: '04-2376-7158', city: '台中市', district: '西區' },
  { id: '37', name: '達爾文動物醫院', address: '台中市西區博館路157號', phone: '04-2326-2759', city: '台中市', district: '西區' },
  { id: '38', name: '感恩動物醫院', address: '台中市北區忠明路131號', phone: '04-2320-2590', city: '台中市', district: '北區' },
  { id: '39', name: '毛克利野生動物醫院', address: '台中市北屯區文心路四段690號', phone: '04-2238-6609', city: '台中市', district: '北屯區' },
  { id: '40', name: '台中亞東綜合動物醫院', address: '台中市北屯區昌平路一段27號', phone: '04-2233-6101', city: '台中市', district: '北屯區' },
  { id: '41', name: '伴心特殊寵物專科醫院', address: '台中市南屯區文心路一段430號', phone: '04-2323-1788', city: '台中市', district: '南屯區' },
  { id: '42', name: '亞洲大學附設獸醫教學醫院', address: '台中市霧峰區柳豐路500號', phone: '04-2332-3456#6371', city: '台中市', district: '霧峰區' },
  { id: '43', name: '台中凡賽爾賽鴿動物醫院', address: '台中市西屯區重慶路8號', phone: '04-23121880', city: '台中市', district: '西屯區' },
  { id: '44', name: '瑞瑞動物醫院', address: '台中市西屯區台灣大道四段828號1樓、2樓', phone: '04-24630052', city: '台中市', district: '西屯區' },
  { id: '45', name: '愛犬動物醫院', address: '彰化縣和美鎮道周路553號', phone: '04-756-7481', city: '彰化縣', district: '和美鎮' },
  { id: '46', name: '龍貓動物醫院', address: '彰化縣鹿港鎮彰鹿路七段639號', phone: '04-7773488', city: '彰化縣', district: '鹿港鎮' },
  { id: '47', name: '築愛動物醫院', address: '彰化縣彰化市民生南路51號', phone: '04-723-9939', city: '彰化縣', district: '彰化市' },
  { id: '48', name: '快樂寵物醫院', address: '彰化縣彰化市中山路三段155號', phone: '04-7384978', city: '彰化縣', district: '彰化市' },
  { id: '49', name: '叢林特殊寵物專科醫院', address: '彰化縣員林市條和街350號1樓', phone: '04-833-3232', city: '彰化縣', district: '員林市' },
  { id: '50', name: '嘉樂動物醫院', address: '嘉義市東區民族路67號', phone: '05-2773122', city: '嘉義市', district: '東區' },
  { id: '51', name: '國立嘉義大學獸醫學院附設動物醫院', address: '嘉義市西區新民路580號', phone: '05-2732988', city: '嘉義市', district: '西區' },
  { id: '52', name: '立安動物醫院', address: '台南市中西區永華路一段186號', phone: '06-2286538', city: '台南市', district: '中西區' },
  { id: '53', name: '酷比動物醫院', address: '台南市南區夏林路210號', phone: '06-2631058', city: '台南市', district: '南區' },
  { id: '54', name: '啄木鳥動物醫院', address: '台南市北區臨安路二段243號', phone: '06-3505902', city: '台南市', district: '北區' },
  { id: '55', name: '小鯢特殊寵物專科醫院', address: '台南市永康區永明街59號', phone: '06-2022252', city: '台南市', district: '永康區' },
  { id: '56', name: '毛毛動物醫院－歸仁分院', address: '台南市歸仁區民權三街32號', phone: '06-2306353', city: '台南市', district: '歸仁區' },
  { id: '57', name: '峽灣動物醫院', address: '台南市北區西門路四段442號', phone: '06-2517213', city: '台南市', district: '北區' },
  { id: '58', name: '窩窩兔動物醫院', address: '高雄市苓雅區建民路67號', phone: '07-713-0300', city: '高雄市', district: '苓雅區' },
  { id: '59', name: '中興梅西動物醫療中心（特別寵物科）', address: '高雄市左營區文府路498號5樓', phone: '07-350-3840', city: '高雄市', district: '左營區' },
  { id: '60', name: '中興農十六特別寵物科', address: '高雄市鼓山區大順一路935號2樓', phone: '07-550-3582', city: '高雄市', district: '鼓山區' },
  { id: '61', name: '亞幸動物醫院', address: '高雄市苓雅區光華一路12-1號', phone: '07-726-5577', city: '高雄市', district: '苓雅區' },
  { id: '62', name: '大毛小毛動物醫院', address: '高雄市三民區文濱路62號', phone: '07-7809102', city: '高雄市', district: '三民區' },
  { id: '63', name: '本丸特殊寵物與貓專科醫院', address: '高雄市前鎮區永豐路105號1樓', phone: '07-721-1089', city: '高雄市', district: '前鎮區' },
  { id: '64', name: '蓋亞野生動物專科醫院', address: '高雄市三民區建工路611號', phone: '07-392-9353', city: '高雄市', district: '三民區' },
  { id: '65', name: '全家福動物醫院', address: '高雄市三民區義華路51號', phone: '07-384-5936', city: '高雄市', district: '三民區' },
  { id: '66', name: '韓特動物醫院', address: '高雄市前金區自強三路211號', phone: '07-215-2577', city: '高雄市', district: '前金區' },
  { id: '67', name: '毛毛動物醫院（大社分院）', address: '高雄市大社區三民路270號', phone: '07-353-5316', city: '高雄市', district: '大社區' },
  { id: '68', name: '星羽動物醫院（三民院）', address: '高雄市三民區信國路20號', phone: '07-395-5131', city: '高雄市', district: '三民區' },
  { id: '69', name: '星羽動物醫院（大寮院）', address: '高雄市大寮區鳳林路四段790號之1', phone: '07-641-3309', city: '高雄市', district: '大寮區' },
  { id: '70', name: '培昱動物醫院', address: '高雄市鳳山區保泰路6號', phone: '07-841-8289', city: '高雄市', district: '鳳山區' },
  { id: '71', name: '小鳴動物醫院', address: '高雄市前鎮區廣西路288號', phone: '07-962-3055', city: '高雄市', district: '前鎮區' },
  { id: '72', name: '祈癒動物醫院', address: '高雄市仁武區京吉六路90號', phone: '07-375-2082', city: '高雄市', district: '仁武區' },
  { id: '73', name: '肯亞動物專業醫院－屏東院', address: '屏東市崇朝一路192號', phone: '08-765-6655', city: '屏東縣', district: '屏東市' },
  { id: '74', name: '肯亞野動倉庫動物醫院', address: '屏東縣萬丹鄉丹榮路975號', phone: '08-777-6262', city: '屏東縣', district: '萬丹鄉' },
  { id: '75', name: '大同動物醫院', address: '屏東縣屏東市民族路486號', phone: '08-733-9215', city: '屏東縣', district: '屏東市' },
  { id: '76', name: '福爾摩莎動物醫院', address: '屏東縣內埔鄉光明路525-1號', phone: '08-7782018', city: '屏東縣', district: '內埔鄉' },
  { id: '77', name: '國立屏東科技大學附設獸醫教學醫院', address: '屏東縣內埔鄉學府路1號', phone: '08-7740270', city: '屏東縣', district: '內埔鄉' },
  { id: '78', name: '谷米動物醫院', address: '台東縣關山鎮和平路128號', phone: '08-9810253', city: '台東縣', district: '關山鎮' }
];

window.addEventListener('load', function() {
    const { createApp } = Vue;

    createApp({
        data() {
            return {
                // --- 核心狀態 ---
                curTab: 'home',
                loading: false,
                isSSG: false,

                // --- 資料儲存 ---
                inv: [],
                merchList: [],
                articlesList: [],
                genePages: [],
                announcement: [],
                
                // --- 基因資料 (商城篩選用) ---
                db: {}, 
                geneSpecies: '豹紋守宮',

                // --- 介面狀態 ---
                navHidden: false,
                mobileMenuOpen: false,
                showToast: false,
                lightboxItem: null,
                isDayMode: true, // 預設日間模式
                lastScrollY: 0,
                displayLimit: 20,
                readingProgress: 0,
                
                // --- 詳細頁狀態 ---
                targetProductId: null,
                targetArticleId: null,
                targetMerchId: null,
                viewingGene: null,
                readingArticle: null,

                // --- 搜尋與篩選 ---
                kw: '', 
                sp: '豹紋守宮',
                fil: { stock:true, sold:false, minP:'', maxP:'', sexM:true, sexF:true, genes:[] },
                showMobileFilter: false,
                openFCat: null,
                sortOrder: 'default',
                artCat: 'All',
                
                // --- 使用者 ---
                wishlist: [],
                history: [],
                showOnlyFav: false,
                showOnlyHistory: false,
                admin: false,
                newI: {Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:''},
                editMode: false,
                aKw: '', aFil: 'All',

                // --- 資源 ---
                careImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E7%92%B0%E5%A2%83.png', 
                aboutImg: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/324500%20(1).png',
                logoUrl: 'https://cdn.jsdelivr.net/gh/zzes50708/gencko-assets@main/img/%E6%AD%A3%E9%9D%A2.png',
                lineLink: 'https://line.me/R/ti/p/@219abdzn', 
                gasApiUrl: 'https://script.google.com/macros/s/AKfycbwEM4j5DdRxvvrVFEOXjHTaBOuEyvg5Ck9SNhfyYKj0WyzbbRYOEQ5oL8pLRJjEoqn91A/exec',
                hotList: [],
                faqList: [
                    {title:'Q1：購買前的須知與權益？ (必讀)', ans:'Gencko 工作室出貨前皆確認個體 100% 健康。\n購買視同同意以下事項：\n1. 開箱請全程錄影。\n2. 購買前請做足功課，本社群與官方皆可無償教學。', open: false},
                    {title:'Q2：運送方式與包裝安全嗎？', ans:'我們提供黑貓宅配與面交服務。\n宅配使用專業紙箱與穩固緩衝包材，確保內部透氣與穩定，讓個體安全抵達。', open: false},
                    {title:'Q3：運送風險與退款機制？', ans:'若收件後開箱錄影發現個體死亡，我們將全額退款或補寄等值個體。\n請務必在收件後 24 小時內回報，逾期將無法受理。', open: false},
                    {title:'Q4：收到後發現有缺陷或問題？', ans:'若個體有缺陷且本工作室未事先告知，經提供錄影證明無調包嫌疑後，本方無條件退款。', open: false},
                    {title:'Q5：選育個體長大後顏色不如預期？', ans:'本工作室不進行退換貨。\n守宮體色隨成長變化，若非常在意未來表現，建議購買已發色之成體。', open: false},
                    {title:'Q6：關於性別判斷準確率？', ans:'亞成體與成體性別判斷準確率極高。幼體我們會依照孵化溫度提供「機率」參考（如 90% 公），但不保證 100% 準確，購買幼體請知悉此風險。', open: false},
                    {title:'Q7：可以先付訂金保留嗎？', ans:'可以。支付 30% 訂金可保留 14 天。若超過保留期限未補足尾款，訂金恕不退還。', open: false}
                ],
                marqueeList: [],
                tags:{'豹紋守宮':['黑夜','蜜橘','紅鑽石','土匪'],'肥尾守宮':['幽靈','橘白','無紋','立可白']},

                // --- 基因計算機狀態 ---
                calc_sp: CALC_SPECIES.LG,
                calc_male: [], 
                calc_female: [], 
                calc_result: null,
                calc_modalOpen: false,
                calc_activeInfo: null,
                calc_activeSelector: null,
                calc_expandType: null,
                calc_expandGroup: null,

                // --- 特寵醫院地圖狀態 ---
                hosp_regions: HOSPITAL_REGIONS,
                hosp_city: 'all',
                hosp_district: 'all',

                // --- 健康評估資料 ---
                health: {
                    activity: 'MEDIUM',
                    movement: 'NORMAL',
                    tail: 'NORMAL',
                    droppings: 'SOLID'
                },

                // --- 飼養評估資料 ---
                qs: {
                    step: 0,
                    answers: {}, 
                    finished: false,
                    questions: [
                        { id: 1, text: "您每天是否能抽出 10 分鐘觀察守宮狀態、清理排泄物並補充水分？", options: [ { id: '1a', label: '沒問題，觀察守宮是種享受', score: 10 }, { id: '1b', label: '有空才弄，沒空就算了', score: 4 }, { id: '1c', label: '我希望牠能完全自動化生存', score: 0 } ] },
                        { id: 2, text: "您對於「餵食活體昆蟲」（如蟋蟀、杜比亞蟑螂）的接受度如何？", options: [ { id: '2a', label: '完全接受，甚至覺得有趣', score: 10 }, { id: '2b', label: '有點怕但為了守宮願意克服', score: 7 }, { id: '2c', label: '極度恐懼昆蟲，完全無法觸碰', score: 0 } ] },
                        { id: 3, text: "您是否願意購置專用的「溫控設備」與「溫濕度計」以維持環境穩定？", options: [ { id: '3a', label: '已規劃好整套溫控系統', score: 10 }, { id: '3b', label: '會買基本加熱設備，手動控制', score: 5 }, { id: '3c', label: '覺得台灣天氣熱，不需加熱設備', score: 1 } ] },
                        { id: 4, text: "守宮壽命可達 10-15 年，您是否能承諾長期的陪伴與照料？", options: [ { id: '4a', label: '這是我的長期承諾', score: 10 }, { id: '4b', label: '目前可以，不確定未來變數', score: 5 }, { id: '4c', label: '只是跟風想養看看', score: 0 } ] },
                        { id: 5, text: "您居住區域附近是否有「爬蟲專科」獸醫院（非一般犬貓醫院）？", options: [ { id: '5a', label: '已有口袋名單，且交通方便', score: 10 }, { id: '5b', label: '知道有幾家，但有點遠', score: 6 }, { id: '5c', label: '完全不知道要去哪裡看醫生', score: 2 } ] },
                        { id: 6, text: "您對守宮的「拒食」、「脫皮不順」或「MBD」等常見疾病有基本了解嗎？", options: [ { id: '6a', label: '已研讀大量資料與飼養案例', score: 10 }, { id: '6b', label: '聽過一些，但不清楚細節', score: 4 }, { id: '6c', label: '完全沒聽過，以為跟魚一樣好養', score: 0 } ] },
                        { id: 7, text: "家中的成員或室友是否能接受房間內有「爬蟲類」與「昆蟲飼料」？", options: [ { id: '7a', label: '全員支持，甚至想一起看', score: 10 }, { id: '7b', label: '只要不跑出來，他們就沒意見', score: 6 }, { id: '7c', label: '家人極度反感蛇或蜥蜴', score: 0 } ] },
                        { id: 8, text: "您了解守宮主要是「觀賞性」寵物，而非像犬貓般頻繁互動或親人嗎？", options: [ { id: '8a', label: '理解，我喜歡靜靜看牠們', score: 10 }, { id: '8b', label: '希望還是能常常上手把玩', score: 5 }, { id: '8c', label: '如果不能撒嬌我就不想養了', score: 1 } ] },
                        { id: 9, text: "當您出遠門（3天以上）時，是否有合適的環境管理或代看方案？", options: [ { id: '9a', label: '已備好合適環境設備或代看親友', score: 10 }, { id: '9b', label: '出門前餵飽一點應該就沒事', score: 4 }, { id: '9c', label: '沒考慮過這點', score: 0 } ] },
                        { id: 10, text: "您是否有一筆約 5,000-10,000 元的緊急預算應對突發醫療或設備損壞？", options: [ { id: '10a', label: '已有準備，這對寵物很重要', score: 10 }, { id: '10b', label: '有存款，但不想花這麼多在蜥蜴身上', score: 4 }, { id: '10c', label: '目前經濟拮据，沒多餘預算', score: 0 } ] }
                    ],
                    results: [
                        { min: 85, max: 100, title: "守宮界的高階玩家", desc: "您具備極其成熟的飼養觀念，特別是對於溫控、活體餵食與醫療資源的掌握非常到位。守宮跟著您一定會很幸福！" },
                        { min: 65, max: 84, title: "合格的守宮新秀", desc: "您已具備基礎知識與環境，但在特定細節（如突發疾病應對或活餌管理）可以再多向經驗豐富的爬友請教。" },
                        { min: 40, max: 64, title: "需要再補課的觀望者", desc: "您對守宮有熱忱，但可能還沒意識到爬蟲類對「環境精確度」的要求。建議先從布置環境與克服昆蟲恐懼開始。" },
                        { min: 0, max: 39, title: "建議先暫緩飼養", desc: "目前的條件或觀念可能尚不適合飼養守宮。爬蟲類雖然安靜，但對生存條件（溫濕度）極其挑剔，建議再多做功課。" }
                    ]
                }
            }
        },
        watch: {
            curTab(val) { this.$nextTick(() => this.updateMeta()); },
            readingArticle() { this.$nextTick(() => this.updateMeta()); },
            targetProductId() { this.$nextTick(() => this.updateMeta()); },
            viewingGene() { this.$nextTick(() => this.updateMeta()); },
            calc_male: { deep: true, handler: 'calc_run' },
            calc_female: { deep: true, handler: 'calc_run' },
            calc_sp() { 
                this.calc_male = []; this.calc_female = []; this.calc_result = null; 
                this.calc_activeSelector = null;
            }
        },
        mounted() {
            this.initTheme();

            fetch('/genes.json').then(r => r.json()).then(data => { this.db = data; });

            if (window.INITIAL_DATA) {
                this.isSSG = true;
                this.hydrate(window.INITIAL_DATA);
            } else {
                this.loadDataFromAPI();
            }

            this.resolveRoute(window.location.pathname);
            window.addEventListener('popstate', () => {
                if (this.lightboxItem) this.lightboxItem = null;
                else this.resolveRoute(window.location.pathname);
            });

            document.addEventListener('click', (e) => {
                this.handleLinkClick(e);
                if (this.calc_activeSelector && !e.target.closest('.calc-dropdown-container')) {
                    this.calc_activeSelector = null;
                    this.calc_expandType = null;
                    this.calc_expandGroup = null;
                }
            });

            const savedWish = localStorage.getItem('gencko_wishlist');
            if(savedWish) this.wishlist = JSON.parse(savedWish);
            const savedHist = localStorage.getItem('gencko_history');
            if(savedHist) this.history = JSON.parse(savedHist);
            
            setTimeout(() => { if(window.hideLoader) window.hideLoader(); }, 800);
            window.addEventListener('scroll', this.handleScroll);
        },
        computed: {
            shopList() {
                let l = this.inv.filter(i => {
                    if (i.Species !== this.sp || i.Status === 'Trash' || i.Status === 'NotForSale') return false;
                    const isSold = i.Status === 'Sold';
                    const isStock = i.Status === 'ForSale' || i.Status === 'Reserved';
                    if (!this.fil.sold && isSold) return false;
                    if (!this.fil.stock && isStock) return false;
                    
                    const p = Number(i.ListingPrice) || 0;
                    if (this.fil.minP && p < this.fil.minP) return false;
                    if (this.fil.maxP && p > this.fil.maxP) return false;

                    const sex = i.GenderType;
                    const isM = sex === '公' || (sex === '溫度' && Number(i.GenderValue) >= 30);
                    const isF = sex === '母' || (sex === '溫度' && Number(i.GenderValue) <= 27);
                    if (!this.fil.sexM && isM) return false;
                    if (!this.fil.sexF && isF) return false;

                    if (this.fil.genes.length > 0) {
                        const iGenes = Array.isArray(i.Genes) ? i.Genes : [];
                        if (!this.fil.genes.every(g => iGenes.includes(g))) return false;
                    }
                    return true;
                });

                if(this.kw) l = l.filter(i => JSON.stringify(i).toLowerCase().includes(this.kw.toLowerCase()));
                if(this.showOnlyFav) l = l.filter(i => this.wishlist.includes(i.ID));
                if(this.showOnlyHistory) l = l.filter(i => this.history.includes(i.ID));
                
                return l.sort((a,b) => {
                    const imgA = a.ImageURL ? 1 : 0;
                    const imgB = b.ImageURL ? 1 : 0;
                    if(imgA !== imgB) return imgB - imgA;

                    const statA = a.Status === 'Sold' ? 1 : 0;
                    const statB = b.Status === 'Sold' ? 1 : 0;
                    if(statA !== statB) return statA - statB;
                    
                    const priceA = Number(a.ListingPrice)||0;
                    const priceB = Number(b.ListingPrice)||0;
                    if(this.sortOrder === 'price_asc') return priceA - priceB;
                    if(this.sortOrder === 'price_desc') return priceB - priceA;
                    
                    return priceB - priceA;
                }).slice(0, this.displayLimit);
            },
            articleCats() {
                if(!this.articlesList.length) return [];
                return [...new Set(this.articlesList.map(i => i.Category).filter(c => c))];
            },
            filteredArticles() {
                if (!this.articlesList || this.articlesList.length === 0) return [];
                let list = this.articlesList;
                if (this.kw) {
                    const k = this.kw.toLowerCase();
                    return list.filter(i => i.Title.toLowerCase().includes(k) || i.Summary.toLowerCase().includes(k));
                }
                if (this.artCat !== 'All') {
                    list = list.filter(i => i.Category === this.artCat);
                }
                return list;
            },
            currentProduct() {
                if (!this.targetProductId || !this.inv.length) return null;
                return this.inv.find(i => i.ID === this.targetProductId) || null;
            },
            currentMerch() {
                if (!this.targetMerchId || !this.merchList.length) return null;
                return this.merchList.find(i => i.ItemID == this.targetMerchId) || null;
            },
            productModules() {
                const p = this.currentProduct;
                if (!p) return null;
                let geneArray = Array.isArray(p.Genes) ? p.Genes : (typeof p.Genes === 'string' ? [p.Genes] : []);
                return {
                    identity: { id: p.ID, morph: p.Morph, genes: geneArray, gender: p.GenderType, genderValue: p.GenderValue, birth: p.Birthday || '未登錄', note: p.Note || '' },
                    visuals: { list: p.ImageURL ? [p.ImageURL] : [] },
                    health: { statement: '本工作室嚴格把關，所有上架個體均確認進食與排泄正常，無健康隱憂始開放選購。' },
                    expectations: { notice: '基因表現受環境與成長過程影響，圖片僅供當下參考。' },
                    transaction: { price: p.ListingPrice, status: p.Status }
                };
            },
            breedersList() {
                let list = this.inv.filter(i => i.Species === this.sp && i.Status === 'NotForSale' && i.Status !== 'Trash');
                return list.sort((a,b) => {
                    const imgA = a.ImageURL ? 1 : 0;
                    const imgB = b.ImageURL ? 1 : 0;
                    if(imgA !== imgB) return imgB - imgA; 
                    return new Date(b.CreatedDate) - new Date(a.CreatedDate);
                });
            },
            adminList() {
                let l = this.inv;
                if(this.aFil !== 'All') l = l.filter(i => i.Status === this.aFil);
                if(this.aKw) l = l.filter(i => i.ID.toLowerCase().includes(this.aKw.toLowerCase()));
                return l.sort((a,b) => new Date(b.CreatedDate) - new Date(a.CreatedDate));
            },
            dash() {
                const c = this.inv.reduce((s,i) => s + (+i.CostPrice||0), 0);
                const v = this.inv.filter(i => i.Status === 'Sold').reduce((s,i) => s + (+i.SoldPrice||0), 0);
                const cnt = this.inv.filter(i => i.Status === 'ForSale' || i.Status === 'NotForSale').length;
                return { cost: c, val: v, count: cnt };
            },
            morphHis() { return [...new Set(this.inv.map(i => i.Morph))]; },
            maxPrice() {
                const prices = this.inv.filter(i => i.Species === this.sp && i.Status === 'ForSale').map(i => Number(i.ListingPrice) || 0);
                return prices.length ? Math.max(...prices) : 0;
            },
            availableGenes() {
                const s = new Set();
                const targetStatus = this.fil.sold ? ['ForSale', 'Sold', 'Reserved'] : ['ForSale', 'Reserved'];
                this.inv.filter(i => i.Species === this.sp && targetStatus.includes(i.Status)).forEach(i => {
                    if (Array.isArray(i.Genes)) i.Genes.forEach(g => s.add(g === '白黃' ? 'WY' : g));
                });
                return Array.from(s);
            },
            
            // --- 基因計算機 Computed ---
            calc_currentDefs() { return GENE_DEFINITIONS[this.calc_sp] || []; },
            calc_groupedGenes() {
                const groups = {};
                this.calc_currentDefs.forEach(g => {
                    if (!groups[g.type]) groups[g.type] = [];
                    groups[g.type].push(g);
                });
                return groups;
            },
            calc_typeOrder() { return [CALC_TYPES.DOM, CALC_TYPES.REC, CALC_TYPES.CODOM, CALC_TYPES.POLY, CALC_TYPES.COMBO, CALC_TYPES.BLOOD]; },
            calc_comboGroups() { return ['川普白化', '貝爾白化', '雨水白化', '無白化']; },

            // --- 特寵醫院地圖 Computed ---
            hosp_availableCities() { return new Set(HOSPITAL_DATA.map(h => h.city)); },
            hosp_districts() {
                if (this.hosp_city === 'all') return [];
                const set = new Set(HOSPITAL_DATA.filter(h => h.city === this.hosp_city).map(h => h.district));
                return Array.from(set).sort();
            },
            hosp_filtered() {
                return HOSPITAL_DATA.filter(h => {
                    const cityMatch = this.hosp_city === 'all' || h.city === this.hosp_city;
                    const districtMatch = this.hosp_district === 'all' || h.district === this.hosp_district;
                    return cityMatch && districtMatch;
                });
            },

            // --- 健康評估計算 ---
            health_result() {
                const d = this.health;
                let score = 0;
                if (d.activity === 'HIGH') score += 25; else if (d.activity === 'MEDIUM') score += 15; else score += 5;
                if (d.movement === 'NORMAL') score += 25; else score += 0;
                if (d.tail === 'PLUMP') score += 25; else if (d.tail === 'NORMAL') score += 20; else if (d.tail === 'THIN') score += 10; else score += 0;
                if (d.droppings === 'SOLID') score += 25; else if (d.droppings === 'NONE') score += 15; else if (d.droppings === 'RUNNY') score += 5; else score += 0;

                let status = "健康良好", colorClass = "c-green", bgClass = "bg-green", suggestion = "您的守宮看起來非常有精神，請繼續保持優質的環境與飲食！", warning = null;

                if (d.droppings === 'ABNORMAL') {
                    score = Math.min(score, 15); status = "極度危險"; colorClass = "c-red"; bgClass = "bg-red";
                    suggestion = "檢測到異常糞便（綠色、黏液或異味）。這通常是寄生蟲或感染的徵兆，請立即諮詢獸醫！"; warning = "系統警告：檢測到高度異常，請即刻尋求醫療建議";
                } else if (d.movement === 'LETHARGIC') {
                    score = Math.min(score, 35); status = "健康堪憂"; colorClass = "c-red"; bgClass = "bg-red";
                    suggestion = "守宮出現四肢無力或拖行現象，可能是代謝性骨病(MBD)或嚴重虛弱，請檢查鈣粉補充與光照。"; warning = "系統警告：行動力異常，建議就醫檢查";
                } else if (d.tail === 'SICKLY') {
                    score = Math.min(score, 45); status = "嚴重消瘦"; colorClass = "c-orange"; bgClass = "bg-orange";
                    suggestion = "尾巴極度細弱顯示長期能量不足或疾病，建議隔離並進行更詳細的體檢與驅蟲。"; warning = "系統警告：體態過瘦，需注意拒食或寄生蟲問題";
                } else {
                    if (score < 50) { status = "需密切觀察"; colorClass = "c-orange"; bgClass = "bg-orange"; suggestion = "多項指標偏低，建議檢查飼養環境（溫度、濕度）並記錄食慾變化。"; } 
                    else if (score < 75) { status = "狀態尚可"; colorClass = "c-yellow"; bgClass = "bg-yellow"; suggestion = "健康狀況穩定，但仍有提升空間。可以嘗試增加食物多樣性或調整環境參數。"; }
                }
                return { score, status, colorClass, bgClass, suggestion, warning };
            },

            // --- 飼養評估 Computed ---
            qs_totalScore() { return Object.values(this.qs.answers).reduce((a, b) => a + b, 0); },
            qs_progress() { return ((this.qs.step) / this.qs.questions.length) * 100; },
            qs_currentQ() { return this.qs.questions[this.qs.step]; },
            qs_result() { 
                const s = this.qs_totalScore;
                return this.qs.results.find(r => s >= r.min && s <= r.max) || this.qs.results[3];
            }
        },
        methods: {
            hydrate(data) {
                if(data.inventory) {
                    this.inv = data.inventory.map(i => {
                        try { if(typeof i.Genes === 'string') i.Genes = JSON.parse(i.Genes); } catch(e) { i.Genes = []; }
                        return i;
                    });
                    this.initHotPicks();
                }
                if(data.merchandise) this.merchList = data.merchandise;
                if(data.articles) {
                    this.articlesList = data.articles;
                    if (this.targetArticleId) {
                        const art = this.articlesList.find(a => a.ID === this.targetArticleId);
                        if(art) this.readingArticle = art;
                        this.targetArticleId = null;
                    }
                }
                if(data.genes) this.genePages = data.genes;
                if(data.announcement) this.marqueeList = data.announcement;
            },
            async loadDataFromAPI() {
                this.loading = true;
                try {
                    const res = await fetch(this.gasApiUrl + '?action=getAllData');
                    const json = await res.json();
                    if(json.status === 'success') this.hydrate(json.data);
                } catch(e) { console.error(e); }
                this.loading = false;
            },
            resolveRoute(path) {
                const cleanPath = path.replace(/\/+$/, '') || '/';
                if (cleanPath === '/calculator') this.curTab = 'calculator';
                else if (cleanPath === '/') this.curTab = 'home';
                else if (cleanPath === '/shop') this.curTab = 'shop';
                else if (cleanPath.startsWith('/product/')) {
                    this.targetProductId = cleanPath.split('/')[2];
                    this.curTab = 'product_detail';
                } else if (cleanPath === '/articles') {
                    this.curTab = 'articles';
                    this.readingArticle = null;
                } else if (cleanPath.startsWith('/articles/')) {
                    const id = cleanPath.split('/')[2];
                    this.curTab = 'articles';
                    if(this.articlesList.length) {
                        const art = this.articlesList.find(a => a.ID === id);
                        if(art) this.readingArticle = art;
                    } else {
                        this.targetArticleId = id;
                    }
                } else if (cleanPath === '/genes') {
                    this.curTab = 'genes';
                    this.viewingGene = null;
                } else if (cleanPath.startsWith('/genes/')) {
                    const name = decodeURIComponent(cleanPath.split('/')[2]);
                    this.curTab = 'gene_detail';
                    this.setViewingGene(name);
                } else if (cleanPath === '/merch') {
                    this.curTab = 'merch';
                } else if (cleanPath.startsWith('/merch/')) {
                    this.targetMerchId = cleanPath.split('/')[2];
                    this.curTab = 'merch_detail';
                } else if (['/about', '/care', '/qs', '/health', '/hospital', '/breeders', '/faq'].includes(cleanPath)) {
                    this.curTab = cleanPath.substring(1);
                } else {
                    this.curTab = 'home';
                }
                window.scrollTo(0, 0);
            },
            handleLinkClick(e) {
                const link = e.target.closest('a');
                if (!link) return;
                const href = link.getAttribute('href');
                if (href && href.startsWith('/') && !href.startsWith('//') && link.target !== '_blank') {
                    e.preventDefault();
                    history.pushState(null, '', href);
                    this.resolveRoute(href);
                    this.mobileMenuOpen = false;
                    // 自動收合所有已展開的 details
                    document.querySelectorAll('details.mm-details[open]').forEach(el => el.removeAttribute('open'));
                }
            },
            navigateTo(path) {
                history.pushState(null, '', path);
                this.resolveRoute(path);
            },
            initTheme() {
                const savedTheme = localStorage.getItem('gencko_theme');
                if(savedTheme === 'dark') { this.isDayMode = false; document.body.classList.remove('day-mode'); }
                else { this.isDayMode = true; document.body.classList.add('day-mode'); }
            },
            toggleTheme() {
                this.isDayMode = !this.isDayMode;
                if(this.isDayMode) document.body.classList.add('day-mode');
                else document.body.classList.remove('day-mode');
                localStorage.setItem('gencko_theme', this.isDayMode ? 'light' : 'dark');
            },
            initHotPicks() { this.hotList = this.inv.filter(i => i.IsHot === 'Hot'); },
            async api(url, method = 'GET', body = null) {
                try {
                    const res = await fetch(this.gasApiUrl, { method: 'POST', body: JSON.stringify({ action: url.replace('/api/', ''), payload: body }) });
                    return await res.json();
                } catch (e) { console.error('API Error:', e); throw e; }
            },
            toShop() { this.sp = '豹紋守宮'; this.kw=''; this.navigateTo('/shop'); },
            toArticles() { this.navigateTo('/articles'); },
            openProduct(id) { this.navigateTo('/product/' + id); },
            openArticle(item) { this.readingArticle = item; this.navigateTo('/articles/' + item.ID); },
            closeArticle() { this.readingArticle = null; this.navigateTo('/articles'); },
            openMerchDetail(id) { this.navigateTo('/merch/' + id); },
            openGenePage(name) {
                let target = name;
                if (name === '直線') target = (this.geneSpecies === '豹紋守宮') ? '直線 (豹紋)' : '直線 (肥尾)';
                this.navigateTo('/genes/' + encodeURIComponent(target));
            },
            setViewingGene(name) {
                let found = this.genePages.find(g => g.Name === name);
                if(!found) found = { Name: name, Warning:'', Brief:'載入中或無資料', Detail:'', ImageURL:'', Source:'', Loading: true };
                this.viewingGene = { ...found, DisplayName: found.Name.replace(/ \((豹紋|肥尾)\)$/, '') };
            },
            scrollToTop() { this.navigateTo('/'); },
            changeSpecies(s) { this.sp = s; this.kw = ''; this.displayLimit = 20; },
            toggleTag(t) { this.kw = (this.kw === t) ? '' : t; this.displayLimit = 20; },
            onSearchInput(e) {
                const val = e.target.value;
                if(this.searchTimer) clearTimeout(this.searchTimer);
                this.searchTimer = setTimeout(() => { this.kw = val; this.displayLimit = 20; }, 300);
            },
            resetFilters() { this.fil = { stock:true, sold:false, minP:'', maxP:'', sexM:true, sexF:true, genes:[] }; this.kw = ''; this.displayLimit = 20; window.scrollTo({ top: 0, behavior: 'smooth' }); },
            toggleFCat(c) { this.openFCat = (this.openFCat === c) ? null : c; },
            handleScroll() {
                const st = Math.max(0, window.scrollY); // 避免負值 (iOS 回彈)
                if (st > 100 && st > this.lastScrollY) this.navHidden = true;
                else this.navHidden = false;
                this.lastScrollY = st;
                if (st + window.innerHeight >= document.documentElement.scrollHeight - 300) this.displayLimit += 20;
                if (this.curTab === 'articles' && this.readingArticle) {
                    const docH = document.documentElement.scrollHeight;
                    const winH = window.innerHeight;
                    const progress = (st / (docH - winH)) * 100;
                    this.readingProgress = Math.min(100, Math.max(0, progress));
                }
            },
            convertLink(url) {
                if (!url) return '';
                const driveRegex = /file\/d\/([a-zA-Z0-9_-]+)\//;
                const match = url.match(driveRegex);
                let target = url;
                if (match && match[1]) target = 'https://drive.google.com/uc?id=' + match[1];
                return `https://wsrv.nl/?url=${encodeURIComponent(target)}&w=1000&output=webp&q=80`;
            },
            fmtDate(d) { try { return new Date(d).toISOString().split('T')[0]; } catch(e){ return ''; } },
            fmtG(g){ return Array.isArray(g)?g.join(' + '):g; },
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
            },
            toggleWishlist(id) {
                if(this.wishlist.includes(id)) this.wishlist = this.wishlist.filter(x => x !== id);
                else this.wishlist.push(id);
                localStorage.setItem('gencko_wishlist', JSON.stringify(this.wishlist));
            },
            toggleHistoryMode() { this.showOnlyHistory = !this.showOnlyHistory; },
            copy(t){ navigator.clipboard.writeText(t).then(() => { this.showToast = true; setTimeout(() => this.showToast = false, 2000); }); },
            isGeneAvail(g) { return this.availableGenes.includes(g); },
            getSortedGenes(list) { return [...list].sort((a, b) => (this.isGeneAvail(b)?1:0) - (this.isGeneAvail(a)?1:0)); },
            openLightbox(i) { this.lightboxItem = i; history.pushState({ lightbox: true }, ''); },
            closeLightbox() { if(history.state?.lightbox) history.back(); else this.lightboxItem = null; },
            login(){ const p = prompt('密碼'); if(btoa(p) === 'ODg4OA==') this.admin=true; },
            async submit(){
                if(!this.newI.Morph) return alert('請填寫品系');
                this.loading=true;
                try {
                    const action = this.editMode ? 'updateProduct' : 'addProduct';
                    const r = await this.api(action, 'POST', this.newI);
                    if (r.status === 'success') { alert(this.editMode ? '修改成功' : '上架成功'); this.loadDataFromAPI(); this.cancelEdit(); }
                } catch(e) { alert('失敗: ' + e); }
                this.loading=false;
            },
            edit(i) { this.newI = JSON.parse(JSON.stringify(i)); this.editMode = true; document.getElementById('form-top').scrollIntoView({behavior:'smooth'}); },
            cancelEdit() { this.editMode = false; this.resetForm(); },
            resetForm() { this.newI = {Species:'豹紋守宮',Morph:'',Genes:[],GenderType:'公',GenderValue:'',Birthday:new Date().toISOString().split('T')[0],CostPrice:'',ListingPrice:'',ImageURL:''}; },
            async chkStat(i){
                 if(i.Status==='Sold'){
                    const p = prompt('成交價', i.ListingPrice);
                    if(p){ 
                        i.SoldPrice=p; const c=prompt('客戶資料'); i.CustomerInfo=c; 
                        if(c){ const r = await this.api('checkBlacklist', 'POST', { phone: c }); if(r.isBlacklisted) alert('⚠️ 黑名單! '+r.reason); }
                    } else i.Status='ForSale';
                 }
                 await this.api('updateProduct', 'POST', i);
            },
            async dup(i){ if(confirm('複製?')) await this.api('addProduct', 'POST', {...i, ID:undefined, CreatedDate:undefined}); this.loadDataFromAPI(); },
            del(i){ if(confirm('刪除?')) { i.Status='Trash'; this.api('updateProduct', 'POST', i); } },
            updateMeta() {
                let title = '守宮選購與飼養｜Gencko Studio';
                if(this.curTab === 'calculator') title = '基因計算機｜Gencko Studio';
                if(this.curTab === 'product_detail' && this.currentProduct) title = `${this.currentProduct.Morph}｜Gencko Studio`;
                if(this.curTab === 'articles' && this.readingArticle) title = `${this.readingArticle.Title}｜Gencko Studio`;
                if(this.curTab === 'shop') title = '線上選購守宮｜Gencko Studio';
                if(this.curTab === 'genes') title = '守宮基因圖鑑｜Gencko Studio';
                document.title = title;
            },

            // --- 基因計算機 UI 互動邏輯 ---
            calc_toggleSelector(sex) {
                if (this.calc_activeSelector === sex) {
                    this.calc_activeSelector = null;
                } else {
                    this.calc_activeSelector = sex;
                    this.calc_expandType = null;
                    this.calc_expandGroup = null;
                }
            },
            calc_toggleType(type) {
                this.calc_expandType = (this.calc_expandType === type) ? null : type;
                this.calc_expandGroup = null;
            },
            calc_toggleComboGroup(group) {
                this.calc_expandGroup = (this.calc_expandGroup === group) ? null : group;
            },
            calc_isGeneDisabled(geneId, sex) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                if (list.some(g => g.geneId === geneId)) return true;
                return false; 
            },
            calc_addGene(geneId, sex) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                const def = this.calc_currentDefs.find(d => d.id === geneId);
                let zyg = ZYG.VIS;
                if (def.type === CALC_TYPES.REC) zyg = ZYG.VIS;
                if (def.type === CALC_TYPES.CODOM) zyg = ZYG.SGL;
                list.push({ geneId, zygosity: zyg });
                this.calc_activeSelector = null;
                this.calc_expandType = null;
                this.calc_run();
            },
            calc_removeGene(index, sex) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                list.splice(index, 1);
                this.calc_run();
            },
            calc_updateZygosity(e, index, sex) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                list[index].zygosity = e.target.value;
                this.calc_run();
            },
            calc_toggleHet(e, index, sex) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                list[index].zygosity = e.target.checked ? ZYG.HET : ZYG.VIS;
                this.calc_run();
            },
            calc_getGeneState(sex, geneId) {
                const list = sex === 'Male' ? this.calc_male : this.calc_female;
                const found = list.find(g => g.geneId === geneId);
                if (!found) return '';
                if (found.zygosity === ZYG.SUP) return 'state-super';
                if (found.zygosity === ZYG.HET) return 'state-het';
                return 'state-visual';
            },
            // [New] 格式化標籤顯示
            calc_fmtTag(g) {
                const d = this.calc_currentDefs.find(k => k.id === g.geneId);
                if (!d) return g.geneId;
                let name = d.name.split(' (')[0];
                if (g.zygosity === 'Super') {
                    if (!name.includes('超級')) return '超級' + name;
                }
                if (typeof g.zygosity === 'string' && g.zygosity.includes('Het')) {
                    return g.zygosity + ' ' + name;
                }
                if (g.isPoly) return name;
                return name;
            },
            // [New] 機率分母轉換
            calc_getProbFraction(prob) {
                if (prob >= 0.99) return '必中';
                const frac = Math.round(1 / prob);
                return `1 / ${frac}`;
            },

            // --- 基因計算機核心演算法 ---
            calc_run() {
                if (this.calc_male.length === 0 && this.calc_female.length === 0) {
                    this.calc_result = null;
                    return;
                }
                const maleGenes = this.calc_male;
                const femaleGenes = this.calc_female;
                const defs = this.calc_currentDefs;

                // 1. Expand Combos
                const expand = (list) => {
                    let res = [];
                    list.forEach(s => {
                        const d = defs.find(k => k.id === s.geneId);
                        if (d && d.components) {
                            d.components.forEach(c => {
                                let z = ZYG.VIS;
                                if (c.type === 'Het') z = ZYG.HET;
                                if (c.type === 'Super') z = ZYG.SUP;
                                res.push({ geneId: c.geneId, zygosity: z });
                            });
                        } else {
                            res.push(s);
                        }
                    });
                    return res;
                };

                const mExpanded = expand(maleGenes);
                const fExpanded = expand(femaleGenes);
                
                // 2. 警告邏輯 Check
                const allGenes = [...maleGenes, ...femaleGenes];
                let warning = '';
                let notices = [];

                if(allGenes.some(g=>g.geneId==='lemonfrost')) warning += "檸檬霜 (Lemon Frost) 易導致腫瘤。\n";
                if(allGenes.some(g=>g.geneId==='ndbe')) warning += "慾望黑眼 (NDBE) 母體不孕且子代易眼部萎縮。\n";
                if(allGenes.some(g=>g.geneId==='enigman')) notices.push("謎 (Enigma) 可能伴隨神經症狀 (ES)。");
                if(allGenes.some(g=>g.geneId==='whiteandyellow')) notices.push("白黃 (W&Y) 可能伴隨輕微神經症狀。");
                
                const fWhiteout = femaleGenes.find(g=>g.geneId==='aft_whiteout');
                if(fWhiteout && fWhiteout.zygosity === ZYG.SUP) warning += "超級立可白為致死基因。\n";

                // [New] 檢查不同白化混配 (Leopard Gecko Only)
                if (this.calc_sp === CALC_SPECIES.LG) {
                    const albinoTypes = ['tremper', 'bell', 'rainwater'];
                    const getAlbinos = (list) => {
                         const rawIds = list.map(g => g.geneId);
                         // 檢查 combos 是否含白化 (如 RAPTOR 含 tremper)
                         const expandedIds = expand(list).map(g => g.geneId);
                         return new Set([...rawIds, ...expandedIds].filter(id => albinoTypes.includes(id)));
                    };
                    const mAlbinos = getAlbinos(maleGenes);
                    const fAlbinos = getAlbinos(femaleGenes);
                    // 聯集所有白化基因
                    const union = new Set([...mAlbinos, ...fAlbinos]);
                    if(union.size > 1) {
                         warning += "不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n";
                    }
                }

                // [New] 檢查肥尾不孕 (Caramel / Ghost)
                if (this.calc_sp === CALC_SPECIES.AFT) {
                    const fHasCaramel = femaleGenes.some(g => g.geneId === 'aft_caramel');
                    const fHasGhost = femaleGenes.some(g => g.geneId === 'aft_ghost');
                    if(fHasCaramel) warning += "母焦糖 (Caramel) 會有不孕問題。\n";
                    if(fHasGhost) warning += "母幽靈 (Ghost) 會有不孕問題。\n";
                }

                // 3. Calculate Locus (孟德爾)
                const allIds = new Set([...mExpanded.map(g=>g.geneId), ...fExpanded.map(g=>g.geneId)]);
                const mendelianResults = [];
                const polyInheritance = {};

                allIds.forEach(id => {
                    const def = defs.find(d => d.id === id);
                    if(!def) return;
                    
                    const mG = mExpanded.find(g => g.geneId === id);
                    const fG = fExpanded.find(g => g.geneId === id);

                    if (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD) {
                        const mP = mG ? 100 : 0;
                        const fP = fG ? 100 : 0;
                        const avg = (mP + fP) / 2;
                        if (avg > 0) polyInheritance[id] = avg;
                    } else {
                        const getAlleles = (z) => {
                            if (!z) return [0,0];
                            if (def.type === CALC_TYPES.REC) {
                                if (z === ZYG.VIS) return [1,1];
                                if (z === ZYG.HET) return [1,0];
                            } else if (def.type === CALC_TYPES.CODOM) {
                                if (z === ZYG.SUP) return [1,1];
                                if (z === ZYG.VIS || z === ZYG.SGL) return [1,0];
                            } else { 
                                if (z === ZYG.VIS) return [1,0];
                            }
                            return [0,0];
                        };
                        const p1 = getAlleles(mG?.zygosity);
                        const p2 = getAlleles(fG?.zygosity);
                        const counts = {};
                        for(let a of p1) {
                            for(let b of p2) {
                                const sum = a+b;
                                let k = '';
                                if(def.type === CALC_TYPES.REC) {
                                    if(sum===2) k=ZYG.VIS; else if(sum===1) k=ZYG.HET; else k='Wild';
                                } else if(def.type === CALC_TYPES.CODOM) {
                                    if(sum===2) k=ZYG.SUP; else if(sum===1) k=ZYG.SGL; else k='Wild';
                                } else {
                                    if(sum>=1) k=ZYG.VIS; else k='Wild';
                                }
                                counts[k] = (counts[k]||0)+1;
                            }
                        }
                        const locRes = [];
                        Object.keys(counts).forEach(k => {
                            if(k!=='Wild') locRes.push({ geneId: id, zygosity: k, prob: counts[k]/4 });
                        });
                        if(locRes.length > 0) mendelianResults.push(locRes);
                    }
                });

                // 4. Cartesian Product
                let rawOutcomes = [{ gens: [], prob: 1 }];
                mendelianResults.forEach(opts => {
                    const nextOutcomes = [];
                    const sumProb = opts.reduce((s,o)=>s+o.prob, 0);
                    const wildProb = 1 - sumProb;
                    rawOutcomes.forEach(ex => {
                        opts.forEach(o => {
                            nextOutcomes.push({ gens: [...ex.gens, { geneId: o.geneId, zygosity: o.zygosity }], prob: ex.prob * o.prob });
                        });
                        if(wildProb > 0.0001) nextOutcomes.push({ gens: [...ex.gens], prob: ex.prob * wildProb });
                    });
                    rawOutcomes = nextOutcomes;
                });

                // 5. Phenotype Grouping & Finalization
                const phenoMap = new Map();
                rawOutcomes.forEach(o => {
                    const active = o.gens;
                    const visualGenes = active.filter(a => {
                        const d = defs.find(k => k.id === a.geneId);
                        if (!d) return false;
                        if (d.type === CALC_TYPES.REC) return a.zygosity === ZYG.VIS;
                        if (d.type === CALC_TYPES.CODOM) return [ZYG.VIS, ZYG.SGL, ZYG.SUP].includes(a.zygosity);
                        return true;
                    });
                    Object.keys(polyInheritance).forEach(pid => {
                        visualGenes.push({ geneId: pid, zygosity: ZYG.VIS });
                        const bd = defs.find(d => d.id === pid);
                        if(bd && bd.baseGeneId) visualGenes.push({ geneId: bd.baseGeneId, zygosity: ZYG.VIS });
                    });

                    const descParts = [];
                    const consumed = new Set();
                    CALC_COMBO_RULES.forEach(rule => {
                        const met = rule.required.every(r => {
                            const match = visualGenes.find(a => a.geneId === r.id);
                            if(!match || consumed.has(match.geneId)) return false;
                            if(r.z === 'Any') return true;
                            return match.zygosity === r.z;
                        });
                        if(met) {
                            descParts.push(rule.name);
                            rule.required.forEach(r => consumed.add(r.id));
                        }
                    });
                    
                    visualGenes.forEach(a => {
                        if(consumed.has(a.geneId)) return;
                        const d = defs.find(k => k.id === a.geneId);
                        if(!d) return;
                        let name = d.name.split(' (')[0];
                        if(d.type === CALC_TYPES.CODOM) {
                            if(a.zygosity === ZYG.SUP) descParts.push('超級'+name);
                            else descParts.push(name);
                        } else if(d.type === CALC_TYPES.REC) {
                            descParts.push(name);
                        } else if(d.type === CALC_TYPES.POLY || d.type === CALC_TYPES.BLOOD) {
                            if(polyInheritance[d.id] === 100) descParts.push(name);
                            else descParts.push(name + ' (可能帶有)');
                        } else {
                            descParts.push(name);
                        }
                    });

                    const name = descParts.join(' + ') || '原生種 (Wild Type)';
                    if(!phenoMap.has(name)) phenoMap.set(name, { prob: 0, raw: [] });
                    const entry = phenoMap.get(name);
                    entry.prob += o.prob;
                    entry.raw.push(o);
                });

                const finalOutcomes = [];
                phenoMap.forEach((data, name) => {
                    const { prob, raw } = data;
                    const displayGens = [];
                    // 取第一筆 raw sample 來顯示外觀基因
                    const sample = raw[0].gens;
                    sample.forEach(g => {
                        const d = defs.find(k => k.id === g.geneId);
                        if(!d) return;
                        let isVis = false;
                        if(d.type === CALC_TYPES.REC && g.zygosity === ZYG.VIS) isVis = true;
                        if(d.type === CALC_TYPES.CODOM) isVis = true; 
                        if(d.type === CALC_TYPES.DOM) isVis = true;
                        if(isVis) displayGens.push({ ...g });
                    });

                    // [Modified] Poss Het Calculation
                    const involvedIds = new Set([...mExpanded.map(x=>x.geneId), ...fExpanded.map(x=>x.geneId)]);
                    involvedIds.forEach(id => {
                        const d = defs.find(k => k.id === id);
                        if(!d || d.type !== CALC_TYPES.REC) return;
                        if(displayGens.some(dg => dg.geneId === id && dg.zygosity === ZYG.VIS)) return;

                        let hetProb = 0;
                        raw.forEach(r => {
                            const g = r.gens.find(x => x.geneId === id);
                            if(g && (g.zygosity === ZYG.HET || g.zygosity === ZYG.VIS)) hetProb += r.prob;
                        });

                        const ratio = hetProb / prob;
                        if(ratio > 0.001) {
                            let label = 'Poss Het';
                            if(ratio >= 0.99) label = 'Het';
                            else if(ratio >= 0.60) label = '66% Poss Het';
                            else if(ratio >= 0.45) label = '50% Poss Het';
                            else label = `${Math.round(ratio*100)}% Poss Het`;
                            displayGens.push({ geneId: id, zygosity: label });
                        }
                    });

                    Object.keys(polyInheritance).forEach(pid => {
                        displayGens.push({ geneId: pid, zygosity: ZYG.VIS, isPoly: true });
                    });

                    // [New] Full Label Generation
                    let extraInfo = displayGens.map(g => {
                        const d = defs.find(k => k.id === g.geneId);
                        const gName = d ? d.name.split(' (')[0] : g.geneId;
                        if(g.zygosity === 'Super' && !gName.includes('超級')) return '超級' + gName;
                        if(typeof g.zygosity === 'string' && g.zygosity.includes('Het')) return `${g.zygosity} ${gName}`;
                        if(g.isPoly) return gName;
                        // Avoid duplicates if gene name is already in combo name
                        if(!name.includes(gName)) return gName;
                        return null; 
                    }).filter(s => s);

                    let fullLabel = name;
                    if(extraInfo.length > 0) {
                        fullLabel += ` <span style="font-size:0.9em; color:#aaa; font-weight:normal;">(${extraInfo.join(', ')})</span>`;
                    }

                    finalOutcomes.push({
                        description: name,
                        fullLabel: fullLabel,
                        prob: prob,
                        gens: displayGens
                    });
                });

                finalOutcomes.sort((a,b) => b.prob - a.prob);

                this.calc_result = {
                    totalCombos: finalOutcomes.length,
                    outcomes: finalOutcomes,
                    warning: warning,
                    notices: notices
                };
            },

            // --- 特寵醫院地圖 Methods ---
            hosp_changeCity(e) {
                this.hosp_city = e.target.value;
                this.hosp_district = 'all';
            },
            hosp_getMapLink(h) {
                if(h.mapUrl) return h.mapUrl;
                return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(h.name + ' ' + h.address)}`;
            },

            // --- 飼養評估 Methods ---
            qs_selectOption(qId, score) {
                this.qs.answers[qId] = score;
                setTimeout(() => {
                    if(this.qs.step < this.qs.questions.length - 1) this.qs.step++;
                    else this.qs.finished = true;
                }, 300);
            },
            qs_prevStep() { if(this.qs.step > 0) this.qs.step--; },
            qs_reset() { this.qs.answers = {}; this.qs.step = 0; this.qs.finished = false; }
        }
    }).mount('#app');
});