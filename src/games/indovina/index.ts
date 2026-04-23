import { GamePlugin } from '../../core/types/gamePlugin';
import IndovinaSettingsPanel from './components/IndovinaSettingsPanel';
import IndovinaHostDashboard from './components/IndovinaHostDashboard';
import IndovinaPlayerGamepad from './components/IndovinaPlayerGamepad';
import { initIndovinaGame, startIndovinaGame } from './services/indovinaLogic';
import { IndovinaSettings } from './types';

const IndovinaPlugin: GamePlugin = {
  id: 'indovina',
  name: 'Indovina la parola',
  description:
    "Ogni giocatore riceve una parola visibile solo agli altri. A turno fa domande a voce per scoprire la propria.",
  icon: '🤔',
  minPlayers: 2,
  maxPlayers: 0, // unlimited

  SettingsPanel: IndovinaSettingsPanel,
  HostDashboard: IndovinaHostDashboard,
  PlayerGamepad: IndovinaPlayerGamepad,

  initGameState: async (roomId: string, settings: unknown) => {
    await initIndovinaGame(roomId, settings as IndovinaSettings);
  },

  startGame: async (roomId: string) => {
    await startIndovinaGame(roomId);
  },

  getDefaultSettings: (): IndovinaSettings => ({ wordSource: 'random' }),
};

export default IndovinaPlugin;
