import type { CorpClient } from './types';
import { PHONE_MAIN } from '../contacts';

export const mincifry: CorpClient = {
  clientName: 'Минцифры России',
  partnerBadge: 'ПАРТНЁРСКАЯ ПРОГРАММА · МИНЦИФРЫ',
  phone: PHONE_MAIN,
  discount: 10,
  transferFrom: null,
  freeTransferMinKids: 10,
  utmSource: 'mincifry',
  slug: 'mincifry',
};
