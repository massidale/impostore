/** Old structured rooms and lossless roomsV2 strings coexist during rollout. */
function roomTimestamp(value, isEnvelope) {
  let room = isEnvelope ? value?.data : value;
  try {
    if (typeof room === "string") room = JSON.parse(room);
  } catch {
    return null;
  }
  if (!room || typeof room !== "object") return null;
  const timestamp = room.updatedAt ?? room.createdAt;
  return typeof timestamp === "number" && Number.isFinite(timestamp)
    ? timestamp
    : null;
}
module.exports = { roomTimestamp };
