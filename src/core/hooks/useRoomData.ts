import { useState, useEffect } from 'react';
import { subscribeToRoom } from '../services/roomService';
import { CoreRoom } from '../types/room';

export function useRoomData(roomId: string | null) {
  const [roomData, setRoomData] = useState<CoreRoom | null>(null);
  const [isFetched, setIsFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    if (roomId) {
      setIsFetched(false);
      setRoomData(null);
      const unsubscribe = subscribeToRoom(roomId, (room) => {
        setError(null);
        setRoomData(room);
        setIsFetched(true);
      }, () => setError('Connessione alla stanza non disponibile. Riprovo automaticamente…'));
      return unsubscribe;
    } else {
      setRoomData(null);
      setIsFetched(false);
    }
  }, [roomId]);

  return { roomData, isFetched, error };
}
