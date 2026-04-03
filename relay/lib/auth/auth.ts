const TOKEN_KEY = "vsremote_token";
const MACHINE_ID_KEY = "vsremote_machine_id";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000; // ms
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const expiry = getTokenExpiry(token);
  return expiry === null || expiry < Date.now();
}

export function getMachineId(): string | null {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(MACHINE_ID_KEY);
}

export function setMachineId(id: string): void {
  sessionStorage.setItem(MACHINE_ID_KEY, id);
}

export function clearMachineId(): void {
  sessionStorage.removeItem(MACHINE_ID_KEY);
}
