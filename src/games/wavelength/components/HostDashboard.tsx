import React from "react";
import { Text } from "react-native";
import { HostDashboardProps } from "../../../core/types/gamePlugin";
import { HostDashboardShell, colors } from "../../../core/ui";
import { WavelengthView } from "../types";
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = roomData.gameState as WavelengthView | undefined;
  return (
    <HostDashboardShell
      gameName="Wavelength"
      status={
        <Text style={{ color: colors.textSecondary }}>
          Indovino: {roomData.players?.[s?.guesserUid ?? ""]?.name ?? "—"}
        </Text>
      }
      waitingNames={Object.values(roomData.players ?? {})
        .filter((p) => p.waiting)
        .map((p) => p.name ?? "Giocatore")}
    />
  );
}
