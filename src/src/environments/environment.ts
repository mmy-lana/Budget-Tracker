export const environment = {
  production: false,
  firebase: {
    apiKey: process.env['NG_APP_FIREBASE_API_KEY'], 
    authDomain: process.env['NG_APP_FIREBASE_AUTH_DOMAIN'],
    databaseURL: process.env['NG_APP_FIREBASE_DATABASE_URL'],
    projectId: process.env['NG_APP_FIREBASE_PROJECT_ID'],
    messagingSenderId: process.env['NG_APP_FIREBASE_MESSAGING_SENDER_ID'],
    appId: process.env['NG_APP_FIREBASE_APP_ID']
  },
  telegramBotToken: process.env['NG_APP_TELEGRAM_BOT_TOKEN'], 
  authorizedChatIds: process.env['NG_APP_TELEGRAM_AUTHORIZED_CHAT_IDS']?.split(',') || []
};