$raw = Get-Content 'D:/project_work_frilans/marketplizzzz/scripts/quiz_raw.json' -Raw -Encoding UTF8
$questions = $raw | ConvertFrom-Json

$out = @()
$out += "=" * 60
$out += "  РЕЗУЛЬТАТЫ ТЕСТА"
$out += "  Экзамен 04.05.26 Тренировочный"
$out += "  Attempt: 22657 | Всего вопросов: $($questions.Count)"
$out += "=" * 60
$out += ""

$correct = 0
$incorrect = 0
$partial = 0

foreach ($q in $questions) {
    $out += "-" * 50
    $status = switch ($q.s) { "V" { "[ВЕРНО]" } "X" { "[НЕВЕРНО]" } "P" { "[ЧАСТИЧНО]" } default { "" } }
    if ($q.s -eq "V") { $correct++ }
    elseif ($q.s -eq "X") { $incorrect++ }
    elseif ($q.s -eq "P") { $partial++ }
    
    $out += "$($q.n) $status"
    $out += "-" * 50
    $out += $q.t
    if ($q.g) { $out += $q.g }
    
    # Multiple choice
    if (($q.tp -eq "mc" -or $q.tp -eq "tf") -and $q.opts.Count -gt 0) {
        $out += ""
        $out += "Варианты:"
        foreach ($o in $q.opts) {
            $m = "  "
            if ($o.sel -and $o.ok) { $m = "[V]" }
            elseif ($o.sel -and $o.bad) { $m = "[X]" }
            elseif ($o.sel) { $m = "[>]" }
            elseif ($o.ok) { $m = "[V]" }
            $text = if ($o.t) { $o.t } else { "(текст не извлечен)" }
            $out += "  $m $text"
        }
    }
    
    # Match
    if ($q.tp -eq "ma" -and $q.opts.Count -gt 0) {
        $out += ""
        $out += "Соответствия:"
        foreach ($o in $q.opts) {
            $mark = if ($o.ok) { "[V]" } else { "[X]" }
            $out += "  $mark $($o.l) -> $($o.r)"
        }
    }
    
    # Short answer
    if (($q.tp -eq "sa" -or $q.tp -eq "nu") -and $q.ua) {
        $out += ""
        $out += "Ваш ответ: $($q.ua)"
    }
    
    # Cloze
    if ($q.tp -eq "cloze" -and $q.opts.Count -gt 0) {
        $out += ""
        $out += "Пропуски:"
        foreach ($o in $q.opts) {
            $out += "  [$($o.p)]: $($o.a)"
        }
    }
    
    if ($q.ra) {
        $out += ""
        $out += "ПРАВИЛЬНЫЙ ОТВЕТ: $($q.ra)"
    }
    
    $out += ""
}

$out += "=" * 60
$out += "ИТОГО: $($questions.Count) вопросов"
$out += "  Верно: $correct | Неверно: $incorrect | Частично: $partial"
$out += "=" * 60

$result = $out -join "`r`n"
Set-Content -Path 'D:/project_work_frilans/marketplizzzz/scripts/quiz_results.txt' -Value $result -Encoding UTF8
Write-Host "Saved quiz_results.txt ($($out.Count) lines)"
Write-Host "Верно: $correct | Неверно: $incorrect | Частично: $partial"
