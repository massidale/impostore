import { EndActionsRow } from '../../../core/components/EndActionsRow';
import React, { useState } from "react";
import { Text, View } from "react-native";
import type { HostDashboardProps } from "../../../core/types/gamePlugin";
import { HostDashboardShell, Button, colors } from "../../../core/ui";
import { sendAction } from "../services/topTenLogic";
import type { TopTenView } from "../types";
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = roomData.gameState as unknown as TopTenView;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const run = async (a: string, p: unknown = {}) => {
    setBusy(true);
    setError("");
    try {
      await sendAction(roomData.id, a, p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova");
    } finally {
      setBusy(false);
    }
  };
  return (
    <HostDashboardShell
      gameName="Top Ten"
      actions={
        <View style={{ flex: 1, minWidth: 0, gap: 8 }}>

          {s.phase === "performing" && (
            <Button
              disabled={busy}
              onPress={() => run("beginOrdering")}
            >
              Apri ordinamento
            </Button>
          )}
          {s.phase === "roundResults" && (
            <Button disabled={busy} onPress={() => run("nextRound")}>
              Continua
            </Button>
          )}
          <EndActionsRow
            round={["performing", "ordering"].includes(s.phase) ? { kind: 'round', disabled: busy, onConfirm: () => run('cancelRound') } : undefined}
            game={{ disabled: busy, onConfirm: () => run('end') }}
          />
        </View>
      }
    >
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </HostDashboardShell>
  );
}
