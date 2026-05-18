import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Volume2, VolumeX, Sparkles } from "lucide-react";
import { MicButton, WaveBars } from "./MicButton";
import { TopBar } from "./TopBar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeak } from "@/hooks/useSpeak";
import { updateThreadMessages, saveSettings } from "@/lib/storage";
import type { AppSettings, Thread } from "@/lib/types";

type Props = {
  thread: Thread;
  settings: AppSettings;
  onSettingsChange: (s: AppSettings) => void;
  onOpenSettings: () => void;
  onMessagesChange?: () => void;
};

export function ChatPanel({
  thread,
  settings,
  onSettingsChange,
  onOpenSettings,
  onMessagesChange,
}: Props) {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          style: settings.style,
          grammarCorrection: settings.grammarCorrection,
        }),
      }),
    [settings.style, settings.grammarCorrection],
  );

  const { messages, sendMessage, status, setMessages } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
  });

  const { supported, listening, transcript, start, stop, reset } =
    useSpeechRecognition();
  const { speak, stop: stopSpeak, speaking } = useSpeak();

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);

  // Persist messages to localStorage
  useEffect(() => {
    updateThreadMessages(thread.id, messages);
    onMessagesChange?.();
  }, [messages, thread.id, onMessagesChange]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, status]);

  // Focus input
  useEffect(() => {
    inputRef.current?.focus();
  }, [thread.id, status]);

  // Auto-speak last assistant message when streaming completes
  useEffect(() => {
    if (!settings.autoSpeak) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== "assistant") return;
    if (lastSpokenRef.current === last.id) return;
    const text = extractText(last);
    const cleaned = text.split(/\n---\n/)[0].trim();
    if (cleaned) {
      lastSpokenRef.current = last.id;
      speak(cleaned);
    }
  }, [messages, status, settings.autoSpeak, speak]);

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setInput("");
    reset();
    stopSpeak();
    await sendMessage({ text: value });
  };

  // When user stops speaking, push transcript into input
  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  const handleMic = () => {
    if (!supported) {
      alert(
        "Voice input isn't supported in this browser. Try Chrome, Edge, or Safari.",
      );
      return;
    }
    if (listening) {
      stop();
      // submit if we got something
      const t = transcript.trim();
      if (t) {
        setTimeout(() => submit(t), 200);
      }
    } else {
      stopSpeak();
      start();
    }
  };

  const isLoading = status === "submitted" || status === "streaming";

  const lastAssistantText = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant") {
        const t = extractText(m).split(/\n---\n/)[0].trim();
        if (t) return t;
      }
    }
    return "";
  })();

  const toggleMute = () => {
    const next = { ...settings, autoSpeak: !settings.autoSpeak };
    saveSettings(next);
    onSettingsChange(next);
    if (settings.autoSpeak) stopSpeak();
  };

  const playLast = () => {
    if (lastAssistantText) speak(lastAssistantText);
  };

  return (
    <div className="flex-1 flex flex-col h-screen min-w-0">
      <TopBar
        settings={settings}
        speaking={speaking}
        hasLastReply={!!lastAssistantText}
        onToggleMute={toggleMute}
        onPlayLast={playLast}
        onStop={stopSpeak}
        onOpenSettings={onOpenSettings}
      />
      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <EmptyState onPick={(s) => submit(s)} />
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onReplay={(text) => speak(text)}
                speaking={speaking}
                onStop={stopSpeak}
              />
            ))}
          </AnimatePresence>
          {status === "submitted" && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground px-1"
            >
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <span className="animate-pulse">Thinking...</span>
            </motion.div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-border glass-strong">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {/* Mic + waves */}
          <div className="flex flex-col items-center mb-4">
            <MicButton
              listening={listening}
              speaking={speaking}
              disabled={isLoading}
              onClick={handleMic}
            />
            <div className="mt-3 w-full max-w-xs">
              <WaveBars active={listening || speaking} />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {listening
                ? "Listening... tap to stop & send"
                : speaking
                  ? "Speaking..."
                  : "Tap the mic to talk, or type below"}
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(input);
            }}
            className="flex items-end gap-2 glass rounded-2xl p-2"
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit(input);
                }
              }}
              rows={1}
              placeholder="Type your message in English..."
              disabled={isLoading}
              className="flex-1 resize-none bg-transparent outline-none px-3 py-2.5 text-sm placeholder:text-muted-foreground max-h-40"
              style={{ minHeight: "44px" }}
            />
            <button
              type="button"
              onClick={() => (speaking ? stopSpeak() : null)}
              className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground transition-smooth"
              aria-label={speaking ? "Stop audio" : "Audio"}
            >
              {speaking ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2.5 rounded-xl text-primary-foreground transition-smooth disabled:opacity-40 hover:scale-105"
              style={{
                background: "var(--gradient-primary)",
                boxShadow: input.trim() ? "var(--shadow-glow)" : "none",
              }}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function extractText(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

function MessageBubble({
  message,
  onReplay,
  speaking,
  onStop,
}: {
  message: UIMessage;
  onReplay: (text: string) => void;
  speaking: boolean;
  onStop: () => void;
}) {
  const text = extractText(message);
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex justify-end"
      >
        <div
          className="rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%] text-sm"
          style={{
            background: "var(--gradient-primary)",
            color: "var(--primary-foreground)",
            boxShadow: "0 8px 24px -8px oklch(0.55 0.16 155 / 0.5)",
          }}
        >
          <div className="whitespace-pre-wrap leading-relaxed">{text}</div>
        </div>
      </motion.div>
    );
  }

  const [main, ...rest] = text.split(/\n---\n/);
  const correction = rest.join("\n---\n").trim();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="group flex gap-3 items-start"
    >
      <div
        className="shrink-0 grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold tracking-wider"
        style={{
          background: "var(--gradient-primary)",
          color: "var(--primary-foreground)",
          boxShadow: "0 4px 16px -4px oklch(0.72 0.18 155 / 0.55)",
        }}
        aria-hidden
      >
        LP
      </div>
      <div className="flex-1 min-w-0">
        <div className="prose prose-invert prose-sm max-w-none text-foreground/95 leading-relaxed">
          <ReactMarkdown>{main}</ReactMarkdown>
        </div>
        {correction && (
          <div className="mt-3 glass rounded-xl px-4 py-3 text-xs border-l-2 border-accent">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent/80 mb-1.5">
              <Sparkles className="h-3 w-3" />
              Polished
            </div>
            <div className="prose prose-invert prose-xs max-w-none text-foreground/85">
              <ReactMarkdown>{correction}</ReactMarkdown>
            </div>
          </div>
        )}
        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-smooth">
          <button
            onClick={() => (speaking ? onStop() : onReplay(main))}
            className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5"
          >
            {speaking ? (
              <>
                <VolumeX className="h-3 w-3" /> Stop
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3" /> Replay
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    "Tell me about your day",
    "Help me practice English",
    "Let's debate an idea",
  ];
  return (
    <div className="text-center py-12 animate-float-up">
      <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--saudi)] animate-pulse" />
        Ready to listen
      </div>
      <h2 className="text-3xl md:text-4xl font-bold mb-3">
        <span className="text-gradient-primary">Speak naturally</span>
      </h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        Tap the microphone and start a real conversation. I'll understand,
        respond, and help polish your English along the way.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-8 max-w-2xl mx-auto">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="glass rounded-xl px-4 py-3 text-sm text-foreground/80 hover:text-foreground hover:scale-[1.03] transition-smooth text-left"
          >
            "{s}"
          </button>
        ))}
      </div>
    </div>
  );
}
