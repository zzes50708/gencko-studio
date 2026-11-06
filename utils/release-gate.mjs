/** 只接受同一專案、同一提交、主分支 push 所產生的最新檢查結果。 */
export function releaseRunState(runs, sha) {
  const matching = (runs || [])
    .filter(
      (run) =>
        run.head_sha === sha &&
        run.event === 'push' &&
        run.head_branch === 'main' &&
        run.head_repository?.full_name === 'zzes50708/gencko-studio' &&
        run.path === '.github/workflows/release-validation.yml'
    )
    .sort((a, b) => b.id - a.id || b.run_attempt - a.run_attempt)
  const run = matching[0]
  if (!run || run.status !== 'completed') return 'pending'
  return run.conclusion === 'success' ? 'passed' : 'failed'
}
