$siteDir = "C:\Users\Ati\Desktop\seoscore-tools\src\site"
$count = 0

Get-ChildItem -Recurse $siteDir -Filter "*.html" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $original = $content

    # Fix ahrefs.com links
    $content = $content -replace '(href="https://ahrefs\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'

    # Fix rankmath.com links
    $content = $content -replace '(href="https://rankmath\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'

    # Fix semrush.com links
    $content = $content -replace '(href="https://www\.semrush\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'
    $content = $content -replace '(href="https://semrush\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'

    # Fix surferseo.com links
    $content = $content -replace '(href="https://surferseo\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'

    # Fix neuronwriter.com links
    $content = $content -replace '(href="https://neuronwriter\.com[^"]*"[^>]*?)rel="noopener"', '$1rel="nofollow noopener"'

    if ($content -ne $original) {
        Set-Content $_.FullName $content -NoNewline
        $count++
        Write-Host "Fixed: $($_.FullName)"
    }
}

Write-Host "`nTotal files fixed: $count"
