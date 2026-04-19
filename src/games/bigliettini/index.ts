import { GamePlugin } from '../../core/types/gamePlugin';
import BigliettiniSettingsPanel from './components/BigliettiniSettingsPanel';
import BigliettiniHostDashboard from './components/BigliettiniHostDashboard';
import BigliettiniPlayerGamepad from './components/BigliettiniPlayerGamepad';
import { initBigliettiniGame, startBigliettiniGame } from './services/bigliettiniLogic';
import { BigliettiniSettings } from './types';

/**
 * Bigliettini — empty scaffold plugin.
 * Mechanics to be defined; name is also temporary.
 */
const BigliettiniPlugin: GamePlugin = {
  id: 'bigliettini',
  name: 'Bigliettini',
  minPlayers: 2,
  maxPlayers: 0, // unlimited

  SettingsPanel: BigliettiniSettingsPanel,
  HostDashboard: BigliettiniHostDashboard,
  PlayerGamepad: BigliettiniPlayerGamepad,

  initGameState: async (roomId: string, _settings: unknown) => {
    await initBigliettiniGame(roomId);
  },

  startGame: async (roomId: string) => {
    await startBigliettiniGame(roomId);
  },

  getDefaultSettings: (): BigliettiniSettings => ({}),
};

export default BigliettiniPlugin;
