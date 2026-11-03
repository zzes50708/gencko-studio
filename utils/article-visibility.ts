/** 草稿僅限開發模式與回環主機同時成立；正式建置即使跑在 localhost 也不開放。 */
export function allowDraftPreview(development: boolean, hostname: string): boolean {
  return development && ['localhost', '127.0.0.1', '::1', '[::1]'].includes(hostname)
}

export function articleStatuses(preview: boolean): string[] {
  return preview ? ['Published', 'Draft'] : ['Published']
}

export function articleIsVisible(status: unknown, preview: boolean): boolean {
  return typeof status === 'string' && articleStatuses(preview).includes(status)
}
