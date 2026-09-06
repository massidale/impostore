import type { GamePlugin } from "../../core/types/gamePlugin";
import SettingsPanel from "./components/SettingsPanel";
import PlayerGamepad from "./components/PlayerGamepad";
import HostDashboard from "./components/HostDashboard";
import { sendAction } from "./services/topTenLogic";
const plugin: GamePlugin = {
  id: "top-ten",
  name: "Top Ten",
  icon: "🔟",
  description: "Interpretate un tema e ordinate le intensità nascoste.",
  minPlayers: 4,
  maxPlayers: 10,
  rules:
    "Ogni partecipante, capitano incluso, riceve un numero diverso da 1 a 10. Interpretate il tema a voce secondo il vostro numero, nell’ordine indicato. Il capitano ordina tutti dal meno al più intenso usando i pulsanti su e giù. Ogni coppia adiacente crescente vale un punto cooperativo. I numeri si rivelano soltanto alla conferma. Il capitano cambia a ogni tema. Partita da 3 a 10 temi, 5 di default. L’host può annullare un tema bloccato senza punti.",
  SettingsPanel,
  PlayerGamepad,
  HostDashboard,
  getDefaultSettings: () => ({ rounds: 5 }),
  initGameState: async (id, s) => {
    await sendAction(id, "init", s);
  },
  startGame: async (id) => {
    await sendAction(id, "start");
  },
};
export default plugin;
