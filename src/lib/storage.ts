import type { UIMessage } from "ai";
import { DEFAULT_SETTINGS, type AppSettings, type Thread } from "./types";

const THREADS_KEY = "lingo-pulse:threads";
const SETTINGS_KEY = "lingo-pulse:settings";
const WELCOMED_KEY = "lingo-pulse:welcomed";

const isBrowser = () => typeof window !== "undefined";

export function loadThreads(): Thread[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(THREADS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Thread[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveThreads(threads: Thread[]) {
  if (!isBrowser()) return;
  localStorage.setItem(THREADS_KEY, JSON.stringify(threads));
}

export function createThread(
  title = "New conversation",
  personaId?: string,
): Thread {
  return {
    id: crypto.randomUUID(),
    title,
    updatedAt: Date.now(),
    messages: [],
    personaId,
  };
}


export function upsertThread(thread: Thread) {
  const all = loadThreads();
  const idx = all.findIndex((t) => t.id === thread.id);
  if (idx >= 0) all[idx] = thread;
  else all.unshift(thread);
  all.sort((a, b) => b.updatedAt - a.updatedAt);
  saveThreads(all);
}

export function updateThreadMessages(id: string, messages: UIMessage[]) {
  const all = loadThreads();
  const idx = all.findIndex((t) => t.id === id);
  if (idx < 0) return;
  all[idx].messages = messages;
  all[idx].updatedAt = Date.now();
  if (all[idx].title === "New conversation" && messages.length > 0) {
    const first = messages.find((m) => m.role === "user");
    if (first) {
      const text = first.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(" ")
        .trim();
      if (text) all[idx].title = text.slice(0, 48);
    }
  }
  saveThreads(all);
}

export function deleteThread(id: string) {
  saveThreads(loadThreads().filter((t) => t.id !== id));
}

export function getThread(id: string): Thread | undefined {
  return loadThreads().find((t) => t.id === id);
}

export function loadSettings(): AppSettings {
  if (!isBrowser()) return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings) {
  if (!isBrowser()) return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function hasBeenWelcomed(): boolean {
  if (!isBrowser()) return true;
  return localStorage.getItem(WELCOMED_KEY) === "1";
}

export function markWelcomed() {
  if (!isBrowser()) return;
  localStorage.setItem(WELCOMED_KEY, "1");
}
