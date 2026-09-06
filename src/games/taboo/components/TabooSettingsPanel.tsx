import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SettingsPanelProps } from '../../../core/types/gamePlugin';
import {
  NumberSelector,
  SegmentedControl,
  avatarColor,
  avatarInitial,
  colors,
  fonts,
  radius,
  spacing,
  fontSize,
} from '../../../core/ui';
import { TabooSettings, TeamId, TeamMode } from '../types';


const TEAM_LABEL: Record<TeamId, string> = {
  blue: 'Blu',
  red: 'Rossa',
};

const TEAM_COLOR: Record<TeamId, string> = {
  blue: colors.teamBlue,
  red: colors.teamRed,
};

export default function TabooSettingsPanel({
  settings,
  onSettingsChange,
  roomData,
  roomId,
}: SettingsPanelProps) {
  const s = (settings || {}) as TabooSettings;
  const turnSeconds = s.turnSeconds ?? 60;
  const turnsPerTeam = s.turnsPerTeam ?? 3;
  const maxSkips = s.maxSkips ?? 3;
  const teamMode: TeamMode = s.teamMode ?? 'auto';
  const manualTeams = s.manualTeams ?? {};

  const update = (partial: Partial<TabooSettings>) => {
    onSettingsChange({
      turnSeconds,
      turnsPerTeam,
      maxSkips,
      teamMode,
      manualTeams,
      ...partial,
    } satisfies TabooSettings);
  };

  const assignTeam = (uid: string, team: TeamId) => {
    update({ manualTeams: { ...manualTeams, [uid]: team } });
  };

  const players = Object.entries(roomData?.players ?? {});

  return (
    <View>
      <NumberSelector
        label="Durata turno (secondi)"
        value={turnSeconds}
        onChange={(v) => update({ turnSeconds: v })}
        min={30}
        max={180}
        step={15}
      />

      <NumberSelector
        label="Turni per squadra"
        value={turnsPerTeam}
        onChange={(v) => update({ turnsPerTeam: v })}
        min={1}
        max={10}
        style={{ marginTop: spacing.lg }}
      />

      <NumberSelector
        label="Passi per turno"
        value={maxSkips}
        onChange={(v) => update({ maxSkips: v })}
        min={0}
        max={10}
        style={{ marginTop: spacing.lg }}
      />

      <Text style={styles.sectionLabel}>Squadre</Text>
      <SegmentedControl<TeamMode>
        value={teamMode}
        onChange={(mode) => update({ teamMode: mode })}
        options={[
          { value: 'auto', label: 'Casuali', description: 'Divise al via, bilanciate' },
          { value: 'manual', label: "Scelte dall'host", description: 'Decidi tu chi va dove' },
        ]}
      />

      {teamMode === 'manual' ? (
        players.length > 0 ? (
          <View style={styles.teamList}>
            {players.map(([uid, p]) => {
              const name = p.name || 'Senza nome';
              const assigned = manualTeams[uid];
              return (
                <View key={uid} style={styles.teamRow}>
                  <View style={[styles.avatar, { backgroundColor: avatarColor(uid) }]}>
                    <Text style={styles.avatarText}>{avatarInitial(name)}</Text>
                  </View>
                  <Text style={styles.teamRowName} numberOfLines={1}>
                    {name}
                  </Text>
                  <View style={styles.teamChips}>
                    {(['blue', 'red'] as TeamId[]).map((team) => {
                      const active = assigned === team;
                      return (
                        <TouchableOpacity
                          key={team}
                          onPress={() => assignTeam(uid, team)}
                          activeOpacity={0.7}
                          style={[
                            styles.teamChip,
                            active && {
                              borderColor: TEAM_COLOR[team],
                              backgroundColor:
                                team === 'blue' ? colors.teamBlueTint : colors.teamRedTint,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.teamChipLabel,
                              active && { color: TEAM_COLOR[team] },
                            ]}
                          >
                            {TEAM_LABEL[team]}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <Text style={styles.teamHint}>
              Ogni squadra deve avere almeno 2 giocatori. Chi entra dopo viene
              aggiunto alla squadra più piccola.
            </Text>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Potrai assegnare i giocatori alle squadre dalle impostazioni della
              stanza, quando saranno entrati.
            </Text>
          </View>
        )
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  teamList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.background,
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.sm,
  },
  teamRowName: {
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.sm,
  },
  teamChips: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  teamChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
  },
  teamChipLabel: {
    color: colors.textSecondary,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    letterSpacing: 0.5,
  },
  teamHint: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: spacing.xs,
  },
  infoCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.sm,
  },
  infoText: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
  },
});
