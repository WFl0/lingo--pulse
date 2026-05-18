import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { Plus, Trash2, MessageSquare, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import logo from "@/assets/logo.png";
import {
  createThread,
  deleteThread,
  loadThreads,
  upsertThread,
} from "@/lib/storage";
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

      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-1">
        {threads.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-8 px-4">
            No conversations yet. Start one above.
          </p>
        )}
        {threads.map((t) => {
          const active = t.id === activeId;
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
                <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
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
