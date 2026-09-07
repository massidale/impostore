import { EndActionButton } from '../../../core/components/EndActionButton';
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
          <EndActionButton kind="game" disabled={busy} onConfirm={() => run("end")} />
          {["performing", "ordering"].includes(s.phase) && (
            <EndActionButton kind="round" disabled={busy} onConfirm={() => run("cancelRound")} message="La fase in corso verrà annullata e verrà mostrato il suo esito." />
          )}
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
        </View>
      }
    >
      {!!error && <Text style={{ color: colors.danger }}>{error}</Text>}
    </HostDashboardShell>
  );
}
