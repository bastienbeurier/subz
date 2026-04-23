const KEY = "subz_device";

export function getDeviceToken(): string {
  if (typeof window === "undefined") return "";
  let token = localStorage.getItem(KEY);
  if (!token) {
    token = crypto.randomUUID();
    localStorage.setItem(KEY, token);
  }
  return token;
}
