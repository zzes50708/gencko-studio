// --- 飼養前自我評估問卷資料 v2 ---
// 結構：6 維度 × 3 題 = 18 題
//   評分維度（計入總分）：time / mind / env / knowledge / budget
//   目標維度（不計分，僅用於推薦路線）：goal
//
// 評分哲學：分數反映「對守宮福祉的實際風險」，不是「離理想多遠」。
// 合理且可行的答案應接近滿分，只有會造成風險的答案才扣分。
//
// 選項 risk 標記：
//   undefined / 'none'  → 不顯示風險說明
//   'warn'              → 提醒級（分數 ≤ 6）
//   'critical'          → 嚴重級（分數 ≤ 3）

export const QUIZ_DIMENSIONS = {
  time: { label: '時間承諾', icon: '⏱', weight: 1.2 },
  mind: { label: '心理接受', icon: '🧠', weight: 1.2 },
  env: { label: '環境設備', icon: '🌡', weight: 1.0 },
  knowledge: { label: '知識儲備', icon: '📚', weight: 0.9 },
  budget: { label: '預算資源', icon: '💰', weight: 0.9 },
  goal: { label: '飼養目標', icon: '🎯', weight: 0 } // 不計分
}

// 路線標籤（goal 維度題目的選項用 trackTag 標記）
export const QUIZ_TRACKS = {
  viewer: {
    label: '觀賞型',
    icon: '🔍',
    desc: '純粹喜歡守宮的外型與靜謐感，享受日常觀察。',
    links: [
      { text: '品系圖鑑', href: '/genes' },
      { text: '飼養教學文章', href: '/articles' }
    ]
  },
  breeder: {
    label: '繁殖型',
    icon: '🧬',
    desc: '想學習基因組合、嘗試繁殖出自己的 morph。',
    links: [
      { text: '基因計算機', href: '/calc' },
      { text: '品系圖鑑', href: '/genes' }
    ]
  },
  collector: {
    label: '收藏型',
    icon: '📚',
    desc: '想長期收藏多隻、不同品系的個體。',
    links: [
      { text: '品系圖鑑', href: '/genes' },
      { text: '飼養教學文章', href: '/articles' }
    ]
  },
  newbie: {
    label: '嘗鮮型',
    icon: '⚠️',
    desc: '可能是跟風或一時興起，建議先確實補課再決定。',
    links: [
      { text: '健康評估', href: '/health' },
      { text: '飼養教學文章', href: '/articles' }
    ]
  }
}

export const QUIZ_DATA = {
  questions: [
    // ============ ⏱ Time 時間承諾 ============
    {
      id: 't1',
      dim: 'time',
      text: '您每天能否抽出 10–15 分鐘觀察守宮狀態、清理排泄物與補水？',
      options: [
        { id: 't1a', label: '每天觀察是我享受的時光', score: 10 },
        { id: 't1b', label: '大多數日子可以，偶爾會漏掉', score: 9 },
        {
          id: 't1c',
          label: '只能 2–3 天弄一次',
          score: 5,
          risk: 'warn',
          note: '守宮雖耐糙養，但每日簡短觀察是發現拒食、便秘、外傷的關鍵時機。隔 2–3 天才檢查，小問題容易拖成大問題。'
        },
        {
          id: 't1d',
          label: '希望牠完全不用照顧',
          score: 0,
          risk: 'critical',
          note: '活體寵物皆需每日基本照料，守宮也不例外。若期待免照顧，請考慮玩偶或植物。'
        }
      ]
    },
    {
      id: 't2',
      dim: 'time',
      text: '守宮平均壽命 10–15 年，您能否承諾這段時間持續照料？',
      options: [
        { id: 't2a', label: '這是我深思熟慮後的長期決定', score: 10 },
        { id: 't2b', label: '目前條件穩定，會盡力承擔', score: 9 },
        {
          id: 't2c',
          label: '先養再說，未來再看',
          score: 4,
          risk: 'warn',
          note: '守宮壽命 10–15 年，這期間您可能換工作、搬家、結婚、生子。沒想清楚就開始，最常見的結局是棄養或轉讓。'
        },
        {
          id: 't2d',
          label: '只是跟風想嘗鮮',
          score: 0,
          risk: 'critical',
          note: '跟風飼養多半結局是棄養。爬蟲棄養與野放在台灣已造成嚴重生態與動物福利問題，請慎重考慮。'
        }
      ]
    },
    {
      id: 't3',
      dim: 'time',
      text: '您出遠門 3 天以上時，如何安排守宮？',
      options: [
        { id: 't3a', label: '有家人/朋友/可信代看者協助', score: 10 },
        { id: 't3b', label: '成體可耐 3–5 天不吃，出門前餵飽補水、3 天內回程', score: 8 },
        {
          id: 't3c',
          label: '超過 3 天但無人代看',
          score: 4,
          risk: 'warn',
          note: '長時間離家無人照看，水盆乾涸、糞便堆積、突發狀況都無人處理。請確認您的生活型態能配合或有穩定後援。'
        },
        {
          id: 't3d',
          label: '從未考慮過這個情境',
          score: 0,
          risk: 'critical',
          note: '飼養前未考慮離家安排，突發出差/旅行/急事時守宮將無人照顧。請務必事前規劃。'
        }
      ]
    },

    // ============ 🧠 Mind 心理接受 ============
    {
      id: 'm1',
      dim: 'mind',
      text: '您對「餵食活體昆蟲」（蟋蟀、杜比亞蟑螂）的接受度？',
      options: [
        { id: 'm1a', label: '完全接受，甚至覺得有趣', score: 10 },
        { id: 'm1b', label: '會怕但為了守宮願意克服', score: 9 },
        { id: 'm1c', label: '只接受冷凍乾燥飼料或蟲泥', score: 8 },
        {
          id: 'm1d',
          label: '極度恐懼昆蟲，完全無法觸碰',
          score: 0,
          risk: 'critical',
          note: '即便選用人工飼料，仍需處理排泄、清潔環境、面對偶爾的飼料逃脫。極度恐懼可能讓飼養日常難以維持。'
        }
      ]
    },
    {
      id: 'm2',
      dim: 'mind',
      text: '您理解守宮主要是「觀賞型」寵物，不會像犬貓親人嗎？',
      options: [
        { id: 'm2a', label: '理解，我享受靜靜觀察的時光', score: 10 },
        { id: 'm2b', label: '接受，希望偶爾能上手互動', score: 10 },
        {
          id: 'm2c',
          label: '希望牠會主動親近我、回應我',
          score: 4,
          risk: 'warn',
          note: '守宮不會主動親近主人，也不會用眼神回應您。如果您期待「被陪伴感」，飼養後容易失落，建議重新評估是否適合。'
        },
        {
          id: 'm2d',
          label: '不能撒嬌的我就不想養',
          score: 0,
          risk: 'critical',
          note: '守宮不會撒嬌，這是物種本能。若您堅持要會回應的寵物，請考慮犬貓，這對雙方都比較好。'
        }
      ]
    },
    {
      id: 'm3',
      dim: 'mind',
      text: '同住的家人/室友/伴侶對爬蟲與昆蟲飼料的態度？',
      options: [
        { id: 'm3a', label: '全員支持，甚至期待', score: 10 },
        { id: 'm3b', label: '不反對，只要不跑出來就行', score: 10 },
        {
          id: 'm3c',
          label: '會碎念但不會強烈反對',
          score: 6,
          risk: 'warn',
          note: '家人雖未強烈反對，但長期碎念會影響飼養品質與心情。建議事前充分溝通，讓家人理解守宮的飼養細節。'
        },
        {
          id: 'm3d',
          label: '有人極度反感蛇/蜥蜴/蟲',
          score: 0,
          risk: 'critical',
          note: '同住成員強烈反對下飼養，常造成家庭衝突、守宮被棄置或環境不穩定。請先取得共識再開始。'
        }
      ]
    },

    // ============ 🌡 Env 環境設備 ============
    {
      id: 'e1',
      dim: 'env',
      text: '您是否已規劃完整的溫控設備（加溫墊 + 控溫器 + 溫濕度計）？',
      options: [
        { id: 'e1a', label: '已研究好整套系統，準備購置', score: 10 },
        { id: 'e1b', label: '知道基本配備，會按建議買齊', score: 10 },
        {
          id: 'e1c',
          label: '只買加溫墊，無控溫器邊養邊看',
          score: 3,
          risk: 'critical',
          note: '無控溫器的加溫墊可能持續加熱導致低溫燙傷（守宮致死常見原因），也可能溫度不足。控溫器是基本配備，不是進階配備。'
        },
        {
          id: 'e1d',
          label: '台灣這麼熱，不需要溫控',
          score: 0,
          risk: 'critical',
          note: '台灣冬季最低溫遠低於守宮可承受範圍，缺乏溫控直接威脅生命。控溫是飼養守宮的最低門檻，不存在「不需要」的選項。'
        }
      ]
    },
    {
      id: 'e2',
      dim: 'env',
      text: '飼養空間（避免冷氣直吹、陽光直射、噪音干擾）是否已規劃？',
      options: [
        { id: 'e2a', label: '已劃好專屬位置與爬箱尺寸', score: 10 },
        { id: 'e2b', label: '有大致想法，會調整擺放', score: 9 },
        {
          id: 'e2c',
          label: '先放桌上再說',
          score: 5,
          risk: 'warn',
          note: '擺放位置會影響溫度穩定（陽光直射、冷氣直吹）、噪音壓力與日常觀察便利。建議飼養前就確定專屬位置。'
        },
        {
          id: 'e2d',
          label: '還沒想過要放哪',
          score: 2,
          risk: 'critical',
          note: '飼養位置直接影響溫度穩定與守宮心理壓力。請於購買前確認位置，避免買回家才發現無處可放。'
        }
      ]
    },
    {
      id: 'e3',
      dim: 'env',
      text: '您是否了解季節變化（寒流、梅雨、夏季悶熱）對守宮的影響？',
      options: [
        { id: 'e3a', label: '會主動依季節調整溫濕度', score: 10 },
        { id: 'e3b', label: '知道要注意，會準備加溫/通風', score: 9 },
        {
          id: 'e3c',
          label: '聽說過但不確定怎麼做',
          score: 4,
          risk: 'warn',
          note: '台灣寒流可能跌破守宮可承受溫度，梅雨季濕度過高易引發皮膚病。事前學會季節調節，可避免突發狀況措手不及。'
        },
        {
          id: 'e3d',
          label: '完全沒概念',
          score: 0,
          risk: 'critical',
          note: '季節變化是台灣飼養守宮的最大隱形殺手。完全沒概念意味著您可能在第一個寒流就失去牠。'
        }
      ]
    },

    // ============ 📚 Knowledge 知識儲備 ============
    {
      id: 'k1',
      dim: 'knowledge',
      text: '對 MBD（代謝性骨病）、拒食、脫皮不順等常見問題，您的了解程度？',
      options: [
        { id: 'k1a', label: '熟悉症狀、預防與初步處置', score: 10 },
        { id: 'k1b', label: '知道病名與大致成因', score: 8 },
        {
          id: 'k1c',
          label: '聽過但細節不清楚',
          score: 4,
          risk: 'warn',
          note: 'MBD、拒食、脫皮不順是守宮三大常見問題，多源自環境或營養失衡。飼養前至少了解症狀與初步處置，以免錯失治療時機。'
        },
        {
          id: 'k1d',
          label: '完全沒聽過',
          score: 0,
          risk: 'critical',
          note: '不認識基本疾病，意味著您無法判讀守宮的求救訊號。守宮不會叫、不會表達痛苦，主人若不認識症狀，等於沒有保護網。'
        }
      ]
    },
    {
      id: 'k2',
      dim: 'knowledge',
      text: '守宮的「健康警訊」（體態、糞便、活動量、眼神）您能辨識嗎？',
      options: [
        { id: 'k2a', label: '每日觀察清單已內建在腦中', score: 10 },
        { id: 'k2b', label: '知道幾個主要指標', score: 8 },
        {
          id: 'k2c',
          label: '大概看牠有沒有動',
          score: 3,
          risk: 'critical',
          note: '僅靠是否會動判斷健康，等於放棄 90% 的預警機會。拒食、脫水、感染初期，守宮仍會活動。請學會看糞便、體態、皮膚與眼神。'
        },
        {
          id: 'k2d',
          label: '不知道要觀察什麼',
          score: 0,
          risk: 'critical',
          note: '等於把守宮的命運交給運氣。飼養前請至少學會「每日健康檢查清單」的基本項目。'
        }
      ]
    },
    {
      id: 'k3',
      dim: 'knowledge',
      text: '您打算從哪裡取得您的第一隻守宮？',
      options: [
        { id: 'k3a', label: '信譽良好的繁殖場或領養', score: 10 },
        { id: 'k3b', label: '會比較多家信譽再決定', score: 10 },
        {
          id: 'k3c',
          label: '哪家便宜就買哪家',
          score: 4,
          risk: 'warn',
          note: '便宜的守宮常來自不明來源或淘汰個體，帶病（隱孢子、寄生蟲）機率較高，後續醫療成本反而更高。'
        },
        {
          id: 'k3d',
          label: '路邊攤、夜市或來路不明的賣家',
          score: 0,
          risk: 'critical',
          note: '此類來源的個體往往無法追溯雙親、年齡、繁殖履歷，買到帶病或近親繁殖個體的機率偏高，售後出狀況也通常找不到人。建議選擇願意公開繁殖資訊、提供後續諮詢的繁殖者或店家。'
        }
      ]
    },

    // ============ 💰 Budget 預算資源 ============
    {
      id: 'b1',
      dim: 'budget',
      text: '入門整套設備預算（爬箱＋溫控＋飼料盒，約 3,000–8,000 元）您是否準備好？',
      options: [
        { id: 'b1a', label: '預算充足，會選品質好的', score: 10 },
        { id: 'b1b', label: '預算夠，會精選必需品', score: 10 },
        {
          id: 'b1c',
          label: '想先用便宜的克難起步',
          score: 4,
          risk: 'warn',
          note: '便宜爬箱常通風不良、溫控品質不穩，反而增加守宮健康風險。基本配備不需頂規，但建議選有口碑的入門款。'
        },
        {
          id: 'b1d',
          label: '不想花什麼錢在這上面',
          score: 0,
          risk: 'critical',
          note: '飼養活體寵物本身就是投資。若不願花基本費用，將無法提供守宮應有的生存條件，最終受苦的是守宮。'
        }
      ]
    },
    {
      id: 'b2',
      dim: 'budget',
      text: '您是否準備了 5,000–10,000 元的緊急醫療/設備備用金？',
      options: [
        { id: 'b2a', label: '已專款專用備好', score: 10 },
        { id: 'b2b', label: '存款充足，需要時拿得出', score: 10 },
        {
          id: 'b2c',
          label: '需要時可能要臨時湊',
          score: 5,
          risk: 'warn',
          note: '緊急狀況若延遲就醫，守宮病情急轉直下。建議至少預備一筆可立即動用的應急金，避免錯失最佳治療時機。'
        },
        {
          id: 'b2d',
          label: '目前經濟拮据，沒多餘預算',
          score: 0,
          risk: 'critical',
          note: '緊急醫療無預警，若連最低備用金都拿不出，建議經濟狀況穩定再考慮飼養，這對守宮與您都比較好。'
        }
      ]
    },
    {
      id: 'b3',
      dim: 'budget',
      text: '您居住區域附近的「爬蟲專科」醫院可及性如何？',
      options: [
        { id: 'b3a', label: '已有口袋名單，車程 30 分鐘內', score: 10 },
        { id: 'b3b', label: '知道幾家，但有點遠（1 小時內）', score: 7 },
        {
          id: 'b3c',
          label: '只知道一般犬貓動物醫院',
          score: 3,
          risk: 'critical',
          note: '一般犬貓獸醫多無爬蟲臨床經驗，緊急時可能誤診或無法處置。請於飼養前先找到 1–2 家爬蟲專科醫院的聯絡資訊。'
        },
        {
          id: 'b3d',
          label: '完全不知道要去哪看醫生',
          score: 0,
          risk: 'critical',
          note: '醫療資源是守宮活下去的最後防線。連去哪看都不知道，等於賭運氣。'
        }
      ]
    },

    // ============ 🎯 Goal 飼養目標（不計分，用於推薦路線） ============
    {
      id: 'g1',
      dim: 'goal',
      text: '您養守宮的主要動機是？',
      options: [
        { id: 'g1a', label: '純粹喜歡牠的外型與靜謐感', score: 0, trackTag: 'viewer' },
        { id: 'g1b', label: '想嘗試學習繁殖與基因組合', score: 0, trackTag: 'breeder' },
        { id: 'g1c', label: '想收集不同品系、長期養多隻', score: 0, trackTag: 'collector' },
        { id: 'g1d', label: '朋友/網路推薦想試試看', score: 0, trackTag: 'newbie' }
      ]
    },
    {
      id: 'g2',
      dim: 'goal',
      text: '您對「品系基因組合」的興趣程度？',
      options: [
        { id: 'g2a', label: '非常感興趣，想深入研究', score: 0, trackTag: 'breeder' },
        { id: 'g2b', label: '想收藏稀有品系', score: 0, trackTag: 'collector' },
        { id: 'g2c', label: '知道有不同花色就好', score: 0, trackTag: 'viewer' },
        { id: 'g2d', label: '目前完全沒概念', score: 0, trackTag: 'newbie' }
      ]
    },
    {
      id: 'g3',
      dim: 'goal',
      text: '三年後您理想的飼養規模？',
      options: [
        { id: 'g3a', label: '1–2 隻陪伴', score: 0, trackTag: 'viewer' },
        { id: 'g3b', label: '3–5 隻不同品系', score: 0, trackTag: 'collector' },
        { id: 'g3c', label: '配對繁殖、學習出 morph', score: 0, trackTag: 'breeder' },
        { id: 'g3d', label: '還沒想這麼遠', score: 0, trackTag: 'newbie' }
      ]
    }
  ],

  // 5 級結果（依總分 0–100）
  results: [
    {
      min: 90,
      max: 100,
      grade: 'S',
      title: '觀念扎實的飼養者',
      desc: '您在各個維度都展現了足夠的準備，可以放心迎接守宮。記得保持學習，飼養路上總有新知識。'
    },
    {
      min: 75,
      max: 89,
      grade: 'A',
      title: '已準備就緒',
      desc: '基本條件齊備，可以開始飼養。針對最弱的維度小補強，會讓你的飼養品質更穩定。'
    },
    {
      min: 55,
      max: 74,
      grade: 'B',
      title: '還在補課中',
      desc: '熱忱足夠，但有 1–2 個維度需要再加強，建議補強後再開始，避免上手後手忙腳亂。'
    },
    {
      min: 35,
      max: 54,
      grade: 'C',
      title: '條件尚未到位',
      desc: '多個維度有明顯缺口，建議先解決核心問題（環境、預算、家人態度），再考慮飼養。'
    },
    {
      min: 0,
      max: 34,
      grade: 'D',
      title: '建議再觀望',
      desc: '目前的條件與觀念尚不適合飼養守宮。先充實知識與環境，等準備好了再回來重新評估。'
    }
  ]
}
