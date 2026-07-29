---
import '../styles/global.css';
import LandingLayout from '../layouts/LandingLayout.astro';
import LandingHero from '../components/LandingHero.astro';
import LandingTwoCol from '../components/LandingTwoCol.astro';
import Shifts from '../components/Shifts.astro';
import FAQ from '../components/FAQ.astro';
import RelatedPages from '../components/RelatedPages.astro';
import { getRelatedPages } from '../data/landing-pages';
import Gallery from '../components/Gallery.astro';
import ShiftBookModal from '../components/shifts/ShiftBookModal.astro';
import CourseSchema from '../components/CourseSchema.astro';

const sections = [
  {
    h2: "Как добраться из {{CITY_NAME}} до лагеря АйДаКемп",
    text: "АйДаКемп расположен в санатории «Изумруд» в Наро-Фоминском районе, 66 км от МКАД по Киевскому шоссе. Из {{CITY_NAME}} — около {{DISTANCE_KM}} км, примерно {{DRIVE_TIME}}. Организованный трансфер отправляется от м. Солнцево — стоимость 2 000 ₽."
  },
  {
    h2: "IT-лагерь для детей из {{CITY_NAME}} — что получит ребёнок",
    text: "Школьники 7–15 лет выбирают трек: Python, AI и нейросети, Minecraft, Roblox или 3D-моделирование. Занятия дважды в день по 90 минут, группы до 8 человек. В конце смены — хакатон и готовый проект.",
    list: [
      "IT-программа по выбору: Python, AI, Minecraft, Roblox, 3D-моделирование",
      "Бассейн с ионизированной водой, спортивные площадки, вечерние активности",
      "Комнаты по 2–4 человека с санузлом, 5-разовое питание",
      "Итоговый хакатон — каждый участник представляет собственный проект"
    ]
  },
  {
    h2: "Безопасность и вожатые",
    text: "Один преподаватель на 6–8 участников — маленькие группы, личное внимание. Медработник дежурит круглосуточно. Родители получают фото из лагеря в Telegram-чат отряда каждый день.",
    list: [
      "1 преподаватель на 6–8 ребят",
      "Медработник 24/7, охрана, закрытая территория санатория «Изумруд»",
      "Ежедневные фото в Telegram — родители всегда в курсе",
      "Лицензия Минобрнауки, документы для налогового вычета — оформляем автоматически"
    ]
  },
  {
    h2: "Смены и цены 2026",
    text: "Июльские смены раскупают первыми. Июнь и август ещё открыты.",
    list: [
      "Актуальные даты и цены смен — на aidacamp.ru/ceny",
      "Трансфер от м. Солнцево — 2 000 ₽ отдельно",
      "Налоговый вычет 13% с образовательной части путёвки — оформляется через ФНС"
    ]
  },
  {
    h2: "Отзывы родителей",
    text: "Родители из {{CITY_NAME}} и соседних городов:",
    list: [
      "«Ребёнок вернулся с готовым проектом на Python — показывал всем друзьям» — Елена, {{CITY_NAME}}",
      "«Трансфер от метро очень удобен. Довезла до станции и поехала по делам» — Марина",
      "«Мы выбрали АйДаКемп потому что маленькие группы — максимум 8 человек» — Ольга"
    ]
  }
];
---

<LandingLayout
  heroImage="/images/hero/lager-v-podmoskove.avif"
  title="{{TITLE}}"
  description="{{DESCRIPTION}}"
  h1="{{H1}}"
  canonical="https://aidacamp.ru/{{SLUG}}"
>
  <Fragment slot="head">
    <script type="application/ld+json" set:html={JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "{{FAQ1_Q}}",
          "acceptedAnswer": { "@type": "Answer", "text": "{{FAQ1_A}}" }
        },
        {
          "@type": "Question",
          "name": "{{FAQ2_Q}}",
          "acceptedAnswer": { "@type": "Answer", "text": "{{FAQ2_A}}" }
        },
        {
          "@type": "Question",
          "name": "Сколько стоит лагерь из {{CITY_NAME}} в 2026?",
          "acceptedAnswer": { "@type": "Answer", "text": "Актуальные цены смен — на aidacamp.ru/ceny. Включены проживание, питание, IT-программа, бассейн. Налоговый вычет 13% с образовательной части путёвки — оформляется через ФНС." }
        }
      ]
    })} />
    <CourseSchema
      name="{{H1}}"
      description="{{DESCRIPTION}}"
      url="https://aidacamp.ru/{{SLUG}}"
      ageMin={7}
      ageMax={15}
    />
  </Fragment>
  <LandingHero slot="hero"
    h1="{{H1}}"
    subtitle="{{SUBTITLE}}"
    breadcrumb="{{BREADCRUMB}}"
    keywords={{{HERO_KEYWORDS}}}
    image="/images/hero/lager-v-podmoskove.avif"
    imageAlt="{{IMAGE_ALT}}"
  />
  <LandingTwoCol sections={sections} />
  <Gallery />
  <Shifts />
  <FAQ />
  <ShiftBookModal />
  <div class="mx-auto max-w-[720px] px-4 py-6 text-center">
    <p class="text-[14px] text-slate-500">
      Подробнее: <a href="/" class="text-primary hover:underline">детский IT-лагерь в Подмосковье</a>
    </p>
  </div>
  <RelatedPages pages={getRelatedPages(Astro.url.pathname)} />
</LandingLayout>
