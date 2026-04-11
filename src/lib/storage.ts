import { ConsentSession } from "./types";

const STORAGE_KEY = "concent_sessions";

export function getSessions(): ConsentSession[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getSession(id: string): ConsentSession | undefined {
  return getSessions().find((s) => s.id === id);
}

export function saveSession(session: ConsentSession): void {
  const sessions = getSessions();
  const index = sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    sessions[index] = session;
  } else {
    sessions.unshift(session);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function deleteSession(id: string): void {
  const sessions = getSessions().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}
