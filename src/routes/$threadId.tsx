import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { ChatPanel } from "@/components/ChatPanel";
import { Welcome } from "@/components/Welcome";
import { Settings } from "@/components/Settings";
import {
  createThread,
  getThread,
  loadSettings,
  upsertThread,
} from "@/lib/storage";
import type { AppSettings, Thread } from "@/lib/types";

export const Route = createFileRoute("/$threadId")({
  component: ThreadPage,
});

function ThreadPage() {
  const { threadId } = useParams({ from: "/$threadId" });
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSettings(loadSettings());
    const existing = getThread(threadId);
    if (existing) {
      setThread(existing);
    } else {
      // Create a new thread with this id (e.g. user navigated directly)
      const t: Thread = {
        ...createThread(),
        id: threadId,
      };
      upsertThread(t);
      setThread(t);
      setRefreshKey((k) => k + 1);
    }
  }, [threadId]);

  if (!thread || !settings) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-muted-foreground text-sm animate-pulse">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen aurora-bg">
      <Welcome />
      <Sidebar
        onOpenSettings={() => setSettingsOpen(true)}
        refreshKey={refreshKey}
      />
      <ChatPanel
        key={thread.id}
        thread={thread}
        settings={settings}
        onSettingsChange={setSettings}
        onOpenSettings={() => setSettingsOpen(true)}
        onMessagesChange={() => setRefreshKey((k) => k + 1)}
      />
      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onChange={setSettings}
      />

      {/* Mobile footer credit */}
      <div className="md:hidden fixed bottom-2 left-0 right-0 text-center text-[10px] text-muted-foreground pointer-events-none">
        <span className="text-gradient-gold font-semibold">
          صناعة سعودية 100/100
        </span>{" "}
        🇸🇦
      </div>
    </div>
  );
}
