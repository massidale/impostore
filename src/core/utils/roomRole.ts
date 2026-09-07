/** Navigation (link, QR, saved room) never determines authority in a room. */
export function isRoomHost(room: {hostId?: string} | null | undefined, uid: string | null | undefined): boolean {
  return !!uid && room?.hostId === uid;
}
