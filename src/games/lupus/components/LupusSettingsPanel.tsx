import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import {
  Button,
  Input,
  NumberSelector,
  avatarColor,
  avatarInitial,
  colors,
  fonts,
  radius,
  spacing,
  fontSize,
} from '../../../core/ui';
import { EXTERNAL_NARRATOR, LupusSettings } from '../types';

export default function LupusSettingsPanel({
  settings,
  onSettingsChange,
  roomData,
}: SettingsPanelProps) {
  const s = (settings || {}) as LupusSettings;
  const numLupi = s.numLupi ?? 1;
  const veggenteEnabled = s.veggenteEnabled ?? true;
  const guardiaEnabled = s.guardiaEnabled ?? true;
  const mediumEnabled = s.mediumEnabled ?? false;
  const boccaEnabled = s.boccaEnabled ?? false;
  const votingSeconds = s.votingSeconds ?? 90;
  const nightSeconds = s.nightSeconds ?? 60;
  const narratorEnabled = s.narratorEnabled ?? false;
  const narratorUid = s.narratorUid ?? null;
  const customRoles = s.customRoles ?? [];

  const [customDraft, setCustomDraft] = useState('');

  const update = (partial: Partial<LupusSettings>) => {
    onSettingsChange({
      numLupi,
      veggenteEnabled,
      guardiaEnabled,
      mediumEnabled,
      boccaEnabled,
      votingSeconds,
      nightSeconds,
      narratorEnabled,
      narratorUid,
      customRoles,
      ...partial,
    } satisfies LupusSettings);
  };

  const addCustomRole = () => {
    const name = customDraft.trim();
    if (!name) return;
    update({ customRoles: [...customRoles, name] });
    setCustomDraft('');
  };

  const removeCustomRole = (index: number) => {
    update({ customRoles: customRoles.filter((_, i) => i !== index) });
  };

  const players = Object.entries(roomData?.players ?? {});

  return (
    <View>
      <NumberSelector
        label="Numero di Lupi"
        value={numLupi}
        onChange={(v) => update({ numLupi: v })}
        min={1}
        max={4}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>🔮 Veggente</Text>
        <Switch value={veggenteEnabled} onValueChange={(v) => update({ veggenteEnabled: v })} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>🛡️ Guardia</Text>
        <Switch value={guardiaEnabled} onValueChange={(v) => update({ guardiaEnabled: v })} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>👻 Medium</Text>
        <Switch value={mediumEnabled} onValueChange={(v) => update({ mediumEnabled: v })} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>💋 Bocca di Rosa</Text>
        <Switch value={boccaEnabled} onValueChange={(v) => update({ boccaEnabled: v })} />
      </View>

      <NumberSelector
        label="Durata notte (secondi)"
        value={nightSeconds}
        onChange={(v) => update({ nightSeconds: v })}
        min={30}
        max={300}
        step={15}
        style={{ marginTop: spacing.lg }}
      />

      <NumberSelector
        label="Durata votazione (secondi)"
        value={votingSeconds}
        onChange={(v) => update({ votingSeconds: v })}
        min={30}
        max={300}
        step={15}
        style={{ marginTop: spacing.lg }}
      />

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>🎙️ Narratore</Text>
        <Switch
          value={narratorEnabled}
          onValueChange={(v) =>
            update({ narratorEnabled: v, narratorUid: v ? narratorUid : null })
          }
        />
      </View>

      {narratorEnabled ? (
        <View style={styles.narratorBlock}>
          <Text style={styles.blockHint}>
            Il narratore dirige interamente la partita: l'app distribuisce le
            carte, raccoglie i sondaggi (se li attiva) e gli riporta gli eventi.
            Decide tutto lui. Non riceve un ruolo.
          </Text>

          {players.length > 0 ? (
            <View style={styles.narratorList}>
              <TouchableOpacity
                onPress={() => update({ narratorUid: EXTERNAL_NARRATOR })}
                activeOpacity={0.7}
                style={[
                  styles.narratorRow,
                  narratorUid === EXTERNAL_NARRATOR && styles.narratorRowActive,
                ]}
              >
                <Text style={styles.externalEmoji}>🪑</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.narratorName}>Narratore esterno (senza app)</Text>
                  <Text style={styles.externalHint}>
                    L'app si limita a distribuire le carte con i ruoli.
                  </Text>
                </View>
                {narratorUid === EXTERNAL_NARRATOR ? (
                  <Text style={styles.narratorTag}>NARRATORE</Text>
                ) : null}
              </TouchableOpacity>
              {players.map(([uid, p]) => {
                const name = p.name || 'Senza nome';
                const active = narratorUid === uid;
                return (
                  <TouchableOpacity
                    key={uid}
                    onPress={() => update({ narratorUid: uid })}
                    activeOpacity={0.7}
                    style={[styles.narratorRow, active && styles.narratorRowActive]}
                  >
                    <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
                      <Text style={styles.avatarText}>{avatarInitial(name)}</Text>
                    </View>
                    <Text style={styles.narratorName} numberOfLines={1}>
                      {name}
                    </Text>
                    {active ? <Text style={styles.narratorTag}>NARRATORE</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.blockHint}>
              Potrai scegliere il narratore dalle impostazioni della stanza.
            </Text>
          )}

          <Text style={styles.sectionLabel}>Ruoli personalizzati</Text>
          <Text style={styles.blockHint}>
            Assegnati a caso ai villici. L'app non ne gestisce i poteri: li
            applica il narratore (può segnare morti/vivi dalla sua schermata).
          </Text>
          <View style={styles.customRow}>
            <Input
              placeholder="Es. Cacciatore"
              value={customDraft}
              onChangeText={setCustomDraft}
              maxLength={24}
              style={{ flex: 1 }}
            />
            <Button
              onPress={addCustomRole}
              variant="secondary"
              size="sm"
              style={styles.addButton}
              disabled={!customDraft.trim()}
            >
              Aggiungi
            </Button>
          </View>
          {customRoles.map((role, i) => (
            <View key={`${role}-${i}`} style={styles.customItem}>
              <Text style={styles.customItemText} numberOfLines={1}>
                🎭 {role}
              </Text>
              <TouchableOpacity
                onPress={() => removeCustomRole(i)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={`Rimuovi ${role}`}
              >
                <Text style={styles.customRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  switchLabel: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
  },
  narratorBlock: {
    marginTop: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  blockHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 19,
  },
  narratorList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  narratorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  narratorRowActive: {
    borderColor: colors.primary,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.background,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.sm,
  },
  narratorName: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
  },
  narratorTag: {
    color: colors.primaryLight,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1,
  },
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  addButton: {
    width: 110,
  },
  customItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  customItemText: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodyMedium,
    fontSize: fontSize.sm,
  },
  customRemove: {
    color: colors.textMuted,
    fontSize: 20,
    lineHeight: 20,
  },
  externalEmoji: {
    fontSize: fontSize.lg,
    width: 30,
    textAlign: 'center',
  },
  externalHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    marginTop: 1,
  },
});
