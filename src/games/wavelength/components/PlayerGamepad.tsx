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
  const visibleNumber = !s.cancelled && (result || member && !guesser) ? s.target : null;
  const card = (
    <View>
      <View style={{padding: 20, backgroundColor: colors.surfaceAlt, borderRadius: 20, gap: 12}}>
        <Text style={{fontFamily:fonts.displayHeavy,fontSize:24,color:colors.textPrimary,textAlign:'center'}}>
          {s.cancelled ? 'Partita annullata' : visibleNumber != null ? 'Il numero è' : guesser ? 'Trova il numero comune' : 'Ascolta gli esempi'}
        </Text>
        {visibleNumber != null && <Text style={{fontFamily:fonts.displayHeavy,fontSize:96,lineHeight:108,color:colors.textPrimary,textAlign:'center'}}>{visibleNumber}</Text>}
        <Text style={{fontSize:16,color:colors.textSecondary,textAlign:'center'}}>
          {result ? s.cancelled ? 'Potete giocare ancora.' : `${name(s.guesserUid)} ha scelto ${s.guess}. Scarto: ${s.distance}.`
            : guesser ? 'Fai una domanda a ogni interlocutore e indovina il voto comune.'
            : member ? 'Dai un esempio che vale questo voto. Non pronunciare il numero!'
            : 'Sei spettatore: entrerai nella prossima partita.'}
        </Text>
      </View>
      <FirstPlayerCard name={name(s.guesserUid)} isMe={guesser} roleLabel="l’indovino" />
      {!result && <FirstPlayerCard name={s.turnOrder?.[0] ? name(s.turnOrder[0]) : null} isMe={s.turnOrder?.[0] === playerId} />}
    </View>
  );
  return (
    <RoundLayout
      roomData={roomData}
      gameName="Wavelength"
      card={card}
      error={error}
    >
      {busy && <Text style={{ color: colors.textSecondary }}>Invio…</Text>}
      {s.phase === "clues" && (
        <>
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
    </RoundLayout>
  );
}
