import { roomCommand } from "../../../core/services/roomCommand";
export const sendAction = (
  roomId: string,
  action: string,
  payload: unknown = {},
) => roomCommand(roomId, "times-up." + action, [payload]);
