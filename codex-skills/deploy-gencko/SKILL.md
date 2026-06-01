---
name: deploy-gencko
description: Automates redeploy git workflow for the gencko-vercel repo. Use when user says 「部署」/「部屬」/deploy/redeploy in this project.
---

# 部署（gencko-vercel）

## 快速開始

在 `D:\Users\User\Desktop\gencko-vercel` 執行：

- PowerShell：`pwsh -File .\codex-skills\deploy-gencko\scripts\deploy.ps1`

## 工作流程

1. 確認目前目錄是專案根目錄，且為 Git repo。
2. 若有檔案變更：
   - `git add .`
   - `git commit -m "redeploy"`
3. `git push origin main`

## 行為規則

- 若沒有任何變更（`git status --porcelain` 為空），會略過 commit，只做 `git push origin main`。
- 若遠端 push 失敗，會以非 0 code 結束，讓呼叫端明確知道失敗原因。

