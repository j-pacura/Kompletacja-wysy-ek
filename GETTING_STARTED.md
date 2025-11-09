# 🚀 Getting Started - Warehouse Packing App

## Wymagania Wstępne

Przed uruchomieniem aplikacji upewnij się, że masz zainstalowane:

- **Node.js** v20.11.0 lub nowszy ([Pobierz tutaj](https://nodejs.org/))
- **npm** v10.2.4 lub nowszy (instaluje się automatycznie z Node.js)
- **Windows 10/11** (aplikacja jest przygotowana dla Windows)
- **Excel** (opcjonalnie - do tworzenia plików testowych)

## 📦 Instalacja

### 1. Sklonuj repozytorium (jeśli jeszcze tego nie zrobiłeś)

```bash
git clone <repository-url>
cd Kompletacja-wysy-ek
```

### 2. Zainstaluj dependencies

```bash
npm install
```

**Uwaga:** Instalacja może potrwać 5-10 minut, ponieważ Electron pobiera binaria (~100-150 MB).

Jeśli napotkasz błędy podczas instalacji:
- Upewnij się, że masz stabilne połączenie internetowe
- Spróbuj wyczyścić cache: `npm cache clean --force`
- Spróbuj ponownie: `npm install`

## 🎯 Uruchomienie w Trybie Development

Aplikacja wymaga uruchomienia **dwóch procesów równocześnie**:

### Opcja 1: Dwa terminale (Zalecane)

**Terminal 1 - Webpack Dev Server:**
```bash
npm run dev
```
Poczekaj aż zobaczysz: `webpack compiled successfully`

**Terminal 2 - Electron:**
```bash
npm run electron:dev
```

### Opcja 2: Jeden terminal (Windows - PowerShell)

```powershell
Start-Process npm -ArgumentList "run dev"
Start-Sleep -Seconds 10
npm run electron:dev
```

### Opcja 3: Jeden terminal (Windows - CMD)

```cmd
start cmd /k npm run dev
timeout /t 10
npm run electron:dev
```

## 📋 Testowanie Aplikacji

### Krok 1: Przygotuj plik Excel

Możesz użyć przykładowego pliku z folderu `examples/`:

1. Otwórz `examples/sample-parts.csv` w Excel
2. Zapisz jako `.xlsx`:
   - File → Save As → Excel Workbook (.xlsx)
   - Nazwa: `test-shipment.xlsx`

**Wymagany format Excel:**

| Kolumna | Nazwa | Wymagana | Przykład |
|---------|-------|----------|----------|
| A | SAP Index | ✅ | SAP-11111 |
| B | Description | ✅ | Śruba M8 ocynkowana |
| C | Quantity | ✅ | 50 |
| D | Unit | ✅ | szt |
| E | Country of Origin | ❌ | CN |

### Krok 2: Utwórz nową wysyłkę

1. Uruchom aplikację (instrukcje powyżej)
2. Kliknij **"Nowa Wysyłka"**
3. Wypełnij formularz:
   - Numer wysyłki: `WYS-001`
   - Miejsce docelowe: `Magazyn Warszawa`
   - Notatki: (opcjonalne)
4. Kliknij **"Dalej"**
5. Kliknij **"Wybierz Plik Excel"**
6. Wybierz plik `test-shipment.xlsx`
7. Sprawdź czy części zostały wczytane
8. Kliknij **"Dalej"**
9. Wybierz wymagania (opcjonalnie):
   - ☑ Pomiar Wagi
   - ☑ Kraj Pochodzenia
   - ☑ Zdjęcia
10. Kliknij **"Rozpocznij Pakowanie"**

### Krok 3: Ekran pakowania

Powinieneś zobaczyć:
- ✅ Nagłówek z numerem wysyłki i miejscem docelowym
- ✅ Progress bar (0/10 części)
- ✅ Pasek wyszukiwania
- ✅ Listę części "DO SPAKOWANIA"

## 🏗️ Build Produkcyjny

### Zbuduj aplikację do portable .exe

```bash
npm run electron:build
```

Plik wykonywalny znajdziesz w:
```
dist-electron/PakowanieApp-1.0.0-portable.exe
```

**Rozmiar:** ~150-200 MB (zawiera wszystko - Node.js, Electron, Chrome)

### Testowanie buildu produkcyjnego

1. Skopiuj `PakowanieApp-1.0.0-portable.exe` na pulpit
2. Uruchom (dwukrotne kliknięcie)
3. Aplikacja powinna uruchomić się bez instalacji

**Uwaga:** Windows SmartScreen może wyświetlić ostrzeżenie:
- Kliknij "More info"
- Kliknij "Run anyway"

## 🐛 Rozwiązywanie Problemów

### Błąd: "npm: command not found"
**Rozwiązanie:** Zainstaluj Node.js z [nodejs.org](https://nodejs.org/)

### Błąd: "Cannot find module 'electron'"
**Rozwiązanie:**
```bash
rm -rf node_modules package-lock.json
npm install
```

### Błąd: "Port 3000 is already in use"
**Rozwiązanie:**
1. Zatrzymaj wszystkie procesy Node.js
2. Spróbuj ponownie: `npm run dev`

Lub zmień port w `webpack.config.js` (linia ~27):
```javascript
devServer: {
  port: 3001,  // Zmień na inny port
}
```

### Aplikacja się nie otwiera w development mode
**Rozwiązanie:**
1. Upewnij się, że webpack dev server działa (Terminal 1)
2. Poczekaj na "webpack compiled successfully"
3. Dopiero wtedy uruchom `npm run electron:dev` (Terminal 2)

### Błąd podczas parsowania Excel
**Rozwiązanie:**
- Sprawdź czy plik ma rozszerzenie `.xlsx` lub `.xls`
- Sprawdź czy pierwsza linia to nagłówki
- Sprawdź czy kolumny A, B, C, D mają dane

### Baza danych nie działa
**Lokalizacja bazy danych:**
```
Windows: C:\Users\[USER]\AppData\Roaming\warehouse-packing-app\data\warehouse.db
```

**Reset bazy (uwaga: usunie wszystkie dane!):**
1. Zamknij aplikację
2. Usuń plik `warehouse.db`
3. Uruchom aplikację ponownie (baza zostanie odtworzona)

## 📊 Struktura Danych Aplikacji

```
AppData/Roaming/warehouse-packing-app/
├── data/
│   └── warehouse.db          # SQLite database
├── exports/                  # Wygenerowane raporty
│   └── [SHIPMENT_NUMBER]/
│       ├── raport.pdf
│       ├── dane.xlsx
│       ├── raport.html
│       └── photos/
└── logs/                     # Logi aplikacji (jeśli włączone)
```

## 🔥 Hot Reload w Development

W trybie development:
- **React:** Hot reload działa automatycznie (zmiany w `src/renderer/`)
- **Electron Main Process:** Wymaga restartu aplikacji (zmiany w `src/main/`)

Aby zrestartować Electron:
1. Zamknij aplikację (Alt+F4 lub zamknij okno)
2. W terminalu 2 uruchom ponownie: `npm run electron:dev`

## 📚 Następne Kroki

Po udanym uruchomieniu aplikacji, następne funkcje do implementacji:

1. ✅ **GOTOWE:** Tworzenie wysyłek i import Excel
2. 🚧 **TERAZ:** Skanowanie QR i pakowanie części
3. ⏳ **PÓŹNIEJ:**
   - Integracja z wagą Radwag (RS-232)
   - Robienie zdjęć (WebRTC)
   - Generowanie raportów (PDF, Excel, HTML)
   - Statystyki i osiągnięcia

## 💡 Wskazówki

- **Używaj Ctrl+Shift+I** aby otworzyć DevTools w aplikacji
- **Sprawdź Console** w DevTools jeśli coś nie działa
- **Logi IPC** w DevTools pokażą komunikację z main process
- **Database viewer:** Możesz otworzyć `warehouse.db` w [DB Browser for SQLite](https://sqlitebrowser.org/)

## 🆘 Potrzebujesz Pomocy?

1. Sprawdź logi w konsoli (DevTools)
2. Sprawdź logi Electron w terminalu
3. Sprawdź sekcję "Rozwiązywanie Problemów" powyżej
4. Otwórz issue na GitHubie z opisem problemu i logami

---

**Powodzenia! 🚀**
