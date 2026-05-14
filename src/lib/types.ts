import type { UIMessage } from "ai";

export type ResponseStyle = "formal" | "friendly" | "concise" | "deep";

export type AppSettings = {
  style: ResponseStyle;
  voiceId: string;
  autoSpeak: boolean;
  grammarCorrection: boolean;
};

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
};

export const DEFAULT_SETTINGS: AppSettings = {
  style: "friendly",
  voiceId: "EXAVITQu4vr4xnSDxMaL", // Sarah
  autoSpeak: true,
  grammarCorrection: true,
};

export const STYLE_PROMPTS: Record<ResponseStyle, string> = {
  formal:
    "Respond in a formal, polished and professional tone. Use precise vocabulary.",
  friendly:
    "Respond in a warm, friendly and conversational tone, like a thoughtful friend.",
  concise:
    "Respond as concisely as possible. Use short sentences. No filler.",
  deep: "Engage deeply with the user's ideas. Ask probing questions, offer nuanced perspectives, and challenge assumptions kindly.",
};

export const VOICES = [
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah" },
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian" },
];
