import React, { useRef, useState } from "react";
import { Text, View } from "react-native";
import { HostDashboardProps } from "../../../core/types/gamePlugin";
import {
  Button,
  ErrorBanner,
  HostDashboardShell,
  colors,
  spacing,
} from "../../../core/ui";
import { sendAction } from "../services/justOneLogic";
import { JustOneSettings, JustOneView } from "../types";

/** MainScreen supplies the scrollable footer, capped at 35% in portrait. */
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = (roomData.gameState ?? {}) as JustOneView;
  const settings = roomData.settings as JustOneSettings;
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: string) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Azione non riuscita. Riprova.",
      );
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <HostDashboardShell gameName="Just One">
      {error && <ErrorBanner message={error} />}
      <View style={{ gap: spacing.sm }}>
        {s.phase === "roundResults" && (
          <Button disabled={busy} onPress={() => act("nextRound")}>
            {(s.roundIndex ?? 0) + 1 >= (settings?.rounds ?? 8)
              ? "Mostra risultato finale"
              : "Prossima parola"}
          </Button>
        )}
        {["clues", "review", "guessing"].includes(s.phase) && (
          <Button
            disabled={busy}
            variant="secondary"
            onPress={() => act("cancelRound")}
          >
            Annulla round senza punti
          </Button>
        )}
        <Button disabled={busy} variant="secondary" onPress={() => act("end")}>
          {s.phase === "results" ? "Torna alla lobby" : "Termina partita"}
        </Button>
        {Object.values(roomData.players ?? {}).some((p) => p.waiting) && (
          <Text style={{ color: colors.textSecondary }}>
            Gli spettatori entrano nella prossima partita.
          </Text>
        )}
      </View>
    </HostDashboardShell>
  );
}
