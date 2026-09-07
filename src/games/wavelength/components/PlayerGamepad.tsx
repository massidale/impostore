import { EndActionButton } from '../../../core/components/EndActionButton';
import { FirstPlayerCard } from '../../../core/components/FirstPlayerCard';
import React, { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { PlayerGamepadProps } from "../../../core/types/gamePlugin";
import { Button, colors, fonts } from "../../../core/ui";
import { RoundLayout } from "../../../core/components/newGames/RoundLayout";
import { NumberPad } from "../../../core/components/newGames/NumberPad";
import { roomCommand } from "../../../core/services/roomCommand";
import { WavelengthView } from "../types";
export default function PlayerGamepad({
  roomData,
  playerId,
}: PlayerGamepadProps) {
  const s = roomData.gameState as WavelengthView | undefined;
  const [guess, setGuess] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setGuess(null);
    setError(null);
  }, [roomData.matchId, s?.roundId, playerId]);
  if (!s) return <Text>Caricamento…</Text>;
  const host = roomData.hostId === playerId;
  const member = s.participantUids?.includes(playerId);
  const guesser = member && s.guesserUid === playerId;
  const name = (id: string) => roomData.players?.[id]?.name ?? "Giocatore";
  const send = async (action: string, payload: unknown = {}) => {
    setBusy(true);
    setError(null);
    try {
      await roomCommand(roomData.id, "wavelength." + action, [payload]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Riprova: invio non riuscito");
    } finally {
      setBusy(false);
    }
  };
  const result = s.phase === "roundResults" || s.phase === "results";
  const card = (
    <View
      style={{
        padding: 24,
        backgroundColor: colors.surfaceAlt,
        borderRadius: 20,
        gap: 16,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.displayHeavy,
          fontSize: 26,
          color: colors.textPrimary,
          textAlign: "center",
        }}
      >
        {result
          ? s.cancelled
            ? "Partita annullata"
            : `Numero comune: ${s.target}`
          : guesser
            ? "Trova il numero comune"
            : member && s.target != null
              ? `Il numero comune è ${s.target}`
              : "Ascolta gli esempi"}
      </Text>
      <Text
        style={{
          fontSize: 17,
          color: colors.textSecondary,
          textAlign: "center",
        }}
      >
        {result
          ? s.cancelled
            ? "Partita annullata. Potete giocare ancora."
            : `${name(s.guesserUid)} ha scelto ${s.guess}. Scarto: ${s.distance}.`
          : guesser
            ? "Fai una domanda a ogni interlocutore. Gli esempi descrivono tutti lo stesso voto da 1 a 10."
            : member
              ? "Dai un esempio che vale questo voto. Non pronunciare il numero!"
              : "Sei spettatore: entrerai nella prossima partita."}
      </Text>
    </View>
  );
  return (
    <RoundLayout
      roomData={roomData}
      title="Wavelength"
      card={card}
      error={error}
    >
      {busy && <Text style={{ color: colors.textSecondary }}>Invio…</Text>}
      {s.phase === "clues" && (
        <>
          <Text style={{ color: colors.textPrimary }}>
            Indovino: {name(s.guesserUid)}
          </Text>
          {s.suggestion && (
            <Text style={{ color: colors.textSecondary }}>
              Suggerimento facoltativo: {s.suggestion}
            </Text>
          )}
          <FirstPlayerCard name={s.turnOrder?.[0] ? name(s.turnOrder[0]) : null} isMe={s.turnOrder?.[0] === playerId} />
          {guesser && (
            <Button disabled={busy} onPress={() => send("beginGuess")}>
              Scegli il numero
            </Button>
          )}
        </>
      )}
      {s.phase === "guessing" &&
        (guesser ? (
          <>
            <NumberPad value={guess} onChange={setGuess} disabled={busy} />
            <Button
              disabled={busy || guess === null}
              onPress={() => send("submitGuess", { value: guess })}
            >
              Conferma {guess ?? "un numero"}
            </Button>
          </>
        ) : (
          <Text style={{ color: colors.textPrimary }}>
            {name(s.guesserUid)} sta scegliendo un numero.
          </Text>
        ))}
      {host && s.phase === "results" && (
        <Button disabled={busy} onPress={() => send("replay")}>Gioca ancora</Button>
      )}
      {host && ["clues", "guessing"].includes(s.phase) && (
        <EndActionButton kind="round" disabled={busy} onConfirm={() => send("cancelRound")} message="La fase in corso verrà annullata e verrà mostrato il suo esito." />
      )}
      {host && (
        <EndActionButton kind="game" disabled={busy} onConfirm={() => send("end")} />
      )}
    </RoundLayout>
  );
}
