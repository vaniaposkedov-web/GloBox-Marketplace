# GloBox Marketplace - Clean Archive Creator
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$archiveName = "GloBox_Marketplace.zip"
$archivePath = Join-Path $root $archiveName

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  GloBox - Sozdanie chistogo arhiva" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $archivePath) { Remove-Item $archivePath -Force }

$exclude = @('node_modules', '.next', 'out', 'dist', '.pnpm-store', '.turbo', '.vercel', 'coverage', '.git', 'GloBox_Marketplace.zip')

Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($archivePath, 'Create')
$base = $root + '\'
$count = 0

Get-ChildItem -Path $root -Recurse -File | ForEach-Object {
    $rel = $_.FullName.Substring($base.Length)
    $skip = $false
    foreach ($ex in $exclude) {
        if ($rel -like "$ex\*" -or $rel -like "*\$ex\*" -or $rel -eq $ex) {
            $skip = $true
            break
        }
    }
    if (-not $skip) {
        $entry = $rel.Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entry, 'Optimal') | Out-Null
        $count++
    }
}
$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $archivePath).Length / 1MB, 1)
Write-Host ""
Write-Host "  Gotovo!" -ForegroundColor Green
Write-Host "  Failov: $count" -ForegroundColor Green
Write-Host "  Razmer: $sizeMB MB" -ForegroundColor Green
Write-Host "  Fail:   $archivePath" -ForegroundColor Yellow
Write-Host ""
Read-Host "Nazmite Enter"
