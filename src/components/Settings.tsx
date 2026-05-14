import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { loadSettings, saveSettings } from "@/lib/storage";
import {
  type AppSettings,
  type ResponseStyle,
  VOICES,
} from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  onChange: (s: AppSettings) => void;
};

const STYLES: { id: ResponseStyle; label: string; desc: string }[] = [
  { id: "friendly", label: "Friendly", desc: "Warm & conversational" },
  { id: "formal", label: "Formal", desc: "Polished & professional" },
  { id: "concise", label: "Concise", desc: "Short & direct" },
  { id: "deep", label: "Deep", desc: "Thoughtful & probing" },
];

export function Settings({ open, onClose, onChange }: Props) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings());

  useEffect(() => {
    if (open) setSettings(loadSettings());
  }, [open]);

  const update = (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveSettings(next);
    onChange(next);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 grid place-items-center p-4"
          style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(8px)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="glass-strong rounded-3xl p-8 w-full max-w-md relative"
            style={{ boxShadow: "var(--shadow-elegant)" }}
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/40 transition-smooth"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <h2 className="text-2xl font-bold mb-1 text-gradient-primary">
              Settings
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Tune how LINGO PULSE talks with you.
            </p>

            <div className="space-y-6">
              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Response Style
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {STYLES.map((s) => {
                    const active = settings.style === s.id;
                    return (
                      <button
                        key={s.id}
                        onClick={() => update({ style: s.id })}
                        className={`p-3 rounded-xl text-left transition-smooth ${
                          active ? "glass" : "hover:bg-muted/40 border border-border"
                        }`}
                        style={
                          active
                            ? {
                                boxShadow:
                                  "0 0 0 1px var(--saudi), 0 0 30px oklch(0.72 0.18 155 / 0.3)",
                              }
                            : undefined
                        }
                      >
                        <div className="text-sm font-semibold">{s.label}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {s.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <section>
                <h3 className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                  Voice
                </h3>
                <select
                  value={settings.voiceId}
                  onChange={(e) => update({ voiceId: e.target.value })}
                  className="w-full glass rounded-xl px-4 py-3 text-sm bg-transparent outline-none focus:ring-2 focus:ring-primary"
                >
                  {VOICES.map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                      className="bg-background text-foreground"
                    >
                      {v.name}
                    </option>
                  ))}
                </select>
              </section>

              <section className="space-y-3">
                <label className="flex items-center justify-between glass rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">Auto-speak replies</div>
                    <div className="text-xs text-muted-foreground">
                      Read responses aloud automatically
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoSpeak}
                    onChange={(e) => update({ autoSpeak: e.target.checked })}
                    className="h-5 w-5 accent-[var(--saudi)]"
                  />
                </label>

                <label className="flex items-center justify-between glass rounded-xl px-4 py-3 cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">Grammar correction</div>
                    <div className="text-xs text-muted-foreground">
                      Politely polish your sentences
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.grammarCorrection}
                    onChange={(e) =>
                      update({ grammarCorrection: e.target.checked })
                    }
                    className="h-5 w-5 accent-[var(--saudi)]"
                  />
                </label>
              </section>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
