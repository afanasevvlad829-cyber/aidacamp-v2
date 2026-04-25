import { ae as sequence } from './chunks/sequence_C7YAHkIp.mjs';

const ipCounts = /* @__PURE__ */ new Map();
const onRequest$1 = async ({ request, url }, next) => {
  if (url.pathname === "/api/ask") {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const now = Date.now();
    const entry = ipCounts.get(ip) ?? { count: 0, reset: now + 6e4 };
    if (now > entry.reset) {
      entry.count = 0;
      entry.reset = now + 6e4;
    }
    entry.count++;
    ipCounts.set(ip, entry);
    if (entry.count > 20) {
      return new Response(
        JSON.stringify({
          state: "error",
          text: "Слишком много запросов. Пожалуйста, подождите минуту.",
          block_type: null,
          block_data: null,
          chips: [{ label: "Написать в WhatsApp", query: "хочу поговорить с человеком" }]
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return next();
};

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
