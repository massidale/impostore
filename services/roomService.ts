import { ref, set, get, onValue, off, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { getRandomWord, getHint } from './wordService';
import { assignRoles, selectFirstPlayer } from './roleService';
import { Room, RoomStatus } from '../types/game';

/**
 * Genera un ID stanza casuale (6 caratteri alfanumerici)
 */
export function generateRoomId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let roomId = '';
  for (let i = 0; i < 6; i++) {
    roomId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return roomId;
}

/**
 * Crea una nuova stanza su Firebase Realtime Database
 * @param numImpostors Numero di impostori nella partita
 * @param hostId ID dell'host (può essere generato o passato)
 * @param hintEnabled Se l'indizio è abilitato
 * @param hintOnlyFirst Se l'indizio viene dato solo al primo giocatore
 * @returns ID della stanza creata
 */
export async function createRoom(
  numImpostors: number,
  hostId: string,
  hintEnabled: boolean = false,
  hintOnlyFirst: boolean = false
): Promise<string> {
  const roomId = generateRoomId();

  const roomData: Room = {
    word: '', // La parola viene assegnata quando si avvia la partita
    status: 'waiting',
    numImpostors,
    hostId,
    hintEnabled,
    hintOnlyFirst,
    createdAt: Date.now(),
    lastHeartbeat: Date.now(),
    players: {
      [hostId]: {
        role: null,
        joinedAt: Date.now(),
        revealed: false,
        name: '',
      },
    },
  };

  await set(ref(database, `rooms/${roomId}`), roomData);

  return roomId;
}

/**
 * Ottiene i dati di una stanza
 * @param roomId ID della stanza
 * @returns Dati della stanza o null se non esiste
 */
export async function getRoomData(roomId: string): Promise<Room | null> {
  const snapshot = await get(ref(database, `rooms/${roomId}`));
  if (!snapshot.exists()) {
    return null;
  }
  return snapshot.val() as Room;
}

/**
 * Verifica se un nome è già utilizzato nella stanza
 * @param roomId ID della stanza
 * @param name Nome da verificare
 * @returns true se il nome è disponibile, false se già utilizzato
 */
export async function isNameAvailable(roomId: string, name: string): Promise<boolean> {
  const roomData = await getRoomData(roomId);
  if (!roomData || !roomData.players) {
    return true;
  }
  
  const players = roomData.players;
  const existingNames = Object.values(players)
    .map(player => player.name?.toLowerCase().trim())
    .filter(name => name);
  
  return !existingNames.includes(name.toLowerCase().trim());
}

/**
 * Aggiunge un giocatore alla stanza
 * @param roomId ID della stanza
 * @param playerUid UID del giocatore
 * @param playerName Nome del giocatore
 */
export async function addPlayerToRoom(
  roomId: string,
  playerUid: string,
  playerName?: string
): Promise<void> {
  const playerRef = ref(database, `rooms/${roomId}/players/${playerUid}`);
  await set(playerRef, {
    role: null,
    joinedAt: Date.now(),
    name: playerName || null,
  });
}

/**
 * Rimuove un giocatore dalla stanza
 * @param roomId ID della stanza
 * @param playerUid UID del giocatore
 */
export async function removePlayerFromRoom(
  roomId: string,
  playerUid: string
): Promise<void> {
  const playerRef = ref(database, `rooms/${roomId}/players/${playerUid}`);
  await remove(playerRef);
}

/**
 * Avvia la partita: assegna ruoli, seleziona primo giocatore e cambia status a 'active'
 * @param roomId ID della stanza
 * @param hostId ID dell'host (per aggiungerlo come giocatore)
 */
export async function startGame(roomId: string, hostId?: string): Promise<void> {
  // Ottieni i dati della stanza
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'waiting') {
    throw new Error('La partita è già iniziata');
  }

  // Ottieni tutti i giocatori
  const playersSnapshot = await get(ref(database, `rooms/${roomId}/players`));
  let playerUids: string[] = [];
  
  if (playersSnapshot.exists()) {
    const players = playersSnapshot.val();
    playerUids = Object.keys(players);
  }

  // Se l'host non è già un giocatore, aggiungilo (dovrebbe essere sempre presente, ma per sicurezza)
  if (hostId && !playerUids.includes(hostId)) {
    await addPlayerToRoom(roomId, hostId);
    playerUids.push(hostId);
  }

  if (playerUids.length === 0) {
    throw new Error('Nessun giocatore nella stanza');
  }

  // Assegna i ruoli
  const roles = assignRoles(playerUids, roomData.numImpostors);

  // Seleziona il primo giocatore
  const firstPlayerId = selectFirstPlayer(playerUids);

  // Genera la parola per questa partita
  const word = getRandomWord();
  const hint = roomData.hintEnabled ? getHint(word) : null;

  // Aggiorna i ruoli dei giocatori, il primo giocatore, la parola e cambia lo status
  const updates: { [key: string]: any } = {
    [`rooms/${roomId}/status`]: 'active' as RoomStatus,
    [`rooms/${roomId}/firstPlayerId`]: firstPlayerId,
    [`rooms/${roomId}/word`]: word,
  };

  // Imposta hint solo se abilitato
  if (hint !== null && hint !== undefined) {
    updates[`rooms/${roomId}/hint`] = hint;
  } else {
    updates[`rooms/${roomId}/hint`] = null;
  }

  roles.forEach((role, uid) => {
    updates[`rooms/${roomId}/players/${uid}/role`] = role;
    updates[`rooms/${roomId}/players/${uid}/isFirst`] = uid === firstPlayerId;
    updates[`rooms/${roomId}/players/${uid}/revealed`] = false;
  });

  await update(ref(database), updates);
}

/**
 * Termina la partita: resetta lo status a 'waiting', rimuove i ruoli e cambia la parola
 * @param roomId ID della stanza
 */
export async function endGame(roomId: string): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  // Ottieni tutti i giocatori
  const playersSnapshot = await get(ref(database, `rooms/${roomId}/players`));
  if (!playersSnapshot.exists()) {
    throw new Error('Nessun giocatore nella stanza');
  }

  const players = playersSnapshot.val();
  const playerUids = Object.keys(players);

  // Genera una nuova parola (diversa dalla precedente)
  let newWord = getRandomWord();
  let attempts = 0;
  while (newWord === roomData.word && attempts < 10) {
    newWord = getRandomWord();
    attempts++;
  }

  // Genera il nuovo indizio se abilitato
  const newHint = roomData.hintEnabled ? getHint(newWord) : null;

  // Aggiorna lo status, resetta i ruoli e cambia la parola
  const updates: { [key: string]: any } = {
    [`rooms/${roomId}/status`]: 'waiting' as RoomStatus,
    [`rooms/${roomId}/firstPlayerId`]: null,
    [`rooms/${roomId}/word`]: newWord,
  };

  // Imposta hint a null se non abilitato, altrimenti usa il valore ottenuto
  if (newHint !== null && newHint !== undefined) {
    updates[`rooms/${roomId}/hint`] = newHint;
  } else {
    updates[`rooms/${roomId}/hint`] = null;
  }

  // Resetta tutti i ruoli, isFirst e revealed
  playerUids.forEach((uid) => {
    updates[`rooms/${roomId}/players/${uid}/role`] = null;
    updates[`rooms/${roomId}/players/${uid}/isFirst`] = false;
    updates[`rooms/${roomId}/players/${uid}/revealed`] = false;
  });

  await update(ref(database), updates);
}

/**
 * Marca un giocatore come "revealed" (ha visualizzato la parola)
 * @param roomId ID della stanza
 * @param playerUid UID del giocatore
 */
export async function markPlayerAsRevealed(roomId: string, playerUid: string): Promise<void> {
  await update(ref(database), {
    [`rooms/${roomId}/players/${playerUid}/revealed`]: true,
  });
}

/**
 * Aggiorna il heartbeat dell'host per indicare che è ancora connesso
 * @param roomId ID della stanza
 */
export async function updateHeartbeat(roomId: string): Promise<void> {
  await update(ref(database), {
    [`rooms/${roomId}/lastHeartbeat`]: Date.now(),
  });
}

/**
 * Aggiorna il numero di impostori nella stanza
 * @param roomId ID della stanza
 * @param numImpostors Nuovo numero di impostori
 */
export async function updateNumImpostors(roomId: string, numImpostors: number): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'waiting') {
    throw new Error('Non puoi modificare il numero di impostori durante la partita');
  }

  await update(ref(database), {
    [`rooms/${roomId}/numImpostors`]: numImpostors,
  });
}

/**
 * Aggiorna le impostazioni dell'indizio nella stanza
 * @param roomId ID della stanza
 * @param hintEnabled Se l'indizio è abilitato
 * @param hintOnlyFirst Se l'indizio viene dato solo al primo giocatore
 */
export async function updateHintSettings(
  roomId: string,
  hintEnabled: boolean,
  hintOnlyFirst: boolean
): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'waiting') {
    throw new Error('Non puoi modificare le impostazioni dell\'indizio durante la partita');
  }

  // L'hint verrà generato quando si avvia la partita
  await update(ref(database), {
    [`rooms/${roomId}/hintEnabled`]: hintEnabled,
    [`rooms/${roomId}/hintOnlyFirst`]: hintOnlyFirst,
  });
}

/**
 * Elimina una stanza
 * @param roomId ID della stanza
 */
export async function deleteRoom(roomId: string): Promise<void> {
  await remove(ref(database, `rooms/${roomId}`));
}

/**
 * Controlla e elimina le stanze abbandonate (host disconnesso)
 * @param timeoutMs Timeout in millisecondi (default: 30 secondi)
 */
export async function cleanupAbandonedRooms(timeoutMs: number = 30000): Promise<void> {
  const roomsRef = ref(database, 'rooms');
  const snapshot = await get(roomsRef);
  
  if (!snapshot.exists()) {
    return;
  }

  const rooms = snapshot.val();
  const now = Date.now();
  const updates: { [key: string]: null } = {};

  for (const [roomId, roomData] of Object.entries(rooms)) {
    const room = roomData as Room;
    if (room.lastHeartbeat && (now - room.lastHeartbeat) > timeoutMs) {
      updates[`rooms/${roomId}`] = null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await update(ref(database), updates);
  }
}

/**
 * Sottoscrive ai cambiamenti di una stanza
 * @param roomId ID della stanza
 * @param callback Callback chiamato quando i dati cambiano
 * @returns Funzione per disiscriversi
 */
export function subscribeToRoom(
  roomId: string,
  callback: (room: Room | null) => void
): () => void {
  const roomRef = ref(database, `rooms/${roomId}`);
  
  const unsubscribe = onValue(roomRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val() as Room);
    } else {
      callback(null);
    }
  });

  // Restituisce funzione per disiscriversi
  return () => {
    off(roomRef);
  };
}

