import type { CabinetConfiguration } from './config'
import { HARDWARE } from './config'

export function cabinetTextExport(cfg: CabinetConfiguration) {
  const title = `GENCKO-${cfg.rows}層${cfg.columns}抽${cfg.boxLabel.replace(/\s/g, '')}訂製櫃`
  const text = [
    title,
    `盒款：${cfg.boxLabel}｜${cfg.boxDimensions.length} × ${cfg.boxDimensions.width} × ${cfg.boxDimensions.height} cm（長 × 寬 × 高）`,
    ...(cfg.boxDimensions.bottomWidth
      ? [`盒底：${cfg.boxDimensions.bottomLength} × ${cfg.boxDimensions.bottomWidth} cm`]
      : []),
    `排列：${cfg.rows} 層，每層 ${cfg.columns} 抽，共 ${cfg.rows * cfg.columns} 盒`,
    `櫃體估算：寬 ${cfg.dimensions.width} × 高 ${cfg.dimensions.height} × 深 ${cfg.dimensions.depth} cm`,
    `板厚：${cfg.boardThickness} cm｜貼皮：${cfg.finish}｜盒色：${cfg.boxColor === 'smoke' ? '霧黑' : '透白示意'}`,
    '標配：貼皮木櫃、內嵌溫控',
    ...HARDWARE.filter((item) => cfg.counts[item.id] > 0).map(
      (item) => `${item.label}：${cfg.counts[item.id]} 個`
    ),
    ...(cfg.ledLayers > 0 ? [`LED：${cfg.ledLayers} 層`] : []),
    `加熱墊：${cfg.heatingMat === 'korea' ? '韓國加熱墊' : '美國加熱墊'}`,
    ...(cfg.storageHeight > 0
      ? [
          `收納內高：${cfg.storageHeight} cm｜款式：${{ drawer: '抽屜', doors: '雙開門', open: '無門' }[cfg.storageStyle]}`
        ]
      : []),
    ...(cfg.wheelHeight > 0 ? ['萬向輪：有'] : []),
    `每盒側向間隙：${cfg.clearances.horizontal} cm｜上方間隙：${cfg.clearances.vertical} cm｜後方間隙：${cfg.clearances.depth} cm｜控制區高度：${cfg.clearances.controlHeight} cm`,
    '',
    '此配置並非正式製作圖，盒體尺寸因品牌有所差異，實際尺寸請交由工作室確認後提供。'
  ].join('\n')
  return { filename: `${title}.txt`, text }
}
