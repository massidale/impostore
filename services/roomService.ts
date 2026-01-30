import { ref, set, get, onValue, off, update, remove } from 'firebase/database';
import { database } from '../config/firebase';
import { getRandomWord, getHint } from './wordService';
import { assignRoles, selectFirstPlayer } from './roleService';
import { Room, RoomStatus, Winner, PlayerRole } from '../types/game';

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
 * @param numClowns Numero di pagliacci nella partita
 * @returns ID della stanza creata
 */
export async function createRoom(
  numImpostors: number,
  hostId: string,
  hintEnabled: boolean = false,
  hintOnlyFirst: boolean = false,
  numClowns: number = 0
): Promise<string> {
  const roomId = generateRoomId();

  const roomData: Room = {
    word: '', // La parola viene assegnata quando si avvia la partita
    status: 'waiting',
    numImpostors,
    numClowns,
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
  const roles = assignRoles(playerUids, roomData.numImpostors, roomData.numClowns || 0);

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
 * Aggiorna il numero di pagliacci nella stanza
 * @param roomId ID della stanza
 * @param numClowns Nuovo numero di pagliacci
 */
export async function updateNumClowns(roomId: string, numClowns: number): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'waiting') {
    throw new Error('Non puoi modificare il numero di pagliacci durante la partita');
  }

  await update(ref(database), {
    [`rooms/${roomId}/numClowns`]: numClowns,
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

/**
 * Avvia la fase di votazione
 * @param roomId ID della stanza
 */
export async function startVoting(roomId: string): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'active') {
    throw new Error('La partita non è attiva');
  }

  // Resetta i voti e i dati di eliminazione, cambia lo status a 'voting'
  await update(ref(database), {
    [`rooms/${roomId}/status`]: 'voting' as RoomStatus,
    [`rooms/${roomId}/votes`]: null,
    [`rooms/${roomId}/eliminatedPlayer`]: null,
    [`rooms/${roomId}/eliminatedRole`]: null,
    [`rooms/${roomId}/winner`]: null,
    [`rooms/${roomId}/impostorGuess`]: null,
  });
}

/**
 * Registra un voto di un giocatore
 * @param roomId ID della stanza
 * @param voterUid UID di chi vota
 * @param votedUid UID di chi viene votato
 */
export async function castVote(
  roomId: string,
  voterUid: string,
  votedUid: string
): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'voting') {
    throw new Error('Non è il momento di votare');
  }

  if (!roomData.players || !roomData.players[voterUid]) {
    throw new Error('Giocatore non trovato');
  }

  if (!roomData.players[votedUid]) {
    throw new Error('Giocatore votato non trovato');
  }

  // Registra il voto
  await update(ref(database), {
    [`rooms/${roomId}/votes/${voterUid}`]: votedUid,
  });

  // Ricarica i dati per verificare se tutti hanno votato
  const updatedRoomData = await getRoomData(roomId);
  if (!updatedRoomData || !updatedRoomData.players) {
    return;
  }

  const playerCount = Object.keys(updatedRoomData.players).length;
  const voteCount = updatedRoomData.votes ? Object.keys(updatedRoomData.votes).length : 0;

  // Se tutti hanno votato, calcola i risultati
  if (voteCount >= playerCount) {
    await calculateVotingResults(roomId);
  }
}

/**
 * Calcola i risultati della votazione e determina il prossimo stato
 * @param roomId ID della stanza
 */
async function calculateVotingResults(roomId: string): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData || !roomData.votes || !roomData.players) {
    throw new Error('Dati mancanti per calcolare i risultati');
  }

  // Conta i voti per ogni giocatore
  const voteCounts: { [uid: string]: number } = {};
  for (const votedUid of Object.values(roomData.votes)) {
    voteCounts[votedUid] = (voteCounts[votedUid] || 0) + 1;
  }

  // Trova il massimo numero di voti
  const maxVotes = Math.max(...Object.values(voteCounts));

  // Trova tutti i giocatori con il massimo numero di voti
  const topVoted = Object.entries(voteCounts)
    .filter(([_, count]) => count === maxVotes)
    .map(([uid, _]) => uid);

  // Se c'è un pareggio, sceglie casualmente
  const eliminatedUid = topVoted[Math.floor(Math.random() * topVoted.length)];
  const eliminatedRole = roomData.players[eliminatedUid]?.role;

  // Determina il prossimo stato in base al ruolo eliminato
  let nextStatus: RoomStatus;
  let winner: Winner = null;

  if (eliminatedRole === 'clown') {
    // Pagliaccio eliminato: vince il pagliaccio
    nextStatus = 'results';
    winner = 'clown';
  } else if (eliminatedRole === 'impostor') {
    // Impostore eliminato: può provare a indovinare la parola
    nextStatus = 'impostor_guess';
    winner = null;
  } else {
    // Civile eliminato: vince l'impostore
    nextStatus = 'results';
    winner = 'impostor';
  }

  await update(ref(database), {
    [`rooms/${roomId}/status`]: nextStatus,
    [`rooms/${roomId}/eliminatedPlayer`]: eliminatedUid,
    [`rooms/${roomId}/eliminatedRole`]: eliminatedRole,
    [`rooms/${roomId}/winner`]: winner,
  });
}

/**
 * L'impostore eliminato tenta di indovinare la parola
 * @param roomId ID della stanza
 * @param guess Il tentativo di indovinare
 */
export async function submitImpostorGuess(
  roomId: string,
  guess: string
): Promise<void> {
  const roomData = await getRoomData(roomId);
  if (!roomData) {
    throw new Error('Stanza non trovata');
  }

  if (roomData.status !== 'impostor_guess') {
    throw new Error('Non è il momento di indovinare');
  }

  // Confronta il tentativo con la parola (case-insensitive)
  const isCorrect = guess.toLowerCase().trim() === roomData.word.toLowerCase().trim();
  const winner: Winner = isCorrect ? 'impostor' : 'civilians';

  await update(ref(database), {
    [`rooms/${roomId}/status`]: 'results' as RoomStatus,
    [`rooms/${roomId}/impostorGuess`]: guess,
    [`rooms/${roomId}/winner`]: winner,
  });
}

/**
 * Ottiene il nome di un giocatore dalla stanza
 * @param roomData Dati della stanza
 * @param playerUid UID del giocatore
 * @returns Nome del giocatore o "Giocatore" se non trovato
 */
export function getPlayerName(roomData: Room, playerUid: string): string {
  if (!roomData.players || !roomData.players[playerUid]) {
    return 'Giocatore';
  }
  return roomData.players[playerUid].name || 'Giocatore';
}

