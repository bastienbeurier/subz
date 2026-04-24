const STORAGE_KEY = "gameVolume";

let _volume: number = 1;

if (typeof window !== "undefined") {
  const stored = parseFloat(localStorage.getItem(STORAGE_KEY) ?? "1");
  _volume = isNaN(stored) ? 1 : Math.max(0, Math.min(1, stored));
}

export function getVolume(): number {
  return _volume;
}

export function setVolumeLevel(v: number): void {
  _volume = Math.max(0, Math.min(1, v));
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, String(_volume));
    window.dispatchEvent(new CustomEvent("gamevolume", { detail: _volume }));
  }
}
