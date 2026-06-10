import type { LandingData } from './types';
import lagerIstra from './lager-istra';
import lagerPushkino from './lager-pushkino';
import lagerBronnitsy from './lager-bronnitsy';
import lagerChehov from './lager-chehov';
import lagerKorolev from './lager-korolev';
import lagerPodolsk from './lager-podolsk';
import lagerKolomna from './lager-kolomna';
import lagerLubertsy from './lager-lubertsy';
import lagerHimki from './lager-himki';
import lagerShchelkovo from './lager-shchelkovo';
import lagerNogink from './lager-nogink';
import lagerVidnoe from './lager-vidnoe';
import lagerLobnya from './lager-lobnya';

export const allLandings: LandingData[] = [
  lagerIstra,
  lagerPushkino,
  lagerBronnitsy,
  lagerChehov,
  lagerKorolev,
  lagerPodolsk,
  lagerKolomna,
  lagerLubertsy,
  lagerHimki,
  lagerShchelkovo,
  lagerNogink,
  lagerVidnoe,
  lagerLobnya,
];

export type { LandingData };
