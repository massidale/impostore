import { roomCommand } from "../../../core/services/roomCommand";
export async function sendAction(
  roomId: string,
  action: string,
  payload: unknown = {},
) {
  await roomCommand(roomId, "just-one." + action, [payload]);
}
