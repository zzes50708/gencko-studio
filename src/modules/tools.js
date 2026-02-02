import { store } from '../store.js';
import { HOSPITAL_DATA, HOSPITAL_REGIONS } from '../data/hospitals.js'; // [修正] 引入區域資料
import { QUIZ_DATA } from '../data/quiz.js';

export const toolsLogic = {
    data() {
        return {
            // --- 特寵醫院狀態 ---
            hosp_regions: HOSPITAL_REGIONS, // [修正] 正確賦值
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
                questions: QUIZ_DATA.questions,
                results: QUIZ_DATA.results
            }
        };
    },
    methods: {
        // --- 特寵醫院 Methods ---
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
    },
    computed: {
        // --- 特寵醫院 Computed ---
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
            // 計分邏輯
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
    }
};