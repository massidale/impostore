import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SegmentedControl, avatarColor, avatarInitial, colors, fonts, radius, spacing, fontSize } from '../ui';
export type TeamId = 'blue' | 'red';
export type TeamMode = 'auto' | 'manual';
export interface TeamSettingsValue {
  teamMode: TeamMode;
  manualTeams: Record<string, TeamId>;
}
interface Props {
  players?: Record<string, { name?: string }>;
  teamMode?: TeamMode;
  manualTeams?: Record<string, TeamId> | null;
  onChange: (value: TeamSettingsValue) => void;
}
const TEAM_LABEL = { blue: 'Blu', red: 'Rossa' };
const TEAM_COLOR = { blue: colors.teamBlue, red: colors.teamRed };
export function TeamSettings({players: roster, teamMode = 'auto', manualTeams = {}, onChange}: Props) {
  const assignments = manualTeams ?? {};
  const players = Object.entries(roster ?? {});
  const update = (value: Partial<TeamSettingsValue>) => onChange({teamMode, manualTeams: assignments, ...value});
  const assignTeam = (uid: string, team: TeamId) => update({manualTeams: {...assignments, [uid]: team}});
  return <View>
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
              const assigned = assignments[uid];
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
                          accessibilityRole="button"
                          accessibilityLabel={`${name}: squadra ${TEAM_LABEL[team]}`}
                          accessibilityState={{ selected: active }}
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
  </View>;
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
    minWidth: 0,
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
