import "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { generateText, type UIMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway";
import { getPersona } from "@/lib/personas";

type Body = { personaId?: string; messages?: UIMessage[] };

function extract(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join("").trim();
}

export const Route = createFileRoute("/api/persona-turn")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { personaId, messages = [] } = (await request.json()) as Body;
        const persona = getPersona(personaId);
        if (!persona) return new Response("Unknown persona", { status: 400 });

        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

        const TOPICS = [
          "weekend plans", "favorite food", "a recent trip", "Riyadh vs Jeddah",
          "football and Al-Hilal", "coffee shops", "new movies", "learning English",
          "cars and driving", "video games", "family gatherings", "Ramadan memories",
          "the desert", "future dreams", "music taste", "tech gadgets",
          "studying abroad", "fashion trends", "a funny story", "the weather today",
        ];
        const topic = TOPICS[Math.floor(Math.random() * TOPICS.length)];

        const system = [
          persona.systemPrompt,
          "",
          "ROLE: You are chatting WITH an AI English tutor named LINGO PULSE. The user is just listening.",
          "- Reply ONLY in English, fully in character, with a real human vibe.",
          "- VERY SHORT: 1–2 short sentences MAX. Never a paragraph.",
          "- Sound natural and casual — use contractions, small fillers ('hmm', 'yeah', 'wallah', 'honestly').",
          "- About 60% of the time, slip ONE small natural English mistake that fits your character. The tutor will correct it.",
          "- Vary the conversation: change topics naturally every few turns. Ask the tutor a quick question sometimes.",
          `- If this is the FIRST turn (no prior tutor message), start with a quick greeting and bring up: ${topic}.`,
          "- Do NOT add corrections, notes, translations, emojis, or meta commentary. Just talk.",
        ].join("\n");

        // Flip roles from the persona's point of view:
        // existing 'user' messages were the persona itself → assistant
        // existing 'assistant' messages were the tutor → user
        const history = messages
          .map((m) => {
            const t = extract(m);
            if (!t) return null;
            const main = t.split(/\n---\n/)[0].trim();
            const role: "user" | "assistant" =
              m.role === "assistant" ? "user" : "assistant";
            return { role, content: main };
          })
          .filter(Boolean) as Array<{ role: "user" | "assistant"; content: string }>;

        const gateway = createLovableAiGatewayProvider(apiKey);
        try {
          const { text } = await generateText({
            model: gateway("google/gemini-3.1-flash-lite-preview"),
            system,
            messages:
              history.length > 0
                ? history
                : [{ role: "user", content: `Say a quick hi and bring up ${topic}.` }],
          });
          return new Response(JSON.stringify({ text: text.trim() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          const msg = String(err?.message ?? err);
          const status = /Too Many Requests|429/i.test(msg)
            ? 429
            : /402|credit/i.test(msg)
              ? 402
              : 500;
          return new Response(
            JSON.stringify({ error: msg.slice(0, 200) }),
            { status, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
