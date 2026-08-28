import { describe, it, expect } from 'vitest';
import {
  buildAlbumName,
  isUnnamedFace,
  canTag,
  getBestFaceForPerson,
  computeAvatarCrop,
  type FaceIndex,
  type NamedPerson,
} from './immich';

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
    people: [{ id: 'person-1', name: 'Демид', assetIds: [{ id: 'asset-1', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }] }],
    unsortedByAsset: [{
      assetId: 'asset-2', assetType: 'IMAGE', recognizedNames: [],
      faces: [{ faceId: 'face-1', box: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10 } }],
    }],
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

describe('getBestFaceForPerson', () => {
  it('null для человека без единого появления', () => {
    const person: NamedPerson = { id: 'p1', name: 'Никто', assetIds: [] };
    expect(getBestFaceForPerson(person)).toBeNull();
  });

  it('выбирает появление с самым большим относительным face-box', () => {
    const person: NamedPerson = {
      id: 'p1',
      name: 'Демид',
      assetIds: [
        { id: 'small', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 50, y2: 50, width: 1000, height: 1000 } },
        { id: 'big', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 400, y2: 400, width: 1000, height: 1000 } },
        { id: 'medium', type: 'IMAGE', box: { x1: 0, y1: 0, x2: 200, y2: 200, width: 1000, height: 1000 } },
      ],
    };
    expect(getBestFaceForPerson(person)).toEqual({
      assetId: 'big',
      box: { x1: 0, y1: 0, x2: 400, y2: 400, width: 1000, height: 1000 },
    });
  });

  it('единственное появление — оно и лучшее', () => {
    const box = { x1: 10, y1: 10, x2: 90, y2: 90, width: 500, height: 500 };
    const person: NamedPerson = { id: 'p1', name: 'Один', assetIds: [{ id: 'only', type: 'IMAGE', box }] };
    expect(getBestFaceForPerson(person)).toEqual({ assetId: 'only', box });
  });
});

describe('computeAvatarCrop', () => {
  it('центрирует квадрат вокруг лица с отступом ×2.2, без пересчёта масштаба (imgW/imgH = box.width/height)', () => {
    const box = { x1: 450, y1: 450, x2: 550, y2: 550, width: 1000, height: 1000 };
    const crop = computeAvatarCrop(box, 1000, 1000);
    expect(crop).toEqual({ left: 390, top: 390, size: 220 });
  });

  it('масштабирует box, когда imgW/imgH меньше оригинала (кроп из превью)', () => {
    const box = { x1: 900, y1: 900, x2: 1100, y2: 1100, width: 2000, height: 2000 };
    const crop = computeAvatarCrop(box, 1000, 1000);
    expect(crop).toEqual({ left: 390, top: 390, size: 220 });
  });

  it('зажимает область в границы картинки, когда лицо у самого края', () => {
    const box = { x1: 0, y1: 0, x2: 40, y2: 40, width: 200, height: 200 };
    const crop = computeAvatarCrop(box, 200, 200);
    expect(crop.left).toBeGreaterThanOrEqual(0);
    expect(crop.top).toBeGreaterThanOrEqual(0);
    expect(crop.left + crop.size).toBeLessThanOrEqual(200);
    expect(crop.top + crop.size).toBeLessThanOrEqual(200);
  });
});
