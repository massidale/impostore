import React, { useState } from "react";
import { Text, View } from "react-native";
import { Button, ErrorBanner, Input, colors, fonts, spacing } from "../../ui";
import { roomCommand } from "../../services/roomCommand";

/** Server-validated content override. JSON stays local until explicitly saved. */
export function ContentEditor({
  roomId,
  gameId,
  example,
  title = "Contenuti personalizzati",
}: {
  roomId?: string;
  gameId: string;
  example: string;
  title?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  if (!roomId) return null;
  const save = async (reset = false) => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const data = reset ? null : JSON.parse(draft);
      await roomCommand(roomId, gameId + ".setContent", [data]);
      setSaved(true);
      if (reset) setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossibile salvare");
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
      <Button size="sm" variant="secondary" onPress={() => setOpen(!open)}>
        {open ? "Chiudi contenuti" : title}
      </Button>
      {open && (
        <>
          <Text style={{ color: colors.textSecondary, fontFamily: fonts.body }}>
            Incolla un elenco JSON. Il server verifica formato e limiti prima di
            salvarlo per questa stanza.
          </Text>
          <Input
            multiline
            value={draft}
            onChangeText={setDraft}
            placeholder={example}
            style={{ minHeight: 110, textAlignVertical: "top" }}
          />
          {error && <ErrorBanner message={error} />}
          {saved && (
            <Text style={{ color: colors.success }}>Contenuti salvati.</Text>
          )}
          <Button disabled={busy || !draft.trim()} onPress={() => save()}>
            Salva contenuti
          </Button>
          <Button
            disabled={busy}
            variant="secondary"
            size="sm"
            onPress={() => save(true)}
          >
            Ripristina contenuti predefiniti
          </Button>
        </>
      )}
    </View>
  );
}
