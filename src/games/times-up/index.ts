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
  rules:
    "Due squadre, almeno due giocatori ciascuna. Lo stesso mazzo da 10 a 60 nomi si gioca per tre round: prima descrizione libera senza dire nome o alias; poi una sola parola; infine solo mimo senza suoni. Turni da 30 a 90 secondi, 45 di default, con squadre alternate e descrittori a rotazione. Solo il descrittore vede la carta e segna gli esiti. Indovinata vale +1; passa e violazione rimettono la carta in fondo senza punti. Un annullamento dell’ultima azione è possibile solo nel turno ancora aperto. Il mazzo completato chiude subito il round. Vince il totale maggiore, parità condivisa. I nomi possono essere predefiniti, caricati dalla lobby o scritti privatamente dai giocatori. Chi arriva dopo osserva fino alla prossima partita.",
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
