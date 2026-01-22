# 🎯 JAK POBRAĆ .EXE Z GITHUB (W PRACY)

## Metoda 1: GitHub Actions Build (Zalecane)

### Krok 1: Zaloguj się na GitHub
1. W pracy, otwórz przeglądarkę
2. Wejdź na: **github.com**
3. Zaloguj się na swoje konto

### Krok 2: Przejdź do swojego repo
1. Kliknij swoją ikonę (prawy górny róg)
2. Wybierz **"Your repositories"**
3. Znajdź i kliknij: **"Kompletacja-wysy-ek"**

### Krok 3: Uruchom Build
1. Kliknij zakładkę **"Actions"** (u góry)
2. **Jeśli NIE WIDZISZ zakładki Actions:**
   - Kliknij **Settings** (koło zębate)
   - Z lewej: **Actions** → **General**
   - Zaznacz: **"Allow all actions and reusable workflows"**
   - Kliknij **Save**
   - Wróć do głównej strony repo

3. **Po wejściu w Actions:**
   - Z LEWEJ strony zobaczysz: **"Build Windows Portable"**
   - Kliknij na to

4. **Po prawej stronie** zobaczysz:
   ```
   This workflow has a workflow_dispatch event trigger.
   
   [Run workflow ▼]    ← KLIKNIJ TEN PRZYCISK
   ```

5. Rozwinie się menu:
   ```
   Use workflow from
   Branch: [main ▼]    ← Zmień na: claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6
   
   [Run workflow]      ← KLIKNIJ
   ```

### Krok 4: Poczekaj na Build (5-10 minut)
1. Zobaczysz żółte kółko ⚠️ - znaczy że się buduje
2. Możesz zamknąć kartę - build działa w tle
3. Po 5-10 minutach wróć i odśwież stronę
4. Zobaczysz ✅ zielony ptaszek = sukces

### Krok 5: Pobierz .exe
1. Kliknij na nazwę buildu (np. "feat: Add GitHub Actions...")
2. **Przewiń W DÓŁ** do sekcji **"Artifacts"**
3. Zobaczysz:
   ```
   Artifacts
   📦 asystent-pakowania-portable    [Download]    ← KLIKNIJ
   ```
4. Pobierze się plik ZIP
5. **Rozpakuj ZIP** - wewnątrz znajdziesz `.exe`

---

## Metoda 2: Bezpośredni Link (Jeśli Release istnieje)

### Krok 1: Wejdź na GitHub
1. Zaloguj się na GitHub
2. Przejdź do: **github.com/j-pacura/Kompletacja-wysy-ek**
   (Zastąp "j-pacura" swoją nazwą użytkownika)

### Krok 2: Przejdź do Releases
1. Po prawej stronie zobaczysz sekcję **"Releases"**
2. Kliknij **"Releases"** lub **"v1.0.0"** (jeśli widoczne)

### Krok 3: Pobierz
1. Zobaczysz listę plików:
   ```
   Assets
   ▾ Asystent Pakowania-1.0.0-portable.exe    ← KLIKNIJ
   ```
2. Plik się pobierze
3. **Gotowe!** Możesz uruchomić

---

## Metoda 3: Szybki Link (Skopiuj i Wklej w Pracy)

Zastąp `TWOJA-NAZWA` swoją nazwą użytkownika GitHub:

```
https://github.com/TWOJA-NAZWA/Kompletacja-wysy-ek/releases/latest
```

Przykład:
```
https://github.com/j-pacura/Kompletacja-wysy-ek/releases/latest
```

---

## ⚠️ Jeśli Antywirus Blokuje

### Windows Defender / McAfee / Inne:
1. Kliknij prawym na plik .exe
2. Wybierz **"Właściwości"**
3. Na dole zaznacz: **"Odblokuj"** (Unblock)
4. Kliknij **Zastosuj** i **OK**
5. Uruchom ponownie

### Jeśli Dalej Blokuje:
1. Poproś IT o dodanie do whitelist
2. Lub uruchom jako Administrator:
   - Kliknij prawym na .exe
   - **"Uruchom jako administrator"**

---

## 📋 Szybka Ściąga

1. **github.com** → Zaloguj się
2. **Twoje repo** → Kompletacja-wysy-ek
3. **Actions** → Build Windows Portable
4. **Run workflow** → Wybierz branch: `claude/review-project-docs-01Tvw9zEsFxZsBPKhS5rTJD6`
5. **Poczekaj 10 min** → Odśwież
6. **Kliknij build** → Przewiń w dół → **Artifacts** → Download
7. **Rozpakuj ZIP** → Uruchom .exe

---

## 🎁 Bonus: Instalacja na Wielu Komputerach

Program jest **portable** - wystarczy skopiować .exe:
1. Pobierz .exe na jednym komputerze
2. Skopiuj na dysk sieciowy / pendrive
3. Skopiuj na inne komputery
4. Uruchom na każdym (bez instalacji!)

**Uwaga:** Każdy komputer będzie miał swoją bazę danych lokalnie.
Jeśli chcesz współdzieloną bazę - użyj "Niestandardowa lokalizacja" podczas tworzenia wysyłki i wskaż dysk sieciowy.

---

## 🆘 Pomoc

Jeśli coś nie działa:
1. Sprawdź czy Actions są włączone (Settings → Actions → Allow all)
2. Sprawdź czy build się zakończył sukcesem (zielony ✅)
3. Sprawdź czy Artifacts są widoczne (przewiń w dół)
4. Sprawdź antywirus (może blokować pobieranie .exe)

---

**Powodzenia!** 🚀
