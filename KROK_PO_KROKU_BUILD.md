# KROK PO KROKU - Jak Zbudować Program

## ⚠️ NAJPROSTSZA METODA - Lokalny Build (ZALECANE NA START)

Jeśli masz problem z GitHub Actions, po prostu zbuduj lokalnie:

### Na Twoim Komputerze Windows:

```powershell
# 1. Otwórz PowerShell w folderze projektu
cd C:\sciezka\do\Kompletacja-wysy-ek

# 2. Upewnij się że masz najnowszy kod
git pull origin claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6

# 3. Zainstaluj zależności (tylko raz)
npm install

# 4. Zbuduj program (to może trwać 5-10 minut)
npm run build:main
npm run build
npm run electron:build
```

**Gotowe!** Plik `.exe` będzie w folderze: `dist-electron\`

Nazwa pliku: `Asystent Pakowania-1.0.0-portable.exe`

---

## 🔧 GitHub Actions - Instrukcja Krok po Kroku

Jeśli mimo wszystko chcesz użyć GitHub:

### KROK 1: Sprawdź czy Actions są włączone

1. Przejdź na GitHub.com do swojego repo
2. Kliknij **Settings** (górny pasek, ostatnia ikona koła zębatego)
3. Z lewego menu wybierz **Actions** → **General**
4. Upewnij się że zaznaczone jest:
   - ✅ "Allow all actions and reusable workflows"
5. Przewiń w dół i kliknij **Save**

### KROK 2: Znajdź zakładkę Actions

1. Wróć do głównej strony repo (kliknij nazwę repo u góry)
2. **U GÓRY** zobaczysz zakładki:
   ```
   < > Code    Issues    Pull requests    Actions    Projects    ...
   ```
3. Kliknij **Actions**

### KROK 3: Jeśli NIE WIDZISZ zakładki Actions

To znaczy że Actions są wyłączone. Zrób to:

1. Settings → Actions → General
2. Zaznacz "Allow all actions and reusable workflows"
3. Save
4. Odśwież stronę

### KROK 4: Uruchom Workflow

Gdy jesteś w zakładce Actions:

1. **Z LEWEJ STRONY** zobaczysz listę workflows:
   ```
   All workflows
   ↓
   Build Windows Portable   ← KLIKNIJ TO
   ```

2. Po kliknięciu "Build Windows Portable", PO PRAWEJ zobaczysz:
   ```
   This workflow has a workflow_dispatch event trigger.
   
   [Run workflow ▼]   ← KLIKNIJ TEN PRZYCISK
   ```

3. Rozwinie się menu:
   ```
   Use workflow from
   Branch: [main ▼]    ← Zmień na: claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6
   
   [Run workflow]      ← KLIKNIJ
   ```

### KROK 5: Poczekaj na Build

1. Zobaczysz żółty kółko wirujące - znaczy że się buduje
2. Trwa to ~5-10 minut
3. Gdy skończy:
   - ✅ Zielony ptaszek = sukces
   - ❌ Czerwony X = błąd

### KROK 6: Pobierz Plik

1. Kliknij na nazwę buildu (np. "feat: Add GitHub Actions...")
2. Przewiń W DÓŁ do sekcji **Artifacts**
3. Zobaczysz:
   ```
   Artifacts
   📦 asystent-pakowania-portable   [Download]
   ```
4. Kliknij Download
5. Rozpakuj ZIP
6. Wewnątrz znajdziesz `.exe`

---

## 🚨 Rozwiązywanie Problemów

### Problem: "Nie widzę zakładki Actions"
**Rozwiązanie:**
- Settings → Actions → General
- Zaznacz "Allow all actions"
- Save i odśwież

### Problem: "Nie widzę workflow 'Build Windows Portable'"
**Rozwiązanie:**
Workflow może nie być na głównym branchu. Zrób tak:

```bash
# Zmerguj do maina
git checkout main
git merge claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6
git push origin main
```

Potem workflow pojawi się w Actions.

### Problem: "Build się nie udał (czerwony X)"
**Rozwiązanie:**
Kliknij na czerwony X i zobacz logi. Prawdopodobnie:
- `windows-media-ocr` nie zadziałał
- Możesz go tymczasowo wyłączyć

### Problem: "GitHub Actions w ogóle nie działa"
**Rozwiązanie:**
Użyj lokalnego buildu (instrukcja na górze) - to tak samo dobry plik .exe

---

## 📝 Szybkie Polecenia

### Lokalny Build:
```powershell
npm install
npm run build:main && npm run build && npm run electron:build
```

### Plik znajduje się w:
```
dist-electron\Asystent Pakowania-1.0.0-portable.exe
```

### Testowanie przed buildem:
```powershell
# Terminal 1
npm run build:main

# Terminal 2  
npm run dev

# Terminal 3
npm run electron:dev
```

---

## ✅ Co Zrobić z Gotowym .exe

1. **Skopiuj** plik `.exe` na pendrive
2. **Zanieś do pracy**
3. **Uruchom** na komputerze roboczym
4. Program **nie wymaga instalacji** - kliknij i działa!
5. Wszystkie dane (baza, zdjęcia) zapisują się w:
   ```
   C:\Users\[TwojaNazwa]\AppData\Roaming\asystent-pakowania\
   ```

---

Jeśli dalej masz problem, powiedz mi:
1. Co dokładnie widzisz na ekranie?
2. Czy widzisz zakładkę "Actions"?
3. Czy wolisz po prostu zbudować lokalnie?
