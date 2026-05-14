import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { createThread, loadThreads, upsertThread } from "@/lib/storage";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = loadThreads();
    let id: string;
    if (existing[0]) {
      id = existing[0].id;
    } else {
      const t = createThread();
      upsertThread(t);
      id = t.id;
    }
    navigate({ to: "/$threadId", params: { threadId: id }, replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-muted-foreground text-sm animate-pulse">
        Preparing your conversation...
      </div>
    </div>
  );
}
