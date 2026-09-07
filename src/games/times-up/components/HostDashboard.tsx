import { EndActionButton } from '../../../core/components/EndActionButton';
import React, { useState } from "react";
import { Text, View } from "react-native";
import type { HostDashboardProps } from "../../../core/types/gamePlugin";
import { HostDashboardShell, Button, colors } from "../../../core/ui";
import { sendAction } from "../services/timesUpLogic";
import type { TimesUpView } from "../types";
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = roomData.gameState as unknown as TimesUpView;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (a: string) => {
    setBusy(true);
    setError("");
    try {
      await sendAction(roomData.id, a);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova");
    } finally {
      setBusy(false);
    }
  };
  return (
    <HostDashboardShell
      gameName="Time’s Up"
      actions={
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
          <EndActionButton kind="game" disabled={busy} onConfirm={() => run("end")} />
          {["ready", "turnResults"].includes(s.phase) && (
            <Button disabled={busy} onPress={() => run("beginTurn")}>
              Avvia turno
            </Button>
          )}
          {s.phase === "turn" && (
            <EndActionButton kind="turn" disabled={busy} onConfirm={() => run("endTurn")} />
          )}
          {s.phase === "roundResults" && (
            <Button disabled={busy} onPress={() => run("nextRound")}>
              Prossimo round
            </Button>
          )}
        </View>
      }
    >
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </HostDashboardShell>
  );
}
