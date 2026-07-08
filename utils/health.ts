// ============================================================
// 健康評估系統資料 v2
// 三種情境：triage（焦急快篩） / checkup（完整檢查） / purchase（購入評估）
// 評估邏輯：非計分制，每題答案直接標記嚴重度（normal/watch/warn/critical）
// 結果頁顯示「項目報告」+「整體建議」+「可能相關狀況（非診斷）」
// ============================================================

// 嚴重度等級
export const SEVERITY = {
  normal: { label: '正常', color: '#4ade80', tag: '✅', weight: 0 },
  watch: { label: '觀察', color: '#facc15', tag: '🟡', weight: 1 },
  warn: { label: '需就醫', color: '#fb923c', tag: '🟠', weight: 2 },
  critical: { label: '立即就醫', color: '#f87171', tag: '🔴', weight: 4 }
}

// 4 級結果
export const VERDICTS = {
  healthy: {
    key: 'healthy',
    title: '看起來無大礙',
    color: '#4ade80',
    emoji: '🟢',
    headline: '目前各項指標看起來都在正常範圍。',
    action: '請繼續維持目前的飼養環境與規律觀察。'
  },
  watch: {
    key: 'watch',
    title: '持續觀察 3–7 天',
    color: '#facc15',
    emoji: '🟡',
    headline: '有 1–2 項指標需要留意，但目前沒有立即危險。',
    action: '請每天記錄糞便、進食、活動與體重，若 3 天內未改善請預約獸醫。'
  },
  urgent: {
    key: 'urgent',
    title: '建議 48 小時內就醫',
    color: '#fb923c',
    emoji: '🟠',
    headline: '多項指標異常，建議 48 小時內預約爬蟲專科醫院。',
    action: '在等待預約期間請保持環境穩定、避免餵食改變、記錄症狀變化。'
  },
  emergency: {
    key: 'emergency',
    title: '立即送醫',
    color: '#f87171',
    emoji: '🔴',
    headline: '出現嚴重警訊，請於 24 小時內送往爬蟲專科醫院。',
    action:
      '前往醫院前請保溫（25–28°C）、避免劇烈搖晃、不要灌食灌水、攜帶近 3 天糞便照片或實物樣本。'
  }
}

// 可能相關狀況（非診斷，僅作問診參考）
export const DISEASES = {
  crypto: {
    name: '隱孢子蟲感染',
    signs: ['牙籤尾', '反覆吐食', '水樣便伴隨腥臭', '慢性消瘦'],
    note: '守宮最致命的腸道寄生蟲之一，須由獸醫採糞便檢驗確診。'
  },
  coccidia: {
    name: '球蟲感染',
    signs: ['持續拉稀', '糞便極臭', '輕度消瘦'],
    note: '常見腸道寄生蟲，獸醫顯微鏡檢糞便可確診。'
  },
  ri: {
    name: '呼吸道感染',
    signs: ['鼻孔黏液', '嘴角泡沫', '張口呼吸'],
    note: '常因溫度過低或濕度失衡引發，須由獸醫評估是否使用抗生素。'
  },
  mbd: {
    name: '代謝性骨病',
    signs: ['四肢無力拖行', '下顎軟塌', '骨骼彎曲', '抽搐'],
    note: '長期鈣質與維生素 D3 缺乏所致，需 X 光、血液檢查與營養補充計畫。'
  },
  stomatitis: {
    name: '口炎 / 嘴角壞死',
    signs: ['嘴角持續泡沫', '嘴部腫脹', '拒食伴隨甩頭'],
    note: '細菌感染口腔，須清創與抗生素治療。'
  },
  impaction: {
    name: '腸阻塞 / 卡便',
    signs: ['超過 7 天無便', '腹部脹大', '食慾下降'],
    note: '可能因底材誤食、脫水、低溫導致蠕動停止。'
  },
  dehydration: {
    name: '脫水',
    signs: ['眼凹', '皮膚皺褶', '尿酸變黃或橘紅'],
    note: '可藉提高濕度與溫水浴改善，嚴重者需皮下注射補液。'
  },
  burn: {
    name: '低溫燙傷',
    signs: ['腹部皮膚發黑', '組織壞死'],
    note: '常見於使用加溫墊但無控溫器的情境，傷口需獸醫清創與抗生素。'
  },
  dysecdysis: {
    name: '脫皮不順',
    signs: ['趾尖殘皮', '尾尖殘皮', '反覆脫皮失敗'],
    note: '長期殘皮會造成血流阻斷與壞死，須儘早協助移除並調整環境濕度。'
  },
  neuroToxic: {
    name: '神經損傷 / 中毒',
    signs: ['抽搐', '星空姿勢', '原地打轉', '歪頭'],
    note: '可能源於熱衰竭、藥物中毒、嚴重 MBD、中耳感染等，需立即就醫。'
  },
  prolapse: {
    name: '泄殖腔脫垂',
    signs: ['生殖器或腸道組織外露超過 1 小時'],
    note: '需緊急手術復位，延誤會導致組織壞死。'
  },
  eyeIssue: {
    name: '眼疾 / 維生素 A 缺乏',
    signs: ['眼睛分泌物', '結痂', '長期閉眼'],
    note: '須由獸醫評估是否補充維生素 A 與沖洗眼睛。'
  },
  // ====== v2 新增 ======
  mystery: {
    name: '謎病',
    signs: ['仰頭看天', '原地轉圈', '瘋狂撲空', '無法精準對準目標'],
    note: '原因不明的神經性疾病，目前無有效治療，須由獸醫評估支持性照護。'
  },
  kidneyFailure: {
    name: '腎衰竭',
    signs: ['痙攣', '尿酸長期偏黃', '長期厭食'],
    note: '常見於長期高蛋白飲食、脫水、藥物或鈣磷比失衡個體，需血液生化確診。'
  },
  heatExhaust: {
    name: '熱衰竭',
    signs: ['張口呼吸', '長時間癱軟', '皮膚高溫'],
    note: '溫度超過 35°C 持續曝曬常見，須立即降溫並就醫。'
  },
  giStasis: {
    name: '腸胃停滯',
    signs: ['長期不排便', '腹部偏脹', '食慾下降'],
    note: '常因低溫或脫水導致腸蠕動停止，須升溫並由獸醫評估。'
  },
  overfeeding: {
    name: '餵食過量 / 餌料尺寸過大',
    signs: ['餵食後嘔吐', '腹部明顯撐大'],
    note: '單次餵食量或餌料尺寸過大引發。建議調整餵食頻率與尺寸。'
  },
  bacterialEnteritis: {
    name: '細菌性腸胃炎',
    signs: ['持續拉稀', '糞便極臭', '食慾下降'],
    note: '可能源於不潔飼料或環境，須由獸醫做糞便培養。'
  },
  eggBinding: {
    name: '卡蛋 / 卵泡留滯',
    signs: ['長期拒食', '腹部腫脹', '長期無排便'],
    note: '母成體常見緊急狀況，即使沒交配也可能有空包蛋，需 X 光與獸醫處置。'
  },
  lowerGiBleeding: {
    name: '下消化道出血',
    signs: ['血便', '糞便帶鮮紅或深紅'],
    note: '可能源自原蟲性腸炎或誤食異物，須由獸醫評估糞檢與內視鏡。'
  },
  parasites: {
    name: '寄生蟲感染',
    signs: ['慢性消瘦', '軟便', '食慾下降'],
    note: '泛指多種腸道與外部寄生蟲，須由獸醫採糞便檢驗鑑定。'
  },
  pinworm: {
    name: '內寄生蟲 / 蟯蟲',
    signs: ['慢性消瘦', '糞便異常', '長期吸收不良'],
    note: '長期感染可能與牙籤尾、慢性脫水並見，須糞檢確認與驅蟲。'
  },
  malnutrition: {
    name: '嚴重營養不良',
    signs: ['牙籤尾', '皮包骨', '體色暗沉'],
    note: '長期飲食單一、拒食或吸收不良所致，須調整餵食並補充電解質與營養。'
  },
  chronicDehydration: {
    name: '長期慢性脫水',
    signs: ['尿酸長期偏黃', '皮膚皺褶', '眼凹'],
    note: '長期環境太乾或飲水不足造成，須提高濕度並補液。'
  },
  organFailure: {
    name: '器官衰竭',
    signs: ['長期拒食', '長期消瘦', '反應遲鈍'],
    note: '可能為肝、腎或循環系統慢性衰竭，須血液生化評估。'
  },
  anorexia: {
    name: '拒食 / 厭食',
    signs: ['完全不進食', '體態消瘦'],
    note: '排除發情期與適應期後仍持續拒食者，須由獸醫評估。'
  },
  severeParasites: {
    name: '嚴重寄生蟲感染',
    signs: ['牙籤尾', '長期腹瀉', '極度消瘦'],
    note: '可能同時感染多種寄生蟲，須由獸醫做糞檢並擬定驅蟲計畫。'
  },
  severeWeakness: {
    name: '極度虛弱 / 嗜睡',
    signs: ['長時間不動', '眼睛閉著', '無反應'],
    note: '通常是多重病因末期，須立即就醫評估支持性治療。'
  },
  neuroDamage: {
    name: '神經受損',
    signs: ['前肢顫抖', '走路腹部拖地', '對外界反應遲鈍'],
    note: '可能源自外傷、中毒、神經感染或營養缺乏，須由獸醫神經評估。'
  },
  contagionRisk: {
    name: '傳染病潛伏高風險',
    signs: ['新個體與既有個體混養', '未隔離 30 天'],
    note: '即使外觀健康仍可能潛伏寄生蟲或細菌，建議隔離與糞檢。'
  },
  tempAbnormal: {
    name: '溫度異常',
    signs: ['溫度長期 <22°C 或 >35°C'],
    note: '高危：低溫導致腸胃停滯，高溫導致熱衰竭，須立即調整溫控。'
  },
  bacterialDermatitis: {
    name: '細菌性皮膚炎',
    signs: ['皮膚紅腫', '局部潰瘍', '長期潮濕'],
    note: '常見於環境過於潮濕，須改善通風並由獸醫評估抗生素。'
  },
  neuroTerminal: {
    name: '中樞神經衰竭 / 瀕死',
    signs: ['翻正困難', '幾乎不動', '無力撐身'],
    note: '為多種重症末期表現，須立即就醫評估是否仍有支持治療空間。'
  },
  chronicStress: {
    name: '慢性緊迫',
    signs: ['長期食慾下降', '反覆躲洞', '體重下降'],
    note: '混養、過度互動、環境配置不佳皆可能引起，須調整飼養條件。'
  },
  severeStress: {
    name: '嚴重緊迫',
    signs: ['短時間內拒食', '長時間躲洞不出', '體重急遽下降', '見人就竄逃'],
    note: '個體在短時間內承受過量壓力源（搬遷震動、強光噪音、頻繁干擾、被追逐或被攻擊等）所致，會壓制免疫系統並誘發其他疾病。須立即排除壓力源、隔離安置、提供穩定遮蔽與固定光週期。'
  },
  woundInfection: {
    name: '外傷性感染',
    signs: ['咬傷 / 抓傷未癒合', '傷口紅腫流膿', '局部組織腫脹發熱', '皮膚潰瘍擴大'],
    note: '由咬傷、抓傷、燙傷或脫皮失敗等開放性傷口被細菌入侵造成。須由獸醫清創、評估抗生素，並改善飼養環境（控溫、清潔、避免再次受傷）。'
  },
  severeHypoxia: {
    name: '嚴重缺氧',
    signs: ['口腔黏膜偏藍紫', '長時間張口呼吸'],
    note: '可能為呼吸道感染晚期或循環衰竭，須立即就醫。'
  },
  sepsisTerminal: {
    name: '末期敗血症',
    signs: ['口腔黏膜紫紅', '全身蒼白', '極度虛弱'],
    note: '全身感染末期表現，須立即就醫評估。'
  },
  sepsis: {
    name: '敗血症',
    signs: ['體色蒼白', '虛弱', '體溫異常'],
    note: '全身性感染，須由獸醫評估抗生素與支持治療。'
  },
  severeAnemia: {
    name: '嚴重貧血',
    signs: ['口腔黏膜蒼白', '體色灰白', '虛弱'],
    note: '可能源於慢性出血、寄生蟲或營養缺乏，須血液檢查。'
  },
  preShock: {
    name: '休克前兆',
    signs: ['體色蒼白', '反應遲鈍', '低溫'],
    note: '須立即送醫評估循環支持。'
  },
  metabolicStasis: {
    name: '代謝停滯',
    signs: ['體色長期暗沉', '活動下降', '長期不脫皮'],
    note: '常因環境溫度或營養不足，須調整飼養條件再觀察。'
  },
  envStress: {
    name: '環境緊迫',
    signs: ['長期體色暗沉', '躲洞時間增加'],
    note: '光照、震動、噪音、缺乏躲避處皆可能引起，須改善飼養配置。'
  },
  fattyLiver: {
    name: '重度脂肪肝',
    signs: ['長期高脂飼料', '體態鬆軟', '活動下降'],
    note: '長期蠟蟲、大麥蟲為主食常見，須調整飼料並由獸醫評估。'
  },
  calciumPhosphorus: {
    name: '鈣磷比失衡',
    signs: ['長期單一飼料', '長期未補鈣'],
    note: '長期失衡會引發 MBD，須補鈣粉並調整飼料種類。'
  },
  tumor: {
    name: '腫瘤',
    signs: ['腹部單側鼓起', '可觸摸到硬塊'],
    note: '須由獸醫評估是否良性或惡性，可能需 X 光或超音波。'
  },
  constipation: {
    name: '便秘',
    signs: ['排便間隔長', '腹部偏脹'],
    note: '可能源自脫水、低溫、餵食量過大，調整環境後觀察。'
  },
  severeConstipation: {
    name: '嚴重便秘',
    signs: ['長時間無排便', '腹部明顯脹大', '食慾下降'],
    note: '可能進展為腸阻塞，須由獸醫評估。'
  },
  nutritionalImbalance: {
    name: '營養不均',
    signs: ['長期單一飼料', '體色變化', '生長遲緩'],
    note: '建議至少 2–3 種飼料交替並定期補充綜合維生素。'
  },
  earlyMbd: {
    name: '初期 MBD',
    signs: ['輕度肢體顫抖', '走路腹部摩擦地面'],
    note: '尚未出現明顯骨骼變形即發現可大幅改善，須調整鈣粉與環境。'
  },
  detectionFail: {
    name: '無法察覺低溫停滯或熱衰竭',
    signs: ['沒有溫度計', '全缸同溫'],
    note: '看不見的溫度問題是新手最常見的隱形殺手，請務必加裝溫度計。'
  },
  limbLossRisk: {
    name: '斷肢 / 斷尾風險',
    signs: ['混養中體型較小', '常被搶食或追逐'],
    note: '混養中弱勢個體常被攻擊，請立即分缸。'
  }
}

// ============================================================
// 季節判斷（用於修正拒食判讀）
// ============================================================
export const getSeasonContext = (date = new Date()) => {
  const m = date.getMonth() + 1
  return {
    month: m,
    isBreedingSeason: m >= 1 && m <= 4,
    isBrumationSeason: m === 12 || m === 1 || m === 2,
    isPostBreeding: m >= 5 && m <= 7,
    season:
      m >= 3 && m <= 5
        ? 'spring'
        : m >= 6 && m <= 8
          ? 'summer'
          : m >= 9 && m <= 11
            ? 'autumn'
            : 'winter'
  }
}

// ============================================================
// 🚨 情境 1：焦急快篩（Triage）
// ============================================================
export const TRIAGE_QUESTIONS = [
  {
    id: 'lifeSign',
    title: 'Q1. 致命警訊檢查',
    subtitle: '以下症狀看似不明顯，其實都是嚴重警訊。請選擇最符合目前狀況的一項。',
    type: 'single',
    options: [
      {
        id: 'seizure',
        label: '抽搐、痙攣、突然無法翻身',
        severity: 'critical',
        diseases: ['neuroToxic', 'mbd', 'mystery', 'kidneyFailure']
      },
      {
        id: 'breathing',
        label: '大口張嘴吸氣 / 頻繁打哈欠樣動作（可能是呼吸困難而非正常打呵欠）',
        severity: 'critical',
        diseases: ['ri', 'heatExhaust']
      },
      {
        id: 'mouth',
        label: '嘴角牽絲黏液 / 鼻孔阻塞或結痂（不是剛喝完水的水珠）',
        severity: 'critical',
        diseases: ['ri']
      },
      {
        id: 'vomit',
        label: '嘔吐 / 反芻已消化的食物（不只是吐出剛吃進的）',
        severity: 'critical',
        diseases: ['giStasis', 'overfeeding', 'crypto', 'impaction']
      },
      {
        id: 'prolapse',
        label: '泄殖腔有粉紅色組織外露 / 半陰莖無法縮回（不是正常排便突起）',
        severity: 'critical',
        diseases: ['prolapse']
      },
      {
        id: 'paralysis',
        label: '四肢完全癱軟、長時間貼地拖行（不是放鬆休息）',
        severity: 'critical',
        diseases: ['mbd', 'neuroToxic']
      },
      { id: 'none', label: '以上都沒有', severity: 'normal', diseases: [] }
    ]
  },
  {
    id: 'stool',
    title: 'Q2. 糞便狀態（最近 3–5 天）',
    type: 'single',
    options: [
      { id: 'normal', label: '成型、白色尿酸、無強烈異味', severity: 'normal' },
      {
        id: 'noStool',
        label: '5–7 天內沒排便但腹部正常、活動進食正常',
        severity: 'normal',
        normalReason: '脫皮前、低溫期、剛吃飽都可能 5–7 天無便，屬正常變異。'
      },
      { id: 'softOdorless', label: '偶爾偏軟、無異味', severity: 'watch' },
      {
        id: 'runnySmell',
        label: '持續拉稀、顏色正常但極臭',
        severity: 'warn',
        diseases: ['coccidia', 'crypto', 'bacterialEnteritis']
      },
      {
        id: 'bloated',
        label: '腹部明顯脹大 / 超過 7 天無便 / 無精神',
        severity: 'critical',
        diseases: ['impaction', 'eggBinding'],
        normalReason: '母成體必須懷疑卡蛋 / 卵泡留滯。'
      },
      {
        id: 'blood',
        label: '糞便帶血絲、鮮血、深紅色',
        severity: 'critical',
        diseases: ['lowerGiBleeding']
      },
      {
        id: 'wateryVomit',
        label: '水樣便 + 腥臭 + 反覆吐食',
        severity: 'critical',
        diseases: ['crypto']
      },
      {
        id: 'yellowUrate',
        label: '尿酸從白變鮮黃或橘紅色',
        severity: 'warn',
        diseases: ['dehydration', 'kidneyFailure'],
        normalReason: '可能是脫水，也可能是長期維生素 / 鈣粉過量導致的腎臟負擔。'
      }
    ]
  },
  {
    id: 'gender',
    title: 'Q3-1. 性別與年齡',
    subtitle:
      '影響拒食判讀。幼亞成體拒食 1–2 週以上極度危險；成年母體春季拒食大多是發情排卵（即使未交配也可能空包蛋）；成年公體繁殖期躁動拒食屬正常。',
    type: 'single',
    options: [
      {
        id: 'maleAdult',
        label: '公成體（1 歲以上）',
        severity: 'normal',
        normalReason: '繁殖期（1–4 月）躁動拒食屬正常現象。'
      },
      {
        id: 'femaleAdult',
        label: '母成體（1 歲以上）',
        severity: 'normal',
        normalReason:
          '春天拒食大多為發情排卵，即使未交配也可能空包蛋，未處理會導致卵泡留滯（卡蛋）。'
      },
      {
        id: 'subadult',
        label: '亞成體（6–12 個月）',
        severity: 'normal',
        normalReason: '亞成體代謝快，拒食超過 1–2 週極度危險。'
      },
      {
        id: 'juvenile',
        label: '幼體（< 6 個月）',
        severity: 'normal',
        normalReason: '幼體代謝快，拒食超過 1–2 週容易餓死或因寄生蟲崩潰。'
      },
      { id: 'unknown', label: '不清楚', severity: 'normal' }
    ]
  },
  {
    id: 'fastDays',
    title: 'Q3-2. 連續拒食天數',
    type: 'single',
    options: [
      { id: 'd0', label: '正常進食中（沒有拒食）', severity: 'normal' },
      { id: 'd3', label: '1–3 天', severity: 'normal' },
      { id: 'd7', label: '4–7 天', severity: 'watch' },
      {
        id: 'd14',
        label: '1–2 週',
        severity: 'warn',
        diseases: ['parasites', 'organFailure', 'eggBinding']
      },
      {
        id: 'd30',
        label: '2 週至 1 個月',
        severity: 'warn',
        diseases: ['parasites', 'organFailure', 'eggBinding']
      },
      {
        id: 'd60',
        label: '超過 1 個月',
        severity: 'critical',
        diseases: ['parasites', 'organFailure', 'eggBinding']
      }
    ]
  },
  {
    id: 'fastSymptoms',
    title: 'Q3-3. 拒食期間是否伴隨以下任一？',
    subtitle: '（可複選）',
    type: 'multi',
    options: [
      {
        id: 'weightLoss',
        label: '體重明顯下降（拿起來變輕）',
        severity: 'warn',
        diseases: ['crypto'],
        normalReason: '建議從現在開始每週量一次體重，若 1 個月內掉 10% 以上請就醫。'
      },
      { id: 'vomiting', label: '嘔吐或反芻', severity: 'critical', diseases: ['crypto'] },
      {
        id: 'hidingAll',
        label: '整天躲洞、碰也無反應',
        severity: 'warn',
        diseases: ['parasites', 'organFailure', 'eggBinding']
      },
      {
        id: 'pencilTail',
        label: '尾巴明顯變細（牙籤尾）',
        severity: 'critical',
        diseases: ['crypto', 'malnutrition', 'pinworm', 'chronicDehydration']
      },
      { id: 'none', label: '都沒有，其他指標看起來正常', severity: 'normal' }
    ]
  },
  {
    id: 'body',
    title: 'Q4. 體態變化',
    type: 'single',
    options: [
      { id: 'plump', label: '飽滿圓潤 / 正常比例', severity: 'normal' },
      {
        id: 'thinOk',
        label: '略偏瘦但活動進食正常',
        severity: 'watch',
        normalReason: '剛產卵母守宮、剛斷尾再生中、發情公守宮短期可能略瘦。'
      },
      {
        id: 'thinFast',
        label: '1 個月內明顯瘦了一圈',
        severity: 'warn',
        diseases: ['parasites', 'anorexia', 'malnutrition']
      },
      {
        id: 'pencil',
        label: '「牙籤尾」皮包骨',
        severity: 'critical',
        diseases: ['crypto', 'coccidia', 'parasites', 'anorexia', 'malnutrition']
      }
    ]
  },
  {
    id: 'behavior',
    title: 'Q5. 行為觀察',
    type: 'single',
    options: [
      { id: 'normal', label: '跟平常差不多（夜間活躍、白天躲洞）', severity: 'normal' },
      {
        id: 'preShed',
        label: '比平常安靜 + 體色變暗',
        severity: 'normal',
        normalReason: '脫皮前 1–3 天典型徵兆。'
      },
      { id: 'slow', label: '比平常慢但仍會出來進食', severity: 'watch' },
      {
        id: 'hiding',
        label: '整天躲洞 + 拒食 + 拿出來也不太掙扎',
        severity: 'warn',
        diseases: ['parasites', 'anorexia', 'malnutrition']
      },
      {
        id: 'crash',
        label: '異常活躍、不停撞缸壁、繞圈打轉',
        severity: 'critical',
        diseases: ['neuroToxic']
      }
    ]
  },
  {
    id: 'env',
    title: 'Q6. 環境快檢',
    subtitle: '最近的飼養環境（可複選）',
    type: 'multi',
    options: [
      {
        id: 'newEnv',
        label: '24 小時內換新環境 / 搬家 / 剛買回家',
        severity: 'normal',
        normalReason: '壓力期，輕微異常先觀察 1–2 週。'
      },
      {
        id: 'tempBad',
        label: '最近 3 天溫度低於 22°C 或高於 35°C',
        severity: 'warn',
        diseases: ['tempAbnormal', 'giStasis', 'heatExhaust'],
        normalReason: '高危險：低溫導致腸胃停滯，高溫導致熱衰竭。'
      },
      {
        id: 'contagion',
        label: '最近接觸 / 同缸其他守宮（傳染風險）',
        severity: 'watch',
        diseases: ['contagionRisk']
      },
      {
        id: 'substrate',
        label: '飼主換過底材（疑似底材誤食 / 中毒）',
        severity: 'watch',
        diseases: ['impaction']
      },
      { id: 'none', label: '都沒有改變', severity: 'normal' }
    ]
  }
]

// ============================================================
// 🩺 情境 2：完整健康檢查（Checkup）
// ============================================================
export const CHECKUP_QUESTIONS = [
  // A. 頭部與五官
  {
    id: 'eyes',
    category: '頭部與五官',
    title: 'A1. 眼睛狀態',
    type: 'single',
    options: [
      { id: 'clear', label: '雙眼大睜、清澈、無分泌物', severity: 'normal' },
      {
        id: 'halfShut',
        label: '一眼半閉（剛醒 / 睡眠中可能）',
        severity: 'watch',
        diseases: ['eyeIssue']
      },
      { id: 'shedRes', label: '眼周有殘餘脫皮', severity: 'watch', diseases: ['dysecdysis'] },
      { id: 'sunken', label: '眼睛凹陷、皮膚皺褶', severity: 'warn', diseases: ['dehydration'] },
      {
        id: 'discharge',
        label: '眼瞼內積聚黃白色固體物 / 眼球表面卡白膜',
        severity: 'warn',
        diseases: ['eyeIssue']
      },
      {
        id: 'shutLong',
        label: '完全閉眼超過 24 小時（非脫皮）',
        severity: 'critical',
        diseases: ['eyeIssue']
      }
    ]
  },
  {
    id: 'nose',
    category: '頭部與五官',
    title: 'A2. 鼻孔狀態',
    type: 'single',
    options: [
      { id: 'clean', label: '乾淨、無分泌物', severity: 'normal' },
      { id: 'driedBit', label: '少量乾結（剛醒可能）', severity: 'watch' },
      { id: 'mucus', label: '透明黏液持續、輕度結痂', severity: 'warn', diseases: ['ri'] },
      { id: 'badRI', label: '持續黏液 + 結痂 + 聽到呼吸聲', severity: 'critical', diseases: ['ri'] }
    ]
  },
  {
    id: 'mouth',
    category: '頭部與五官',
    title: 'A3. 口腔狀態',
    type: 'single',
    options: [
      { id: 'closed', label: '緊閉、抓拿時不抗拒張嘴', severity: 'normal' },
      { id: 'lickLip', label: '偶爾舔嘴角（剛喝水可能）', severity: 'normal' },
      { id: 'whiteSpot', label: '嘴角白點 / 微腫', severity: 'warn', diseases: ['stomatitis'] },
      {
        id: 'foamSwell',
        label: '口腔邊緣膿塊 / 嚴重腫脹 / 嘴歪斜',
        severity: 'critical',
        diseases: ['stomatitis']
      },
      { id: 'openMouth', label: '長時間張口呼吸', severity: 'critical', diseases: ['ri'] }
    ]
  },
  {
    id: 'breathing',
    category: '頭部與五官',
    title: 'A4. 呼吸狀態',
    type: 'single',
    options: [
      { id: 'steady', label: '呼吸平穩、無聲、無明顯喉部起伏', severity: 'normal' },
      { id: 'afterMove', label: '活動後短暫喘一下，靜止後恢復', severity: 'watch' },
      { id: 'fast', label: '靜止時呼吸偏快、喉部起伏明顯', severity: 'warn', diseases: ['ri'] },
      {
        id: 'bubble',
        label: '張口呼吸 / 啵啵聲 / 嘴角牽絲黏液',
        severity: 'critical',
        diseases: ['ri']
      }
    ]
  },
  {
    id: 'jaw',
    category: '頭部與五官',
    title: 'A5. 頭部與下顎外觀',
    type: 'single',
    options: [
      { id: 'symmetry', label: '左右對稱、下顎線條正常', severity: 'normal' },
      { id: 'oldScar', label: '有舊疤但無腫脹、無變形', severity: 'watch' },
      {
        id: 'swollen',
        label: '臉頰或嘴角單側腫起、下顎變厚',
        severity: 'warn',
        diseases: ['stomatitis']
      },
      {
        id: 'softJaw',
        label: '下顎軟塌 / 歪斜 / 無法正常閉嘴',
        severity: 'critical',
        diseases: ['mbd', 'stomatitis']
      }
    ]
  },
  {
    id: 'tongue',
    category: '頭部與五官',
    title: 'A6. 舌頭與口腔內部顏色',
    type: 'single',
    subtitle: '輕翻嘴角時的舌頭與口腔黏膜顏色（健康應為淺粉至紅）',
    options: [
      { id: 'pink', label: '淺粉至粉紅、濕潤有光澤', severity: 'normal' },
      { id: 'paleHint', label: '略偏白、但仍有粉色感', severity: 'watch' },
      { id: 'pale', label: '蒼白、發白無血色', severity: 'warn', diseases: ['dehydration', 'ri'] },
      {
        id: 'cyanotic',
        label: '舌頭或黏膜偏藍紫色 / 紫紅',
        severity: 'critical',
        diseases: ['severeHypoxia', 'sepsisTerminal']
      }
    ]
  },
  // B. 體表與脫皮
  {
    id: 'skin',
    category: '體表與脫皮',
    title: 'B1. 皮膚完整度',
    type: 'single',
    options: [
      { id: 'intact', label: '光滑完整無傷', severity: 'normal' },
      { id: 'oldScar', label: '有舊傷疤（已癒合）', severity: 'normal' },
      {
        id: 'scratch',
        label: '抓痕 / 咬傷 / 殘皮卡 > 1 週',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      { id: 'burn', label: '燒燙傷（腹部黑斑）', severity: 'critical', diseases: ['burn'] },
      { id: 'wound', label: '開放傷口 / 潰瘍 / 組織壞死', severity: 'critical', diseases: ['burn'] }
    ]
  },
  {
    id: 'shed',
    category: '體表與脫皮',
    title: 'B2. 脫皮狀態',
    type: 'single',
    options: [
      { id: 'clean', label: '整片脫淨、3 天內完成', severity: 'normal' },
      { id: 'minor', label: '殘餘碎屑但沒卡關節', severity: 'watch' },
      { id: 'toe', label: '趾尖殘皮 1 週未脫', severity: 'warn', diseases: ['dysecdysis'] },
      {
        id: 'tailTip',
        label: '尾尖殘皮（壞死斷尾風險）',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      {
        id: 'chronic',
        label: '反覆脫皮不順、體色長期暗沉',
        severity: 'warn',
        diseases: ['dysecdysis']
      }
    ]
  },
  {
    id: 'color',
    category: '體表與脫皮',
    title: 'B3. 體色',
    type: 'single',
    options: [
      { id: 'vivid', label: '顏色飽和明亮（依品系判斷）', severity: 'normal' },
      { id: 'preShed', label: '整體略暗（脫皮前 1–3 天）', severity: 'normal' },
      {
        id: 'dullLong',
        label: '持續暗沉 > 1 週、無脫皮跡象',
        severity: 'watch',
        diseases: ['metabolicStasis', 'envStress']
      },
      {
        id: 'pale',
        label: '異常蒼白、灰白色',
        severity: 'critical',
        diseases: ['severeAnemia', 'preShock', 'sepsis']
      }
    ]
  },
  {
    id: 'toesTail',
    category: '體表與脫皮',
    title: 'B4. 趾尖與尾尖狀態',
    type: 'single',
    options: [
      { id: 'clean', label: '趾尖、尾尖乾淨無殘皮', severity: 'normal' },
      { id: 'smallFlake', label: '少量碎皮，2–3 天內可自行脫落', severity: 'watch' },
      {
        id: 'stuck',
        label: '趾尖或尾尖有卡皮、環狀束住',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      {
        id: 'necrosis',
        label: '趾尖發黑 / 尾尖乾縮 / 疑似壞死',
        severity: 'critical',
        diseases: ['dysecdysis']
      }
    ]
  },
  {
    id: 'vent',
    category: '體表與脫皮',
    title: 'B5. 腹部與泄殖腔周圍',
    type: 'single',
    options: [
      { id: 'clean', label: '腹部與泄殖腔乾淨、無殘便無紅腫', severity: 'normal' },
      { id: 'stain', label: '剛排便後有少量污漬，但可自行清掉', severity: 'watch' },
      {
        id: 'irritated',
        label: '泄殖腔周圍反覆沾便、紅腫或殘皮',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      {
        id: 'prolapse',
        label: '外翻 / 出血 / 明顯腫塊',
        severity: 'critical',
        diseases: ['prolapse']
      }
    ]
  },
  {
    id: 'limbs',
    category: '體表與脫皮',
    title: 'B6. 四肢、趾數與趾甲',
    type: 'single',
    subtitle: '前後肢各 5 趾，趾甲應完整且不過長',
    options: [
      { id: 'complete', label: '四肢健全、20 趾完整、趾甲正常', severity: 'normal' },
      { id: 'missingOld', label: '有舊缺趾或截肢但完全癒合', severity: 'normal' },
      { id: 'overgrown', label: '趾甲過長 / 趾甲斷裂未癒合', severity: 'watch' },
      {
        id: 'freshLost',
        label: '近期缺趾 / 傷口未癒合',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      {
        id: 'necrotic',
        label: '趾尖或四肢局部發黑壞死、流組織液',
        severity: 'critical',
        diseases: ['dysecdysis', 'burn']
      }
    ]
  },
  // C. 體態與進食
  {
    id: 'tail',
    category: '體態與進食',
    title: 'C1. 尾巴體態',
    type: 'single',
    options: [
      { id: 'plump', label: '飽滿圓潤（豹紋）/ 葫蘆狀（肥尾）', severity: 'normal' },
      { id: 'okThin', label: '比例略瘦但仍有肉', severity: 'watch' },
      { id: 'thin', label: '明顯凹陷、能看出脊椎', severity: 'warn' },
      {
        id: 'pencil',
        label: '牙籤尾（強烈警訊）',
        severity: 'critical',
        diseases: ['crypto', 'coccidia']
      }
    ]
  },
  {
    id: 'weight',
    category: '體態與進食',
    title: 'C2. 體重變化（若無紀錄請選最後一項）',
    type: 'single',
    options: [
      { id: 'stable', label: '穩定（± 5%）', severity: 'normal' },
      { id: 'gain', label: '緩步增重（幼亞成體正常）', severity: 'normal' },
      { id: 'lose10', label: '1 個月內掉 5–10%', severity: 'watch' },
      {
        id: 'lose20',
        label: '1 個月內掉 10–20%',
        severity: 'warn',
        diseases: ['parasites', 'anorexia']
      },
      {
        id: 'lose30',
        label: '1 個月內掉 20% 以上 / 任何時段急速消瘦',
        severity: 'critical',
        diseases: ['crypto']
      },
      { id: 'noData', label: '沒量過 / 沒紀錄', severity: 'watch' }
    ]
  },
  {
    id: 'appetite',
    category: '體態與進食',
    title: 'C3. 食慾',
    type: 'single',
    options: [
      { id: 'normal', label: '正常進食、看到飼料會追', severity: 'normal' },
      { id: 'reduced', label: '進食量比平常少 1/3，仍會吃', severity: 'watch' },
      {
        id: 'spit',
        label: '反覆甩頭吐食 / 含一下就吐',
        severity: 'critical',
        diseases: ['crypto']
      },
      {
        id: 'refuse',
        label: '完全拒食 + 體態消瘦',
        severity: 'critical',
        diseases: ['organFailure', 'severeParasites', 'eggBinding']
      },
      {
        id: 'maleSeason',
        label: '公成體春季完全拒食 + 其他指標正常',
        severity: 'normal',
        normalReason: '發情期拒食，多數會在 1–2 個月後恢復。'
      },
      {
        id: 'newAdjust',
        label: '新個體入手 2 週內拒食 + 其他指標正常',
        severity: 'normal',
        normalReason: '環境適應期，建議保持安靜減少干擾。'
      }
    ]
  },
  {
    id: 'bodyLine',
    category: '體態與進食',
    title: 'C4. 軀幹線條與骨感',
    type: 'single',
    options: [
      { id: 'solid', label: '背線平順、肋骨與骨盆不明顯', severity: 'normal' },
      { id: 'slim', label: '略瘦但肌肉仍在、腹部不凹', severity: 'watch' },
      {
        id: 'bony',
        label: '骨盆、脊椎、肋骨變明顯',
        severity: 'warn',
        diseases: ['parasites', 'organFailure', 'eggBinding']
      },
      {
        id: 'wasted',
        label: '全身快速消瘦、明顯皮包骨',
        severity: 'critical',
        diseases: ['crypto']
      }
    ]
  },
  {
    id: 'hydration',
    category: '體態與進食',
    title: 'C5. 水分狀態',
    type: 'single',
    options: [
      { id: 'good', label: '眼神正常、皮膚平整、尿酸多為白色', severity: 'normal' },
      { id: 'unsure', label: '沒有特別觀察過喝水與尿酸狀態', severity: 'watch' },
      {
        id: 'dry',
        label: '尿酸偏黃、皮膚略皺、精神下降',
        severity: 'warn',
        diseases: ['dehydration']
      },
      {
        id: 'dehydrated',
        label: '眼窩深陷、皮膚皺褶明顯、長期不喝水',
        severity: 'critical',
        diseases: ['dehydration']
      }
    ]
  },
  {
    id: 'abdomen',
    category: '體態與進食',
    title: 'C6. 腹部外觀',
    type: 'single',
    options: [
      { id: 'flat', label: '腹部平順、不鼓脹、不拖地', severity: 'normal' },
      { id: 'afterMeal', label: '進食後短暫微鼓，數小時內恢復', severity: 'watch' },
      {
        id: 'bloated',
        label: '長時間腹脹、排便變少',
        severity: 'warn',
        diseases: ['eggBinding', 'tumor', 'constipation', 'impaction']
      },
      {
        id: 'mass',
        label: '明顯腫塊 / 單側鼓起 / 腹部拖地',
        severity: 'critical',
        diseases: ['eggBinding', 'tumor', 'severeConstipation', 'impaction']
      }
    ]
  },
  {
    id: 'feederVariety',
    category: '體態與進食',
    title: 'C7. 飼料多樣性',
    type: 'single',
    subtitle: '長期單一飼料容易營養失衡（鈣/磷比、維生素 A）',
    options: [
      { id: 'mixed', label: '主食 2–3 種以上交替（杜比亞、蟋蟀等）', severity: 'normal' },
      { id: 'twoTypes', label: '主食固定 1 種、偶爾換點心', severity: 'watch' },
      {
        id: 'mealwormOnly',
        label: '只餵麵包蟲 / 大麥蟲長期單一',
        severity: 'warn',
        diseases: ['nutritionalImbalance']
      },
      {
        id: 'sweets',
        label: '長期以蠟蟲 / 大麥蟲為主食（高脂）',
        severity: 'warn',
        diseases: ['fattyLiver', 'calciumPhosphorus', 'mbd']
      },
      {
        id: 'unknown',
        label: '飼料來源不明 / 野外捕捉昆蟲',
        severity: 'warn',
        diseases: ['coccidia', 'crypto']
      }
    ]
  },
  {
    id: 'drinking',
    category: '體態與進食',
    title: 'C8. 飲水習慣',
    type: 'single',
    options: [
      { id: 'selfDrink', label: '會主動到水盆喝水', severity: 'normal' },
      { id: 'spray', label: '不直接喝，但會舔濕盒/玻璃凝結水', severity: 'normal' },
      { id: 'rare', label: '幾乎沒看過喝水，但尿酸正常', severity: 'watch' },
      {
        id: 'none',
        label: '長期不喝水 + 尿酸偏黃 / 偏少',
        severity: 'warn',
        diseases: ['dehydration']
      }
    ]
  },
  // D. 排泄行為環境
  {
    id: 'droppings',
    category: '排泄行為環境',
    title: 'D1. 糞便與排泄',
    type: 'single',
    options: [
      { id: 'regular', label: '規律成型、白色尿酸', severity: 'normal' },
      { id: 'noStool', label: '5–7 天無便但腹部正常', severity: 'normal' },
      { id: 'soft', label: '偏軟、無異味', severity: 'watch' },
      { id: 'runny', label: '拉稀 + 極臭', severity: 'warn', diseases: ['coccidia'] },
      {
        id: 'blood',
        label: '血便 / 反覆吐食 + 水便',
        severity: 'critical',
        diseases: ['crypto', 'impaction']
      },
      { id: 'urate', label: '尿酸鮮黃或橘紅（脫水）', severity: 'warn', diseases: ['dehydration'] }
    ]
  },
  {
    id: 'mbd',
    category: '排泄行為環境',
    title: 'D2. 行動穩定度（MBD 篩查）',
    type: 'single',
    options: [
      { id: 'steady', label: '行走穩定、腹部離地', severity: 'normal' },
      { id: 'slip', label: '偶爾打滑、腹部摩擦地面', severity: 'watch' },
      { id: 'tremor', label: '前肢顫抖 / 後肢拖行', severity: 'warn', diseases: ['mbd'] },
      {
        id: 'hop',
        label: '跳走、四肢無力、下顎軟塌、骨頭彎曲',
        severity: 'critical',
        diseases: ['mbd']
      },
      { id: 'seizure', label: '抽搐 / 痙攣', severity: 'critical', diseases: ['neuroToxic', 'mbd'] }
    ]
  },
  {
    id: 'envCare',
    category: '排泄行為環境',
    title: 'D3. 環境溫控與補充',
    type: 'single',
    options: [
      { id: 'full', label: '完整溫度梯度 + 規律鈣粉每餐', severity: 'normal' },
      {
        id: 'noTherm',
        label: '有加溫但無控溫器（燙傷風險）',
        severity: 'warn',
        diseases: ['burn']
      },
      {
        id: 'noMeas',
        label: '沒測量過溫度 / 全缸同溫',
        severity: 'warn',
        diseases: ['detectionFail']
      },
      { id: 'none', label: '完全沒溫控 + 沒補鈣粉', severity: 'critical', diseases: ['mbd'] }
    ]
  },
  {
    id: 'activity',
    category: '排泄行為環境',
    title: 'D4. 活動力與警覺性',
    type: 'single',
    options: [
      { id: 'alert', label: '夜間活動正常、會探索、對動靜有反應', severity: 'normal' },
      { id: 'calm', label: '白天偏安靜，但夜間仍會移動', severity: 'watch' },
      { id: 'sluggish', label: '整天少動、反應慢、長時間縮著', severity: 'warn' },
      {
        id: 'collapsed',
        label: '翻正困難 / 幾乎不動 / 無力撐身',
        severity: 'critical',
        diseases: ['neuroTerminal']
      }
    ]
  },
  {
    id: 'stance',
    category: '排泄行為環境',
    title: 'D5. 站姿與抓地力',
    type: 'single',
    options: [
      { id: 'strong', label: '站姿穩、抓地正常、腹部離地', severity: 'normal' },
      { id: 'slip', label: '偶爾打滑，但能自行恢復', severity: 'watch' },
      { id: 'weak', label: '四肢撐力變差、走路搖晃', severity: 'warn', diseases: ['mbd'] },
      { id: 'drag', label: '拖行 / 無法抬身 / 明顯跛行', severity: 'critical', diseases: ['mbd'] }
    ]
  },
  {
    id: 'setup',
    category: '排泄行為環境',
    title: 'D6. 躲避屋與濕盒配置',
    type: 'single',
    options: [
      { id: 'complete', label: '冷區、熱區、濕盒齊全且可正常使用', severity: 'normal' },
      { id: 'partial', label: '有躲避屋，但濕盒偶爾才補濕', severity: 'watch' },
      {
        id: 'missingOne',
        label: '缺濕盒或長期太乾，脫皮常卡',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      { id: 'bare', label: '幾乎無躲避設施，環境長期失衡', severity: 'critical' }
    ]
  },
  {
    id: 'records',
    category: '排泄行為環境',
    title: 'D7. 體重、進食與糞檢紀錄',
    type: 'single',
    options: [
      { id: 'tracked', label: '有固定記錄，必要時也有做糞檢', severity: 'normal' },
      { id: 'partial', label: '只有部分記錄，頻率不固定', severity: 'watch' },
      {
        id: 'none',
        label: '幾乎沒記錄，最近又出現軟便或掉重',
        severity: 'warn',
        diseases: ['coccidia']
      },
      {
        id: 'chronic',
        label: '長期腹瀉 / 消瘦，且從未檢糞',
        severity: 'critical',
        diseases: ['crypto', 'coccidia']
      }
    ]
  },
  {
    id: 'humidity',
    category: '排泄行為環境',
    title: 'D8. 環境濕度',
    type: 'single',
    subtitle: '豹紋多數時間 30–50%、濕盒內 70–80%',
    options: [
      { id: 'ideal', label: '主環境 30–50%、濕盒 70–80%', severity: 'normal' },
      { id: 'lowOk', label: '主環境偏乾 (< 30%) 但有濕盒可用', severity: 'watch' },
      {
        id: 'tooDry',
        label: '長期 < 30% 且無濕盒，脫皮反覆失敗',
        severity: 'warn',
        diseases: ['dysecdysis', 'dehydration']
      },
      {
        id: 'tooWet',
        label: '長期 > 70% 滿缸潮濕、底材長黴',
        severity: 'warn',
        diseases: ['ri', 'bacterialDermatitis']
      },
      { id: 'noMeasure', label: '從未測過濕度 / 沒有溫濕度計', severity: 'watch' }
    ]
  },
  {
    id: 'calcium',
    category: '排泄行為環境',
    title: 'D9. 鈣粉與綜合維生素補充',
    type: 'single',
    subtitle: '幼體每餐沾鈣粉、成體每週 2–3 次；綜合維生素每週 1 次',
    options: [
      { id: 'routine', label: '依年齡規律補鈣 + 每週綜合維生素', severity: 'normal' },
      { id: 'calOnly', label: '只補鈣粉，沒有綜合維生素', severity: 'watch' },
      { id: 'irregular', label: '想到才補 / 補充頻率不固定', severity: 'warn', diseases: ['mbd'] },
      { id: 'never', label: '從未補充鈣粉與維生素', severity: 'critical', diseases: ['mbd'] }
    ]
  },
  {
    id: 'cohab',
    category: '排泄行為環境',
    title: 'D10. 同箱個體狀況',
    type: 'single',
    subtitle: '⚠️ 守宮禁止任何形式的混養，若有混養情況，請立即停止，堅持一缸一體。',
    options: [
      { id: 'solo', label: '單獨飼養', severity: 'normal' },
      {
        id: 'femalePair',
        label: '母 + 母混養，無爭執且皆健康',
        severity: 'critical',
        diseases: ['chronicStress']
      },
      {
        id: 'malePair',
        label: '兩隻成熟公守宮同箱 / 有打鬥傷口',
        severity: 'critical',
        diseases: ['severeStress', 'woundInfection']
      },
      {
        id: 'sizeGap',
        label: '混養但體型差距大 / 弱勢個體常被搶食',
        severity: 'warn',
        diseases: ['malnutrition', 'limbLossRisk', 'chronicStress']
      }
    ]
  }
]

// ============================================================
// 👀 情境 3：購入評估（Purchase）
// 4 觀察題（純照片可判斷）
// ============================================================
export const PURCHASE_QUESTIONS = [
  {
    id: 'eyes',
    title: 'Q1. 眼睛',
    type: 'single',
    options: [
      { id: 'clear', label: '雙眼大睜、清澈、無分泌物', severity: 'normal' },
      { id: 'halfShut', label: '一眼半閉、無分泌物', severity: 'watch' },
      { id: 'sunken', label: '眼睛凹陷 / 皮膚皺褶', severity: 'warn', diseases: ['dehydration'] },
      { id: 'discharge', label: '有分泌物 / 結痂', severity: 'critical', diseases: ['eyeIssue'] }
    ]
  },
  {
    id: 'body',
    title: 'Q2. 體態與尾巴',
    type: 'single',
    options: [
      { id: 'plump', label: '飽滿圓潤、尾巴比例正常', severity: 'normal' },
      { id: 'okThin', label: '略瘦但仍有肉', severity: 'watch' },
      { id: 'thin', label: '明顯偏瘦、脊椎可見', severity: 'warn' },
      {
        id: 'pencil',
        label: '牙籤尾（皮包骨，🚨 deal-breaker）',
        severity: 'critical',
        diseases: ['crypto']
      }
    ]
  },
  {
    id: 'skin',
    title: 'Q3. 皮膚與脫皮',
    type: 'single',
    options: [
      { id: 'intact', label: '光滑完整無傷、無殘皮', severity: 'normal' },
      { id: 'minor', label: '少量殘皮可協助移除', severity: 'watch' },
      {
        id: 'wound',
        label: '殘皮卡關節 / 咬痕 / 抓傷',
        severity: 'warn',
        diseases: ['dysecdysis']
      },
      {
        id: 'burn',
        label: '燒燙傷痕跡 / 潰瘍 / 組織壞死 / 大面積傷口',
        severity: 'critical',
        diseases: ['burn']
      }
    ]
  },
  {
    id: 'response',
    title: 'Q4. 精神與神經狀態',
    type: 'single',
    options: [
      {
        id: 'alert',
        label: '眼神明亮，把手靠近會盯著看、會舔鼻子，上手會試圖爬行或輕微掙扎',
        severity: 'normal'
      },
      {
        id: 'tremor',
        label: '上手時前肢一直發抖 / 走路腹部拖地',
        severity: 'warn',
        diseases: ['earlyMbd', 'neuroDamage']
      },
      {
        id: 'wobble',
        label: '仰頭看天（星際觀望）/ 原地轉圈圈 / 瘋狂撲空',
        severity: 'critical',
        diseases: ['mystery']
      },
      {
        id: 'limp',
        label: '放在手上像一灘爛泥完全不動、眼睛閉著',
        severity: 'critical',
        diseases: ['severeWeakness']
      }
    ]
  }
]
