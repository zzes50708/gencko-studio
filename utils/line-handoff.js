/** LINE 官方聊天 scheme 只支援手機系統；桌機縮窄視窗也不能套用。 */
export function isMobileLineDevice(userAgent, maxTouchPoints = 0) {
  return (
    /Android|iPhone|iPad|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)
  )
}
