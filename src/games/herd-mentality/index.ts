import { GamePlugin } from "../../core/types/gamePlugin";
import { roomCommand } from "../../core/services/roomCommand";
import SettingsPanel from "./components/SettingsPanel";
import HostDashboard from "./components/HostDashboard";
import PlayerGamepad from "./components/PlayerGamepad";
const plugin: GamePlugin = {
  id: "herd-mentality",
  name: "Herd Mentality",
  icon: "\ud83d\udc2e",
  description: "Pensa come il gruppo e scopri la risposta più popolare.",
  rules: "Tutti rispondono privatamente alla stessa domanda. Quando tutti hanno inviato, si mostrano le risposte raggruppate. L’host può unire risposte equivalenti e annullare le fusioni, poi conferma. Scoprite la risposta più popolare e chi ha pensato come il gruppo.",
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
