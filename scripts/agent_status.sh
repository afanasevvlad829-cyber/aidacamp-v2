#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HEARTBEAT_DIR="$ROOT/logs/agent-heartbeats"
REGISTRY="$ROOT/.agent-registry.json"
NOW=$(date +%s)
BOLD='\033[1m'; NC='\033[0m'

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║          AidaCamp Agent Monitor                      ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════╝${NC}"
echo -e "  Время: $(date '+%H:%M:%S %d.%m.%Y')"
echo ""

python3 << PYEOF
import json, os, glob

hb_dir = "$HEARTBEAT_DIR"
registry_path = "$REGISTRY"
now = $NOW
TIMEOUT = 120

agents_info = {}
if os.path.exists(registry_path):
    data = json.load(open(registry_path))
    for a in data.get("agents", []):
        agents_info[a["slug"]] = {"status": a.get("status","?"), "started_at": a.get("started_at","")[:16].replace("T"," ")}

for hb_file in glob.glob(os.path.join(hb_dir, "*.json")):
    slug = os.path.basename(hb_file).replace(".json","")
    if slug not in agents_info:
        agents_info[slug] = {"status": "in_progress", "started_at": "?"}

if not agents_info:
    print("  Нет агентов")
else:
    for slug, info in agents_info.items():
        hb_file = os.path.join(hb_dir, f"{slug}.json")
        if not os.path.exists(hb_file):
            print(f"  🔵  {slug}\n       нет heartbeat\n")
            continue
        hb = json.load(open(hb_file))
        epoch = hb.get("epoch", 0)
        delta = now - epoch
        step  = hb.get("step", "?")
        ts    = hb.get("timestamp","?")[11:19]
        if delta > TIMEOUT:
            icon, state = "🔴", f"МЁРТВ — молчит {delta//60} мин"
        elif delta > TIMEOUT // 2:
            icon, state = "🟡", f"МЕДЛЕННО — {delta}с без пинга"
        else:
            icon, state = "🟢", f"ОК — пинг {delta}с назад"
        print(f"  {icon}  {slug}\n       {state}\n       шаг: {step}\n       последний пинг: {ts} UTC\n")
PYEOF
