import { GamePlugin } from '../../core/types/gamePlugin';
import ImpostoreSettingsPanel, { ImpostoreSettings } from './components/ImpostoreSettingsPanel';
import ImpostoreHostDashboard from './components/ImpostoreHostDashboard';
import ImpostorePlayerGamepad from './components/ImpostorePlayerGamepad';
import { initImpostoreGame, startImpostoreGame } from './services/impostoreLogic';

/**
 * Impostore game plugin manifest.
 * 
 * This is the single entry point that the core Game Registry uses
 * to discover and interact with the Impostore game module.
 */
const ImpostorePlugin: GamePlugin = {
  id: 'impostore',
  name: 'Impostore',
  minPlayers: 3,
  maxPlayers: 0, // unlimited

  // UI Components
  SettingsPanel: ImpostoreSettingsPanel,
  HostDashboard: ImpostoreHostDashboard,
  PlayerGamepad: ImpostorePlayerGamepad,

  // Lifecycle
  initGameState: async (roomId: string, settings: unknown) => {
    const s = settings as ImpostoreSettings;
    await initImpostoreGame(roomId, s.numImpostors, s.numClowns, s.hintEnabled, s.hintOnlyFirst);
  },

  startGame: async (roomId: string) => {
    await startImpostoreGame(roomId);
  },

  getDefaultSettings: (): ImpostoreSettings => ({
    numImpostors: 1,
    numClowns: 0,
    hintEnabled: false,
    hintOnlyFirst: false,
  }),
};

export default ImpostorePlugin;
