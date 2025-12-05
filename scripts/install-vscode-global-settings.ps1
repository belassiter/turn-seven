<#
  install-vscode-global-settings.ps1

  Cross-platform (PowerShell on Windows) helper to:
   - install the recommended extensions
   - merge recommended settings into the user's global VS Code settings.json

  Usage (run from PowerShell):
    powershell -ExecutionPolicy Bypass -File .\scripts\install-vscode-global-settings.ps1

  Safety: this script backs up your existing settings.json before modifying it.
>

function Write-Log($msg) { Write-Host "[install-vscode] $msg" }

# Where VS Code stores user settings on Windows
$candidates = @(
  Join-Path $env:APPDATA 'Code\User\settings.json',
  Join-Path $env:APPDATA 'Code - Insiders\User\settings.json'
)

$settingsPath = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $settingsPath) {
  # If no existing file exists, use the stable path
  $settingsPath = Join-Path $env:APPDATA 'Code\User\settings.json'
  $dir = Split-Path $settingsPath -Parent
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Write-Log "No existing settings.json found. Will create: $settingsPath"
} else {
  Write-Log "Using existing settings file: $settingsPath"
}

# Backup current settings.json
$backupPath = "$settingsPath.bak.$((Get-Date).ToString('yyyyMMdd-HHmmss'))"
Copy-Item -Path $settingsPath -Destination $backupPath -Force -ErrorAction SilentlyContinue
Write-Log "Backed up existing settings to $backupPath"

# Read existing settings or create an empty object
try {
  $settingsText = Get-Content -Path $settingsPath -Raw -ErrorAction SilentlyContinue
  if ($null -eq $settingsText -or $settingsText.Trim().Length -eq 0) { $settings = @{} } else { $settings = $settingsText | ConvertFrom-Json -ErrorAction Stop }
} catch {
  Write-Log "Could not parse existing settings.json. Aborting to avoid corrupting settings."; exit 1
}

# Recommended settings to merge for this repository and global convenience
$recommended = @{
  "editor.defaultFormatter" = "esbenp.prettier-vscode"
  "editor.formatOnSave" = $true
  "editor.codeActionsOnSave" = @{ "source.fixAll.eslint" = $true }
  "eslint.validate" = @("javascript","javascriptreact","typescript","typescriptreact")
  "editor.formatOnSaveMode" = "modifications"
}

# Merge (shallow) — preserve existing values
foreach ($k in $recommended.Keys) {
  if (-not $settings.ContainsKey($k)) { $settings[$k] = $recommended[$k] } else { Write-Log "Skipping existing setting: $k" }
}

# Write merged settings back
$json = $settings | ConvertTo-Json -Depth 10
Set-Content -Path $settingsPath -Value $json -Encoding UTF8
Write-Log "Settings updated in $settingsPath"

# Install recommended extensions via the 'code' CLI
function Install-Extension($id) {
  $cmd = Get-Command code -ErrorAction SilentlyContinue
  if (-not $cmd) { Write-Log "VS Code CLI 'code' not found — please install it from the Command Palette (Shell Command: Install 'code' command in PATH)."; return }
  Write-Log "Installing extension: $id"
  & code --install-extension $id --force | Out-Null
}

Install-Extension 'dbaeumer.vscode-eslint'
Install-Extension 'esbenp.prettier-vscode'

Write-Log "Done — VS Code user settings and recommended extensions installed/merged. If you used a different product (Code - Insiders), check the corresponding settings.json path and adjust manually." 
