import { describe, expect, it } from 'vitest';
import { validateRoomPlacement } from './portalRooms';

describe('validateRoomPlacement', () => {
  it('разрешает оставить ребёнка нерасселённым', () => {
    expect(validateRoomPlacement(null, null)).toBeNull();
  });

  it('разрешает только существующую койку в пределах вместимости', () => {
    expect(validateRoomPlacement(31, 3)).toBeNull();
    expect(validateRoomPlacement(31, 4)).toBe('bed_index outside room capacity');
    expect(validateRoomPlacement(999, 0)).toBe('room unavailable for accommodation');
  });

  it('запрещает служебную комнату и неполную позицию', () => {
    expect(validateRoomPlacement(22, 0)).toBe('room unavailable for accommodation');
    expect(validateRoomPlacement(20, null)).toBe('room_number and bed_index must be set together');
  });

  it('запрещает дробные и отрицательные номера коек', () => {
    expect(validateRoomPlacement(20, 0.5)).toBe('room_number and bed_index must be integers');
    expect(validateRoomPlacement(20, -1)).toBe('bed_index outside room capacity');
  });
});
