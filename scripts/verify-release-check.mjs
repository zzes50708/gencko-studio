import { releaseRunState } from '../utils/release-gate.mjs'

// GitHub 的本機正式建置不帶 VERCEL；避免檢查等待自己的死結。
if (process.env.VERCEL === '1' && process.env.VERCEL_ENV === 'production') {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA
  if (!/^[a-f0-9]{40}$/.test(sha || '')) throw new Error('正式發布缺少提交版本，停止發布。請使用 Git 部署。')
  const deadline = Date.now() + 30 * 60 * 1000
  let passed = false
  while (Date.now() < deadline) {
    const url = new URL('https://api.github.com/repos/zzes50708/gencko-studio/actions/workflows/release-validation.yml/runs')
    url.search = new URLSearchParams({ head_sha: sha, event: 'push', branch: 'main', per_page: '5' }).toString()
    const response = await fetch(url, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Gencko-Release-Gate' }, signal: AbortSignal.timeout(15000) })
    if (response.status === 403 || response.status === 429) throw new Error('發布檢查服務暫時受限，停止發布；請稍後重新部署。')
    if (!response.ok && response.status !== 404) throw new Error(`無法核對發布檢查（${response.status}），停止發布。`)
    const state = response.ok ? releaseRunState((await response.json()).workflow_runs, sha) : 'pending'
    if (state === 'failed') throw new Error('同版本全站回歸測試未通過，停止發布。')
    if (state === 'passed') { passed = true; console.log('同版本全站回歸測試通過，繼續建置。'); break }
    console.log('等待同版本桌面與手機回歸測試…')
    await new Promise((resolve) => setTimeout(resolve, 60000))
  }
  if (!passed) throw new Error('等待發布檢查逾時，停止發布。')
}
