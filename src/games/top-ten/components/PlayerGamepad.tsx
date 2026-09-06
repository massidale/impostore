import React, { useState, useEffect } from "react";
import { Text, View, Pressable } from "react-native";
import type { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { Button, colors, fonts } from "../../../core/ui";
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
  const label = { color: colors.textPrimary, fontSize: 18 };
  const reveal = ["roundResults", "results"].includes(s.phase);
  const current = s.performanceOrder?.[s.performed?.length ?? 0];
  return (
    <RoundLayout
      roomData={roomData}
      title={`Top Ten · tema ${s.roundId}/${(roomData.settings as TopTenSettings)?.rounds ?? 5}`}
      error={error}
      card={
        <View
          style={{
            backgroundColor: colors.surfaceAlt,
            borderRadius: 20,
            padding: 24,
            gap: 14,
          }}
        >
          <Text
            style={{ ...label, fontFamily: fonts.displayHeavy, fontSize: 26 }}
          >
            {s.theme?.prompt ?? "Preparazione del tema"}
          </Text>
          <Text style={label}>
            1 · {s.theme?.lowLabel}
            {"\n"}10 · {s.theme?.highLabel}
          </Text>
          {participant && s.ownNumber !== undefined && !reveal && (
            <Text style={{ ...label, fontSize: 40, textAlign: "center" }}>
              Il tuo numero: {s.ownNumber}
            </Text>
          )}
          <Text style={label}>Capitano: {name(s.captainUid)}</Text>
          {!participant && (
            <Text style={label}>
              Spettatore · parteciperai dalla prossima partita
            </Text>
          )}
        </View>
      }
    >
      {s.phase === "performing" && (
        <>
          <Text style={label}>
            Interpretazioni: {s.performed?.length ?? 0}/
            {s.performanceOrder?.length ?? 0}.{" "}
            {current
              ? `Ora parla ${name(current)}`
              : "Tutti hanno interpretato il tema."}
          </Text>
          {s.performanceOrder?.map((id, i) => (
            <Text key={id} style={label}>
              {i + 1}. {name(id)} {s.performed?.includes(id) ? "✓" : ""}
            </Text>
          ))}
          {participant && current === playerId && (
            <Button
              disabled={busy}
              onPress={() => run("markPerformed", { playerUid: playerId })}
            >
              Ho finito
            </Button>
          )}
          {captain && !current && (
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
              <View
                key={id}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={{ ...label, flex: 1 }}>
                  {i + 1}. {name(id)}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sposta ${name(id)} su`}
                  disabled={busy || i === 0}
                  onPress={() => move(i, -1)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.surfaceAlt,
                    opacity: busy || i === 0 ? 0.4 : 1,
                  }}
                >
                  <Text style={label}>↑</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Sposta ${name(id)} giù`}
                  disabled={busy || i === order.length - 1}
                  onPress={() => move(i, 1)}
                  style={{
                    minWidth: 48,
                    minHeight: 48,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: colors.surfaceAlt,
                    opacity: busy || i === order.length - 1 ? 0.4 : 1,
                  }}
                >
                  <Text style={label}>↓</Text>
                </Pressable>
              </View>
            ))}
            <Button
              disabled={busy}
              onPress={() => run("submitOrder", { uids: order })}
            >
              Conferma ordine definitivo
            </Button>
          </>
        ) : (
          <Text style={label}>
            Il capitano sta ordinando le interpretazioni.
          </Text>
        ))}
      {reveal && (
        <>
          <Text style={label}>
            {s.cancelled
              ? "Tema annullato"
              : `Punti del tema: ${s.roundScore ?? 0}/${(s.participantUids?.length ?? 1) - 1}`}
          </Text>
          {s.order?.map((id, i) => (
            <Text key={id} style={label}>
              {i + 1}. {name(id)} · {s.numbersByUid?.[id]}
            </Text>
          ))}
          <Text style={{ ...label, fontSize: 24 }}>
            Totale cooperativo: {s.score} /{" "}
            {((s.participantUids?.length ?? 1) - 1) *
              ((roomData.settings as TopTenSettings)?.rounds ?? 5)}
          </Text>
          {s.phase === "results" &&
            s.history?.map((h) => (
              <Text key={h.round} style={label}>
                Tema {h.round}: {h.score} punti{" "}
                {h.cancelled ? "· annullato" : ""}
              </Text>
            ))}
        </>
      )}
    </RoundLayout>
  );
}
