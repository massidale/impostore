import { GamePlugin } from '../../core/types/gamePlugin';
import LupusSettingsPanel from './components/LupusSettingsPanel';
import LupusHostDashboard from './components/LupusHostDashboard';
import LupusPlayerGamepad from './components/LupusPlayerGamepad';
import { initLupusGame, startLupusGame } from './services/lupusLogic';
import { LupusSettings } from './types';

const LupusPlugin: GamePlugin = {
  id: 'lupus',
  name: 'Lupus',
  description: 'Di notte i lupi colpiscono, di giorno il villaggio vota. Sopravvivi.',
  rules:
    "All'avvio ogni giocatore riceve un ruolo segreto. La partita alterna notte e giorno, entrambe a tempo: di NOTTE ognuno agisce in segreto dal telefono entro il timer (chi non agisce si astiene); all'alba si annuncia solo CHI è morto, senza dettagli. Di GIORNO il villaggio discute e vota entro il timer: ci si può astenere e cambiare voto; in caso di pareggio si va al ballottaggio tra i più votati, e un nuovo pareggio non elimina nessuno. I lupi devono essere TUTTI d'accordo sulla vittima entro la fine della notte, altrimenti si astengono. I morti osservano in silenzio.\n\n" +
    'I RUOLI:\n' +
    '🐺 Lupo — ogni notte sceglie la vittima col branco (le scelte sono visibili agli altri lupi). Vince alla parità numerica col villaggio.\n' +
    '🏡 Villico — nessun potere, solo intuito e voto.\n' +
    '🔮 Veggente — ogni notte scopre il vero ruolo di un giocatore.\n' +
    '🛡️ Guardia — ogni notte protegge un giocatore (anche sé stessa): se i lupi lo scelgono, si salva.\n' +
    '👻 Medium — vede il vero ruolo dei giocatori morti.\n' +
    '💋 Bocca di Rosa — ogni notte la passa a casa di un altro giocatore: se i lupi cercano lei, non la trovano; se colpiscono chi la ospita, muoiono entrambi.\n' +
    "🎭 Ruoli personalizzati — disponibili in modalità narratore: l'app li assegna, i poteri li gestisce il narratore.\n\n" +
    "🎙️ NARRATORE (opzionale) — dirige interamente lui la partita: l'app distribuisce le carte e gli mette a disposizione, se vuole, i sondaggi per la notte e per il voto. Il telefono raccoglie le scelte e gli riporta gli eventi; la decisione finale su chi muore è sempre sua (segna morti e vivi dalla sua schermata). Il narratore può essere uno della stanza oppure una persona totalmente esterna senza app: in quel caso l'app si limita a distribuire le carte con i ruoli.\n\n" +
    'Senza narratore vince il VILLAGGIO se elimina tutti i lupi; vincono i LUPI alla parità numerica con gli altri.',
  icon: '🐺',
  minPlayers: 4,
  maxPlayers: 0, // unlimited

  SettingsPanel: LupusSettingsPanel,
  HostDashboard: LupusHostDashboard,
  PlayerGamepad: LupusPlayerGamepad,

  initGameState: async (roomId: string, settings: unknown) => {
    await initLupusGame(roomId, settings as LupusSettings);
  },

  startGame: async (roomId: string) => {
    await startLupusGame(roomId);
  },

  getDefaultSettings: (): LupusSettings => ({
    numLupi: 1,
    veggenteEnabled: true,
    guardiaEnabled: true,
    mediumEnabled: false,
    boccaEnabled: false,
    votingSeconds: 90,
    nightSeconds: 60,
    narratorEnabled: false,
    narratorUid: null,
    customRoles: [],
  }),
};

export default LupusPlugin;
