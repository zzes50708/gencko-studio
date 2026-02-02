import { CALC_SPECIES, CALC_TYPES, ZYG, CALC_COMBO_RULES } from '../../data/genes.js';

// --- 輔助函式：取得機率分數顯示 ---
export function getProbFraction(prob) {
    if (prob >= 0.99) return '必中';
    const frac = Math.round(1 / prob);
    return `1 / ${frac}`;
}

// --- 核心運算函式 (原 calc_run) ---
export function calculateGenetics(species, maleGenes, femaleGenes, defs) {
    if (maleGenes.length === 0 && femaleGenes.length === 0) {
        return null;
    }

    // 展開 Combo 基因 (如 RAPTOR -> Tremper + Eclipse...)
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
    const allGenes = [...maleGenes, ...femaleGenes];

    // 1. 警告與提示檢查
    let warning = '';
    let notices = [];

    if(allGenes.some(g => g.geneId === 'lemonfrost')) warning += "檸檬霜 (Lemon Frost) 易導致腫瘤。\n";
    if(allGenes.some(g => g.geneId === 'ndbe')) warning += "慾望黑眼 (NDBE) 母體不孕且子代易眼部萎縮。\n";
    if(allGenes.some(g => g.geneId === 'enigman')) notices.push("謎 (Enigma) 可能伴隨神經症狀 (ES)。");
    if(allGenes.some(g => g.geneId === 'whiteandyellow')) notices.push("白黃 (W&Y) 可能伴隨輕微神經症狀。");
    
    const fWhiteout = femaleGenes.find(g => g.geneId === 'aft_whiteout');
    if(fWhiteout && fWhiteout.zygosity === ZYG.SUP) warning += "超級立可白為致死基因。\n";

    // 豹紋守宮特有警告：白化互配
    if (species === CALC_SPECIES.LG) {
        const albinoTypes = ['tremper', 'bell', 'rainwater'];
        const getAlbinos = (list) => {
             const rawIds = list.map(g => g.geneId);
             const expandedIds = expand(list).map(g => g.geneId);
             return new Set([...rawIds, ...expandedIds].filter(id => albinoTypes.includes(id)));
        };
        const mAlbinos = getAlbinos(maleGenes);
        const fAlbinos = getAlbinos(femaleGenes);
        const union = new Set([...mAlbinos, ...fAlbinos]);
        if(union.size > 1) {
             warning += "不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n";
        }
    }

    // 肥尾守宮特有警告
    if (species === CALC_SPECIES.AFT) {
        const fHasCaramel = femaleGenes.some(g => g.geneId === 'aft_caramel');
        const fHasGhost = femaleGenes.some(g => g.geneId === 'aft_ghost');
        if(fHasCaramel) warning += "母焦糖 (Caramel) 會有不孕問題。\n";
        if(fHasGhost) warning += "母幽靈 (Ghost) 會有不孕問題。\n";
    }

    // 2. 孟德爾遺傳計算
    const allIds = new Set([...mExpanded.map(g => g.geneId), ...fExpanded.map(g => g.geneId)]);
    const mendelianResults = [];
    const polyInheritance = {};

    allIds.forEach(id => {
        const def = defs.find(d => d.id === id);
        if(!def) return;
        
        const mG = mExpanded.find(g => g.geneId === id);
        const fG = fExpanded.find(g => g.geneId === id);

        // 多遺傳與血系：取平均值概念 (簡化處理)
        if (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD) {
            const mP = mG ? 100 : 0;
            const fP = fG ? 100 : 0;
            const avg = (mP + fP) / 2;
            if (avg > 0) polyInheritance[id] = avg;
        } else {
            // 單基因遺傳：計算配子
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
            
            // 棋盤方格法 (Punnett Square)
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

    // 3. 組合所有基因座的結果 (Cartesian Product)
    let rawOutcomes = [{ gens: [], prob: 1 }];
    mendelianResults.forEach(opts => {
        const nextOutcomes = [];
        const sumProb = opts.reduce((s,o) => s + o.prob, 0);
        const wildProb = 1 - sumProb;
        
        rawOutcomes.forEach(ex => {
            // 與當前基因座的每個可能性組合
            opts.forEach(o => {
                nextOutcomes.push({ 
                    gens: [...ex.gens, { geneId: o.geneId, zygosity: o.zygosity }], 
                    prob: ex.prob * o.prob 
                });
            });
            // 加上不帶此基因的情況 (Wild Type)
            if(wildProb > 0.0001) {
                nextOutcomes.push({ gens: [...ex.gens], prob: ex.prob * wildProb });
            }
        });
        rawOutcomes = nextOutcomes;
    });

    // 4. 表型對應與命名 (Phenotype Mapping)
    const phenoMap = new Map();
    rawOutcomes.forEach(o => {
        const active = o.gens;
        
        // 篩選出表現型 (Visual)
        const visualGenes = active.filter(a => {
            const d = defs.find(k => k.id === a.geneId);
            if (!d) return false;
            if (d.type === CALC_TYPES.REC) return a.zygosity === ZYG.VIS;
            if (d.type === CALC_TYPES.CODOM) return [ZYG.VIS, ZYG.SGL, ZYG.SUP].includes(a.zygosity);
            return true; // Dominant
        });

        // 加入多遺傳表現
        Object.keys(polyInheritance).forEach(pid => {
            visualGenes.push({ geneId: pid, zygosity: ZYG.VIS });
            const bd = defs.find(d => d.id === pid);
            if(bd && bd.baseGeneId) visualGenes.push({ geneId: bd.baseGeneId, zygosity: ZYG.VIS });
        });

        const descParts = [];
        const consumed = new Set();

        // 檢查組合品系 (Combo Rules)
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
        
        // 加入剩餘的單基因名稱
        visualGenes.forEach(a => {
            if(consumed.has(a.geneId)) return;
            const d = defs.find(k => k.id === a.geneId);
            if(!d) return;
            let name = d.name.split(' (')[0];
            
            if(d.type === CALC_TYPES.CODOM) {
                if(a.zygosity === ZYG.SUP) descParts.push('超級' + name);
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
        
        // 合併相同表型的機率
        if(!phenoMap.has(name)) phenoMap.set(name, { prob: 0, raw: [] });
        const entry = phenoMap.get(name);
        entry.prob += o.prob;
        entry.raw.push(o);
    });

    // 5. 整理最終輸出 (含 Het 計算)
    const finalOutcomes = [];
    phenoMap.forEach((data, name) => {
        const { prob, raw } = data;
        const displayGens = [];
        
        // 基礎顯示基因 (取第一個 raw 作為代表)
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

        // 計算隱性基因攜帶機率 (Poss Het)
        const involvedIds = new Set([...mExpanded.map(x=>x.geneId), ...fExpanded.map(x=>x.geneId)]);
        involvedIds.forEach(id => {
            const d = defs.find(k => k.id === id);
            if(!d || d.type !== CALC_TYPES.REC) return;
            // 如果已經是顯性表現，就不顯示 Het
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

        // 產生括號內的詳細說明 (Extra Info)
        let extraInfo = displayGens.map(g => {
            const d = defs.find(k => k.id === g.geneId);
            const gName = d ? d.name.split(' (')[0] : g.geneId;
            if(g.zygosity === 'Super' && !gName.includes('超級')) return '超級' + gName;
            if(typeof g.zygosity === 'string' && g.zygosity.includes('Het')) return `${g.zygosity} ${gName}`;
            if(g.isPoly) return gName;
            // 如果名稱已經在主標題中，就不顯示在括號內，除非狀態特殊
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

    // 依機率排序
    finalOutcomes.sort((a,b) => b.prob - a.prob);

    return {
        totalCombos: finalOutcomes.length,
        outcomes: finalOutcomes,
        warning: warning,
        notices: notices
    };
}