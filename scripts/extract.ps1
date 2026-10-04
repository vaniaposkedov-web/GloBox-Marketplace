$content = Get-Content 'C:/Users/vanap/AppData/Local/Temp/windsurf/mcp_output_22e40a649338d28f.txt' -Raw
$json = ($content -split '### Ran Playwright')[0].Replace('### Result','').Trim()
Set-Content -Path 'D:/project_work_frilans/marketplizzzz/scripts/quiz_raw.json' -Value $json -Encoding UTF8
Write-Host "Done. Length: $($json.Length)"
