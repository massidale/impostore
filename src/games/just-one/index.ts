import { GamePlugin } from "../../core/types/gamePlugin";
import { roomCommand } from "../../core/services/roomCommand";
import SettingsPanel from "./components/SettingsPanel";
import HostDashboard from "./components/HostDashboard";
import PlayerGamepad from "./components/PlayerGamepad";
const plugin: GamePlugin = {
  id: "just-one",
  name: "Just One",
  icon: "\u270d\ufe0f",
  description:
    "Un solo indizio a testa: eliminate i doppioni e indovinate insieme.",
  rules:
    "Un indovino a rotazione, una parola per ogni autore. Tutti gli indizi duplicati vengono annullati. Gli autori controllano gli indizi e confermano: servono due segnalazioni distinte per annullarne uno. L\u2019indovino ha un solo tentativo o passa. Senza indizi validi si passa alla parola successiva. Potete giocare tutti insieme oppure in due squadre casuali ed equilibrate (almeno 4 giocatori), con partite contemporanee, indizi separati e indovini a rotazione. In due basta un indizio valido. Le squadre giocano lo stesso numero di parole: vince chi ne indovina di più, con possibilità di pareggio. Partita da 5 a 20 parole, 8 di default.",
  minPlayers: 3,
  maxPlayers: 10,
  SettingsPanel,
  HostDashboard,
  PlayerGamepad,
  getDefaultSettings: () => ({ rounds: 8, mode: "cooperative" }),
  initGameState: async (roomId, settings) => {
    await roomCommand(roomId, "just-one.init", [settings]);
  },
  startGame: async (roomId) => {
    await roomCommand(roomId, "just-one.start", []);
  },
};
export default plugin;
