import { GamePlugin } from '../../core/types/gamePlugin';
import TabooSettingsPanel from './components/TabooSettingsPanel';
import TabooHostDashboard from './components/TabooHostDashboard';
import TabooPlayerGamepad from './components/TabooPlayerGamepad';
import { initTabooGame, startTabooGame } from './services/tabooLogic';
import { TabooSettings } from './types';

const TabooPlugin: GamePlugin = {
  id: 'taboo',
  name: 'Taboo',
  description: 'Fai indovinare le parole alla tua squadra senza dire quelle vietate.',
  rules:
    "All'avvio i giocatori vengono divisi in Squadra Blu e Squadra Rossa: a caso, oppure come deciso dall'host nelle impostazioni (ogni squadra deve avere almeno 2 giocatori).\n\n" +
    'A turno un giocatore della squadra di mano (il descrittore) vede una carta con una parola da far indovinare e 5 parole vietate. Deve descriverla a voce ai compagni SENZA mai dire la parola stessa né le parole vietate.\n\n' +
    'Gli avversari vedono la carta sul proprio telefono e fanno da arbitri: se il descrittore dice una parola vietata lo dicono a voce, e il descrittore preme Tabù (−1 punto, si passa alla carta successiva).\n\n' +
    "Ogni parola indovinata vale +1. Il descrittore può passare la carta un numero limitato di volte per turno (configurabile) e può annullare l'ultima mossa con ↩.\n\n" +
    "Quando il tempo scade il turno passa all'altra squadra. Dopo i turni previsti, vince la squadra con più punti.",
  icon: '🚫',
  minPlayers: 4,
  maxPlayers: 0, // unlimited

  SettingsPanel: TabooSettingsPanel,
  HostDashboard: TabooHostDashboard,
  PlayerGamepad: TabooPlayerGamepad,

  initGameState: async (roomId: string, settings: unknown) => {
    await initTabooGame(roomId, settings as TabooSettings);
  },

  startGame: async (roomId: string) => {
    await startTabooGame(roomId);
  },

  getDefaultSettings: (): TabooSettings => ({
    turnSeconds: 60,
    turnsPerTeam: 3,
    maxSkips: 3,
    teamMode: 'auto',
    manualTeams: null,
  }),
};

export default TabooPlugin;
