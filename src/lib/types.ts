import type { UIMessage } from "ai";

export type ResponseStyle = "formal" | "friendly" | "concise" | "deep";

export type AppSettings = {
  style: ResponseStyle;
  autoSpeak: boolean;
  grammarCorrection: boolean;
};

export type Thread = {
  id: string;
  title: string;
  updatedAt: number;
  messages: UIMessage[];
  personaId?: string;
};


// Single, premium female voice (Sarah - ElevenLabs).
export const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export const DEFAULT_SETTINGS: AppSettings = {
  style: "friendly",
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

