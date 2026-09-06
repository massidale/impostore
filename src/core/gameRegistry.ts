import cheDomandaPlugin from '../games/che-domanda';
import wavelengthPlugin from '../games/wavelength';
import justOnePlugin from '../games/just-one';
import herdMentalityPlugin from '../games/herd-mentality';
import topTenPlugin from '../games/top-ten';
import timesUpPlugin from '../games/times-up';
import { GamePlugin } from './types/gamePlugin';
import ImpostorePlugin from '../games/impostore';
import IndovinaPlugin from '../games/indovina';
import TabooPlugin from '../games/taboo';

// ── Game Registry ──
// Central map of all available games. To add a new game:
// 1. Create a plugin under src/games/<name>/ with an index.ts exporting GamePlugin
// 2. Import it here and add to the registry map

/**
 * Sentinel `currentGameId` for a room created before any game is chosen.
 * Must be a non-empty string (RTDB rules require `length > 0`) that never
 * collides with a real plugin id.
 */
export const NO_GAME_ID = 'none';

const registry: Record<string, GamePlugin> = {
  [cheDomandaPlugin.id]: cheDomandaPlugin,
  [wavelengthPlugin.id]: wavelengthPlugin,
  [justOnePlugin.id]: justOnePlugin,
  [herdMentalityPlugin.id]: herdMentalityPlugin,
  [topTenPlugin.id]: topTenPlugin,
  [timesUpPlugin.id]: timesUpPlugin,

  [ImpostorePlugin.id]: ImpostorePlugin,
  [IndovinaPlugin.id]: IndovinaPlugin,
  [TabooPlugin.id]: TabooPlugin,
};

/**
 * Get a game plugin by its ID.
 * Throws if the game is not registered.
 */
export function getGame(gameId: string): GamePlugin {
  const plugin = Object.hasOwn(registry, gameId) ? registry[gameId] : undefined;
  if (!plugin) {
    throw new Error(`Game "${gameId}" is not registered in the game registry.`);
  }
  return plugin;
}

/**
 * Get all registered game plugins.
 */
export function getAllGames(): GamePlugin[] {
  return Object.values(registry);
}
