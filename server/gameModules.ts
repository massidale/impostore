import type { GameModule } from "./gameModule";
import { cheDomandaModule } from "./games/che-domanda";
import { wavelengthModule } from "./games/wavelength";
import { justOneModule } from "./games/just-one";
import { herdMentalityModule } from "./games/herd-mentality";
import { topTenModule } from "./games/top-ten";
import { timesUpModule } from "./games/times-up";
const modules: Record<string, GameModule> = {
  "che-domanda": cheDomandaModule,
  wavelength: wavelengthModule,
  "just-one": justOneModule,
  "herd-mentality": herdMentalityModule,
  "top-ten": topTenModule,
  "times-up": timesUpModule,
};
export function getGameModule(id: string): GameModule | undefined {
  return Object.hasOwn(modules, id) ? modules[id] : undefined;
}
