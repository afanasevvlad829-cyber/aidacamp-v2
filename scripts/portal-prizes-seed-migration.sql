-- portal-prizes-seed-migration.sql
-- Перенос базового каталога призов из хардкода PRIZES (portalPrizes.ts) в БД.
-- Все призы (базовые + кастомные) живут в portal_prize_custom — штаб редактирует через UI.
-- Поля: ozon_price (закупка), img_url (картинка), url (ссылка Озон), qty (кол-во),
-- is_base (базовый каталог). Рекомендованная цена = ozon_price×3 (на клиенте),
-- bongere_price (ручная игровая цена) — в portal_prize_state. Выдача — portal_prize_issuance.
-- Идемпотентно (ON CONFLICT DO NOTHING).

ALTER TABLE portal_prize_custom ADD COLUMN IF NOT EXISTS is_base BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE portal_prize_custom ADD COLUMN IF NOT EXISTS url TEXT;

INSERT INTO portal_prize_custom (slug, name, category, ozon_price, qty, img_url, url, is_base) VALUES
  ('prize-hologram', 'Опыты Голограмма (Подарок для мальчика и девочки)', 'Опыты', 224, 5, 'https://ir.ozone.ru/s3/multimedia-1-g/wc1000/10541528260.jpg', 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-gologramma-podarok-dlya-malchika-i-devochki-3103794581/', TRUE),
  ('prize-night-torch', 'Ночник Minecraft — Факел (светодиодный)', 'Декор', 507, 3, 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/7295613612.jpg', 'https://www.ozon.ru/product/nochnik-svetilnik-maynkraft-ocean-of-light-fakel-minecraft-svetodiodnyy-915552091/', TRUE),
  ('prize-night-potion', 'Ночник Minecraft — Колба с зельем', 'Декор', 717, 3, 'https://ir.ozone.ru/s3/multimedia-1-z/wc1000/7646341031.jpg', 'https://www.ozon.ru/product/ocean-of-light-nochnik-detskiy-dlya-sna-maynkraft-svetilnik-minecraft-dlya-detey-kolba-s-zelem-1084491803/', TRUE),
  ('prize-brelok', 'Брелки Minecraft (2 модели — фонарик-факел и пара)', 'Сувенир', 187, 30, 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/9160701848.jpg', 'https://www.ozon.ru/product/brelok-fonarik-minecraft-svetyashchiysya-fakel-usb-zaryadka-podarok-rebenku-3378284656/', TRUE),
  ('prize-opyty-10v1', 'Набор опытов «10 в 1» — эксперименты для детей', 'Опыты', 849, 2, 'https://ir.ozone.ru/s3/multimedia-1-d/wc1000/7689179101.jpg', 'https://www.ozon.ru/product/nabor-opytov-dlya-detey-10-v-1-opyty-i-eksperimenty-dlya-detey-2195902200/', TRUE),
  ('prize-raznotsv-plamya', 'Опыты «Разноцветное пламя»', 'Опыты', 250, 2, 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7292913050.jpg', 'https://www.ozon.ru/product/opyty-dlya-detey-raznotsvetnoe-plamya-razvivayushchiy-podarok-dlya-malchika-i-devochki-154703923/', TRUE),
  ('prize-lava-lamp', 'Набор для опытов «Лава-Лампа»', 'Опыты', 187, 2, 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7675562199.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-lava-lampa-opyty-dlya-detey-2322958175/', TRUE),
  ('prize-faraonova-zmeya', 'Опыты «Фараонова змея»', 'Опыты', 224, 2, 'https://ir.ozone.ru/s3/multimedia-1-8/wc1000/7292593520.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-faraonova-zmeya-himicheskiy-eksperiment-dlya-detey-podarok-dlya-malchikov-154639740/', TRUE),
  ('prize-pushistyy-rif', '«Пушистый риф» — выращивание кристаллов', 'Кристаллы', 229, 1, 'https://ir.ozone.ru/s3/multimedia-1-9/wc1000/7292903121.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-dlya-detey-pushistyy-rif-vyrashchivanie-kristallov-v-podarok-154704385/', TRUE),
  ('prize-magnit-burya', '«Магнитная буря» — опыты с магнитами', 'Опыты', 225, 2, 'https://ir.ozone.ru/s3/multimedia-1-t/wc1000/7300748657.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-i-eksperimentov-magnitnaya-burya-razvivayushchiy-igry-s-magnitami-dlya-detey-300792417/', TRUE),
  ('prize-fiksiki-12v1', 'Фиксики «12 в 1» — эксперименты', 'Опыты', 585, 1, 'https://ir.ozone.ru/s3/multimedia-1-b/wc1000/8093140463.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-fiksiki-fiksiki-12-v-1-eksperimenty-i-opyty-dlya-detey-522849179/', TRUE),
  ('prize-snezh-lab', 'Опыты «Снежная лаборатория»', 'Опыты', 149, 2, 'https://ir.ozone.ru/s3/multimedia-1-h/wc1000/9410844473.jpg', 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-snezhnaya-laboratoriya-2759805848/', TRUE),
  ('prize-moy-mir-10v1', 'Набор «Мой мир» — 10 в 1', 'Опыты', 1272, 2, 'https://ir.ozone.ru/s3/multimedia-1-l/wc1000/7970430153.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-moy-mir-10-v-1-opyty-i-eksperimenty-dlya-detey-igrushka-dlya-malchika-2800935879/', TRUE),
  ('prize-kartof-batareyka', '«Картофельная батарейка»', 'Опыты', 275, 1, 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/8223585858.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-kartofelnaya-batareyka-opyty-dlya-detey-2801018811/', TRUE),
  ('prize-podsolnuh', 'Мини-сад «Подсолнух» — выращивание растений', 'Сад', 338, 2, 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/10104125220.jpg', 'https://www.ozon.ru/product/nabor-dlya-vyrashchivaniya-rasteniy-mini-sad-podsolnuh-4112739592/', TRUE),
  ('prize-dnk', 'Исследование ДНК', 'Опыты', 842, 1, 'https://ir.ozone.ru/multimedia/wc1000/1022172002.jpg', 'https://www.ozon.ru/product/nabor-dlya-eksperimentov-issledovanie-dnk-150028575/', TRUE),
  ('prize-sem-chudes-7v1', '«Семь чудес» — 7 в 1', 'Опыты', 496, 2, 'https://ir.ozone.ru/s3/multimedia-1-3/wc1000/7340767203.jpg', 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-sem-chudes-7-v-1-podarok-na-novyy-god-detyam-167823357/', TRUE),
  ('prize-lab-sveta', 'Лаборатория света — юный химик', 'Опыты', 656, 1, 'https://ir.ozone.ru/s3/multimedia-1-0/wc1000/7777228608.jpg', 'https://www.ozon.ru/product/nabor-dlya-opytov-laboratoriya-sveta-himicheskie-eksperimenty-dlya-detey-8-let-v-podarok-yunyy-himik-866290815/', TRUE),
  ('prize-zvezdnaya-pyl', 'Опыты «Звёздная пыль»', 'Опыты', 218, 2, 'https://ir.ozone.ru/s3/multimedia-1-2/wc1000/7300776998.jpg', 'https://www.ozon.ru/product/opyty-dlya-detey-zvezdnaya-pyl-himicheskie-eksperimenty-dlya-malchikov-i-devochek-v-nabore-1305503337/', TRUE),
  ('prize-kotik-kristally', 'Волшебный котик из кристаллов', 'Кристаллы', 141, 2, 'https://ir.ozone.ru/s3/multimedia-1-i/wc1000/10109043846.jpg', 'https://www.ozon.ru/product/volshebnyy-kotik-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2042460843/', TRUE),
  ('prize-derevo-kristally', 'Волшебное дерево из кристаллов', 'Кристаллы', 227, 2, 'https://ir.ozone.ru/s3/multimedia-1-k/wc1000/8080431968.jpg', 'https://www.ozon.ru/product/volshebnoe-derevo-rastushchee-iz-kristallov-opyty-dlya-detey-nabor-dlya-vyrashchivaniya-kristallov-2195934937/', TRUE),
  ('prize-opyty-15v1', 'Набор опытов «15 в 1»', 'Опыты', 887, 2, 'https://ir.ozone.ru/s3/multimedia-1-r/wc1000/9086733603.jpg', 'https://www.ozon.ru/product/nabor-opytov-15-v-1-opyty-i-eksperimenty-dlya-detey-2322967333/', TRUE),
  ('prize-dyhanie-drakona', 'Опыты «Дыхание дракона»', 'Опыты', 164, 2, 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9495526704.jpg', 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-dyhanie-drakona-2759708625/', TRUE),
  ('prize-lab-chervyachkov', 'Опыты «Лаборатория червячков»', 'Опыты', 164, 2, 'https://ir.ozone.ru/s3/multimedia-1-v/wc1000/9410827891.jpg', 'https://www.ozon.ru/product/opyty-i-eksperimenty-dlya-detey-laboratoriya-chervyachkov-2760297844/', TRUE),
  ('prize-yunyy-himik-6v1', 'Набор «Юный химик» — 6 в 1', 'Опыты', 1033, 2, 'https://ir.ozone.ru/s3/multimedia-1-o/wc1000/9247131600.jpg', 'https://www.ozon.ru/product/nabor-opytov-6v1-himicheskie-opyty-dlya-detey-nabor-yunogo-himika-154702328/', TRUE)
ON CONFLICT (slug) DO NOTHING;
