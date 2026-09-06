import React from "react";
import { Text } from "react-native";
import { HostDashboardProps } from "../../../core/types/gamePlugin";
import { HostDashboardShell, colors } from "../../../core/ui";
import { CheDomandaView } from "../types";
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = roomData.gameState as CheDomandaView | undefined;
  return (
    <HostDashboardShell
      gameName="Che domanda?"
      status={
        <Text style={{ color: colors.textSecondary }}>
          {s?.participantUids?.length ?? 0} partecipanti
        </Text>
      }
      waitingNames={Object.values(roomData.players ?? {})
        .filter((p) => p.waiting)
        .map((p) => p.name ?? "Giocatore")}
    />
  );
}
