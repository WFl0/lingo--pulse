import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Volume2, VolumeX, Sparkles, Play, Pause, SkipForward, GraduationCap } from "lucide-react";
import { MicButton, WaveBars } from "./MicButton";
import { TopBar } from "./TopBar";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { useSpeak } from "@/hooks/useSpeak";
import { updateThreadMessages, saveSettings } from "@/lib/storage";
import { getPersona } from "@/lib/personas";
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
  const persona = getPersona(thread.personaId);
  const isPersonaMode = !!persona;

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: () => ({
          style: settings.style,
          grammarCorrection: settings.grammarCorrection,
          personaId: thread.personaId,
        }),
      }),
    [settings.style, settings.grammarCorrection, thread.personaId],
  );

  const { messages, sendMessage, status } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
  });

  const { supported, listening, transcript, start, stop, reset } =
    useSpeechRecognition();
  const { speak, stop: stopSpeak, speaking } = useSpeak();

  const [input, setInput] = useState("");
  const [autoMode, setAutoMode] = useState(false);
  const [personaLoading, setPersonaLoading] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSpokenRef = useRef<string | null>(null);
  const autoModeRef = useRef(autoMode);
  useEffect(() => { autoModeRef.current = autoMode; }, [autoMode]);

  // Persist messages
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

  useEffect(() => {
    if (!isPersonaMode) inputRef.current?.focus();
  }, [thread.id, status, isPersonaMode]);

  // Speak the LAST message when streaming completes
  // In persona mode: persona uses its voice, tutor uses default.
  // In normal mode: only assistant is spoken.
  useEffect(() => {
    if (!settings.autoSpeak) return;
    if (status !== "ready") return;
    const last = messages[messages.length - 1];
    if (!last) return;
    if (lastSpokenRef.current === last.id) return;

    if (isPersonaMode) {
      const text = extractText(last).split(/\n---\n/)[0].trim();
      if (!text) return;
      lastSpokenRef.current = last.id;
      // In persona mode role 'user' = persona, role 'assistant' = tutor
      const voiceId = last.role === "user" ? persona?.voiceId : undefined;
      speak(text, voiceId);
    } else {
      if (last.role !== "assistant") return;
      const text = extractText(last).split(/\n---\n/)[0].trim();
      if (!text) return;
      lastSpokenRef.current = last.id;
      speak(text);
    }
  }, [messages, status, settings.autoSpeak, speak, persona?.voiceId, isPersonaMode]);

  const generatePersonaTurn = useCallback(async () => {
    if (!persona) return;
    setPersonaLoading(true);
    try {
      const res = await fetch("/api/persona-turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: persona.id, messages }),
      });
      if (!res.ok) {
        if (res.status === 429) {
          // Rate limited — pause the auto loop briefly
          setAutoMode(false);
          console.warn("Persona turn rate-limited, pausing auto-chat.");
        }
        return;
      }
      const { text } = (await res.json()) as { text?: string };
      const value = text?.trim();
      if (!value) return;
      await sendMessage({ text: value });
    } catch (e) {
      console.error("persona-turn failed", e);
    } finally {
      setPersonaLoading(false);
    }
  }, [persona, messages, sendMessage]);

  // Auto-loop: when the tutor finishes replying, queue the next persona turn.
  useEffect(() => {
    if (!isPersonaMode || !autoMode) return;
    if (status !== "ready") return;
    if (personaLoading) return;
    const last = messages[messages.length - 1];
    // Trigger next persona turn only after a tutor reply (or to kick things off when empty).
    if (messages.length > 0 && last?.role !== "assistant") return;
    const t = setTimeout(() => {
      if (autoModeRef.current) generatePersonaTurn();
    }, 4000);
    return () => clearTimeout(t);
  }, [isPersonaMode, autoMode, status, personaLoading, messages, generatePersonaTurn]);

  const submit = async (text: string) => {
    const value = text.trim();
    if (!value) return;
    setInput("");
    reset();
    stopSpeak();
    await sendMessage({ text: value });
  };

  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  const handleMic = () => {
    if (!supported) {
      alert("Voice input isn't supported in this browser. Try Chrome, Edge, or Safari.");
      return;
    }
    if (listening) {
      stop();
      const t = transcript.trim();
      if (t) setTimeout(() => submit(t), 200);
    } else {
      stopSpeak();
      start();
    }
  };

  const isLoading = status === "submitted" || status === "streaming" || personaLoading;

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
      {persona && (
        <div className="px-4 md:px-8 pt-4">
          <div className="max-w-3xl mx-auto glass rounded-2xl px-4 py-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full grid place-items-center text-lg glass-strong shrink-0">
              {persona.emoji}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gradient-gold truncate">
                {persona.name}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {persona.trait} • chatting with the AI tutor
              </div>
            </div>
            <span className="ml-auto text-[10px] tracking-wider uppercase text-muted-foreground">
              Live dialogue
            </span>
          </div>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.length === 0 && (
            <EmptyState
              persona={persona}
              onPick={(s) => submit(s)}
              onStartPersona={generatePersonaTurn}
              loading={personaLoading}
            />
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                persona={persona}
                onReplay={(text, voiceId) => speak(text, voiceId)}
                speaking={speaking}
                onStop={stopSpeak}
              />
            ))}
          </AnimatePresence>

          {(status === "submitted" || personaLoading) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground px-1"
            >
              <Sparkles className="h-4 w-4 text-accent animate-pulse" />
              <span className="animate-pulse">
                {personaLoading ? `${persona?.shortName} is typing...` : "Tutor is thinking..."}
              </span>
            </motion.div>
          )}
        </div>
      </div>

      <div className="border-t border-border glass-strong">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {isPersonaMode ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-xs text-muted-foreground text-center">
                {autoMode
                  ? `Auto-conversation is running — ${persona?.shortName} and the tutor are chatting.`
                  : `Press Play to let ${persona?.shortName} and the tutor have a live English conversation, or Next for one turn.`}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (autoMode) {
                      setAutoMode(false);
                      stopSpeak();
                    } else {
                      setAutoMode(true);
                      if (!isLoading && (messages.length === 0 || messages[messages.length - 1].role === "assistant")) {
                        generatePersonaTurn();
                      }
                    }
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold text-primary-foreground transition-smooth hover:scale-[1.03]"
                  style={{
                    background: "var(--gradient-primary)",
                    boxShadow: "var(--shadow-glow)",
                  }}
                >
                  {autoMode ? (
                    <><Pause className="h-4 w-4" /> Pause auto-chat</>
                  ) : (
                    <><Play className="h-4 w-4" /> Start auto-chat</>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => generatePersonaTurn()}
                  disabled={isLoading}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm glass hover:scale-[1.03] transition-smooth disabled:opacity-40"
                >
                  <SkipForward className="h-4 w-4" /> Next turn
                </button>
              </div>
              <div className="w-full max-w-xs">
                <WaveBars active={speaking || isLoading} />
              </div>
            </div>
          ) : (
            <>
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
                  {speaking ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
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
            </>
          )}
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
  persona,
  onReplay,
  speaking,
  onStop,
}: {
  message: UIMessage;
  persona?: ReturnType<typeof getPersona>;
  onReplay: (text: string, voiceId?: string) => void;
  speaking: boolean;
  onStop: () => void;
}) {
  const text = extractText(message);
  const isPersonaMode = !!persona;

  // In persona mode:
  //   role 'user'      → the persona speaking (left side, persona avatar)
  //   role 'assistant' → the AI tutor speaking (right side)
  // In normal mode:
  //   role 'user'      → the human (right side, gradient bubble)
  //   role 'assistant' → the AI (left side, transparent)
  if (isPersonaMode) {
    if (message.role === "user") {
      // persona
      return (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-start items-end gap-2 group"
        >
          <div className="h-9 w-9 rounded-full grid place-items-center text-base glass-strong shrink-0">
            {persona.emoji}
          </div>
          <div className="max-w-[80%]">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 ml-1">
              {persona.shortName}
            </div>
            <div className="glass rounded-2xl rounded-bl-md px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {text}
            </div>
            <button
              onClick={() => (speaking ? onStop() : onReplay(text, persona.voiceId))}
              className="mt-1 ml-1 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth"
            >
              {speaking ? <><VolumeX className="h-3 w-3" /> Stop</> : <><Volume2 className="h-3 w-3" /> Replay</>}
            </button>
          </div>
        </motion.div>
      );
    }
    // tutor reply
    const [main, ...rest] = text.split(/\n---\n/);
    const correction = rest.join("\n---\n").trim();
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-end items-end gap-2 group"
      >
        <div className="max-w-[82%]">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 text-right mr-1 inline-flex items-center gap-1 w-full justify-end">
            <GraduationCap className="h-3 w-3" /> AI Tutor
          </div>
          <div
            className="rounded-2xl rounded-br-md px-4 py-3 text-sm"
            style={{
              background: "var(--gradient-primary)",
              color: "var(--primary-foreground)",
              boxShadow: "0 8px 24px -8px oklch(0.55 0.16 155 / 0.5)",
            }}
          >
            <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
              <ReactMarkdown>{main}</ReactMarkdown>
            </div>
          </div>
          {correction && (
            <div className="mt-2 glass rounded-xl px-4 py-3 text-xs border-l-2 border-accent">
              <div className="prose prose-invert prose-xs max-w-none text-foreground/85">
                <ReactMarkdown>{correction}</ReactMarkdown>
              </div>
            </div>
          )}
          <button
            onClick={() => (speaking ? onStop() : onReplay(main))}
            className="mt-1 mr-1 text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-smooth float-right"
          >
            {speaking ? <><VolumeX className="h-3 w-3" /> Stop</> : <><Volume2 className="h-3 w-3" /> Replay</>}
          </button>
        </div>
      </motion.div>
    );
  }

  // Normal mode
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
      transition={{ duration: 0.4 }}
      className="group"
    >
      <div className="prose prose-invert prose-sm max-w-none text-foreground/95 leading-relaxed">
        <ReactMarkdown>{main}</ReactMarkdown>
      </div>
      {correction && (
        <div className="mt-3 glass rounded-xl px-4 py-3 text-xs border-l-2 border-accent">
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
          {speaking ? <><VolumeX className="h-3 w-3" /> Stop</> : <><Volume2 className="h-3 w-3" /> Replay</>}
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState({
  persona,
  onPick,
  onStartPersona,
  loading,
}: {
  persona?: ReturnType<typeof getPersona>;
  onPick: (text: string) => void;
  onStartPersona: () => void;
  loading: boolean;
}) {
  if (persona) {
    return (
      <div className="text-center py-12 animate-float-up">
        <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-6">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--saudi)] animate-pulse" />
          Live English dialogue
        </div>
        <div className="text-5xl mb-4">{persona.emoji}</div>
        <h2 className="text-3xl md:text-4xl font-bold mb-3">
          <span className="text-gradient-gold">{persona.shortName} meets the AI Tutor</span>
        </h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-8">
          Watch and listen as {persona.shortName} chats live with the AI tutor in English.
          The tutor gently corrects any small mistakes along the way.
        </p>
        <button
          type="button"
          onClick={onStartPersona}
          disabled={loading}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-semibold text-primary-foreground transition-smooth hover:scale-[1.03] disabled:opacity-50"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Play className="h-4 w-4" /> Start the conversation
        </button>
      </div>
    );
  }

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
        Tap the microphone and start a real conversation. I'll understand, respond, and help polish your English along the way.
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
