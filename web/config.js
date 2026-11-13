// Where the web app finds the backend. Leave apiBase empty to run without accounts (prototype mode).
window.FS_CONFIG = {
  apiBase: '',          // e.g. 'http://localhost:8001' locally, or your deployed API URL
  googleClientId: '',   // same OAuth client ID as GOOGLE_CLIENT_ID in the backend .env
  devLogin: false,      // true only locally (needs DEV_LOGIN=true on the backend)
};
