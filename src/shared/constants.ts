// Application constants

export const APP_NAME = 'PakowanieApp';
export const APP_VERSION = '1.0.0';

// Database
export const DB_NAME = 'warehouse.db';

// Autosave interval in milliseconds
export const AUTOSAVE_INTERVAL = 2 * 60 * 1000; // 2 minutes

// Image compression settings
export const IMAGE_MAX_WIDTH = 1920;
export const IMAGE_MAX_HEIGHT = 1080;
export const IMAGE_QUALITY = 75;
export const THUMBNAIL_MAX_WIDTH = 400;
export const THUMBNAIL_MAX_HEIGHT = 300;
export const THUMBNAIL_QUALITY = 60;

// Scale settings
export const SCALE_BAUD_RATE = 9600;
export const SCALE_DATA_BITS = 8;
export const SCALE_STOP_BITS = 1;
export const SCALE_PARITY = 'none' as const;

// Quick countries for country selector
export const QUICK_COUNTRIES = [
  { code: 'CN', name: 'China', key: '1' },
  { code: 'US', name: 'United States', key: '2' },
  { code: 'DE', name: 'Germany', key: '3' },
  { code: 'JP', name: 'Japan', key: '4' },
  { code: 'PL', name: 'Poland', key: '5' },
  { code: 'IT', name: 'Italy', key: '6' },
  { code: 'FR', name: 'France', key: '7' },
] as const;

// Achievements
export const ACHIEVEMENTS = [
  {
    id: 'first_shipment',
    name: '🎉 Pierwsze Pakowanie',
    description: 'Skompletuj swoją pierwszą wysyłkę',
  },
  {
    id: 'speed_demon',
    name: '⚡ Demon Prędkości',
    description: 'Spakuj część w mniej niż 15 sekund',
  },
  {
    id: 'century',
    name: '💯 Setka',
    description: 'Spakuj 100 części',
  },
  {
    id: 'perfect_day',
    name: '🌟 Perfekcyjny Dzień',
    description: 'Skompletuj 5 wysyłek w jeden dzień',
  },
  {
    id: 'heavyweight',
    name: '🏋️ Ciężarowiec',
    description: 'Spakuj część ważącą ponad 50kg',
  },
  {
    id: 'marathon',
    name: '🏃 Maraton',
    description: 'Spakuj wysyłkę z ponad 200 pozycjami',
  },
  {
    id: 'streak_7',
    name: '🔥 Seria 7 Dni',
    description: 'Pakuj przez 7 dni z rzędu',
  },
] as const;
