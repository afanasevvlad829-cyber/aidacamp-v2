import { describe, it, expect } from 'vitest';
import { clampIds, safeZipFilename } from './fotoZip';

describe('clampIds', () => {
  it('не массив → пусто', () => {
    expect(clampIds('not-an-array')).toEqual([]);
    expect(clampIds(null)).toEqual([]);
    expect(clampIds(undefined)).toEqual([]);
  });

  it('фильтрует не-строки и пустые строки', () => {
    expect(clampIds(['a', 1, null, '', 'b', {}])).toEqual(['a', 'b']);
  });

  it('убирает дубли, сохраняя порядок первого появления', () => {
    expect(clampIds(['a', 'b', 'a', 'c', 'b'])).toEqual(['a', 'b', 'c']);
  });

  it('зажимает в max, по умолчанию 300', () => {
    const many = Array.from({ length: 400 }, (_, i) => `id-${i}`);
    expect(clampIds(many)).toHaveLength(300);
    expect(clampIds(many, 5)).toHaveLength(5);
  });
});

describe('safeZipFilename', () => {
  it('оставляет буквы/цифры/пробелы/точки/дефисы, добавляет .zip', () => {
    expect(safeZipFilename('Смена 3')).toBe('Смена 3.zip');
  });

  it('вырезает опасные для заголовка символы', () => {
    expect(safeZipFilename('Смена "3" / test?')).toBe('Смена 3  test.zip');
  });

  it('пустое имя после очистки → фолбэк foto.zip', () => {
    expect(safeZipFilename('"""')).toBe('foto.zip');
  });
});
