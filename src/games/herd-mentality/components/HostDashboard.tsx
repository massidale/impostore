import { EndActionsRow } from '../../../core/components/EndActionsRow';
import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { HostDashboardProps } from "../../../core/types/gamePlugin";
import {
  Button,
  ErrorBanner,
  HostDashboardShell,
  colors,
  spacing,
} from "../../../core/ui";
import { sendAction } from "../services/herdMentalityLogic";
import { HerdMentalitySettings, HerdMentalityView } from "../types";

/** MainScreen supplies the scrollable footer, capped at 35% in portrait. */
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = (roomData.gameState ?? {}) as HerdMentalityView;
  const settings = roomData.settings as HerdMentalitySettings;
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => { setSelected([]); }, [roomData.matchId, s.roundId, s.phase]);
  useEffect(() => {
    setSelected(previous => previous.filter(id => (s.groups ?? []).some(g => g.id === id)));
  }, [JSON.stringify(s.groups)]);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: string, payload: unknown = {}) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, payload);
      if (action === "mergeGroups" || action === "undoMerge") setSelected([]);
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
    <HostDashboardShell gameName="Herd Mentality">
      {error && <ErrorBanner message={error} />}
      <View style={{ gap: spacing.sm }}>
        {s.phase === 'review' && <>
          <Text style={{ color: colors.textSecondary }}>Seleziona i gruppi con risposte equivalenti.</Text>
          {(s.groups ?? []).map(group => <Button key={group.id} variant={selected.includes(group.id) ? 'primary' : 'secondary'} disabled={busy}
            onPress={() => setSelected(previous => previous.includes(group.id) ? previous.filter(id => id !== group.id) : [...previous, group.id])}>
            {s.answersByUid?.[group.memberUids[0]] ?? 'Gruppo'} · {group.memberUids.length}
          </Button>)}
          <Button disabled={busy || selected.length < 2} onPress={() => act('mergeGroups', { groupIds: selected })}>Unisci gruppi selezionati</Button>
          <Button disabled={busy || !s.canUndo} variant="secondary" onPress={() => act('undoMerge')}>Annulla ultima fusione</Button>
          <Button disabled={busy} onPress={() => act('confirmResults')}>Conferma gruppi</Button>
        </>}
        {s.phase === "roundResults" && (
          <Button disabled={busy} onPress={() => act("nextRound")}>
            {(s.roundIndex ?? 0) + 1 >= (settings?.rounds ?? 8)
              ? "Mostra risultato finale"
              : "Prossima domanda"}
          </Button>
        )}
        <EndActionsRow
          round={["answering", "review"].includes(s.phase) ? { disabled: busy, onConfirm: () => act("cancelRound"), message: "La fase in corso verrà annullata e verrà mostrato il suo esito." } : undefined}
          game={{ disabled: busy, onConfirm: () => act("end") }}
        />
        {Object.values(roomData.players ?? {}).some((p) => p.waiting) && (
          <Text style={{ color: colors.textSecondary }}>
            Gli spettatori entrano nella prossima partita.
          </Text>
        )}
      </View>
    </HostDashboardShell>
  );
}
