import { PlayerRole } from '../types/game';

/**
 * Mescola un array usando l'algoritmo Fisher-Yates
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Assegna ruoli casualmente ai giocatori
 * @param playerUids Array di UID dei giocatori
 * @param numImpostors Numero di impostori da assegnare
 * @param numClowns Numero di pagliacci da assegnare
 * @returns Mappa UID -> ruolo
 */
export function assignRoles(
  playerUids: string[],
  numImpostors: number,
  numClowns: number = 0
): Map<string, PlayerRole> {
  if (playerUids.length === 0) {
    return new Map();
  }

  const totalSpecialRoles = numImpostors + numClowns;

  if (totalSpecialRoles >= playerUids.length) {
    // Se ci sono più ruoli speciali richiesti che giocatori, assegna in ordine di priorità
    const roles = new Map<string, PlayerRole>();
    const shuffledUids = shuffleArray(playerUids);

    for (let i = 0; i < shuffledUids.length; i++) {
      if (i < numImpostors) {
        roles.set(shuffledUids[i], 'impostor');
      } else if (i < numImpostors + numClowns) {
        roles.set(shuffledUids[i], 'clown');
      } else {
        roles.set(shuffledUids[i], 'civilian');
      }
    }
    return roles;
  }

  // Mescola gli UID
  const shuffledUids = shuffleArray(playerUids);

  // Crea la mappa dei ruoli
  const roles = new Map<string, PlayerRole>();

  // Assegna 'impostor' ai primi numImpostors
  for (let i = 0; i < numImpostors; i++) {
    roles.set(shuffledUids[i], 'impostor');
  }

  // Assegna 'clown' ai successivi numClowns
  for (let i = numImpostors; i < numImpostors + numClowns; i++) {
    roles.set(shuffledUids[i], 'clown');
  }

  // Assegna 'civilian' ai restanti
  for (let i = numImpostors + numClowns; i < shuffledUids.length; i++) {
    roles.set(shuffledUids[i], 'civilian');
  }

  return roles;
}

/**
 * Seleziona casualmente il primo giocatore
 * @param playerUids Array di UID dei giocatori
 * @returns UID del primo giocatore
 */
export function selectFirstPlayer(playerUids: string[]): string {
  if (playerUids.length === 0) {
    throw new Error('Nessun giocatore disponibile');
  }
  const shuffled = shuffleArray(playerUids);
  return shuffled[0];
}

