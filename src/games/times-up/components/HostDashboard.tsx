import { EndActionsRow } from '../../../core/components/EndActionsRow';
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
          {["ready", "turnResults"].includes(s.phase) && (
            <Button disabled={busy} onPress={() => run("beginTurn")}>
              Avvia turno
            </Button>
          )}

          {s.phase === "roundResults" && (
            <Button disabled={busy} onPress={() => run("nextRound")}>
              Prossimo round
            </Button>
          )}
          <EndActionsRow
            round={["turn"].includes(s.phase) ? { kind: 'turn', disabled: busy, onConfirm: () => run('endTurn') } : undefined}
            game={{ disabled: busy, onConfirm: () => run('end') }}
          />
        </View>
      }
    >
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </HostDashboardShell>
  );
}
