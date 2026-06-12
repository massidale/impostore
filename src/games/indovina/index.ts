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
  rules:
    'Ogni giocatore riceve una parola segreta che NON può vedere: la vedono tutti gli altri sul proprio telefono.\n\n' +
    'Le parole arrivano dal dizionario (o da un tema generato con l\'AI), oppure — in modalità "Scelte dai giocatori" — le scrivete voi: ognuno ne invia una e vengono distribuite a caso, mai a chi l\'ha scritta.\n\n' +
    'A turno, partendo dal primo giocatore indicato, si fanno domande sì/no a voce ("Sono un animale?", "Sono vivo?") per indovinare la propria parola. Gli altri rispondono guardando la parola sul proprio schermo.\n\n' +
    'Chi indovina la propria parola può continuare a giocare per aiutare gli altri o fermarsi. Vince chi indovina con meno domande... o semplicemente ci si diverte!',
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
