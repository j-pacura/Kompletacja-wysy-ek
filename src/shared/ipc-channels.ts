// IPC Channel names for communication between main and renderer processes

export const IPC_CHANNELS = {
  // Database operations
  DB_QUERY: 'db:query',
  DB_EXECUTE: 'db:execute',
  DB_GET_SHIPMENTS: 'db:get-shipments',
  DB_GET_SHIPMENT: 'db:get-shipment',
  DB_CREATE_SHIPMENT: 'db:create-shipment',
  DB_UPDATE_SHIPMENT: 'db:update-shipment',
  DB_DELETE_SHIPMENT: 'db:delete-shipment',
  DB_ARCHIVE_SHIPMENT: 'db:archive-shipment',
  DB_GET_PARTS: 'db:get-parts',
  DB_UPDATE_PART: 'db:update-part',
  DB_SAVE_PHOTO: 'db:save-photo',
  DB_GET_PHOTOS: 'db:get-photos',
  DB_DELETE_PHOTO: 'db:delete-photo',
  DB_GET_SETTINGS: 'db:get-settings',
  DB_UPDATE_SETTING: 'db:update-setting',
  DB_GET_STATS: 'db:get-stats',
  DB_UPDATE_STATS: 'db:update-stats',

  // User operations
  DB_GET_USERS: 'db:get-users',
  DB_CREATE_USER: 'db:create-user',
  DB_LOGIN_USER: 'db:login-user',
  DB_DELETE_USER: 'db:delete-user',
  DB_CHANGE_PASSWORD: 'db:change-password',
  DB_RESET_USER_PASSWORD: 'db:reset-user-password',

  // Scale operations
  SCALE_CONNECT: 'scale:connect',
  SCALE_DISCONNECT: 'scale:disconnect',
  SCALE_GET_WEIGHT: 'scale:get-weight',
  SCALE_ZERO: 'scale:zero',
  SCALE_TARE: 'scale:tare',
  SCALE_LIST_PORTS: 'scale:list-ports',

  // File operations
  FILE_SELECT_EXCEL: 'file:select-excel',
  FILE_PARSE_EXCEL: 'file:parse-excel',
  FILE_SELECT_FOLDER: 'file:select-folder',
  FILE_EXPORT_PDF: 'file:export-pdf',
  FILE_EXPORT_EXCEL: 'file:export-excel',
  FILE_EXPORT_HTML: 'file:export-html',
  FILE_EXPORT_ALL: 'file:export-all',
  FILE_OPEN_FOLDER: 'file:open-folder',

  // OCR operations
  OCR_PROCESS_IMAGE: 'ocr:process-image',
  OCR_SAVE_SN_PHOTO: 'ocr:save-sn-photo',

  // App operations
  APP_GET_PATH: 'app:get-path',
  APP_GET_VERSION: 'app:get-version',

  // Notifications
  NOTIFICATION_SEND: 'notification:send',
} as const;

export type IPCChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS];
