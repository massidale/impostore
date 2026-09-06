import { GamePlugin } from "../../core/types/gamePlugin";
import { roomCommand } from "../../core/services/roomCommand";
import SettingsPanel from "./components/SettingsPanel";
import HostDashboard from "./components/HostDashboard";
import PlayerGamepad from "./components/PlayerGamepad";
const plugin: GamePlugin = {
  id: "herd-mentality",
  name: "Herd Mentality",
  icon: "\ud83d\udc2e",
  description: "Pensa come il gruppo: la risposta pi\u00f9 popolare fa punto.",
  rules:
    "Tutti rispondono privatamente alla stessa domanda. Quando tutti hanno inviato, si mostrano le risposte raggruppate. L\u2019host pu\u00f2 unire risposte equivalenti e annullare le fusioni, poi conferma. Ogni persona nell\u2019unico gruppo pi\u00f9 grande guadagna un punto, anche senza maggioranza assoluta. Pareggio tra gruppi pi\u00f9 grandi: nessun punto. Vince chi totalizza pi\u00f9 punti; le parit\u00e0 finali sono condivise. Da 5 a 20 domande, 8 di default.",
  minPlayers: 3,
  maxPlayers: 12,
  SettingsPanel,
  HostDashboard,
  PlayerGamepad,
  getDefaultSettings: () => ({ rounds: 8 }),
  initGameState: async (roomId, settings) => {
    await roomCommand(roomId, "herd-mentality.init", [settings]);
  },
  startGame: async (roomId) => {
    await roomCommand(roomId, "herd-mentality.start", []);
  },
};
export default plugin;
