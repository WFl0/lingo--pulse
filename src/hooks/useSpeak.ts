import { useCallback, useRef, useState } from "react";

/**
 * Speaks text using ElevenLabs (premium). If ElevenLabs fails (rate limit,
 * missing key, network) we transparently fall back to the browser's built-in
 * SpeechSynthesis so the user always hears a voice.
 */
export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

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
    utterRef.current = null;
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
      u.pitch = 1;
      // Try to pick a nice English voice
      const voices = window.speechSynthesis.getVoices();
      const preferred =
        voices.find((v) =>
          /Google US English|Samantha|Microsoft Aria|Microsoft Jenny/i.test(
            v.name,
          ),
        ) || voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
      if (preferred) u.voice = preferred;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utterRef.current = u;
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
    async (text: string, voiceId: string) => {
      if (!text.trim()) return;
      stop();
      // Pre-create audio element synchronously to preserve user gesture
      const audio = new Audio();
      audioRef.current = audio;
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
        });
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          console.warn("ElevenLabs TTS unavailable, falling back:", res.status, errText);
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
      } catch (e) {
        console.error(e);
        speakBrowser(text);
      }
    },
    [stop, speakBrowser],
  );

  return { speak, stop, speaking };
}
