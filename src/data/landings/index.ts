import type { LandingData } from './types';
import lagerIstra from './lager-istra';
import lagerPushkino from './lager-pushkino';
import lagerBronnitsy from './lager-bronnitsy';
import lagerChehov from './lager-chehov';
import lagerKorolev from './lager-korolev';
import lagerPodolsk from './lager-podolsk';
import lagerKolomna from './lager-kolomna';
import lagerLubertsy from './lager-lubertsy';

export const allLandings: LandingData[] = [
  lagerIstra,
  lagerPushkino,
  lagerBronnitsy,
  lagerChehov,
  lagerKorolev,
  lagerPodolsk,
  lagerKolomna,
  lagerLubertsy,
];

export type { LandingData };
