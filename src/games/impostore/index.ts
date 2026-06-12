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
  description: 'Tutti conoscono la parola segreta tranne uno. Scopri chi bluffa.',
  rules:
    "Tutti i giocatori ricevono la stessa parola segreta, tranne l'Impostore che non la conosce (al massimo riceve un indizio, se abilitato).\n\n" +
    'A turno, partendo dal primo giocatore indicato, ognuno dice a voce una parola collegata a quella segreta: abbastanza precisa da non sembrare ' +
    "l'impostore, abbastanza vaga da non rivelargliela.\n\n" +
    "Quando l'host avvia la votazione, ogni giocatore vota chi crede sia l'impostore entro il tempo limite (si può cambiare voto finché il timer non scade; chi non vota non viene contato). In caso di pareggio si va al ballottaggio, dove il voto del primo giocatore vale doppio.\n\n" +
    "Se viene eliminato un civile, vince l'Impostore. Se viene eliminato l'Impostore, ha un'ultima possibilità: indovinare la parola segreta per vincere comunque.\n\n" +
    'Ruolo opzionale — il Pagliaccio: conosce la parola come i civili, ma vince da solo se viene eliminato lui.',
  icon: '🎭',
  minPlayers: 3,
  maxPlayers: 0, // unlimited

  // UI Components
  SettingsPanel: ImpostoreSettingsPanel,
  HostDashboard: ImpostoreHostDashboard,
  PlayerGamepad: ImpostorePlayerGamepad,

  // Lifecycle
  initGameState: async (roomId: string, settings: unknown) => {
    const s = settings as ImpostoreSettings;
    await initImpostoreGame(
      roomId,
      s.numImpostors,
      s.numClowns,
      s.hintEnabled,
      s.hintOnlyFirst,
      s.votingSeconds
    );
  },

  startGame: async (roomId: string) => {
    await startImpostoreGame(roomId);
  },

  getDefaultSettings: (): ImpostoreSettings => ({
    numImpostors: 1,
    numClowns: 0,
    hintEnabled: true,
    hintOnlyFirst: false,
    votingSeconds: 60,
  }),
};

export default ImpostorePlugin;
