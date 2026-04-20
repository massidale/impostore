import { GamePlugin } from './types/gamePlugin';
import ImpostorePlugin from '../games/impostore';
import IndovinaPlugin from '../games/indovina';

// ── Game Registry ──
// Central map of all available games. To add a new game:
// 1. Create a plugin under src/games/<name>/ with an index.ts exporting GamePlugin
// 2. Import it here and add to the registry map

const registry: Record<string, GamePlugin> = {
  [ImpostorePlugin.id]: ImpostorePlugin,
  [IndovinaPlugin.id]: IndovinaPlugin,
};

/**
 * Get a game plugin by its ID.
 * Throws if the game is not registered.
 */
export function getGame(gameId: string): GamePlugin {
  const plugin = registry[gameId];
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
