# Warehouse Packing Application

Profesjonalna aplikacja desktopowa do pakowania wysyłek magazynowych.

## 🚀 Funkcje

- ✅ Offline-first (działa bez internetu)
- ✅ Skanowanie QR kodów
- ✅ Integracja z wagą Radwag (RS-232)
- ✅ Robienie zdjęć podczas pakowania
- ✅ Generowanie raportów (PDF, Excel, HTML)
- ✅ Spotify-style UI/UX
- ✅ Język polski

## 🛠️ Stack Technologiczny

- **Electron 33** - Framework desktopowy
- **React 18** - UI framework
- **TypeScript 5** - Strict mode
- **SQLite** - Lokalna baza danych
- **Tailwind CSS** - Styling
- **Zustand** - State management

## 📦 Instalacja

```bash
# Zainstaluj dependencies
npm install

# Uruchom w trybie development
npm run dev

# W drugim terminalu uruchom Electron
npm run electron:dev

# Build produkcyjny (portable .exe)
npm run electron:build
```

## 📁 Struktura Projektu

```
warehouse-packing-app/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.ts
│   │   └── database.ts
│   ├── renderer/              # React application
│   │   ├── components/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── App.tsx
│   └── shared/                # Shared code
├── database/
│   └── schema.sql
├── resources/
└── package.json
```

## 🎯 Status Rozwoju

### ✅ Ukończone
- [x] Setup projektu i konfiguracja
- [x] Struktura Electron + React
- [x] Baza danych SQLite
- [x] Dashboard (główny ekran)
- [x] TypeScript types i interfaces

### 🚧 W trakcie
- [ ] Tworzenie nowych wysyłek
- [ ] Import z plików Excel
- [ ] Ekran pakowania
- [ ] Integracja ze skanerami QR
- [ ] Integracja z wagą Radwag
- [ ] Robienie zdjęć
- [ ] Generowanie raportów

### 📅 Planowane
- [ ] Statystyki i osiągnięcia
- [ ] Eksport na dysk sieciowy
- [ ] Voice feedback
- [ ] Auto-save

## 🔧 Konfiguracja

### Waga Radwag
- Port: RS-232 (COM)
- Baud rate: 9600
- Data bits: 8, Parity: None, Stop bits: 1

### Skaner QR
- Tryb: Keyboard wedge
- Auto-Enter: Włączony

## 📝 Licencja

MIT

## 👨‍💻 Autor

Warehouse Team
