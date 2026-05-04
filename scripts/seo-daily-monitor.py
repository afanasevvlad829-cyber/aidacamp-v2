#!/usr/bin/env python3
"""
SEO Daily Monitor — Ежедневный мониторинг 130 ключевых слов
Проверяет позиции, CTR, клики, конверсии и отправляет отчет в Telegram
"""

import json
import csv
import os
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
import subprocess
import requests
from typing import Dict, List, Tuple

# ===== CONFIG =====
KEYWORDS_FILE = "/Users/vladimirafanasev/Aidacamp-cloude/scripts/keywords-130.txt"
LOG_DIR = "/Users/vladimirafanasev/Aidacamp-cloude/_notes/SEO/logs"
TELEGRAM_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Используем локальную директорию для отчетов (затем копируем на сервер при успехе)
REPORTS_DIR = os.getenv("SEO_REPORTS_DIR", "/var/www/dev/screenshots")
# Fallback на локальную директорию если нет доступа к /var/www
if not os.access(os.path.dirname(REPORTS_DIR), os.W_OK):
    REPORTS_DIR = "/Users/vladimirafanasev/Aidacamp-cloude/_notes/SEO/reports"

# ===== DATA STRUCTURES =====

class KeywordMetrics:
    """Метрики одного ключевого слова"""
    def __init__(self, keyword: str):
        self.keyword = keyword
        self.position_today = None
        self.position_yesterday = None
        self.impressions_today = 0
        self.clicks_today = 0
        self.ctr_today = 0.0
        self.conversions = 0
        self.cr = 0.0

    def position_change(self) -> Tuple[float, str]:
        """Изменение позиции (вверх/вниз)"""
        if self.position_yesterday is None:
            return 0, "—"

        change = self.position_yesterday - self.position_today
        direction = "↑" if change > 0 else "↓" if change < 0 else "→"
        return change, direction

    def to_dict(self) -> dict:
        change, direction = self.position_change()
        return {
            "keyword": self.keyword,
            "position_today": self.position_today,
            "position_yesterday": self.position_yesterday,
            "position_change": change,
            "direction": direction,
            "impressions": self.impressions_today,
            "clicks": self.clicks_today,
            "ctr": f"{self.ctr_today:.1f}%",
            "conversions": self.conversions,
            "cr": f"{self.cr:.1f}%" if self.conversions > 0 else "—"
        }

# ===== DATA COLLECTION =====

def load_keywords() -> List[str]:
    """Загрузить 130 ключевых слов"""
    try:
        with open(KEYWORDS_FILE, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f.readlines() if line.strip()]
    except FileNotFoundError:
        print(f"ERROR: Keywords file not found: {KEYWORDS_FILE}")
        sys.exit(1)

def get_positions_from_arsenkin(keywords: List[str]) -> Dict[str, float]:
    """Вытянуть позиции из seo_position_snapshots или кеша"""
    positions = {}

    try:
        # Попытаемся загрузить позиции из таблицы seo_position_snapshots
        result = subprocess.run(
            ["./scripts/stats.sh", "query",
             "SELECT keyword, position FROM seo_position_snapshots WHERE snapshot_date = CURRENT_DATE AND position IS NOT NULL ORDER BY keyword"],
            cwd="/Users/vladimirafanasev/Aidacamp-cloude",
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            # Парсим результат (TSV формат)
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line and not line.startswith('keyword'):
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 2:
                        try:
                            kw = parts[0]
                            pos = float(parts[1]) if parts[1] else 0
                            positions[kw] = pos
                        except (ValueError, IndexError):
                            continue

            print(f"[Positions] Загружены позиции для {len(positions)} ключей из seo_position_snapshots")
        else:
            print(f"[Positions] Ошибка запроса: {result.stderr[:200]}")

    except subprocess.TimeoutExpired:
        print("[Positions] Timeout при запросе позиций")
    except Exception as e:
        print(f"[Positions] Ошибка загрузки: {e}")

    # Заполнить недостающие значения нулями (позиции не найдены в snapshot)
    for kw in keywords:
        if kw not in positions:
            positions[kw] = 0  # Placeholder для отсутствующих позиций

    return positions

def get_metrics_from_yandex_webmaster() -> Dict[str, Dict]:
    """Вытянуть CTR, клики, показы из таблицы seo_position_snapshots"""
    metrics = {}

    try:
        # Используем stats.sh для получения статистики из PostgreSQL
        result = subprocess.run(
            ["./scripts/stats.sh", "query",
             "SELECT keyword, SUM(impressions) as impressions, SUM(clicks) as clicks, AVG(ctr) as ctr FROM seo_position_snapshots WHERE snapshot_date = CURRENT_DATE GROUP BY keyword ORDER BY impressions DESC"],
            cwd="/Users/vladimirafanasev/Aidacamp-cloude",
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0:
            # Парсим результат (TSV формат)
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line and not line.startswith('keyword'):
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 4:
                        try:
                            kw = parts[0]
                            impressions = int(float(parts[1])) if parts[1] else 0
                            clicks = int(float(parts[2])) if parts[2] else 0
                            ctr = float(parts[3]) if parts[3] else 0.0

                            metrics[kw] = {
                                'impressions': impressions,
                                'clicks': clicks,
                                'ctr': ctr
                            }
                        except (ValueError, IndexError):
                            continue

            print(f"[Webmaster] Загружены метрики для {len(metrics)} ключей")
        else:
            print(f"[Webmaster] Ошибка запроса: {result.stderr[:200]}")

    except subprocess.TimeoutExpired:
        print("[Webmaster] Timeout при запросе к БД")
    except Exception as e:
        print(f"[Webmaster] Ошибка: {e}")

    return metrics

def get_conversions_from_metrika() -> Dict[str, int]:
    """Вытянуть общие конверсии по целям из Яндекс.Метрики"""
    conversions = {}

    try:
        # Используем stats.sh для получения данных по целям из PostgreSQL
        result = subprocess.run(
            ["./scripts/stats.sh", "query",
             "SELECT source, SUM(reaches) as total_reaches FROM metrika_goals WHERE date = CURRENT_DATE GROUP BY source ORDER BY total_reaches DESC LIMIT 50"],
            cwd="/Users/vladimirafanasev/Aidacamp-cloude",
            capture_output=True,
            text=True,
            timeout=30
        )

        if result.returncode == 0 and result.stdout.strip():
            # Парсим результат (TSV формат)
            total_conversions = 0
            lines = result.stdout.strip().split('\n')
            for line in lines:
                if line and not line.startswith('source'):
                    parts = [p.strip() for p in line.split('|')]
                    if len(parts) >= 2:
                        try:
                            source = parts[0]
                            reaches = int(float(parts[1])) if parts[1] else 0
                            total_conversions += reaches

                            # Сохраняем каждый источник отдельно
                            if source:
                                conversions[source] = reaches
                        except (ValueError, IndexError):
                            continue

            if conversions:
                print(f"[Metrika] Загружены {total_conversions} конверсий по {len(conversions)} источникам")
            else:
                print(f"[Metrika] Нет данных конверсий на сегодня (может быть, это выходной день или просто нет трафика)")
        else:
            if result.returncode != 0:
                print(f"[Metrika] Ошибка запроса: {result.stderr[:200]}")

    except subprocess.TimeoutExpired:
        print("[Metrika] Timeout при запросе к БД")
    except Exception as e:
        print(f"[Metrika] Ошибка: {e}")

    return conversions

def load_yesterday_metrics() -> Dict[str, Dict]:
    """Загрузить метрики вчерашнего дня из лога"""
    yesterday_file = Path(LOG_DIR) / f"metrics-{(datetime.now() - timedelta(days=1)).strftime('%Y-%m-%d')}.json"

    if not yesterday_file.exists():
        print(f"[Log] Вчерашних данных нет: {yesterday_file}")
        return {}

    try:
        with open(yesterday_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            # Возвращаем raw данные для использования в main
            return data
    except Exception as e:
        print(f"[Log] Ошибка загрузки вчерашних данных: {e}")
        return {}

# ===== REPORT GENERATION =====

def generate_html_report(metrics_list: List[KeywordMetrics], timestamp: str) -> str:
    """Генерировать красивый HTML-отчет"""

    # Категоризация
    grown = [m for m in metrics_list if m.position_change()[0] > 0]
    fallen = [m for m in metrics_list if m.position_change()[0] < 0]
    stable = [m for m in metrics_list if m.position_change()[0] == 0]

    top_10 = sorted([m for m in metrics_list if m.position_today and m.position_today <= 10],
                    key=lambda x: x.position_today)

    html = f"""
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Daily Report — {timestamp}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: #1a1f35; border-radius: 12px; padding: 30px; }}

        .header {{ text-align: center; margin-bottom: 40px; border-bottom: 2px solid #334155; padding-bottom: 20px; }}
        .header h1 {{ font-size: 28px; margin-bottom: 5px; color: #f1f5f9; }}
        .header .date {{ color: #94a3b8; font-size: 14px; }}

        .summary {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }}
        .summary-card {{ background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 15px; text-align: center; }}
        .summary-card .number {{ font-size: 24px; font-weight: 700; margin-bottom: 5px; }}
        .summary-card .label {{ font-size: 12px; color: #94a3b8; text-transform: uppercase; }}
        .summary-card.growth .number {{ color: #10b981; }}
        .summary-card.decline .number {{ color: #ef4444; }}
        .summary-card.neutral .number {{ color: #06b6d4; }}

        .section {{ margin-bottom: 35px; }}
        .section h2 {{ font-size: 18px; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #334155; }}

        table {{ width: 100%; border-collapse: collapse; font-size: 13px; }}
        th {{ background: #0f172a; padding: 12px; text-align: left; font-weight: 600; color: #cbd5e1; border-bottom: 1px solid #334155; }}
        td {{ padding: 10px 12px; border-bottom: 1px solid #334155; }}
        tr:hover {{ background: #1e293b; }}

        .keyword {{ font-weight: 500; color: #f1f5f9; }}
        .position {{ text-align: center; }}
        .position.top {{ color: #10b981; font-weight: 600; }}
        .position.mid {{ color: #f59e0b; }}
        .position.low {{ color: #ef4444; }}

        .change {{ text-align: center; font-weight: 600; }}
        .change.up {{ color: #10b981; }}
        .change.down {{ color: #ef4444; }}
        .change.stable {{ color: #64748b; }}

        .ctr {{ text-align: right; }}
        .clicks {{ text-align: right; }}
        .conversions {{ text-align: right; font-weight: 600; }}

        .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; text-align: center; color: #94a3b8; font-size: 12px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 SEO Daily Report</h1>
            <p class="date">{timestamp}</p>
        </div>

        <div class="summary">
            <div class="summary-card growth">
                <div class="number">🟢 {len(grown)}</div>
                <div class="label">Выросли позиции</div>
            </div>
            <div class="summary-card decline">
                <div class="number">🔴 {len(fallen)}</div>
                <div class="label">Упали позиции</div>
            </div>
            <div class="summary-card neutral">
                <div class="number">→ {len(stable)}</div>
                <div class="label">Без изменений</div>
            </div>
            <div class="summary-card neutral">
                <div class="number">⭐ {len(top_10)}</div>
                <div class="label">В TOP-10</div>
            </div>
        </div>

        <div class="section">
            <h2>🟢 Выросли позиции ({len(grown)})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ключевое слово</th>
                        <th class="position">Позиция</th>
                        <th class="change">Изменение</th>
                        <th class="clicks">Клики</th>
                        <th class="ctr">CTR</th>
                        <th class="conversions">Конверсии</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(f'''
                    <tr>
                        <td class="keyword">{m.keyword}</td>
                        <td class="position top">{m.position_today or "—"}</td>
                        <td class="change up">↑ {m.position_change()[0]:+.1f}</td>
                        <td class="clicks">{m.clicks_today}</td>
                        <td class="ctr">{m.ctr_today:.1f}%</td>
                        <td class="conversions">{m.conversions}</td>
                    </tr>''' for m in sorted(grown, key=lambda x: x.position_change()[0], reverse=True)[:20])}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>⭐ TOP-10 позиции ({len(top_10)})</h2>
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Ключевое слово</th>
                        <th class="position">Позиция</th>
                        <th class="clicks">Клики</th>
                        <th class="ctr">CTR</th>
                        <th class="conversions">CR%</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(f'''
                    <tr>
                        <td>{i+1}</td>
                        <td class="keyword">{m.keyword}</td>
                        <td class="position top">{m.position_today}</td>
                        <td class="clicks">{m.clicks_today}</td>
                        <td class="ctr">{m.ctr_today:.1f}%</td>
                        <td class="conversions">{m.cr:.1f}%</td>
                    </tr>''' for i, m in enumerate(top_10[:10]))}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>🔴 Упали позиции ({len(fallen)})</h2>
            <table>
                <thead>
                    <tr>
                        <th>Ключевое слово</th>
                        <th class="position">Позиция</th>
                        <th class="change">Изменение</th>
                        <th class="clicks">Клики</th>
                        <th class="ctr">CTR</th>
                        <th class="conversions">Конверсии</th>
                    </tr>
                </thead>
                <tbody>
                    {''.join(f'''
                    <tr>
                        <td class="keyword">{m.keyword}</td>
                        <td class="position low">{m.position_today or "—"}</td>
                        <td class="change down">↓ {m.position_change()[0]:+.1f}</td>
                        <td class="clicks">{m.clicks_today}</td>
                        <td class="ctr">{m.ctr_today:.1f}%</td>
                        <td class="conversions">{m.conversions}</td>
                    </tr>''' for m in sorted(fallen, key=lambda x: x.position_change()[0])[:20])}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>🤖 Automated SEO Monitoring System — АйДаКемп</p>
            <p>Следующий отчет завтра в 07:00 UTC+3</p>
        </div>
    </div>
</body>
</html>
"""
    return html

# ===== TELEGRAM INTEGRATION =====

def send_to_telegram(html_content: str, report_date: str) -> bool:
    """Сохранить отчет и отправить ссылку в Telegram"""
    # ВСЕГДА сохраняем HTML файл (независимо от Telegram)
    try:
        os.makedirs(REPORTS_DIR, exist_ok=True)
    except PermissionError:
        print(f"[Report] Нет доступа к {REPORTS_DIR}, используем локальную директорию")
        reports_dir = "/Users/vladimirafanasev/Aidacamp-cloude/_notes/SEO/reports"
        os.makedirs(reports_dir, exist_ok=True)
    else:
        reports_dir = REPORTS_DIR

    report_file = f"{reports_dir}/seo-report-{report_date}.html"

    try:
        with open(report_file, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"[Report] Отчет сохранен: {report_file}")
    except Exception as e:
        print(f"[Report] Ошибка сохранения: {e}")
        return False

    # Отправить ссылку в Telegram (если есть токен)
    if not TELEGRAM_TOKEN or not TELEGRAM_CHAT_ID:
        print("[Telegram] Токен или chat_id не установлены, отчет сохранен локально")
        return True  # Возвращаем True, так как файл успешно сохранен

    # Определяем URL в зависимости от директории
    if "var/www" in reports_dir:
        url = f"https://dev.aidacamp.ru/screenshots/seo-report-{report_date}.html"
    else:
        # Локальная директория - предоставляем локальный путь
        url = f"file://{report_file}"

    message = f"""
📊 *SEO Daily Report — {report_date}*

Отчет готов! Смотри подробный анализ:
[Открыть полный отчет]({url})

🤖 _Automated monitoring system_
"""

    try:
        api_url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        response = requests.post(api_url, json={
            "chat_id": TELEGRAM_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown",
            "disable_web_page_preview": False
        }, timeout=10)

        if response.status_code == 200:
            print(f"[Telegram] Отчет отправлен в чат {TELEGRAM_CHAT_ID}")
            return True
        else:
            print(f"[Telegram] Ошибка отправки (HTTP {response.status_code})")
            return False
    except Exception as e:
        print(f"[Telegram] Ошибка отправки: {e}")
        return False

# ===== LOGGING =====

def save_metrics_log(metrics_list: List[KeywordMetrics], report_date: str):
    """Сохранить метрики в лог для завтрашнего сравнения"""
    os.makedirs(LOG_DIR, exist_ok=True)

    log_file = Path(LOG_DIR) / f"metrics-{report_date}.json"

    data = {m.keyword: m.to_dict() for m in metrics_list}

    with open(log_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[Log] Метрики сохранены: {log_file}")

# ===== MAIN =====

def main():
    print(f"\n{'='*60}")
    print(f"SEO Daily Monitor — {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'='*60}\n")

    # Убедимся что нужные директории существуют
    os.makedirs(LOG_DIR, exist_ok=True)
    os.makedirs(REPORTS_DIR, exist_ok=True)

    report_date = datetime.now().strftime('%Y-%m-%d')

    # 1. Загрузить ключевые слова
    keywords = load_keywords()
    print(f"[Load] Загружено {len(keywords)} ключевых слов")

    # 2. Получить данные
    positions = get_positions_from_arsenkin(keywords)
    webmaster_metrics = get_metrics_from_yandex_webmaster()
    conversions = get_conversions_from_metrika()
    yesterday_metrics = load_yesterday_metrics()

    # 3. Объединить данные
    metrics_list = []
    for keyword in keywords:
        m = KeywordMetrics(keyword)
        m.position_today = positions.get(keyword)

        wm_data = webmaster_metrics.get(keyword, {})
        m.impressions_today = wm_data.get('impressions', 0)
        m.clicks_today = wm_data.get('clicks', 0)
        m.ctr_today = wm_data.get('ctr', 0.0)

        m.conversions = conversions.get(keyword, 0)
        if m.clicks_today > 0:
            m.cr = (m.conversions / m.clicks_today) * 100

        # Загрузить позицию вчера для сравнения
        if keyword in yesterday_metrics:
            yesterday_data = yesterday_metrics[keyword]
            m.position_yesterday = yesterday_data.get('position_today', None)

        metrics_list.append(m)

    # 4. Генерировать отчет
    html_report = generate_html_report(metrics_list, report_date)

    # 5. Отправить в Telegram
    send_to_telegram(html_report, report_date)

    # 6. Сохранить лог
    save_metrics_log(metrics_list, report_date)

    print(f"\n{'='*60}")
    print("✅ Мониторинг завершен успешно")
    print(f"{'='*60}\n")

if __name__ == "__main__":
    main()
