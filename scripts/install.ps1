# ============================================
# Installe ou met à jour Billard Pro sur ce PC (Docker)
# Usage (dans le dossier du projet) :
#   powershell -ExecutionPolicy Bypass -File scripts\install.ps1
# ============================================
# Les commandes docker écrivent parfois des avertissements sur stderr : avec 'Stop',
# PowerShell 5.1 les traiterait comme des erreurs. On vérifie $LASTEXITCODE à la place.
$ErrorActionPreference = 'Continue'
Set-Location (Split-Path $PSScriptRoot -Parent)

# --- 1. Docker est-il prêt ? ---
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker n'est pas installé. Installez Docker Desktop : https://www.docker.com/products/docker-desktop/"
}
docker info 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Docker Desktop n'est pas démarré. Lancez-le, attendez qu'il soit prêt, puis relancez ce script."
}

# --- 2. Fichier .env (créé une seule fois) ---
if (-not (Test-Path .env)) {
    Write-Host "Création du fichier .env..." -ForegroundColor Cyan

    # Clé secrète aléatoire
    $bytes = New-Object byte[] 48
    [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes) -replace '[+/=]', ''

    # Adresses autorisées : localhost + IP(s) de ce PC sur le réseau local (accès depuis tablette/téléphone)
    $ips = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
        Select-Object -ExpandProperty IPAddress
    $hosts = (@('localhost', '127.0.0.1') + $ips) -join ','

    $content = (Get-Content .env.example) `
        -replace '^# Copier ce fichier en \.env puis remplir les valeurs', '# Configuration Docker - NE PAS COMMITER (généré par scripts\install.ps1)' `
        -replace '^DJANGO_SECRET_KEY=.*', "DJANGO_SECRET_KEY=$secret" `
        -replace '^ALLOWED_HOSTS=.*', "ALLOWED_HOSTS=$hosts"
    # UTF-8 sans BOM (docker compose ne lit pas le BOM)
    [IO.File]::WriteAllLines((Join-Path (Get-Location) '.env'), $content, (New-Object Text.UTF8Encoding $false))
    Write-Host "  .env créé (adresses autorisées : $hosts)"
} else {
    Write-Host ".env déjà présent : conservé." -ForegroundColor DarkGray
}

# --- 3. Construction et démarrage ---
Write-Host "Construction et démarrage du conteneur (quelques minutes la première fois)..." -ForegroundColor Cyan
docker compose up -d --build 2>&1 | ForEach-Object { "$_" }
if ($LASTEXITCODE -ne 0) { throw "Échec de docker compose. Le port 80 est peut-être déjà utilisé : changez HOST_PORT dans .env." }

# --- 4. Attendre que l'application réponde ---
$port = ((Get-Content .env | Where-Object { $_ -match '^HOST_PORT=' }) -replace 'HOST_PORT=', '')
if (-not $port) { $port = '80' }
$ready = $false
for ($i = 0; $i -lt 60 -and -not $ready; $i++) {
    Start-Sleep -Seconds 2
    try { Invoke-WebRequest "http://localhost:$port/api/" -UseBasicParsing -TimeoutSec 3 | Out-Null }
    catch { if ($_.Exception.Response.StatusCode.value__ -eq 401) { $ready = $true } }
}
if (-not $ready) { throw "L'application ne répond pas. Voir : docker logs billarde" }

# --- 5. Résumé ---
$url = if ($port -eq '80') { 'http://localhost' } else { "http://localhost:$port" }
Write-Host ""
Write-Host "Billard Pro est prêt : $url" -ForegroundColor Green
$generated = docker logs billarde 2>&1 | Select-String 'Generated password' | Select-Object -Last 1
if ($generated) {
    Write-Host "Compte admin créé. $generated" -ForegroundColor Yellow
    Write-Host "Notez ce mot de passe : il n'est affiché qu'à la première installation." -ForegroundColor Yellow
}
