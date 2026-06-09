import type { LandingData } from './types';
import lagerIstra from './lager-istra';
import lagerPushkino from './lager-pushkino';
import lagerBronnitsy from './lager-bronnitsy';

export const allLandings: LandingData[] = [
  lagerIstra,
  lagerPushkino,
  lagerBronnitsy,
];

export type { LandingData };
