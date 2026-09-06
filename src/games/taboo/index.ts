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
  rules: "Due squadre si alternano. Il descrittore fa indovinare la parola senza dire le parole vietate. Gli avversari vedono la carta e fanno da arbitri: se sentono una parola vietata lo dicono a voce e il descrittore preme Tabù per cambiare carta. Si possono passare le carte entro il limite del turno e annullare l’ultima mossa. Quando il tempo scade tocca all’altra squadra.",
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
