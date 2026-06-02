import { CALC_TYPES, ZYG } from './genes.js';

// --- 輔助函式：取得機率分數顯示 ---
export function getProbFraction(prob) {
    if (prob >= 0.99) return '';
    const frac = Math.round(1 / prob);
    if ([ 2, 3, 4, 8, 16, 32, 64, 128, 256 ].includes(frac)) return `1/${frac}`;
    return '';
}

// --- 核心運算函式 ---
// @param speciesConfig {Object} 物種配置，包含 genes, comboRules, checks, warnings
// @param maleGenes {Array} 公代基因陣列
// @param femaleGenes {Array} 母代基因陣列
// @returns {Object|null} 計算結果或 null
export function calculateGenetics(speciesConfig, maleGenes, femaleGenes) {
    if (maleGenes.length === 0 && femaleGenes.length === 0) {
        return null;
    }

    // 從 speciesConfig 中提取數據
    const defs = speciesConfig.genes;
    const comboRules = speciesConfig.comboRules || [];
    const checks = speciesConfig.checks || {};
    const speciesWarnings = speciesConfig.warnings || [];

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

    // 從物種配置讀取警告
    speciesWarnings.forEach(w => {
        if(allGenes.some(g => g.geneId === w.check)) {
            warning += w.message;
        }
    });

    // 多遺傳基因警告（通用邏輯）
    const hasPolygenicGene = allGenes.some(g => {
        const def = defs.find(d => d.id === g.geneId);
        return def && (def.type === CALC_TYPES.POLY || def.type === CALC_TYPES.BLOOD);
    });
    if (hasPolygenicGene) {
        warning += "含有多遺傳基因之品系需視表現而定。\n";
    }

    // 執行物種特定的檢查函數
    if (checks.validateAlbinos) {
        const albinoCheck = checks.validateAlbinos(allGenes, defs);
        if (albinoCheck && albinoCheck.hasWarning) {
            warning += albinoCheck.warning;
        }
    }

    if (checks.validateCaramelFemale) {
        const caramelCheck = checks.validateCaramelFemale(femaleGenes);
        if (caramelCheck && caramelCheck.hasWarning) {
            warning += caramelCheck.warning;
        }
    }

    if (checks.validateGhostFemale) {
        const ghostCheck = checks.validateGhostFemale(femaleGenes);
        if (ghostCheck && ghostCheck.hasWarning) {
            warning += ghostCheck.warning;
        }
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

        comboRules.forEach(rule => {
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

        // 計算「完整表現隱性基因數」用於推薦排序
        // 完整表現 = 隱性基因（REC）中，zygosity === ZYG.VIS 的個數
        let completeExpressionCount = 0;
        raw.forEach(r => {
            r.gens.forEach(g => {
                const gDef = defs.find(d => d.id === g.geneId);
                if(gDef && gDef.type === CALC_TYPES.REC && g.zygosity === ZYG.VIS) {
                    completeExpressionCount++;
                }
            });
        });
        completeExpressionCount = completeExpressionCount / raw.length;  // 平均值

        finalOutcomes.push({
            description: name,
            fullLabel: fullLabel,
            prob: prob,
            completeExpressionCount: completeExpressionCount,
            gens: [ ]
        });
    });

    // 排序：首先按「完整表現隱性基因數」降序（表現最多的優先）
    // 其次按「概率」降序
    finalOutcomes.sort((a,b) => {
        if(a.completeExpressionCount !== b.completeExpressionCount) {
            return b.completeExpressionCount - a.completeExpressionCount;
        }
        return b.prob - a.prob;
    });

    return {
        totalCombos: finalOutcomes.length,
        outcomes: finalOutcomes,
        warning: warning,
        notices: notices
    };
}