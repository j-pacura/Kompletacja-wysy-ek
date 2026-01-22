# Skrypt do zbudowania Asystenta Pakowania
# Uruchom w PowerShell: .\build-local.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Asystent Pakowania - Lokalny Build  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Sprawdź czy Node.js jest zainstalowany
Write-Host "Sprawdzam Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js zainstalowany: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js NIE jest zainstalowany!" -ForegroundColor Red
    Write-Host "  Pobierz z: https://nodejs.org/" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host ""

# Sprawdź czy npm jest zainstalowany
Write-Host "Sprawdzam npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version
    Write-Host "✓ npm zainstalowany: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ npm NIE jest zainstalowany!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Krok 1: Instalacja zależności
Write-Host "[1/4] Instalacja zależności..." -ForegroundColor Yellow
Write-Host "      (To może potrwać kilka minut)" -ForegroundColor Gray
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Błąd instalacji zależności!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✓ Zależności zainstalowane" -ForegroundColor Green
Write-Host ""

# Krok 2: Build main process
Write-Host "[2/4] Budowanie main process..." -ForegroundColor Yellow
npm run build:main
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Błąd budowania main process!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✓ Main process zbudowany" -ForegroundColor Green
Write-Host ""

# Krok 3: Build renderer
Write-Host "[3/4] Budowanie renderer..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Błąd budowania renderer!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✓ Renderer zbudowany" -ForegroundColor Green
Write-Host ""

# Krok 4: Build Electron portable
Write-Host "[4/4] Budowanie Electron portable..." -ForegroundColor Yellow
Write-Host "      (To może potrwać 5-10 minut)" -ForegroundColor Gray
npm run electron:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Błąd budowania Electron!" -ForegroundColor Red
    pause
    exit 1
}
Write-Host "✓ Electron portable zbudowany" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Green
Write-Host "           BUILD ZAKOŃCZONY!           " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Znajdź plik .exe
$exePath = Get-ChildItem -Path "dist-electron" -Filter "*.exe" | Select-Object -First 1
if ($exePath) {
    Write-Host "Plik .exe znajduje się w:" -ForegroundColor Cyan
    Write-Host "  $($exePath.FullName)" -ForegroundColor White
    Write-Host ""
    Write-Host "Otwórz folder?" -ForegroundColor Yellow
    $openFolder = Read-Host "Wpisz 't' aby otworzyć folder (lub Enter aby pominąć)"
    if ($openFolder -eq "t" -or $openFolder -eq "T") {
        explorer "dist-electron"
    }
} else {
    Write-Host "Nie znaleziono pliku .exe w dist-electron/" -ForegroundColor Red
}

Write-Host ""
Write-Host "Naciśnij Enter aby zakończyć..." -ForegroundColor Gray
pause
