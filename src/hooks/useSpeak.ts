import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Speaks text with a single premium voice (ElevenLabs - Sarah).
 * Falls back to the browser's built-in voice if ElevenLabs is unavailable.
 *
 * Guarantees:
 *  - Only ONE voice plays at a time (no overlap between ElevenLabs & browser TTS).
 *  - Repeated calls with identical text are coalesced.
 *  - In-flight requests are cancelled when stop() is called.
 */
function cleanForSpeech(input: string) {
  return input
    // remove fenced code blocks
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    // remove markdown emphasis / headings / list markers
    .replace(/[#>*_~]+/g, " ")
    // strip emojis & symbols
    .replace(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\uFE0F]/gu,
      " ",
    )
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

export function useSpeak() {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastTextRef = useRef<string>("");
  const lockRef = useRef(false);

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = "";
      } catch {
        /* noop */
      }
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    cleanup();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        /* noop */
      }
    }
    lockRef.current = false;
    lastTextRef.current = "";
    setSpeaking(false);
  }, [cleanup]);

  const speakBrowser = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSpeaking(false);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US";
      u.rate = 1;
      u.pitch = 1.05;
      const voices = window.speechSynthesis.getVoices();
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
      window.speechSynthesis.speak(u);
    } catch {
      setSpeaking(false);
    }
  }, []);

  const speak = useCallback(
    async (raw: string, voiceId?: string) => {
      const text = cleanForSpeech(raw || "");

      if (!text) return;
      // Skip if already speaking the exact same text
      if (lockRef.current && lastTextRef.current === text) return;

      // Hard reset previous playback
      stop();

      lockRef.current = true;
      lastTextRef.current = text;

      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voiceId }),
          signal: ctrl.signal,
        });


        if (ctrl.signal.aborted) return;

        if (!res.ok) {
          speakBrowser(text);
          return;
        }
        const blob = await res.blob();
        if (ctrl.signal.aborted) return;
        if (!blob.size) {
          speakBrowser(text);
          return;
        }
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          lockRef.current = false;
          setSpeaking(false);
          cleanup();
        };
        audio.onerror = () => {
          lockRef.current = false;
          setSpeaking(false);
          cleanup();
        };

        setSpeaking(true);
        try {
          await audio.play();
        } catch {
          lockRef.current = false;
          setSpeaking(false);
          cleanup();
          speakBrowser(text);
        }
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        lockRef.current = false;
        speakBrowser(text);
      }
    },
    [stop, cleanup, speakBrowser],
  );

  useEffect(() => () => stop(), [stop]);

  return { speak, stop, speaking };
}
