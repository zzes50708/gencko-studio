@echo off
REM Start Nuxt dev in background; write output to logs.
cd /d "%~dp0.."

REM Reset logs
type nul > dev.log
type nul > dev.err.log

REM Start dev server
npm.cmd run dev 1>> dev.log 2>> dev.err.log
