import { GamePlugin } from '../../core/types/gamePlugin';
import IndovinaSettingsPanel from './components/IndovinaSettingsPanel';
import IndovinaHostDashboard from './components/IndovinaHostDashboard';
import IndovinaPlayerGamepad from './components/IndovinaPlayerGamepad';
import { initIndovinaGame, startIndovinaGame } from './services/indovinaLogic';
import { IndovinaSettings } from './types';

const IndovinaPlugin: GamePlugin = {
  id: 'indovina',
  name: 'Indovina la parola',
  description: 'Tutti vedono la tua parola tranne te. Scoprila con domande sì/no.',
  rules: "Ogni giocatore riceve dal mazzo una parola che non può vedere: la vedono tutti gli altri. A turno, partendo dal giocatore indicato, fate domande sì/no a voce per indovinare la vostra parola. Gli altri rispondono guardando il proprio schermo. Chi indovina può aiutare gli altri.",
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
