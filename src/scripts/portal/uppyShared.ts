/**
 * Общая, чисто механическая часть Uppy-конфига для MediaManager.astro и
 * UppyUploader.astro. Оба компонента решают разные задачи (список+удаление
 * vs событийная загрузка для внешнего UI) — здесь только то, что у них
 * буквально совпадает: русская локализация, ограничения файлов, базовые
 * опции Dashboard/XHRUpload, разбор ошибки загрузки.
 */

export const UPPY_LOCALE_STRINGS = {
  dropPasteFiles: 'Перетащи файл сюда или %{browseFiles}',
  browseFiles: 'выбери файл',
  dropPasteImportFiles: 'Перетащи файл сюда, %{browseFiles} или импортируй из %{importFrom}',
  uploadComplete: 'Загружено',
  uploadPaused: 'Пауза',
  uploadingXFiles: { 0: 'Загружаю %{smart_count} файл', 1: 'Загружаю %{smart_count} файла', 2: 'Загружаю %{smart_count} файлов' },
  processingXFiles: { 0: 'Обработка %{smart_count} файла', 1: 'Обработка %{smart_count} файлов', 2: 'Обработка %{smart_count} файлов' },
} as any;

export function buildUppyRestrictions(accept: string, maxFiles: number) {
  return {
    maxFileSize: 500 * 1024 * 1024,
    maxNumberOfFiles: maxFiles,
    allowedFileTypes: accept.split(',').map((s) => s.trim()).filter(Boolean),
  };
}

export const UPPY_DASHBOARD_BASE = {
  inline: true,
  width: '100%',
  proudlyDisplayPoweredByUppy: false,
  showProgressDetails: true,
  hideUploadButton: false,
} as const;

export const UPPY_XHR_BASE = {
  method: 'POST',
  formData: true,
  fieldName: 'file',
  withCredentials: true,
  timeout: 0,
} as const;

export function attachGoldenRetriever(uppy: any, GoldenRetriever: any) {
  try { uppy.use(GoldenRetriever, { serviceWorker: false }); } catch {}
}

/** Разбирает событие upload-error в { code, msg } — дальше каждый компонент сам решает, как это показать. */
export function formatUploadError(error: any, response: any): { code: string | number; msg: string } {
  const code = (response as any)?.status ?? '';
  const msg = (error as any)?.message || 'unknown error';
  return { code, msg };
}
