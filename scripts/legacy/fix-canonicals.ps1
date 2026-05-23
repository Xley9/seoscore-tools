# Fix canonical tags on translated blog pages and plugin landing pages
# Scans de/, tr/, ru/, es/ directories and fixes canonicals pointing to EN versions

$siteRoot = "C:\Users\Ati\Desktop\seoscore-tools\src\site"
$baseUrl = "https://seoscore.tools"
$languages = @("de", "tr", "ru", "es")
$fixedCount = 0
$alreadyCorrectCount = 0
$noCanonicalCount = 0

foreach ($lang in $languages) {
    $langDir = Join-Path $siteRoot $lang
    if (-not (Test-Path $langDir)) {
        Write-Host "SKIP: $langDir does not exist" -ForegroundColor Yellow
        continue
    }

    $htmlFiles = Get-ChildItem -Path $langDir -Recurse -Filter "*.html"

    foreach ($file in $htmlFiles) {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

        # Calculate what the correct canonical should be
        # Get relative path from site root, using forward slashes
        $relativePath = $file.FullName.Substring($siteRoot.Length).Replace("\", "/")
        # Remove /index.html from the end to get the directory path
        $relativePath = $relativePath -replace "/index\.html$", "/"
        $correctCanonical = "$baseUrl$relativePath"

        # Find existing canonical tag
        $canonicalPattern = '<link\s+rel="canonical"\s+href="([^"]*)"'
        $match = [regex]::Match($content, $canonicalPattern)

        if (-not $match.Success) {
            Write-Host "NO CANONICAL: $($file.FullName)" -ForegroundColor Yellow
            $noCanonicalCount++
            continue
        }

        $currentCanonical = $match.Groups[1].Value

        if ($currentCanonical -eq $correctCanonical) {
            $alreadyCorrectCount++
            continue
        }

        # Fix the canonical
        $oldTag = $match.Value + '"'
        # Handle both self-closing and non-self-closing variants
        $oldTagFull = [regex]::Match($content, '<link\s+rel="canonical"\s+href="[^"]*"\s*/?>').Value
        $newTag = "<link rel=`"canonical`" href=`"$correctCanonical`""

        # Check if original had self-closing
        if ($oldTagFull.EndsWith("/>")) {
            $newTag += "/>"
        } elseif ($oldTagFull.EndsWith(">")) {
            $newTag += ">"
        } else {
            $newTag += ">"
        }

        $newContent = $content.Replace($oldTagFull, $newTag)

        if ($newContent -ne $content) {
            Set-Content -Path $file.FullName -Value $newContent -NoNewline -Encoding UTF8
            $fixedCount++
            Write-Host "FIXED: $($file.FullName)" -ForegroundColor Green
            Write-Host "  OLD: $currentCanonical" -ForegroundColor Red
            Write-Host "  NEW: $correctCanonical" -ForegroundColor Cyan
        } else {
            Write-Host "WARNING: Replace failed for $($file.FullName)" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor White
Write-Host "SUMMARY" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "Fixed:            $fixedCount" -ForegroundColor Green
Write-Host "Already correct:  $alreadyCorrectCount" -ForegroundColor Cyan
Write-Host "No canonical:     $noCanonicalCount" -ForegroundColor Yellow
Write-Host "Total processed:  $($fixedCount + $alreadyCorrectCount + $noCanonicalCount)" -ForegroundColor White
