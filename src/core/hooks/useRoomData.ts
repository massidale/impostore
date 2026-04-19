import { useState, useEffect } from 'react';
import { subscribeToRoom } from '../services/roomService';
import { CoreRoom } from '../types/room';

export function useRoomData(roomId: string | null) {
  const [roomData, setRoomData] = useState<CoreRoom | null>(null);
  const [isFetched, setIsFetched] = useState(false);

  useEffect(() => {
    if (roomId) {
      setIsFetched(false);
      const unsubscribe = subscribeToRoom(roomId, (room) => {
        setRoomData(room);
        setIsFetched(true);
      });
      return unsubscribe;
    } else {
      setRoomData(null);
      setIsFetched(false);
    }
  }, [roomId]);

  return { roomData, isFetched };
}
