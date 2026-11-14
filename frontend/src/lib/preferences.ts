"use client";

// 🎛️ Display settings, saved in this browser (Settings screen).
//   theme:    light | dark | system (follow the device)
//   textSize: standard | large | xlarge
//   motion:   full | reduced
// Each one is mirrored onto <html data-theme / data-text-size / data-motion>
// so globals.css can react, and applied before first paint by prefsInitScript.

import { useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export type TextSize = "standard" | "large" | "xlarge";
export type MotionPref = "full" | "reduced";

export interface Preferences {
  theme: ThemePref;
  textSize: TextSize;
  motion: MotionPref;
}

const KEY = "fixflow-prefs";
const DEFAULTS: Preferences = { theme: "system", textSize: "standard", motion: "full" };

// Runs in <head> before the page paints, so there's no flash of the wrong theme.
export const prefsInitScript = `(function(){var d=document.documentElement,p={};try{p=JSON.parse(localStorage.getItem("${KEY}")||"{}")}catch(e){}var t=p.theme;if(t!=="light"&&t!=="dark"){t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}d.dataset.theme=t;d.dataset.textSize=p.textSize||"standard";d.dataset.motion=p.motion||"full"})()`;

function read(): Preferences {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function apply(p: Preferences) {
  const d = document.documentElement;
  d.classList.add("theme-transition");
  setTimeout(() => d.classList.remove("theme-transition"), 400);
  d.dataset.theme =
    p.theme === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : p.theme;
  d.dataset.textSize = p.textSize;
  d.dataset.motion = p.motion;
}

const listeners = new Set<() => void>();
let cache: Preferences | null = null;

function subscribe(cb: () => void) {
  listeners.add(cb);
  // Follow the device's light/dark setting while "system" is chosen.
  const mq = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => read().theme === "system" && apply(read());
  mq.addEventListener("change", onChange);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onChange);
  };
}

function snapshot() {
  cache ??= read();
  return cache;
}

export function setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]) {
  const next = { ...read(), [key]: value };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  cache = next;
  apply(next);
  listeners.forEach((l) => l());
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, snapshot, () => DEFAULTS);
}
