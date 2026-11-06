/** 等照片（含原圖備援）及字型就緒；逾時不印出缺圖證書。 */
export async function waitForPrintReady(
  getImage: () => HTMLImageElement | null,
  fontsReady: PromiseLike<unknown>,
  signal: AbortSignal,
  timeout = 12000
): Promise<boolean> {
  let fontsLoaded = false
  Promise.resolve(fontsReady).then(
    () => {
      fontsLoaded = true
    },
    () => {}
  )
  const deadline = Date.now() + timeout
  while (!signal.aborted && Date.now() < deadline) {
    const referencedImage = getImage()
    const image = referencedImage?.isConnected === false ? null : referencedImage
    // 已明確降級為「暫無照片」的證書仍可列印；載入中的照片必須等待。
    if (fontsLoaded && (!image || (image.complete && image.naturalWidth > 0))) return true
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  return false
}
