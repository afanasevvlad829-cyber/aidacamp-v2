---
import '../styles/global.css';
import LandingLayout from '../layouts/LandingLayout.astro';
import Shifts from '../components/Shifts.astro';
import FAQ from '../components/FAQ.astro';
import RelatedPages from '../components/RelatedPages.astro';
import { getRelatedPages } from '../data/landing-pages';
import ShiftBookModal from '../components/shifts/ShiftBookModal.astro';
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
          "name": "{{FAQ3_Q}}",
          "acceptedAnswer": { "@type": "Answer", "text": "{{FAQ3_A}}" }
        }
      ]
    })} />
  </Fragment>

  <main class="mx-auto max-w-[720px] px-4 py-10">
    <h1 class="text-[28px] md:text-[36px] font-bold text-body leading-tight tracking-[-0.02em] mb-6">
      {{H1}}
    </h1>

    <div class="prose prose-lg max-w-none text-body-muted leading-relaxed">
      <p>{{INTRO_P1}}</p>
      <p>{{INTRO_P2}}</p>
    </div>

    <ul class="mt-6 space-y-2">
      {{#BULLETS}}
      <li class="flex items-start gap-2 text-[16px] text-body">
        <i class="bi bi-check-lg text-primary mt-0.5 shrink-0" aria-hidden="true"></i>
        <span>{{BULLET}}</span>
      </li>
      {{/BULLETS}}
    </ul>

    <div class="mt-8 p-5 bg-orange-50 rounded-[16px] border border-orange-100">
      <p class="text-[15px] text-slate-700">
        <strong>АйДаКемп</strong> — детский IT-лагерь в Подмосковье, 66 км от МКАД.
        Python, AI, Minecraft для школьников 7–15 лет. Летние смены 2026, актуальные цены — на aidacamp.ru/ceny.
        Налоговый вычет 13% с образовательной части путёвки.
      </p>
    </div>
  </main>

  <Shifts />
  <FAQ />
  <ShiftBookModal />
  <div class="mx-auto max-w-[720px] px-4 pb-8 text-center">
    <p class="text-[14px] text-slate-500">
      Подробнее: <a href="/" class="text-primary hover:underline">детский IT-лагерь в Подмосковье</a> ·
      <a href="/ceny" class="text-primary hover:underline">цены и смены 2026</a>
    </p>
  </div>
  <RelatedPages pages={getRelatedPages(Astro.url.pathname)} />
</LandingLayout>
