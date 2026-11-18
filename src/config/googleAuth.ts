import googleOauthConfig from './google-oauth.json';

export interface GoogleOAuthConfig {
  clientId: string;
  projectId: string;
  authUri: string;
  tokenUri: string;
  javascriptOrigins: string[];
}

export const GOOGLE_AUTH_CONFIG: GoogleOAuthConfig = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || googleOauthConfig.web.client_id,
  projectId: import.meta.env.VITE_GOOGLE_PROJECT_ID || googleOauthConfig.web.project_id,
  authUri: googleOauthConfig.web.auth_uri,
  tokenUri: googleOauthConfig.web.token_uri,
  javascriptOrigins: googleOauthConfig.web.javascript_origins,
};

export interface GoogleUserProfile {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

// Decode standard Google JWT credential safely
export function parseJwt(token: string): GoogleUserProfile | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const parsed = JSON.parse(jsonPayload);
    return {
      email: parsed.email || '',
      name: parsed.name || parsed.email.split('@')[0],
      picture: parsed.picture,
      sub: parsed.sub,
    };
  } catch (err) {
    console.error('Failed to parse Google JWT:', err);
    return null;
  }
}
