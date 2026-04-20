import { CALC_SPECIES, CALC_TYPES, ZYG, CALC_COMBO_RULES } from './genes.js';

// --- 輔助函式：取得機率分數顯示 ---
export function getProbFraction(prob) {
    if (prob >= 0.99) return '';
    const frac = Math.round(1 / prob);
    if ([ 2, 3, 4, 8, 16, 32, 64, 128, 256 ].includes(frac)) return `1/${frac}`;
    return '';
}

// --- 核心運算函式 ---
export function calculateGenetics(species, maleGenes, femaleGenes, defs) {
    if (maleGenes.length === 0 && femaleGenes.length === 0) {
        return null;
    }

    // 展開 Combo 基因
    const expand = (list) => {
        let res =[ ];
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
    const allGenes = [ ...maleGenes, ...femaleGenes ];

    // 1. 警告與提示檢查
    let warning = '';
    let notices = [ ];

    if(allGenes.some(g => g.geneId === 'lemonfrost')) warning += "檸檬霜 (Lemon Frost) 易導致腫瘤。\n";
    if(allGenes.some(g => g.geneId === 'ndbe')) warning += "慾望黑眼 (NDBE) 母體不孕且子代易眼部萎縮。\n";
    if(allGenes.some(g => g.geneId === 'enigman')) notices.push("謎 (Enigma) 可能伴隨神經症狀 (ES)。");
    if(allGenes.some(g => g.geneId === 'whiteandyellow')) notices.push("白黃 (W&Y) 可能伴隨輕微神經症狀。");
    
    const fWhiteout = femaleGenes.find(g => g.geneId === 'aft_whiteout');
    if(fWhiteout && fWhiteout.zygosity === ZYG.SUP) warning += "超級立可白為致死基因。\n";

    // 新增：檢查是否存在多遺傳基因，並顯示警告
    const hasPolygenicGene = allGenes.some(g => {
        const def = defs.find(d => d.id === g.geneId);
        return def && (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD);
    });
    if (hasPolygenicGene) {
        warning += "含有多遺傳基因之品系需視表現而定。\n";
    }

    if (species === CALC_SPECIES.LG) {
        const albinoTypes =[ 'tremper', 'bell', 'rainwater' ];
        const getAlbinos = (list) => {
             const rawIds = list.map(g => g.geneId);
             const expandedIds = expand(list).map(g => g.geneId);
             return new Set([ ...rawIds, ...expandedIds ].filter(id => albinoTypes.includes(id)));
        };
        const mAlbinos = getAlbinos(maleGenes);
        const fAlbinos = getAlbinos(femaleGenes);
        const union = new Set([ ...mAlbinos, ...fAlbinos ]);
        if(union.size > 1) {
             warning += "不同白化基因 (川普/貝爾/雨水) 互配，子代將不表現白化且造成基因混亂。\n";
        }
    }

    if (species === CALC_SPECIES.AFT) {
        const fHasCaramel = femaleGenes.some(g => g.geneId === 'aft_caramel');
        const fHasGhost = femaleGenes.some(g => g.geneId === 'aft_ghost');
        if(fHasCaramel) warning += "母焦糖 (Caramel) 會有不孕問題。\n";
        if(fHasGhost) warning += "母幽靈 (Ghost) 會有不孕問題。\n";
    }

    // 2. 孟德爾遺傳計算
    const allIds = new Set([ ...mExpanded.map(g => g.geneId), ...fExpanded.map(g => g.geneId) ]);
    const mendelianResults = [ ];
    const polyInheritance = {};

    allIds.forEach(id => {
        const def = defs.find(d => d.id === id);
        if(!def) return;
        
        const mG = mExpanded.find(g => g.geneId === id);
        const fG = fExpanded.find(g => g.geneId === id);

        // 多遺傳與血系：取平均值
        if (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD) {
            const mP = mG ? 100 : 0;
            const fP = fG ? 100 : 0;
            const avg = (mP + fP) / 2;
            if (avg > 0) polyInheritance[id] = avg;
        } else {
            const getAlleles = (z) => {
                if (!z) return [ 0, 0 ];
                if (def.type === CALC_TYPES.REC) {
                    if (z === ZYG.VIS) return [ 1, 1 ];
                    if (z === ZYG.HET) return [ 1, 0 ];
                } else if (def.type === CALC_TYPES.CODOM) {
                    if (z === ZYG.SUP) return [ 1, 1 ];
                    if (z === ZYG.VIS || z === ZYG.SGL) return [ 1, 0 ];
                } else { 
                    if (z === ZYG.VIS) return[ 1, 0 ]; 
                }
                return [ 0, 0 ];
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
            const locRes = [ ];
            Object.keys(counts).forEach(k => {
                if(k!=='Wild') locRes.push({ geneId: id, zygosity: k, prob: counts[k]/4 });
            });
            if(locRes.length > 0) mendelianResults.push(locRes);
        }
    });

    // 3. 組合結果
    let rawOutcomes = [ { gens: [ ], prob: 1 } ];
    mendelianResults.forEach(opts => {
        const nextOutcomes = [ ];
        const sumProb = opts.reduce((s,o) => s + o.prob, 0);
        const wildProb = 1 - sumProb;
        
        rawOutcomes.forEach(ex => {
            opts.forEach(o => {
                nextOutcomes.push({ 
                    gens:[ ...ex.gens, { geneId: o.geneId, zygosity: o.zygosity } ], 
                    prob: ex.prob * o.prob 
                });
            });
            if(wildProb > 0.0001) {
                nextOutcomes.push({ gens: [ ...ex.gens ], prob: ex.prob * wildProb });
            }
        });
        rawOutcomes = nextOutcomes;
    });

    // 4. 表型對應 (Phenotype Mapping)
    const phenoMap = new Map();
    rawOutcomes.forEach(o => {
        const active = o.gens;
        
        // 篩選單基因遺傳的 Visual
        const visualGenes = active.filter(a => {
            const d = defs.find(k => k.id === a.geneId);
            if (!d) return false;
            if (d.type === CALC_TYPES.REC) return a.zygosity === ZYG.VIS;
            if (d.type === CALC_TYPES.CODOM) return[ ZYG.VIS, ZYG.SGL, ZYG.SUP ].includes(a.zygosity);
            return true;
        });

        // 收集當前組合中，所有多遺傳和血系基因的 ID，用於後續 descParts 的生成
        const polygenicGeneIdsInPhenotype = new Set();
        Object.keys(polyInheritance).forEach(pid => {
            const val = polyInheritance[pid];
            const def = defs.find(d => d.id === pid);
            
            if (def.type === CALC_TYPES.BLOOD) {
                if (val >= 100) {
                    polygenicGeneIdsInPhenotype.add(pid);
                } else {
                    if (def.baseGeneId) {
                        polygenicGeneIdsInPhenotype.add(def.baseGeneId);
                    }
                }
            } else {
                polygenicGeneIdsInPhenotype.add(pid);
            }
        });

        const descParts = [ ];
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
        
        // 處理非多遺傳/血系的視覺表現基因
        visualGenes.forEach(a => {
            if(consumed.has(a.geneId)) return;
            const d = defs.find(k => k.id === a.geneId);
            if(!d) return;
            let geneDisplayName = d.name.split(' (')[0];
            
            if(d.type === CALC_TYPES.CODOM) {
                if(a.zygosity === ZYG.SUP) descParts.push('超級' + geneDisplayName);
                else descParts.push(geneDisplayName);
            } else if(d.type === CALC_TYPES.REC) {
                descParts.push(geneDisplayName);
            } else {
                descParts.push(geneDisplayName);
            }
        });
        
        // 將多遺傳基因的名稱添加到 descParts，但要確保它們不會被 consumed 掉
        polygenicGeneIdsInPhenotype.forEach(pid => {
            const d = defs.find(k => k.id === pid);
            if (d && !consumed.has(pid)) {
                const geneDisplayName = d.name.split(' (')[0];
                if (!descParts.includes(geneDisplayName)) { // 避免重複添加
                    descParts.push(geneDisplayName);
                }
            }
        });

        const name = descParts.join(' + ') || '原色';
        
        if(!phenoMap.has(name)) phenoMap.set(name, { prob: 0, raw: [ ] });
        const entry = phenoMap.get(name);
        entry.prob += o.prob;
        entry.raw.push(o);
    });

    // 5. 整理最終輸出
    const finalOutcomes = [ ];
    phenoMap.forEach((data, name) => {
        const { prob, raw } = data;
        const hetStats = {};
        
        // Het 計算
        const potentialHets = new Set([ ...mExpanded.map(x=>x.geneId), ...fExpanded.map(x=>x.geneId) ]);
        potentialHets.forEach(id => {
            const d = defs.find(k => k.id === id);
            if(!d || d.type !== CALC_TYPES.REC) return;
            
            const isVisualInThisGroup = raw.every(r => {
                const g = r.gens.find(x => x.geneId === id);
                return g && g.zygosity === ZYG.VIS;
            });

            const geneDef = defs.find(k => k.id === id);
            const geneName = geneDef ? geneDef.name.split(' (')[0] : '';
            
            if (isVisualInThisGroup && name.includes(geneName) && 
                geneDef.type !== CALC_TYPES.POLY && geneDef.type !== CALC_TYPES.BLOOD) {
                return;
            }

            let hetCount = 0;
            raw.forEach(r => {
                const g = r.gens.find(x => x.geneId === id);
                if(g && (g.zygosity === ZYG.HET || g.zygosity === ZYG.VIS)) {
                    hetCount += r.prob;
                }
            });

            const ratio = hetCount / prob;
            if(ratio > 0.001) {
                let label = '';
                if(ratio >= 0.99) label = 'Het';
                else if(ratio >= 0.60) label = '66% Poss Het';
                else if(ratio >= 0.45) label = '50% Poss Het';
                else label = `${Math.round(ratio*100)}% Poss Het`;
                hetStats[id] = label;
            }
        });

        const groupedHets = {};
        Object.keys(hetStats).forEach(id => {
            const label = hetStats[id];
            const d = defs.find(k => k.id === id);
            const gName = d ? d.name.split(' (')[0] : id;
            if(!groupedHets[label]) groupedHets[label] = [ ];
            groupedHets[label].push(gName);
        });

        const extraInfo = [ ];

        // --- 多遺傳與血系基因的「視表現」標籤處理 ---
        Object.keys(polyInheritance).forEach(pid => {
            const val = polyInheritance[pid];
            const d = defs.find(k => k.id === pid);
            if(d) {
                const pName = d.name.split(' (')[0];
                if (d.type === CALC_TYPES.BLOOD) {
                    if (val < 100) {
                        extraInfo.push(`${val}% ${pName}血`);
                    }
                } else if (d.type === CALC_TYPES.POLY) {
                    if (!name.includes(pName)) { 
                        extraInfo.push(`${pName} (視表現)`);
                    }
                }
            }
        });

        // 排序並加入 Het 資訊
        const sortOrder =[ 'Het', '66% Poss Het', '50% Poss Het' ];
        sortOrder.forEach(lbl => {
            if(groupedHets[lbl]) {
                extraInfo.push(`${lbl} ${groupedHets[lbl].join(' ')}`);
                delete groupedHets[lbl];
            }
        });
        Object.keys(groupedHets).forEach(lbl => {
            extraInfo.push(`${lbl} ${groupedHets[lbl].join(' ')}`);
        });

        let fullLabel = name;
        if(extraInfo.length > 0) {
            fullLabel += ` (${extraInfo.join(', ')})`;
        }

        finalOutcomes.push({
            description: name,
            fullLabel: fullLabel,
            prob: prob,
            gens: [ ]
        });
    });

    finalOutcomes.sort((a,b) => b.prob - a.prob);

    return {
        totalCombos: finalOutcomes.length,
        outcomes: finalOutcomes,
        warning: warning,
        notices: notices
    };
}