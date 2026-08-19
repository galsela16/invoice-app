/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// ── Google Identity Services (token flow) — טיפוסים מינימליים ──
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  error?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: GoogleTokenResponse) => void;
    error_callback?: (err: unknown) => void;
  }) => GoogleTokenClient;
  revoke: (token: string, done?: () => void) => void;
}

interface Window {
  google?: {
    accounts: {
      oauth2: GoogleAccountsOAuth2;
    };
  };
}
