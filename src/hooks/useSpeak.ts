import { useCallback, useRef, useState } from "react";
import { DEFAULT_VOICE_ID } from "@/lib/types";

/**
 * Speaks text with a single premium female voice (ElevenLabs - Sarah).
 * Falls back transparently to the browser's built-in female voice if the
 * ElevenLabs API is unavailable, so the user always hears a voice.
 */
export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const speakBrowser = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1;
      u.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
      // Prefer well-known female English voices
      const preferred =
        voices.find((v) =>
          /Samantha|Google US English|Microsoft Aria|Microsoft Jenny|Microsoft Zira|Karen|Victoria|Tessa|Serena/i.test(
            v.name,
          ),
        ) ||
        voices.find(
          (v) =>
            v.lang?.toLowerCase().startsWith("en") &&
            /female|woman|girl/i.test(v.name),
        ) ||
        voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      setSpeaking(true);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
      return true;
    } catch {
      setSpeaking(false);
      return false;
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      stop();
      const audio = new Audio();
      audioRef.current = audio;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId: DEFAULT_VOICE_ID }),
        });
        if (!res.ok) {
          speakBrowser(text);
          return;
        }
        const blob = await res.blob();
        if (!blob.size) {
          speakBrowser(text);
          return;
        }
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        audio.src = url;
        audio.onended = () => {
          setSpeaking(false);
          if (urlRef.current) {
            URL.revokeObjectURL(urlRef.current);
            urlRef.current = null;
          }
        };
        audio.onerror = () => {
          setSpeaking(false);
          speakBrowser(text);
        };
        setSpeaking(true);
        await audio.play().catch(() => {
          setSpeaking(false);
          speakBrowser(text);
        });
      } catch {
        speakBrowser(text);
      }
    },
    [stop, speakBrowser],
  );

  return { speak, stop, speaking };
}
