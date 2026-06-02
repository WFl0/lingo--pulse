import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, Trash2, MessageSquare, Settings as SettingsIcon, Users } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import {
  createThread,
  deleteThread,
  loadThreads,
  upsertThread,
} from "@/lib/storage";
import { PERSONAS, getPersona } from "@/lib/personas";
import type { Thread } from "@/lib/types";


type Props = {
  onOpenSettings: () => void;
  refreshKey: number;
};

export function Sidebar({ onOpenSettings, refreshKey }: Props) {
  const [threads, setThreads] = useState<Thread[]>([]);
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { threadId?: string };
  const activeId = params.threadId;

  useEffect(() => {
    setThreads(loadThreads());
  }, [refreshKey, activeId]);

  const newChat = () => {
    const t = createThread();
    upsertThread(t);
    setThreads(loadThreads());
    navigate({ to: "/$threadId", params: { threadId: t.id } });
  };

  const startPersonaChat = (personaId: string) => {
    const p = PERSONAS.find((x) => x.id === personaId);
    if (!p) return;
    const t = createThread(`${p.shortName} • chat`, personaId);
    upsertThread(t);
    setThreads(loadThreads());
    navigate({ to: "/$threadId", params: { threadId: t.id } });
  };


  const remove = (id: string) => {
    deleteThread(id);
    const remaining = loadThreads();
    setThreads(remaining);
    if (id === activeId) {
      if (remaining[0]) {
        navigate({ to: "/$threadId", params: { threadId: remaining[0].id } });
      } else {
        navigate({ to: "/" });
      }
    }
  };

  return (
    <aside className="hidden md:flex w-72 shrink-0 flex-col glass-strong border-r border-border h-screen sticky top-0">
      <div className="p-5 border-b border-border">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={logo}
            alt="LINGO PULSE"
            width={36}
            height={36}
            className="h-9 w-9 object-contain"
          />
          <div>
            <div className="font-display font-bold text-lg leading-none text-gradient-primary">
              LINGO PULSE
            </div>
            <div className="text-[10px] text-muted-foreground mt-1 tracking-wider">
              AI VOICE COMPANION
            </div>
          </div>
        </Link>
      </div>

      <div className="p-4">
        <button
          onClick={newChat}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-full text-sm font-semibold text-primary-foreground transition-smooth hover:scale-[1.02]"
          style={{
            background: "var(--gradient-primary)",
            boxShadow: "var(--shadow-glow)",
          }}
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {/* Personas section */}
        <div className="px-2 pt-1">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            <Users className="h-3 w-3" />
            <span>Chat with a persona</span>
          </div>
          <div className="space-y-1">
            {PERSONAS.map((p) => (
              <button
                key={p.id}
                onClick={() => startPersonaChat(p.id)}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl glass hover:scale-[1.01] transition-smooth text-left"
                title={`Chat with ${p.name}`}
              >
                <span className="h-7 w-7 rounded-full grid place-items-center text-sm shrink-0 glass-strong">
                  {p.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-semibold text-gradient-gold truncate">
                    {p.shortName}
                  </span>
                  <span className="block text-[10px] text-muted-foreground truncate">
                    {p.trait}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="gold-divider mx-2 my-2" />

        <div className="px-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
          Conversations
        </div>
        {threads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6 px-4">
            No conversations yet.
          </p>
        )}
        {threads.map((t) => {
          const active = t.id === activeId;
          const p = getPersona(t.personaId);
          return (
            <div
              key={t.id}
              className={`group flex items-center gap-2 rounded-xl px-2 transition-smooth ${
                active ? "glass" : "hover:bg-muted/40"
              }`}
            >
              <Link
                to="/$threadId"
                params={{ threadId: t.id }}
                className="flex-1 flex items-center gap-2 py-2.5 min-w-0"
              >
                {p ? (
                  <span className="text-sm shrink-0">{p.emoji}</span>
                ) : (
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                )}
                <span className="truncate text-sm">{t.title}</span>
              </Link>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  remove(t.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive transition-smooth"
                aria-label="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>


      <div className="p-4 border-t border-border space-y-3">
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm glass hover:bg-muted/40 transition-smooth"
        >
          <SettingsIcon className="h-4 w-4" />
          Settings
        </button>
        <div className="text-[10px] text-center text-muted-foreground space-y-0.5">
          <div>
            Made by{" "}
            <span className="text-gradient-gold font-semibold">
              Ahmed Abu Heliyel
            </span>
          </div>
          <div>
            <span className="text-gradient-gold font-semibold">
              صناعة سعودية 100/100
            </span>{" "}
            🇸🇦
          </div>
        </div>
      </div>
    </aside>
  );
}
