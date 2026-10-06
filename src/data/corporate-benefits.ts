/** Справочник названий работодателей. Наличие бренда не подтверждает льготы.
 * BestBenefits указывается только по предоставленному списку и опубликованным источникам.
 * ИНН не используются; условия всегда уточняются у HR.
 */
import directoryCompanies from './corporate-company-directory.json';
export interface CorporateCompany {
  name: string;
  aliases: string[];
  programs: { name: string; sourceAsOf: string; offerUrl?: string; sourceUrl?: string }[];
}
export const BESTBENEFITS_OFFER_URL = 'https://bestbenefits.ru/product/8024';
export const corporateCompanies: CorporateCompany[] = [
  {
    "name": "Highland Gold",
    "aliases": [
      "Хайлэнд Голд",
      "Ареал"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Сибур",
    "aliases": [
      "Sibur"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "НЛМК",
    "aliases": [
      "NLMK",
      "Новолипецкий металлургический комбинат"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Северсталь",
    "aliases": [
      "Severstal"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      },
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Еврохим",
    "aliases": [
      "Eurochem"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Черкизово",
    "aliases": [
      "Cherkizovo"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "СДЭК",
    "aliases": [
      "CDEK"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Сегежа Групп",
    "aliases": [
      "Segezha Group",
      "Сегежа"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      },
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Самолет",
    "aliases": [
      "Самолёт",
      "Samolet"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Level Group",
    "aliases": [
      "Левел Груп",
      "Левел Групп",
      "Level"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "БКС",
    "aliases": [
      "BCS"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Рольф",
    "aliases": [
      "Rolf"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Росатом",
    "aliases": [
      "Rosatom",
      "структуры Росатома"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Яковлев",
    "aliases": [
      "Иркут",
      "Yakovlev"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "VK",
    "aliases": [
      "ВК",
      "Mail.ru",
      "Мейл.ру"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      },
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://vc.ru/insidevk/3127074-kod-zaboty-vk-sistema-lgot"
      }
    ]
  },
  {
    "name": "Ozon",
    "aliases": [
      "Озон"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "WB",
    "aliases": [
      "Wildberries",
      "Вайлдберриз",
      "ВБ",
      "РВБ"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Авито",
    "aliases": [
      "Avito",
      "Кех Екоммерц"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Т1",
    "aliases": [
      "T1",
      "Холдинг Т1"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "КРОК",
    "aliases": [
      "CROC"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Инфосистемы Джет",
    "aliases": [
      "Jet",
      "Джет"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Ланит",
    "aliases": [
      "Lanit"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Циан",
    "aliases": [
      "Cian"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      },
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Ядро",
    "aliases": [
      "Yadro",
      "КНС Групп"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "J&J",
    "aliases": [
      "Johnson & Johnson",
      "Johnson and Johnson",
      "Джонсон",
      "Джонсон энд Джонсон"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Sanofi",
    "aliases": [
      "Санофи"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Фармстандарт",
    "aliases": [
      "Pharmstandard"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Валента Фарм",
    "aliases": [
      "Valenta",
      "Валента Фармацевтика"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Sotex",
    "aliases": [
      "Сотекс",
      "Фармфирма Сотекс"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Лундбек",
    "aliases": [
      "Lundbeck"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Байер",
    "aliases": [
      "Bayer"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Мерц Фарма",
    "aliases": [
      "Merz",
      "Merz Pharma"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Биннофарм Групп",
    "aliases": [
      "Binnopharm",
      "Биннофарм"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Акрихин",
    "aliases": [
      "Akrikhin"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "ВТБ",
    "aliases": [
      "VTB"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Альфа-Банк",
    "aliases": [
      "Альфа Банк",
      "Alfa Bank",
      "Alfabank"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Т-Банк",
    "aliases": [
      "Т Банк",
      "ТБанк",
      "Тинькофф",
      "T-Bank",
      "Tinkoff"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "ПСБ",
    "aliases": [
      "Промсвязьбанк",
      "PSB"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Совкомбанк",
    "aliases": [
      "Sovcombank"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Россельхозбанк",
    "aliases": [
      "РСХБ",
      "RSHB"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "МКБ",
    "aliases": [
      "Московский Кредитный Банк",
      "MKB"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Уралсиб",
    "aliases": [
      "Uralsib"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "ОТП",
    "aliases": [
      "ОТП Банк",
      "OTP Bank"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Балтика",
    "aliases": [
      "Baltika"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "BAT",
    "aliases": [
      "БАТ",
      "British American Tobacco",
      "ITMS",
      "ИТМС"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Kimberly Clark",
    "aliases": [
      "Кимберли Кларк",
      "Kimberly-Clark"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Kraft Heinz",
    "aliases": [
      "Крафт Хайнц",
      "КрафтХайнц Восток",
      "КХВ"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Jacobs",
    "aliases": [
      "Якобс",
      "Jacobs Douwe Egberts",
      "JDE",
      "Якобс Рус"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Спортмастер",
    "aliases": [
      "Sportmaster"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "М.Видео",
    "aliases": [
      "М Видео",
      "МВидео",
      "M.Video",
      "МВМ"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Все Инструменты",
    "aliases": [
      "ВсеИнструменты",
      "ВсеИнструменты.ру",
      "Vseinstrumenti"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Детский Мир",
    "aliases": [
      "Детмир",
      "Detmir"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Лемана Про",
    "aliases": [
      "Лемана ПРО",
      "Леруа Мерлен",
      "Lemana Pro",
      "Leroy Merlin",
      "Ле Монлид"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Лента",
    "aliases": [
      "Lenta"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      },
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Билайн",
    "aliases": [
      "Beeline",
      "Вымпелком",
      "Вымпел-Коммуникации"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Теле2",
    "aliases": [
      "Tele2",
      "T2",
      "Т2",
      "Т2 Мобайл"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Мегафон",
    "aliases": [
      "Megafon"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "МТС",
    "aliases": [
      "MTS",
      "Мобильные ТелеСистемы"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Ренессанс Страхование",
    "aliases": [
      "Renaissance Insurance",
      "Ренессанс"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Росгосстрах",
    "aliases": [
      "RGS",
      "РГС"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Альфа Страхование",
    "aliases": [
      "Альфастрахование",
      "AlfaStrakhovanie"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-02",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Ситроникс",
    "aliases": [
      "Sitronics"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Positive Technologies",
    "aliases": [
      "Позитив Текнолоджиз",
      "Позитив"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Русский Стандарт",
    "aliases": [
      "Банк Русский Стандарт"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Мангазея Девелопмент",
    "aliases": [
      "Mangazeya"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Coldy",
    "aliases": [
      "Колди"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Галс",
    "aliases": [
      "Галс-Девелопмент"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Азбука Вкуса",
    "aliases": [
      "Azbuka Vkusa"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Barilla",
    "aliases": [
      "Барилла"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Биокад",
    "aliases": [
      "Biocad"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Генериум",
    "aliases": [
      "Generium"
    ],
    "programs": [
      {
        "name": "BestBenefits",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://career.habr.com/companies/bestbenefits",
        "offerUrl": "https://bestbenefits.ru/product/8024"
      }
    ]
  },
  {
    "name": "Россети",
    "aliases": [
      "Rosseti"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Глобал Портс",
    "aliases": [
      "Global Ports",
      "Globalports"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Технониколь",
    "aliases": [
      "ТехноНИКОЛЬ",
      "Technonikol"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Башкирэнерго",
    "aliases": [
      "Bashkirenergo"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "IFCM",
    "aliases": [
      "АйЭфСиЭм"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Nordgold",
    "aliases": [
      "Нордголд",
      "Норд Голд"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "А Деньги",
    "aliases": [
      "А-Деньги",
      "АДеньги"
    ],
    "programs": [
      {
        "name": "Aladdin",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://aladdin.store/"
      }
    ]
  },
  {
    "name": "Корпорация Кошелев",
    "aliases": [
      "Кошелев",
      "Кошелёв",
      "Кошелев-Проект",
      "Koshelev"
    ],
    "programs": [
      {
        "name": "PremiumCode",
        "sourceAsOf": "2026-10-06",
        "sourceUrl": "https://hh.ru/employer/140494"
      }
    ]
  }
,
  ...directoryCompanies.map(company => ({ ...company, programs: [] })),
];
