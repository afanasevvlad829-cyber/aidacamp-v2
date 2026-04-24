"""Яндекс XML API (XMLStock) интеграция.

Документация: https://xmlstock.com/?do=help-yaxml-connect

Поддерживаемые эндпоинты:
  - yandex: https://xmlstock.com/yandex/xml/ (стандартный индекс Яндекса)
  - yandex_live: https://xmlstock.com/yandexlive/xml/ (свежие результаты)
  - google: https://xmlstock.com/google/xml/ (индекс Google)

Параметры:
  - user: ID пользователя в XMLStock
  - key: API ключ (можно менять в любой момент)
  - query: поисковый запрос
  - page: номер страницы результатов (опционально)
  - endpoint: тип поиска ('yandex', 'yandex_live', 'google')

Ограничения:
  - Максимум 50 одновременных потоков
  - Максимум 100 запросов в секунду
  - Формат: только XML (не JSON/HTML)
"""

import os
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Literal

# ── Конфиг ────────────────────────────────────────────────────────────────────

YAXML_USER = os.environ.get("YAXML_USER", "")
YAXML_KEY = os.environ.get("YAXML_KEY", "")

# Доступные эндпоинты XMLStock
ENDPOINTS = {
    "yandex": "https://xmlstock.com/yandex/xml/",
    "yandex_live": "https://xmlstock.com/yandexlive/xml/",
    "google": "https://xmlstock.com/google/xml/",
}

# ── Проверка ──────────────────────────────────────────────────────────────────

def ensure_credentials():
    """Проверить наличие credentials. Вернуть (user, key) или raise."""
    if not YAXML_USER or not YAXML_KEY:
        raise ValueError(
            "❌ YAXML credentials не настроены.\n"
            "Установите переменные окружения:\n"
            "  YAXML_USER=<ваш_id>\n"
            "  YAXML_KEY=<ваш_ключ>\n\n"
            "Получить можно на: https://xmlstock.com/"
        )
    return YAXML_USER, YAXML_KEY


# ── API Запросы ───────────────────────────────────────────────────────────────

def search(
    query: str,
    page: int = 1,
    user: Optional[str] = None,
    key: Optional[str] = None,
    endpoint: Literal["yandex", "yandex_live", "google"] = "yandex_live"
) -> Dict:
    """Поиск через XMLStock API.

    Args:
        query: поисковый запрос
        page: номер страницы (1-10)
        user: USER_ID (если не указан, берется из YAXML_USER)
        key: API_KEY (если не указан, берется из YAXML_KEY)
        endpoint: тип поиска ('yandex', 'yandex_live', 'google')
                 - yandex: стандартный индекс Яндекса
                 - yandex_live: свежие результаты из Яндекса
                 - google: индекс Google

    Returns:
        {
            "success": bool,
            "results": [{"title": str, "url": str, "snippet": str}, ...],
            "total": int,  # всего результатов
            "pages": int   # всего страниц
        }

    Raises:
        ValueError: если credentials отсутствуют
        urllib.error.URLError: если API недоступен
    """
    if not user or not key:
        user, key = ensure_credentials()

    if endpoint not in ENDPOINTS:
        return {
            "success": False,
            "error": f"Unknown endpoint '{endpoint}'. Valid: {list(ENDPOINTS.keys())}",
            "results": []
        }

    params = urllib.parse.urlencode({
        "user": user,
        "key": key,
        "query": query,
        "page": page
    })

    url = f"{ENDPOINTS[endpoint]}?{params}"

    try:
        with urllib.request.urlopen(url, timeout=30) as response:
            xml_data = response.read().decode('utf-8')

        return _parse_yaxml_response(xml_data)

    except urllib.error.HTTPError as e:
        return {
            "success": False,
            "error": f"HTTP {e.code}: {e.reason}",
            "results": []
        }
    except urllib.error.URLError as e:
        return {
            "success": False,
            "error": f"Network error: {e.reason}",
            "results": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


def _parse_yaxml_response(xml_data: str) -> Dict:
    """Парсить XML ответ от Яндекс XML API."""
    try:
        root = ET.fromstring(xml_data)

        # Проверка на ошибки в ответе
        error = root.find(".//error")
        if error is not None:
            return {
                "success": False,
                "error": error.text or "Unknown API error",
                "results": []
            }

        results = []
        for doc in root.findall(".//doc"):
            title_elem = doc.find("title")
            url_elem = doc.find("url")
            snippet_elem = doc.find("snippet")

            results.append({
                "title": title_elem.text if title_elem is not None else "",
                "url": url_elem.text if url_elem is not None else "",
                "snippet": snippet_elem.text if snippet_elem is not None else ""
            })

        # Метаданные
        request_elem = root.find(".//request")
        total_results = 0
        pages = 0

        if request_elem is not None:
            query_elem = request_elem.find("query")
            results_elem = request_elem.find("results-total")
            results_pages = request_elem.find("results-pages")

            if results_elem is not None:
                try:
                    total_results = int(results_elem.text)
                except (ValueError, TypeError):
                    pass

            if results_pages is not None:
                try:
                    pages = int(results_pages.text)
                except (ValueError, TypeError):
                    pass

        return {
            "success": True,
            "results": results,
            "total": total_results,
            "pages": pages
        }

    except ET.ParseError as e:
        return {
            "success": False,
            "error": f"XML parse error: {e}",
            "results": []
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "results": []
        }


def search_batch(
    queries: List[str],
    page: int = 1,
    delay_between_requests: float = 0.1,
    endpoint: Literal["yandex", "yandex_live", "google"] = "yandex_live"
) -> Dict[str, Dict]:
    """Пакетный поиск нескольких запросов.

    ⚠️ ВАЖНО: Не более 100 запросов в секунду и 50 одновременных потоков!

    Args:
        queries: список поисковых запросов
        page: номер страницы для всех запросов
        delay_between_requests: задержка между запросами в секундах
        endpoint: тип поиска ('yandex', 'yandex_live', 'google')

    Returns:
        {
            "query1": {"success": bool, "results": [...], ...},
            "query2": {...},
            ...
        }
    """
    import time
    results = {}

    for i, query in enumerate(queries):
        if i > 0:
            time.sleep(delay_between_requests)

        results[query] = search(query, page, endpoint=endpoint)

    return results


# ── Утилиты ───────────────────────────────────────────────────────────────────

def validate_credentials(user: str, key: str) -> bool:
    """Проверить корректность credentials простым запросом.

    Returns:
        True если credentials работают, False иначе
    """
    try:
        result = search("test", user=user, key=key)
        return result.get("success", False)
    except Exception:
        return False


def get_credentials_from_env() -> tuple:
    """Получить credentials из окружения.

    Returns:
        (user, key) или (None, None)
    """
    return YAXML_USER or None, YAXML_KEY or None
