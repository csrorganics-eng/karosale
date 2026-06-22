# C4 diagrams — AI shop chatbot

PlantUML source for the storefront **shop assistant** (floating widget, `POST /api/chat`, multi-provider LLM router, tool use, Neon persistence, Resend escalation).

## Source file

| File | Description |
|------|-------------|
| [c4-ai-chatbot.puml](./c4-ai-chatbot.puml) | Four diagrams: **Level 1** system context, **Level 2** containers, **Level 3** components, **Level 4** code / file map |

Diagrams use [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) via remote `!include` from GitHub (`master` branch). Offline render: clone that repo and point `!include` to local `.puml` files.

## How to render

1. **VS Code** — [PlantUML extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml); set Java + Graphviz; open `c4-ai-chatbot.puml` and run preview (each `@startuml` … `@enduml` block renders as its own diagram).
2. **CLI** — [PlantUML](https://plantuml.com/download) + Graphviz:  
   `java -jar plantuml.jar docs/c4-ai-chatbot.puml`  
   Outputs PNG/SVG next to the source (one file per diagram when using multiple `@startuml` blocks).

## Implementation pointers

- **Routes:** `app/api/chat/route.ts`, `app/api/chat/status/route.ts`
- **Orchestration:** `lib/chat/run-shop-chat.ts` (`runShopChatAssistant`, `shopToolsOpenAI`, `runTool`)
- **LLM router:** `lib/ai-router.ts` (Groq → Cerebras → Gemini OpenAI-compat)
- **UI:** `components/storefront/ShopChatWidget.tsx`
- **DB:** `lib/db/queries/shop-chat.ts`, tables in `lib/db/schema.ts`

See also `AI_ROUTER_IMPLEMENTATION_PROMPT.md` for provider routing rationale.
