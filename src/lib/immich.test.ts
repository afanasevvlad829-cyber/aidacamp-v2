import { describe, it, expect } from 'vitest';
import { buildAlbumName, isUnnamedFace, canTag, type FaceIndex } from './immich';

describe('buildAlbumName', () => {
  it('собирает имя альбома из названия смены и года startDate', () => {
    expect(buildAlbumName({ name: 'Смена 3', startDate: '2026-08-03' })).toBe('Смена 3 — 2026');
  });

  it('берёт год именно из startDate, не из текущей даты', () => {
    expect(buildAlbumName({ name: 'Смена 1', startDate: '2025-05-30' })).toBe('Смена 1 — 2025');
  });
});

describe('isUnnamedFace', () => {
  it('true для лица без person вообще', () => {
    expect(isUnnamedFace({ person: null })).toBe(true);
  });

  it('true для лица с person, но без имени (пустой кластер)', () => {
    expect(isUnnamedFace({ person: { name: '' } })).toBe(true);
  });

  it('false для лица с именованным person', () => {
    expect(isUnnamedFace({ person: { name: 'Демид Слекеничс' } })).toBe(false);
  });
});

describe('canTag', () => {
  const index: FaceIndex = {
    people: [{ id: 'person-1', name: 'Демид', assetIds: [{ id: 'asset-1', type: 'IMAGE' as const }] }],
    unsorted: [{ assetId: 'asset-2', faceId: 'face-1', assetType: 'IMAGE' as const, box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }],
  };

  it('true когда faceId и personId оба реально принадлежат этой смене', () => {
    expect(canTag(index, 'face-1', 'person-1')).toBe(true);
  });

  it('false для чужого/несуществующего faceId', () => {
    expect(canTag(index, 'face-does-not-exist', 'person-1')).toBe(false);
  });

  it('false для чужого/несуществующего personId', () => {
    expect(canTag(index, 'face-1', 'person-does-not-exist')).toBe(false);
  });
});
