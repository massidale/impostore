import { EndActionsRow } from '../../../core/components/EndActionsRow';
import { EndActionButton } from '../../../core/components/EndActionButton';
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
import { JustOneSettings, JustOneView, JustOneTeamSummary } from "../types";

/** MainScreen supplies the scrollable footer, capped at 35% in portrait. */
export default function HostDashboard({ roomData }: HostDashboardProps) {
  const s = (roomData.gameState ?? {}) as JustOneView;
  const settings = roomData.settings as JustOneSettings;
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const act = async (action: string, team?: JustOneTeamSummary) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, team ? {
        teamId: team.id, teamRoundId: team.roundId, teamPhaseVersion: team.phaseVersion,
      } : {});
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
        {(s.teams ?? []).map((team) => (
          <View key={team.id} style={{ gap: spacing.sm }}>
            <Text style={{ color: colors.textSecondary }}>
              {team.name} · {team.phase === "results" ? "Terminata" : `Parola ${team.roundIndex + 1}/${settings.rounds}`}
            </Text>
            {team.phase === "roundResults" && (
              <Button disabled={busy} onPress={() => act("nextRound", team)}>
                {team.roundIndex + 1 >= settings.rounds ? `Concludi ${team.name}` : `Prossima parola · ${team.name}`}
              </Button>
            )}
            {["clues", "review", "guessing"].includes(team.phase) && (
              <EndActionButton kind="round" disabled={busy} onConfirm={() => act("cancelRound", team)} label={`Termina round · ${team.name}`} message={`La parola in corso di ${team.name} verrà annullata.`} />
            )}
          </View>
        ))}
        {s.phase === "results" && settings?.mode !== "teams" && (
          <Button disabled={busy} onPress={() => act("replay")}>Gioca ancora</Button>
        )}
        <EndActionsRow
          round={["clues", "review", "guessing"].includes(s.phase) ? { disabled: busy, onConfirm: () => act("cancelRound"), message: "La fase in corso verrà annullata e verrà mostrato il suo esito." } : undefined}
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
