param(
  [ValidateSet("dev", "production")]
  [string]$Environment = "dev"
)

$url = if ($Environment -eq "production") {
  "https://text-o-matic-pageviews.nick-958.workers.dev/health"
} else {
  "https://text-o-matic-dev.nick-958.workers.dev/health""
}

Write-Host "Checking $url"
$response = Invoke-WebRequest -Uri $url -Method GET
Write-Host ""
Write-Host "Status: $($response.StatusCode)"
Write-Host "Commit: $($response.Headers['X-Text-O-Matic-Commit'])"
Write-Host "Worker version: $($response.Headers['X-Text-O-Matic-Worker-Version'])"
Write-Host "Environment: $($response.Headers['X-Text-O-Matic-Worker-Environment'])"
Write-Host ""
$response.Content
