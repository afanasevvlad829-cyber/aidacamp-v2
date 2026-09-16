import sharp from 'sharp';
// PSI hcoghmei3l: mobile hero and completed-shift thumbnails are oversized.
for (const width of [390, 414, 600, 828]) {
  await sharp('public/images/hero-mobile-bean-v3-828.avif').resize({ width }).avif({ quality: 23, effort: 7 }).toFile(`public/optimized-media/hero-mobile-optimized-${width}.avif`);
}
for (const name of ['proto-smena1', 'proto-smena2']) {
  for (const width of [96, 192, 320]) {
    await sharp(`public/images/gallery/${name}.webp`).resize({ width, withoutEnlargement: true }).avif({ quality: 45, effort: 7 }).toFile(`public/optimized-media/${name}-${width}.avif`);
  }
}
