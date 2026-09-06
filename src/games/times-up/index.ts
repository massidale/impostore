import type { GamePlugin } from "../../core/types/gamePlugin";
import SettingsPanel, { defaults } from "./components/SettingsPanel";
import PlayerGamepad from "./components/PlayerGamepad";
import HostDashboard from "./components/HostDashboard";
import { sendAction } from "./services/timesUpLogic";
const plugin: GamePlugin = {
  id: "times-up",
  name: "Time’s Up",
  icon: "⏱️",
  description: "Descrivi, usa una parola e mima gli stessi nomi in tre round.",
  minPlayers: 4,
  maxPlayers: 12,
  rules: "Due squadre si alternano con descrittori a rotazione. Lo stesso mazzo si gioca per tre round: descrizione libera senza dire nome o alias, una sola parola, solo mimo senza suoni. Solo il descrittore vede la carta e segna gli esiti. Le carte indovinate escono dal mazzo; passa e violazione rimettono la carta in fondo. Si può annullare l’ultima azione nel turno aperto. Il mazzo completato chiude il round.",
  SettingsPanel,
  PlayerGamepad,
  HostDashboard,
  getDefaultSettings: () => ({ ...defaults }),
  initGameState: async (id, s) => {
    await sendAction(id, "init", s);
  },
  startGame: async (id) => {
    await sendAction(id, "start");
  },
};
export default plugin;
