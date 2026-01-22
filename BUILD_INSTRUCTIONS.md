# Instrukcje Tworzenia Buildu

## Metoda 1: Automatyczny Build przez GitHub Actions (Zalecane)

### Krok 1: Wypchnij kod na GitHub
```bash
git add .
git commit -m "Add build workflow"
git push origin claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6
```

### Krok 2: Uruchom build ręcznie
1. Przejdź do swojego repo na GitHub
2. Kliknij zakładkę **Actions**
3. Wybierz workflow **"Build Windows Portable"** z lewej strony
4. Kliknij przycisk **"Run workflow"** (po prawej)
5. Wybierz branch: `claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6`
6. Kliknij **"Run workflow"**

### Krok 3: Pobierz zbudowany plik
- Build trwa ~5-10 minut
- Po zakończeniu, kliknij na nazwę buildu
- Przewiń w dół do sekcji **"Artifacts"**
- Pobierz `asystent-pakowania-portable.zip`
- Rozpakuj i uruchom `.exe`

## Metoda 2: Build z Tagiem (Release)

Jeśli chcesz stworzyć oficjalny release:

```bash
# Utwórz tag z wersją
git tag v1.0.0

# Wypchnij tag
git push origin v1.0.0
```

GitHub Actions automatycznie:
- Zbuduje aplikację
- Stworzy Release na GitHub
- Doda plik .exe do Release

## Metoda 3: Lokalny Build (jeśli GitHub Actions nie działa)

Na komputerze z Windows:

```powershell
# 1. Zainstaluj zależności
npm install

# 2. Zbuduj main process
npm run build:main

# 3. Zbuduj renderer
npm run build

# 4. Zbuduj Electron portable
npm run electron:build
```

Plik .exe będzie w folderze `dist-electron/`

## Rozwiązywanie Problemów

### Problem: "windows-media-ocr" nie kompiluje się
**Rozwiązanie:** Na razie OCR i tak nie działa dobrze, możesz go tymczasowo wyłączyć:
- Zakomentuj `import { ocr } from 'windows-media-ocr';` w `src/main/index.ts`
- Zakomentuj kod OCR w handlerze

### Problem: Build trwa bardzo długo
**Rozwiązanie:** Normalne - Sharp i inne native dependencies potrzebują czasu na kompilację

### Problem: Brak uprawnień na GitHub
**Rozwiązanie:** Upewnij się, że masz uprawnienia do Actions w Settings → Actions → General → Allow all actions
