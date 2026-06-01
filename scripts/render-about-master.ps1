#requires -Version 5.1

$ErrorActionPreference = 'Stop'

$width  = 1920
$height = 1080
$fps    = 60
$hold   = 2.5
$trans  = 1.2

node .\scripts\render-about-master.mjs `
  --width  $width `
  --height $height `
  --fps    $fps `
  --hold   $hold `
  --trans  $trans `
  --port   4173 `
  --fresh true `
  --cleanup true
