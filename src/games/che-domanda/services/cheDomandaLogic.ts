import { roomCommand } from "../../../core/services/roomCommand";
export const sendAction = (
  roomId: string,
  action: string,
  payload: unknown = {},
) => roomCommand(roomId, "che-domanda." + action, [payload]);
export async function initCheDomandaGame(
  roomId: string,
  settings: unknown,
): Promise<void> {
  await sendAction(roomId, "init", settings);
}
export async function startCheDomandaGame(roomId: string): Promise<void> {
  await sendAction(roomId, "start");
}
