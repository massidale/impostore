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
  rules:
    "Tutti tranne l’indovino ricevono lo stesso numero da 1 a 10. L’indovino fa a voce una domanda a ogni interlocutore, nell’ordine indicato. Ognuno risponde con un esempio che per lui vale quel voto, senza pronunciare il numero. Le domande possono essere diverse. Dopo avere ascoltato tutti, l’indovino sceglie un solo numero e lo conferma. Numero esatto: 2 punti; scarto di 1: 1 punto; altrimenti 0. Tutti indovinano una volta per giro (1–3 giri). Vince chi ha più punti, anche a pari merito. I numeri possono ripetersi. Chi entra a partita iniziata osserva fino alla prossima partita. L’host può annullare un turno senza punti o terminare la partita.",
  SettingsPanel,
  HostDashboard,
  PlayerGamepad,
  initGameState: initWavelengthGame,
  startGame: startWavelengthGame,
  getDefaultSettings: () => ({ cycles: 1 }),
};
export default WavelengthPlugin;
