import { GamePlugin } from "../../core/types/gamePlugin";
import SettingsPanel from "./components/SettingsPanel";
import HostDashboard from "./components/HostDashboard";
import PlayerGamepad from "./components/PlayerGamepad";
import {
  initCheDomandaGame,
  startCheDomandaGame,
} from "./services/cheDomandaLogic";
const CheDomandaPlugin: GamePlugin = {
  id: "che-domanda",
  name: "Che domanda?",
  icon: "🔢",
  description:
    "Risposte numeriche, domande simili: chi ha ricevuto quella diversa?",
  minPlayers: 3,
  maxPlayers: 0,
  rules:
    "Ognuno legge privatamente una domanda e risponde con un numero nell’intervallo indicato. Gli impostori ricevono una domanda simile, ma nessuno conosce esplicitamente il proprio ruolo. Dopo tutte le risposte si rivela solo la domanda dei civili e si discute a turno. L’host apre un voto di 60 secondi: vota un altro partecipante e cambia voto finché resta aperto. Con tutti i voti si chiude subito, altrimenti l’host chiude alla scadenza (gli assenti si astengono). Un pareggio porta a un solo ballottaggio di 30 secondi; un altro pareggio non espelle nessuno. L’espulso rivela il ruolo e non vota più. I civili vincono eliminando tutti gli impostori; gli impostori vincono alla parità numerica. Altrimenti si discute e vota ancora sulle stesse risposte. Nessun punteggio individuale. Chi entra tardi osserva fino alla prossima partita.",
  SettingsPanel,
  HostDashboard,
  PlayerGamepad,
  initGameState: initCheDomandaGame,
  startGame: startCheDomandaGame,
  getDefaultSettings: () => ({ numImpostors: 1, votingSeconds: 60 }),
};
export default CheDomandaPlugin;
