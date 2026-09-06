import { GamePlugin } from "../../core/types/gamePlugin";
import SettingsPanel from "./components/SettingsPanel";
import HostDashboard from "./components/HostDashboard";
import PlayerGamepad from "./components/PlayerGamepad";
import {
  initWavelengthGame,
  startWavelengthGame,
} from "./services/wavelengthLogic";
const WavelengthPlugin: GamePlugin = {
  id: "wavelength",
  name: "Wavelength",
  icon: "🌊",
  description:
    "Un numero comune, tanti esempi: entra in sintonia con il gruppo.",
  minPlayers: 3,
  maxPlayers: 12,
  rules: "Tutti tranne l’indovino ricevono lo stesso numero da 1 a 10. Partendo dal giocatore indicato, date esempi a voce senza dire il numero. L’indovino ascolta e sceglie un numero. Scoprite il numero comune e lo scarto dalla risposta. Tutti indovinano una volta per giro.",
  SettingsPanel,
  HostDashboard,
  PlayerGamepad,
  initGameState: initWavelengthGame,
  startGame: startWavelengthGame,
  getDefaultSettings: () => ({ cycles: 1 }),
};
export default WavelengthPlugin;
