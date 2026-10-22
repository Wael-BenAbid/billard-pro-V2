# ============================================
# Restaure une sauvegarde dans le conteneur (REMPLACE les données actuelles)
# Usage : powershell -ExecutionPolicy Bypass -File scripts\restore-db.ps1 backups\billard_2026-10-22_14-30.sqlite3
# ============================================
param([Parameter(Mandatory = $true)][string]$File)
# Les commandes docker écrivent parfois des avertissements sur stderr : avec 'Stop',
# PowerShell 5.1 les traiterait comme des erreurs. On vérifie $LASTEXITCODE à la place.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Test-Path $File)) { throw "Fichier introuvable : $File" }

$answer = Read-Host "Les données actuelles de l'application seront REMPLACÉES par '$File'. Continuer ? (oui/non)"
if ($answer -ne 'oui') { Write-Host 'Annulé.'; exit 0 }

docker cp $File billarde:/tmp/restore.sqlite3
if ($LASTEXITCODE -ne 0) { throw "Copie impossible : le conteneur billarde tourne-t-il ?" }
$check = docker exec billarde sqlite3 /tmp/restore.sqlite3 'PRAGMA integrity_check;'
if ($check -ne 'ok') {
    docker exec billarde rm -f /tmp/restore.sqlite3
    throw "Le fichier n'est pas une base SQLite valide ($check)"
}

# Arrêter Django, remplacer la base, redémarrer (les migrations s'appliquent au démarrage)
docker exec billarde supervisorctl stop django | Out-Null
docker exec billarde sh -c 'rm -f /app/data/db.sqlite3-wal /app/data/db.sqlite3-shm && mv /tmp/restore.sqlite3 /app/data/db.sqlite3'
if ($LASTEXITCODE -ne 0) { docker exec billarde supervisorctl start django | Out-Null; throw "Remplacement de la base impossible" }
docker exec billarde supervisorctl start django | Out-Null

Write-Host "Base restaurée depuis $File" -ForegroundColor Green
