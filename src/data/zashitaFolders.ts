// Публичные папки Яндекс.Диска с видео защит проектов — по сменам.
// Файлы на сервер не копируем: страница /foto/<смена>/zashita читает папку на лету.
// Имя файла = имя автора: «Балтунов Ярослав.mp4» → подпись «Балтунов Ярослав».

export const zashitaFolders: Record<string, { publicKey: string; date: string }> = {
  'shift-3': {
    publicKey: 'https://disk.yandex.ru/d/nDObMPutleVKYw',
    date: '16 августа 2026',
  },
  'shift-4': {
    publicKey: 'https://disk.yandex.ru/d/EdJ2ZFDFtj0zRw',
    date: '26 августа 2026',
  },
};
