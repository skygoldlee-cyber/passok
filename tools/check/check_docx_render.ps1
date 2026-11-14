# @spec none — check_docx_render.ps1: docx 시각 회귀 로컬 게이트 (Word COM 필요 — CI 비적합)
#
# tmp/sample-docs/*.docx → Word COM으로 PDF 내보내기 → PyMuPDF로 렌더 계약 검증:
#   · 쪽당 워터마크 PNG 정확히 1개 (중첩 = 알파 배가 버그, 0개 = 누락)
#   · 워터마크 bbox 전 쪽 동일 (페이지 중심 대각선, 페이지 크기 기준)
#   · 마지막 쪽이 거의 빈 "꼬리 쪽"이 아님 (본문 3블록 미만 + QR만 = 회귀)
#   · 여백 위 워터마크 잉크 존재 (표 안에만 보이는 회귀 감지)
#
# 사용: powershell -File tools/check/check_docx_render.ps1 [-DocsDir tmp\sample-docs]
param(
    [string]$DocsDir = "tmp\sample-docs",
    [string]$PyExe = "python"
)
$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$dir  = Join-Path $root $DocsDir
if (-not (Test-Path $dir)) { Write-Error "docs dir not found: $dir"; exit 2 }

$docx = Get-ChildItem (Join-Path $dir '*.docx')
if (-not $docx) { Write-Error "no .docx in $dir"; exit 2 }

$w = New-Object -ComObject Word.Application
$w.Visible = $false
$fail = $false
foreach ($f in $docx) {
    $pdf = [System.IO.Path]::ChangeExtension($f.FullName, 'pdf')
    try {
        $d = $w.Documents.Open($f.FullName)
        $pages = $d.ComputeStatistics(2) # wdStatisticPages
        $d.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF
        $d.Close($false)
        Write-Output ("{0} => {1} pages" -f $f.Name, $pages)
    } catch {
        Write-Output ("{0} => EXPORT FAIL" -f $f.Name); $fail = $true
    }
}
$w.Quit()
if ($fail) { Write-Error "Word export failed"; exit 1 }

python (Join-Path $PSScriptRoot 'docx_render_assert.py') $dir
exit $LASTEXITCODE
