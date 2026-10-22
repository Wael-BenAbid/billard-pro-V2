# ============================================
# Sauvegarde la base de données du conteneur dans backups\
# Usage : powershell -ExecutionPolicy Bypass -File scripts\backup-db.ps1
# ============================================
# Les commandes docker écrivent parfois des avertissements sur stderr : avec 'Stop',
# PowerShell 5.1 les traiterait comme des erreurs. On vérifie $LASTEXITCODE à la place.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

$stamp = Get-Date -Format 'yyyy-MM-dd_HH-mm'
New-Item -ItemType Directory -Force backups | Out-Null
$target = "backups\billard_$stamp.sqlite3"

# ".backup" donne une copie cohérente même pendant l'utilisation (mode WAL)
docker exec billarde sqlite3 /app/data/db.sqlite3 ".backup '/tmp/backup.sqlite3'" 2>$null
if ($LASTEXITCODE -ne 0) { throw "Sauvegarde impossible : le conteneur billarde tourne-t-il ?" }
docker cp billarde:/tmp/backup.sqlite3 $target
if ($LASTEXITCODE -ne 0) { throw "Copie de la sauvegarde impossible" }
docker exec billarde rm -f /tmp/backup.sqlite3

Write-Host "Sauvegarde créée : $target ($([math]::Round((Get-Item $target).Length / 1KB)) Ko)" -ForegroundColor Green
