export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

export const LOCAL_AUTH_USER_KEY = "erp-local-auth-user";
export const RUNTIME_USER_INFO_KEY = "manus-runtime-user-info";

type LocalAuthUser = {
  id?: number | string | null;
  companyId?: number | string | null;
  [key: string]: unknown;
};

export const clearLocalAuthState = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_AUTH_USER_KEY);
  localStorage.removeItem(RUNTIME_USER_INFO_KEY);
};

export const readLocalAuthUser = (): LocalAuthUser | null => {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(LOCAL_AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as LocalAuthUser | null;
    const userId = Number(parsed?.id || 0);
    if (!(userId > 0)) {
      clearLocalAuthState();
      return null;
    }
    return parsed;
  } catch {
    clearLocalAuthState();
    return null;
  }
};

export const writeRuntimeUserInfo = (user: unknown) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(RUNTIME_USER_INFO_KEY, JSON.stringify(user ?? null));
};

// Generate login URL at runtime so redirect URI reflects the current origin.
export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;

  // If OAuth is not configured, use local login page.
  if (!oauthPortalUrl || !appId) {
    return `${window.location.origin}/login`;
  }

  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  try {
    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return window.location.href;
  }
};
