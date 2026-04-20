import { GamePlugin } from '../../core/types/gamePlugin';
import IndovinaSettingsPanel from './components/IndovinaSettingsPanel';
import IndovinaHostDashboard from './components/IndovinaHostDashboard';
import IndovinaPlayerGamepad from './components/IndovinaPlayerGamepad';
import { initIndovinaGame, startIndovinaGame } from './services/indovinaLogic';
import { IndovinaSettings } from './types';

/**
 * Indovina la parola — empty scaffold plugin. Mechanics to be defined.
 */
const IndovinaPlugin: GamePlugin = {
  id: 'indovina',
  name: 'Indovina la parola',
  minPlayers: 2,
  maxPlayers: 0, // unlimited

  SettingsPanel: IndovinaSettingsPanel,
  HostDashboard: IndovinaHostDashboard,
  PlayerGamepad: IndovinaPlayerGamepad,

  initGameState: async (roomId: string, _settings: unknown) => {
    await initIndovinaGame(roomId);
  },

  startGame: async (roomId: string) => {
    await startIndovinaGame(roomId);
  },

  getDefaultSettings: (): IndovinaSettings => ({}),
};

export default IndovinaPlugin;
