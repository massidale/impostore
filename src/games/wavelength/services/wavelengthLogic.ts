import { roomCommand } from "../../../core/services/roomCommand";
export const sendAction = (
  roomId: string,
  action: string,
  payload: unknown = {},
) => roomCommand(roomId, "wavelength." + action, [payload]);
export async function initWavelengthGame(
  roomId: string,
  settings: unknown,
): Promise<void> {
  await sendAction(roomId, "init", settings);
}
export async function startWavelengthGame(roomId: string): Promise<void> {
  await sendAction(roomId, "start");
}
