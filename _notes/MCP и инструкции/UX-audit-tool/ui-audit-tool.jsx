import { useState, useCallback } from "react";

const ANTHROPIC_SYSTEM = `You are a senior UX/UI auditor and design psychologist. You analyze websites and provide comprehensive design audits.

CRITICAL: Return ONLY raw valid JSON. No markdown, no backticks, no code fences. All string values on a single line — no literal newlines inside strings. No trailing commas. Straight double quotes only.

Return this exact JSON structure:

{
  "score": 0-100,
  "summary": "2-3 sentence executive summary",
  "sections": [
    {
      "id": "contrast",
      "title": "Контраст и цвет",
      "score": 0-100,
      "issues": [
        {"severity": "critical|warning|info", "text": "description", "fix": "how to fix"}
      ],
      "passed": ["what works well"]
    },
    {
      "id": "typography",
      "title": "Типографика",
      "score": 0-100,
      "issues": [...],
      "passed": [...]
    },
    {
      "id": "mobile",
      "title": "Мобильная версия",
      "score": 0-100,
      "issues": [...],
      "passed": [...]
    },
    {
      "id": "layout",
      "title": "Лэйаут и иерархия",
      "score": 0-100,
      "issues": [...],
      "passed": [...]
    },
    {
      "id": "psychology",
      "title": "Психология восприятия",
      "score": 0-100,
      "issues": [...],
      "passed": [...]
    }
  ],
  "colorPalette": {
    "dominant": ["#hex1", "#hex2"],
    "accent": ["#hex1"],
    "psychology": "description of color psychology being used or missing",
    "recommendations": ["specific color recommendation 1", "recommendation 2"]
  },
  "priorityFixes": [
    {"rank": 1, "action": "specific action", "impact": "high|medium|low", "effort": "high|medium|low"}
  ]
}

For the psychology section specifically analyze:
- Trust signals (blue tones, consistent branding)
- Urgency/CTA effectiveness (orange/red accents)
- Calm/safety (green, teal tones)
- Money/premium (gold, dark navy, muted tones)
- Children's context if relevant (bright, playful, safe colors)
- Visual hierarchy guiding the eye
- F-pattern and Z-pattern reading flow
- Hick's Law (too many choices paralyzing users)
- Fitts's Law (button sizes and click targets)

If the URL is a real website you know, analyze it specifically. Otherwise provide general analysis based on the description.
Be specific, practical, and direct. No vague advice.`;

const DESIGN_GUIDE = {
  contrast: {
    title: "Контраст",
    icon: "◐",
    color: "#e74c3c",
    rules: [
      { rule: "WCAG AA: текст на фоне ≥ 4.5:1", example: "Серый #999 на белом = 2.8:1 — ПРОВАЛ" },
      { rule: "Крупный текст (18px+): минимум 3:1", example: "#777 на белом = ок для h1, не ок для body" },
      { rule: "Кнопки/иконки без текста: 3:1", example: "Иконка на фоне должна контрастировать" },
      { rule: "Текст поверх фото: всегда подложка", example: "Полупрозрачный градиент снизу или overlay" }
    ]
  },
  typography: {
    title: "Типографика",
    icon: "Aa",
    color: "#8e44ad",
    rules: [
      { rule: "Минимум body: 16px desktop, 14px mobile", example: "14px на десктопе читается плохо после 40 лет" },
      { rule: "Line-height: 1.4–1.7 для абзацев", example: "1.0 = текст задыхается, 2.0 = строки плывут" },
      { rule: "Максимум ширина строки: 60–80 символов", example: "Полная ширина экрана = читатель устаёт" },
      { rule: "Не более 3 разных шрифтов на странице", example: "4+ шрифта = визуальный хаос" },
      { rule: "Иерархия: h1 > h2 > h3 ≥ 1.25× каждый", example: "h1=36, h2=28, h3=22, body=16" }
    ]
  },
  mobile: {
    title: "Мобилка",
    icon: "📱",
    color: "#27ae60",
    rules: [
      { rule: "Tap target: минимум 44×44px", example: "Маленькие ссылки = промахи пальцем" },
      { rule: "Горизонтальный scroll на мобиле = смерть", example: "Overflow-x: hidden + ширины в %/vw" },
      { rule: "Кнопки CTA на мобиле: full-width или min 200px", example: "Узкая кнопка посередине = плохая эргономика" },
      { rule: "Текст не меньше 14px на мобиле (лучше 16px)", example: "iOS зумирует поля input <16px автоматически" },
      { rule: "Отступы от краёв: минимум 16px с каждой стороны", example: "Текст, упирающийся в экран = дискомфорт" }
    ]
  },
  layout: {
    title: "Лэйаут",
    icon: "⬜",
    color: "#2980b9",
    rules: [
      { rule: "F-паттерн: важное — сверху слева", example: "Логотип слева, CTA справа вверху, контент левее" },
      { rule: "Визуальный вес: один главный элемент на экран", example: "2 одинаково большие кнопки конкурируют" },
      { rule: "Whitespace — не пустота, а воздух", example: "Плотные блоки утомляют, разреженные — отдыхают" },
      { rule: "Правило трети: важное на пересечениях", example: "Hero-заголовок на 1/3 от верха = привычнее" },
      { rule: "Закон Фиттса: чем крупнее и ближе — тем легче кликнуть", example: "CTA в углу экрана = плохо. По центру = хорошо" }
    ]
  },
  psychology: {
    title: "Психология цвета",
    icon: "🧠",
    color: "#e67e22",
    rules: [
      { rule: "Синий — доверие, надёжность, профессионализм", example: "Банки, медицина, IT. Холодный синий = корпоратив" },
      { rule: "Зелёный — безопасность, природа, деньги (США)", example: "Кнопка 'купить' в зелёном работает для финансов" },
      { rule: "Оранжевый — энергия, срочность, call-to-action", example: "Amazon, B2C-кнопки. Не для премиума" },
      { rule: "Красный — опасность, скидки, стоп, любовь", example: "Хорош для скидок и ошибок. Не для фона" },
      { rule: "Тёмно-синий + золото = премиум/деньги", example: "Luxury, private banking, дорогие продукты" },
      { rule: "Пастель + скруглённые углы = дети, забота, безопасность", example: "Детские лагеря, мед. для детей, еда для малышей" },
      { rule: "Высокая насыщенность = дешевизна и энергия", example: "Скидочные акции vs премиум-сдержанность" },
      { rule: "Закон Хика: меньше выборов = быстрее решение", example: "3 тарифа > 10 тарифов по конверсии" }
    ]
  }
};

const SEVERITY_CONFIG = {
  critical: { color: "#e74c3c", bg: "#fdf2f2", label: "Критично", icon: "✕" },
  warning: { color: "#f39c12", bg: "#fffbf0", label: "Важно", icon: "!" },
  info: { color: "#3498db", bg: "#f0f7ff", label: "Совет", icon: "i" }
};

function ScoreRing({ score, size = 80 }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 70 ? "#27ae60" : score >= 50 ? "#f39c12" : "#e74c3c";
  return (
    <svg width={size} height={size} style={{ display: "block" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#eee" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: "stroke-dasharray 0.8s ease" }}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size*0.22, fontWeight: 700, fill: color, fontFamily: "monospace" }}>
        {score}
      </text>
    </svg>
  );
}

function IssueItem({ issue }) {
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.color}20`, borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 6, padding: "10px 12px", marginBottom: 8 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <span style={{ color: cfg.color, fontWeight: 700, fontSize: 13, flexShrink: 0, marginTop: 1 }}>
          [{cfg.icon}] {cfg.label}
        </span>
        <span style={{ fontSize: 13, color: "#333", lineHeight: 1.5 }}>{issue.text}</span>
      </div>
      {issue.fix && (
        <div style={{ marginTop: 6, fontSize: 12, color: "#555", paddingLeft: 4,
          borderTop: `1px solid ${cfg.color}15`, paddingTop: 6 }}>
          <b style={{ color: "#27ae60" }}>→ Фикс:</b> {issue.fix}
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const color = section.score >= 70 ? "#27ae60" : section.score >= 50 ? "#f39c12" : "#e74c3c";
  const critCount = section.issues?.filter(i => i.severity === "critical").length || 0;
  return (
    <div style={{ border: "1px solid #e8e8e8", borderRadius: 10, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", cursor: "pointer", background: open ? "#fafafa" : "#fff",
        userSelect: "none", transition: "background 0.2s" }}>
        <ScoreRing score={section.score} size={52}/>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: "#222" }}>{section.title}</div>
          <div style={{ fontSize: 12, color: "#888", marginTop: 2 }}>
            {section.issues?.length || 0} проблем
            {critCount > 0 && <span style={{ color: "#e74c3c", fontWeight: 600 }}> ({critCount} критичных)</span>}
            {section.passed?.length > 0 && <span style={{ color: "#27ae60" }}> · {section.passed.length} ок</span>}
          </div>
        </div>
        <span style={{ fontSize: 18, color: "#aaa", transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s" }}>▾</span>
      </div>
      {open && (
        <div style={{ padding: "4px 16px 16px", borderTop: "1px solid #f0f0f0" }}>
          {section.issues?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {section.issues.map((issue, i) => <IssueItem key={i} issue={issue}/>)}
            </div>
          )}
          {section.passed?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {section.passed.map((p, i) => (
                <div key={i} style={{ fontSize: 12, color: "#27ae60", padding: "4px 0",
                  display: "flex", gap: 6, alignItems: "flex-start" }}>
                  <span>✓</span><span>{p}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PriorityMatrix({ fixes }) {
  if (!fixes?.length) return null;
  const impactOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...fixes].sort((a,b) => impactOrder[a.impact] - impactOrder[b.impact]);
  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#222", margin: "0 0 12px",
        textTransform: "uppercase", letterSpacing: "0.05em" }}>📋 Приоритеты фиксов</h3>
      {sorted.map((fix, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start",
          padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, marginBottom: 8 }}>
          <span style={{ fontWeight: 700, color: "#888", fontSize: 12, flexShrink: 0, marginTop: 1 }}>#{fix.rank}</span>
          <div style={{ flex: 1, fontSize: 13, color: "#333" }}>{fix.action}</div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20,
              background: fix.impact === "high" ? "#e74c3c15" : fix.impact === "medium" ? "#f39c1215" : "#eee",
              color: fix.impact === "high" ? "#e74c3c" : fix.impact === "medium" ? "#f39c12" : "#999",
              fontWeight: 600 }}>
              {fix.impact === "high" ? "⬆ высокий" : fix.impact === "medium" ? "→ средний" : "⬇ низкий"}
            </span>
            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 20,
              background: fix.effort === "low" ? "#27ae6015" : "#eee",
              color: fix.effort === "low" ? "#27ae60" : "#999", fontWeight: 600 }}>
              {fix.effort === "low" ? "⚡ быстро" : fix.effort === "medium" ? "⏱ ~день" : "🔧 долго"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function GuideTab() {
  const [active, setActive] = useState("psychology");
  const section = DESIGN_GUIDE[active];
  return (
    <div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {Object.entries(DESIGN_GUIDE).map(([key, sec]) => (
          <button key={key} onClick={() => setActive(key)} style={{
            padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, transition: "all 0.2s",
            background: active === key ? sec.color : "#f0f0f0",
            color: active === key ? "#fff" : "#555"
          }}>{sec.icon} {sec.title}</button>
        ))}
      </div>
      <div style={{ background: section.color + "08", border: `1px solid ${section.color}25`,
        borderRadius: 10, padding: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: section.color, marginBottom: 12 }}>
          {section.icon} {section.title} — правила и примеры
        </div>
        {section.rules.map((r, i) => (
          <div key={i} style={{ marginBottom: 12, paddingBottom: 12,
            borderBottom: i < section.rules.length - 1 ? `1px solid ${section.color}15` : "none" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#222", marginBottom: 4 }}>→ {r.rule}</div>
            <div style={{ fontSize: 12, color: "#666", fontStyle: "italic",
              background: "#fff", padding: "6px 10px", borderRadius: 6, border: "1px solid #eee" }}>
              💬 {r.example}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("audit");
  const [url, setUrl] = useState("https://aidacamp.ru");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const runAudit = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const prompt = `Analyze this website for UI/UX design quality: ${url}
      
Focus on Russian-speaking audience. The site is a children's IT summer camp (ages 7-14).
Target audience: mothers aged 34-45. Analyze for: color contrast, typography, mobile usability, 
layout hierarchy, and color psychology appropriate for both parents and children.
Return ONLY valid JSON as specified.`;

      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4096,
          system: ANTHROPIC_SYSTEM,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();

      if (data.error) throw new Error("API: " + (data.error.message || JSON.stringify(data.error)));
      if (!data.content) throw new Error("No content: " + JSON.stringify(data).slice(0, 200));

      const text = data.content.filter(b => b.type === "text").map(b => b.text).join("");
      if (!text.trim()) throw new Error("Empty response");

      const jsonStart = text.indexOf("{");
      const jsonEnd = text.lastIndexOf("}");
      let raw = jsonStart >= 0 ? text.slice(jsonStart, jsonEnd >= 0 ? jsonEnd + 1 : undefined) : text;

      raw = raw
        .replace(/```json|```/gi, "")
        .replace(/[\u201C\u201D\u00AB\u00BB]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,(\s*[}\]])/g, "$1")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .trim();

      function repairJson(s) {
        let inStr = false, escape = false;
        const stack = [];
        for (let i = 0; i < s.length; i++) {
          const c = s[i];
          if (escape) { escape = false; continue; }
          if (c === "\\") { escape = true; continue; }
          if (c === '"' && !inStr) { inStr = true; continue; }
          if (c === '"' && inStr) { inStr = false; continue; }
          if (inStr) continue;
          if (c === "{") stack.push("}");
          else if (c === "[") stack.push("]");
          else if (c === "}" || c === "]") stack.pop();
        }
        if (inStr) s += '"';
        return s + stack.reverse().join("");
      }

      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        try {
          parsed = JSON.parse(repairJson(raw));
        } catch (e2) {
          throw new Error("Parse failed: " + e2.message + "\nRaw: " + raw.slice(0, 400));
        }
      }
      setResult(parsed);
    } catch (e) {
      setError("Ошибка анализа: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [url]);

  return (
    <div style={{ fontFamily: "'SF Pro Display', -apple-system, sans-serif",
      maxWidth: 680, margin: "0 auto", padding: "20px 16px", background: "#fff", minHeight: "100vh" }}>
      
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
          color: "#888", textTransform: "uppercase", marginBottom: 4 }}>Design Audit Tool</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111", margin: 0, lineHeight: 1.2 }}>
          UI/UX Аудитор
        </h1>
        <p style={{ fontSize: 13, color: "#888", margin: "6px 0 0" }}>
          Контраст · Типографика · Мобилка · Психология цвета
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "2px solid #f0f0f0", marginBottom: 20, gap: 4 }}>
        {[["audit", "🔍 Аудит сайта"], ["guide", "📖 Правила дизайна"]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "8px 16px", border: "none", background: "none", cursor: "pointer",
            fontSize: 13, fontWeight: tab === key ? 700 : 400,
            color: tab === key ? "#111" : "#888",
            borderBottom: tab === key ? "2px solid #111" : "2px solid transparent",
            marginBottom: -2, transition: "all 0.2s"
          }}>{label}</button>
        ))}
      </div>

      {tab === "guide" && <GuideTab/>}

      {tab === "audit" && (
        <div>
          {/* Input */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
            <input value={url} onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && runAudit()}
              placeholder="https://example.com"
              style={{ flex: 1, padding: "11px 14px", border: "1.5px solid #e0e0e0",
                borderRadius: 8, fontSize: 14, outline: "none", fontFamily: "monospace",
                transition: "border 0.2s" }}/>
            <button onClick={runAudit} disabled={loading} style={{
              padding: "11px 20px", background: loading ? "#ccc" : "#111",
              color: "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", transition: "background 0.2s"
            }}>{loading ? "Анализирую..." : "Проверить"}</button>
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 20px", color: "#888" }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>Анализирую дизайн...</div>
              <div style={{ fontSize: 12, marginTop: 6 }}>Проверяю контраст, типографику, мобилку, психологию</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ background: "#fdf2f2", border: "1px solid #e74c3c30",
              borderRadius: 8, padding: 16, color: "#e74c3c", fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Result */}
          {result && !loading && (
            <div>
              {/* Overall score */}
              <div style={{ display: "flex", alignItems: "center", gap: 20,
                background: "#f8f9fa", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
                <ScoreRing score={result.score} size={80}/>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: "#222", marginBottom: 6 }}>
                    Общая оценка дизайна
                  </div>
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.6 }}>{result.summary}</div>
                </div>
              </div>

              {/* Priority fixes */}
              {result.priorityFixes?.length > 0 && <PriorityMatrix fixes={result.priorityFixes}/>}

              {/* Color Psychology Block */}
              {result.colorPalette && (
                <div style={{ background: "#f8f4ff", border: "1px solid #9b59b620",
                  borderRadius: 10, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#8e44ad", marginBottom: 10 }}>
                    🎨 Психология цвета на сайте
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                    {[...(result.colorPalette.dominant||[]), ...(result.colorPalette.accent||[])].map((c, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 6,
                        background: "#fff", borderRadius: 20, padding: "4px 10px 4px 4px",
                        border: "1px solid #eee", fontSize: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: "50%",
                          background: c, border: "1px solid #ddd", flexShrink: 0 }}/>
                        <span style={{ fontFamily: "monospace", color: "#555" }}>{c}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
                    {result.colorPalette.psychology}
                  </div>
                  {result.colorPalette.recommendations?.map((r, i) => (
                    <div key={i} style={{ fontSize: 12, color: "#8e44ad", marginTop: 4,
                      display: "flex", gap: 6 }}>
                      <span>→</span><span>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sections */}
              <div style={{ marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "#888", margin: "0 0 12px",
                  textTransform: "uppercase", letterSpacing: "0.05em" }}>Детальный анализ</h3>
                {result.sections?.map((s, i) => (
                  <SectionCard key={s.id || i} section={s} defaultOpen={i === 0}/>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!result && !loading && !error && (
            <div style={{ textAlign: "center", padding: "32px 20px", color: "#bbb" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎨</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: "#999" }}>
                Введи URL и нажми «Проверить»
              </div>
              <div style={{ fontSize: 12, marginTop: 6 }}>
                Или переключись на вкладку «Правила дизайна» для справочника
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
