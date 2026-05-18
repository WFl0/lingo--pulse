import { useEffect, useRef, useState } from "react";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult: ((e: any) => void) | null;
  onerror: ((e: any) => void) | null;
  onend: (() => void) | null;
  onstart?: (() => void) | null;
};

export function useSpeechRecognition() {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  // True when the user explicitly stopped; prevents auto-restart loops.
  const userStoppedRef = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setSupported(false);
      return;
    }
    setSupported(true);
    const rec: SpeechRecognitionLike = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    (rec as any).maxAlternatives = 1;

    rec.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalRef.current += res[0].transcript + " ";
        } else {
          interim += res[0].transcript;
        }
      }
      setTranscript((finalRef.current + interim).trim());
    };

    rec.onerror = (e: any) => {
      // Ignore transient errors that fire during normal pauses.
      if (e?.error === "no-speech" || e?.error === "aborted") return;
      setListening(false);
      userStoppedRef.current = true;
    };

    rec.onend = () => {
      // Auto-restart if the browser ended the session but the user didn't.
      if (!userStoppedRef.current) {
        try {
          rec.start();
          return;
        } catch {
          /* fallthrough */
        }
      }
      setListening(false);
    };

    recognitionRef.current = rec;
    return () => {
      userStoppedRef.current = true;
      try {
        rec.stop();
      } catch {
        /* noop */
      }
    };
  }, []);

  const start = () => {
    if (!recognitionRef.current) return;
    finalRef.current = "";
    setTranscript("");
    userStoppedRef.current = false;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      /* already started */
    }
  };

  const stop = () => {
    if (!recognitionRef.current) return;
    userStoppedRef.current = true;
    try {
      recognitionRef.current.stop();
    } catch {
      /* noop */
    }
    setListening(false);
  };

  const reset = () => {
    finalRef.current = "";
    setTranscript("");
  };

  return { supported, listening, transcript, start, stop, reset };
}
