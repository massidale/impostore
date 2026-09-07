import { FirstPlayerCard } from '../../../core/components/FirstPlayerCard';
import React, { useState, useEffect } from "react";
import { Text, View } from "react-native";
import type { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { Button, WordBox, PhaseCard, StatusCard, PlayerSlot, colors, fonts, spacing } from "../../../core/ui";
import { sendAction } from "../services/topTenLogic";
import type { TopTenView, TopTenSettings } from "../types";
export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const s = roomData.gameState as unknown as TopTenView;
  const [order, setOrder] = useState<string[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setOrder([...(s.performanceOrder ?? [])]);
    setError(null);
  }, [roomData.matchId, s.roundId]);
  const run = async (action: string, payload: unknown = {}) => {
    setBusy(true);
    setError(null);
    try {
      await sendAction(roomData.id, action, payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova");
    } finally {
      setBusy(false);
    }
  };
  const name = (id: string) => roomData.players?.[id]?.name ?? id;
  const participant = s.participantUids?.includes(playerId),
    captain = s.captainUid === playerId;
  const move = (i: number, d: number) =>
    setOrder((a) => {
      const b = [...a];
      [b[i], b[i + d]] = [b[i + d], b[i]];
      return b;
    });
  const label = { color: colors.textSecondary, fontFamily: fonts.body, fontSize: 14 };
  const reveal = ["roundResults", "results"].includes(s.phase);
  return (
    <RoundLayout
      roomData={roomData}
      title={`Top Ten · tema ${s.roundId}/${(roomData.settings as TopTenSettings)?.rounds ?? 5}`}
      error={error}
      card={
        <View style={{ gap: spacing.sm }}>
          <View>
            <WordBox label="Il tema" word={s.theme?.prompt ?? 'Preparazione del tema'} size="md" style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.sm }} />
            <Text style={[label, { marginVertical: spacing.sm }]}>1 · {s.theme?.lowLabel}{'\n'}10 · {s.theme?.highLabel}</Text>
            {participant && s.ownNumber !== undefined && !reveal && <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm }}><Text style={label}>Il tuo numero</Text><Text style={{ color: colors.primaryLight, fontFamily: fonts.displayHeavy, fontSize: 36 }}>{s.ownNumber}</Text></View>}
          </View>
        </View>
      }
    >
      <FirstPlayerCard name={name(s.captainUid)} isMe={captain} roleLabel="il capitano" />
      {s.phase === 'performing' && <FirstPlayerCard name={s.performanceOrder?.[0] ? name(s.performanceOrder[0]) : null} isMe={s.performanceOrder?.[0] === playerId} />}
      {!participant && <StatusCard title="Spettatore" message="Parteciperai dalla prossima partita." tone="muted" />}
      {s.phase === "performing" && (
        <>
          {captain && roomData.hostId !== playerId && (
            <Button disabled={busy} onPress={() => run("beginOrdering")}>
              Ordina le interpretazioni
            </Button>
          )}
        </>
      )}
      {s.phase === "ordering" &&
        (captain ? (
          <>
            <Text style={label}>
              Ordina dal numero più basso al più alto, includendo te.
            </Text>
            {order.map((id, i) => (
              <PlayerSlot key={id} uid={id} name={name(id)} compact outlined subtitle={null}
                right={<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Text style={label}>{i + 1}</Text>
                  <View style={{ width: 44 }}><Button accessibilityLabel={`Sposta ${name(id)} su`} size="sm" variant="secondary" disabled={busy || i === 0} onPress={() => move(i, -1)}>↑</Button></View>
                  <View style={{ width: 44 }}><Button accessibilityLabel={`Sposta ${name(id)} giù`} size="sm" variant="secondary" disabled={busy || i === order.length - 1} onPress={() => move(i, 1)}>↓</Button></View>
                </View>} />
            ))}
            <Button
              disabled={busy}
              onPress={() => run("submitOrder", { uids: order })}
            >
              Conferma ordine definitivo
            </Button>
          </>
        ) : (
<StatusCard title="Ordinamento in corso" message="Il capitano sta ordinando le interpretazioni." />
        ))}
      {reveal && (
        <>
          <Text style={label}>
            {s.cancelled
              ? "Tema annullato"
              : s.correctOrder ? "Ordine corretto!" : "Ordine da rivedere"}
          </Text>
          <PhaseCard title="Il vostro ordine" compact>
            {s.order?.map((id, i) => <PlayerSlot key={id} uid={id} name={name(id)} compact subtitle={null}
              right={<Text style={label}>{i + 1} · {s.numbersByUid?.[id]}</Text>} />)}
          </PhaseCard>
          {!s.cancelled && <PhaseCard title="Ordine corretto" compact tone="success">
            {Object.entries(s.numbersByUid ?? {}).sort((a, b) => a[1] - b[1]).map(([id, number]) =>
              <PlayerSlot key={id} uid={id} name={name(id)} compact subtitle={null} right={<Text style={label}>{number}</Text>} />)}
          </PhaseCard>}
        </>
      )}
    </RoundLayout>
  );
}
