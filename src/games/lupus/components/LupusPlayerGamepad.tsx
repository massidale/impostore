import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { PlayerGamepadProps } from '../../../core/types/gamePlugin';
import {
  Button,
  CheckIcon,
  CountdownBar,
  InlineConfirm,
  MetaRow,
  PhaseCard,
  PlayerSlot,
  ProgressCounter,
  StatusCard,
  TrophyIcon,
  colors,
  fonts,
  fontSize,
  radius,
  spacing,
} from '../../../core/ui';
import { useCountdown } from '../../../core/hooks/useCountdown';
import { LupusGameState, LupusRole } from '../types';
import { ABSTAIN } from '../services/lupusPure';
import {
  castLupusVote,
  submitBoccaVisit,
  submitLupoVote,
  submitProtect,
  submitSeer,
} from '../services/lupusLogic';
import LupusNarratorView from './LupusNarratorView';

const ROLE_LABEL: Record<LupusRole, string> = {
  lupo: 'Lupo',
  villico: 'Villico',
  veggente: 'Veggente',
  guardia: 'Guardia',
  medium: 'Medium',
  bocca: 'Bocca di Rosa',
};

const ROLE_EMOJI: Record<LupusRole, string> = {
  lupo: '🐺',
  villico: '🏡',
  veggente: '🔮',
  guardia: '🛡️',
  medium: '👻',
  bocca: '💋',
};

const ROLE_COLOR: Record<LupusRole, string> = {
  lupo: colors.roleImpostor,
  villico: colors.roleCivilian,
  veggente: colors.primaryLight,
  guardia: colors.warning,
  medium: '#A78BFA',
  bocca: '#EC4899',
};

function playerName(roomData: PlayerGamepadProps['roomData'], uid?: string | null): string {
  if (!uid) return 'Giocatore';
  return roomData.players?.[uid]?.name || 'Giocatore';
}

function RoleBadge({ role, customName }: { role: LupusRole; customName?: string | null }) {
  return (
    <View style={[styles.roleBadge, { borderColor: customName ? colors.border : ROLE_COLOR[role] }]}>
      <Text style={styles.roleBadgeEmoji}>{customName ? '🎭' : ROLE_EMOJI[role]}</Text>
      <Text
        style={[
          styles.roleBadgeLabel,
          { color: customName ? colors.textPrimary : ROLE_COLOR[role] },
        ]}
        numberOfLines={1}
      >
        {customName ?? ROLE_LABEL[role]}
      </Text>
    </View>
  );
}

export default function LupusPlayerGamepad({ roomData, playerId }: PlayerGamepadProps) {
  const gameState = roomData.gameState as LupusGameState;
  const roomId = roomData.id;
  const [showRole, setShowRole] = useState(false);
  // Lynch vote awaiting the inline ✓/✕ confirmation.
  const [pendingVote, setPendingVote] = useState<string | null>(null);

  const roles = gameState.roles ?? {};
  const alive = gameState.alive ?? {};
  const myRole = roles[playerId];
  const amAlive = alive[playerId] !== false;
  const round = gameState.round ?? 1;
  const playerCount = Object.keys(roomData.players ?? {}).length;
  const metaRow = <MetaRow roomId={roomId} players={playerCount} />;

  const remaining = useCountdown(
    gameState.phase === 'voting' ? gameState.votingEndsAt : null
  );
  const nightRemaining = useCountdown(
    gameState.phase === 'night' ? gameState.nightEndsAt : null
  );

  if (!roomData.players?.[playerId]) return null;

  // ── Waiting / not part of this match ──
  if (gameState.phase === 'setup') {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard title="In attesa..." message="L'host non ha ancora avviato la partita." />
        </View>
      </View>
    );
  }

  // The narrator gets the game-master console instead of a player view.
  if (gameState.narratorUid === playerId) {
    return <LupusNarratorView roomData={roomData} gameState={gameState} />;
  }

  if (!myRole && gameState.phase !== 'results') {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard
            title="Partita in corso"
            message="Non fai parte di questo round. Entrerai alla prossima partita."
            tone="muted"
          />
        </View>
      </View>
    );
  }

  // ── Results ──
  // Minimal recap, identical for everyone: winner + who the lupi were.
  if (gameState.phase === 'results') {
    const winner = gameState.winner;
    const accent = winner === 'lupi' ? colors.roleImpostor : colors.roleCivilian;
    const title = winner === 'lupi' ? 'Vincono i Lupi' : 'Vince il Villaggio';
    const lupiNames = Object.entries(roles)
      .filter(([, role]) => role === 'lupo')
      .map(([uid]) => playerName(roomData, uid));

    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <View style={[styles.resultsCard, { borderColor: accent }]}>
            <View style={styles.resultsHeader}>
              <TrophyIcon size={14} color={accent} />
              <Text style={[styles.resultsLabel, { color: accent }]}>FINE PARTITA</Text>
            </View>
            <Text style={styles.resultsEmoji}>{winner === 'lupi' ? '🐺' : '🏡'}</Text>
            <Text style={[styles.resultsTitle, { color: accent }]}>{title}</Text>
            {lupiNames.length > 0 ? (
              <Text style={styles.resultsLupi}>
                I lupi erano: <Text style={styles.resultsLupiNames}>{lupiNames.join(' · ')}</Text>
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    );
  }

  // ── Dead players spectate ──
  if (!amAlive) {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard
            tone="muted"
            title="Sei morto"
            message="Osserva in silenzio: niente suggerimenti ai vivi! La partita continua senza di te."
            icon={<Text style={styles.deadEmoji}>🪦</Text>}
          />
        </View>
      </View>
    );
  }

  // ── First reveal of the role ──
  if (!showRole) {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.centerGrow}>
          <StatusCard
            title={`Round ${round}`}
            message="Scopri il tuo ruolo in segreto. Non mostrare lo schermo a nessuno."
          >
            <Button
              onPress={() => setShowRole(true)}
              variant="primary"
              size="lg"
              style={{ marginTop: spacing.lg, alignSelf: 'stretch' }}
            >
              Scopri il tuo ruolo
            </Button>
          </StatusCard>
        </View>
      </View>
    );
  }

  const aliveUids = Object.keys(roomData.players || {}).filter(
    (uid) => roles[uid] && alive[uid] !== false
  );
  const myCustomName = gameState.customRoles?.[playerId] ?? null;

  const deadUids = Object.keys(roles).filter((uid) => alive[uid] === false);

  // ── Standby (narrator mode): hold your card, the narrator leads ──
  if (gameState.phase === 'standby') {
    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.topRow}>
          <RoleBadge role={myRole!} customName={myCustomName} />
          <Text style={styles.roundLabel}>🎙️ Narratore</Text>
        </View>
        <View style={styles.centerGrow}>
          <PhaseCard
            title={myCustomName ?? ROLE_LABEL[myRole!]}
            tone="cyan"
            description="Questo è il tuo ruolo: tienilo segreto."
          >
            <Text style={styles.standbyEmoji}>
              {myCustomName ? '🎭' : ROLE_EMOJI[myRole!]}
            </Text>
            <Text style={styles.nightHint}>
              Segui le indicazioni del narratore: è lui a guidare la partita.
            </Text>
          </PhaseCard>
        </View>
      </View>
    );
  }

  // ── Night ──
  if (gameState.phase === 'night') {
    const night = gameState.night ?? {};

    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.topRow}>
          <RoleBadge role={myRole!} customName={myCustomName} />
          <Text style={styles.roundLabel}>Notte {round}</Text>
        </View>

        {nightRemaining !== null ? (
          <CountdownBar
            seconds={nightRemaining}
            total={gameState.nightSeconds ?? 60}
            size="md"
            style={{ marginBottom: spacing.sm }}
          />
        ) : null}

        <ScrollView
          style={styles.scrollFlex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {myRole === 'lupo' ? (
            <LupoNightView
              roomData={roomData}
              playerId={playerId}
              gameState={gameState}
              aliveUids={aliveUids}
            />
          ) : myRole === 'veggente' ? (
            night.seerDone && night.seerTarget ? (
              <PhaseCard title="Visione" tone="cyan">
                <Text style={styles.seerResult}>
                  <Text style={styles.seerName}>{playerName(roomData, night.seerTarget)}</Text>
                  {' è '}
                  <Text
                    style={{
                      color: ROLE_COLOR[roles[night.seerTarget] ?? 'villico'],
                      fontFamily: fonts.displayHeavy,
                    }}
                  >
                    {ROLE_LABEL[roles[night.seerTarget] ?? 'villico']}
                  </Text>
                </Text>
                <Text style={styles.nightHint}>Attendi l'alba senza farti notare.</Text>
              </PhaseCard>
            ) : (
              <NightPickList
                title="Chi vuoi scrutare?"
                description="Scoprirai il suo vero ruolo. La scelta è definitiva."
                tone="cyan"
                uids={aliveUids.filter((uid) => uid !== playerId)}
                roomData={roomData}
                onPick={(uid) => submitSeer(roomId, uid)}
              />
            )
          ) : myRole === 'guardia' ? (
            night.protectDone ? (
              <PhaseCard title="Protezione attiva" tone="warning">
                <Text style={styles.seerResult}>
                  Stai vegliando su{' '}
                  <Text style={styles.seerName}>
                    {playerName(roomData, night.protectTarget)}
                  </Text>
                </Text>
                <Text style={styles.nightHint}>Se i lupi lo scelgono, si salverà.</Text>
              </PhaseCard>
            ) : (
              <NightPickList
                title="Chi vuoi proteggere?"
                description="Puoi proteggere anche te stesso. La scelta è definitiva."
                tone="warning"
                uids={aliveUids}
                roomData={roomData}
                selfUid={playerId}
                onPick={(uid) => submitProtect(roomId, uid)}
              />
            )
          ) : myRole === 'bocca' ? (
            night.boccaDone ? (
              <PhaseCard title="Notte fuori casa" tone="danger">
                <Text style={styles.seerResult}>
                  Passi la notte da{' '}
                  <Text style={styles.seerName}>
                    {playerName(roomData, night.boccaTarget)}
                  </Text>
                </Text>
                <Text style={styles.nightHint}>
                  Se i lupi vengono a cercarti, non ti troveranno. Ma se colpiscono chi ti
                  ospita, cadrete insieme.
                </Text>
              </PhaseCard>
            ) : (
              <NightPickList
                title="Da chi passi la notte?"
                description="Non sarai a casa tua. La scelta è definitiva."
                tone="danger"
                uids={aliveUids.filter((uid) => uid !== playerId)}
                roomData={roomData}
                onPick={(uid) => submitBoccaVisit(roomId, uid)}
              />
            )
          ) : myRole === 'medium' ? (
            <MediumView roomData={roomData} roles={roles} deadUids={deadUids} />
          ) : (
            <StatusCard
              title="Il villaggio dorme"
              message="Qualcuno, là fuori, è sveglio. Attendi l'alba."
              icon={<Text style={styles.deadEmoji}>🌙</Text>}
            />
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Day announcement (names only — no roles, no protection details) ──
  if (gameState.phase === 'day') {
    const victims = (gameState.lastNight?.victims ?? []).filter(Boolean);
    const victimNames = victims.map((uid) => playerName(roomData, uid));

    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.topRow}>
          <RoleBadge role={myRole!} customName={myCustomName} />
          <Text style={styles.roundLabel}>Giorno {round}</Text>
        </View>

        <View style={styles.centerGrow}>
          <PhaseCard
            title="L'alba"
            tone={victims.length > 0 ? 'danger' : 'success'}
            description={
              victims.length > 1
                ? `${victimNames.join(' e ')} sono morti questa notte.`
                : victims.length === 1
                  ? `${victimNames[0]} è morto questa notte.`
                  : 'Nessuna vittima questa notte.'
            }
          >
            <Text style={styles.nightHint}>
              Discutete a voce: chi è il lupo? L'host avvierà la votazione.
            </Text>
          </PhaseCard>

          {myRole === 'medium' && deadUids.length > 0 ? (
            <View style={{ marginTop: spacing.md }}>
              <MediumView roomData={roomData} roles={roles} deadUids={deadUids} compact />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  // ── Dusk (post-vote verdict): the host starts the next night by hand ──
  if (gameState.phase === 'dusk') {
    const lynchedUid = gameState.lastLynch?.uid ?? null;
    const lynchedName = lynchedUid ? playerName(roomData, lynchedUid) : null;

    return (
      <View style={styles.container}>
        {metaRow}
        <View style={styles.topRow}>
          <RoleBadge role={myRole!} customName={myCustomName} />
          <Text style={styles.roundLabel}>Tramonto</Text>
        </View>

        <View style={styles.centerGrow}>
          <PhaseCard
            title="Il verdetto"
            tone={lynchedName ? 'danger' : 'success'}
            description={
              lynchedName
                ? `Il villaggio ha eliminato ${lynchedName}.`
                : 'Nessuno è stato eliminato.'
            }
          >
            <Text style={styles.nightHint}>
              La notte sta per scendere: la avvierà l'host.
            </Text>
          </PhaseCard>
        </View>
      </View>
    );
  }

  // ── Lynch voting ──
  if (gameState.phase === 'voting') {
    const myVote = gameState.votes?.[playerId] ?? null;
    const votesCast = Object.keys(gameState.votes ?? {}).length;
    const totalVoters = aliveUids.length;
    const runoff = gameState.runoffCandidates;
    const isRunoff = !!(runoff && runoff.length > 0);
    const candidates = isRunoff ? aliveUids.filter((uid) => runoff!.includes(uid)) : aliveUids;
    const hasAbstained = myVote === ABSTAIN;

    return (
      <ScrollView
        contentContainerStyle={[styles.container, styles.votingScroll]}
        keyboardShouldPersistTaps="handled"
      >
        {metaRow}
        {remaining !== null ? (
          <CountdownBar
            seconds={remaining}
            total={gameState.votingSeconds ?? 90}
            size="md"
            style={{ marginBottom: spacing.md }}
          />
        ) : null}

        <PhaseCard
          title={isRunoff ? 'Ballottaggio' : 'Votazione'}
          tone={isRunoff ? 'danger' : 'warning'}
          description={
            isRunoff
              ? 'Pareggio: scegli tra i candidati. Un nuovo pareggio non elimina nessuno.'
              : 'Chi è il lupo? Puoi cambiare voto finché il tempo non scade, o astenerti. Chi non vota si astiene.'
          }
        >
          <View style={styles.voteList}>
            {candidates.map((uid) => {
              const isSelf = uid === playerId;
              const isMyVote = myVote === uid;
              const isPending = pendingVote === uid;
              return (
                <View
                  key={uid}
                  // Colored only once the vote is CONFIRMED — a pending
                  // pick shows just the ✓/✕ pair, no highlight.
                  style={[styles.voteRow, isMyVote && styles.voteRowSelected]}
                >
                  <PlayerSlot
                    uid={uid}
                    name={playerName(roomData, uid)}
                    isMe={isSelf}
                    subtitle={null}
                    onPress={
                      isSelf ? undefined : () => setPendingVote(isPending ? null : uid)
                    }
                    disabled={isSelf}
                    variant={isSelf ? 'dimmed' : isMyVote ? 'selected' : 'default'}
                    right={
                      isPending ? (
                        <InlineConfirm
                          onConfirm={() => {
                            setPendingVote(null);
                            castLupusVote(roomId, playerId, uid);
                          }}
                          onCancel={() => setPendingVote(null)}
                        />
                      ) : isMyVote ? (
                        <CheckIcon size={20} color={colors.primaryLight} />
                      ) : undefined
                    }
                  />
                </View>
              );
            })}
          </View>

          <View style={styles.abstainWrap}>
            <Button
              onPress={() => setPendingVote(pendingVote === ABSTAIN ? null : ABSTAIN)}
              variant="secondary"
              size="sm"
              style={{ opacity: hasAbstained ? 1 : 0.85 }}
            >
              {hasAbstained ? 'Ti sei astenuto' : 'Astieniti'}
            </Button>
            {pendingVote === ABSTAIN ? (
              // Overlaid inside the button's gray area: the button keeps
              // its full size, like every other confirm in the list.
              <View style={styles.abstainConfirm}>
                <InlineConfirm
                  onConfirm={() => {
                    setPendingVote(null);
                    castLupusVote(roomId, playerId, ABSTAIN);
                  }}
                  onCancel={() => setPendingVote(null)}
                />
              </View>
            ) : null}
          </View>

          <ProgressCounter
            completed={votesCast}
            total={totalVoters}
            suffix="hanno votato"
            style={{ textAlign: 'center' }}
          />
        </PhaseCard>
      </ScrollView>
    );
  }

  return null;
}

// ── Night sub-views ──

interface NightPickListProps {
  title: string;
  description: string;
  tone: 'cyan' | 'warning' | 'danger';
  uids: string[];
  roomData: PlayerGamepadProps['roomData'];
  selfUid?: string;
  onPick: (uid: string) => void;
}

function NightPickList({
  title,
  description,
  tone,
  uids,
  roomData,
  selfUid,
  onPick,
}: NightPickListProps) {
  // Tap a name → inline ✓/✕ next to it; ✓ locks the (definitive) choice.
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  return (
    <PhaseCard title={title} description={description} tone={tone}>
      <View style={styles.voteList}>
        {uids.map((uid) => {
          const isPending = pendingUid === uid;
          return (
            <View key={uid} style={styles.voteRow}>
              <PlayerSlot
                uid={uid}
                name={playerName(roomData, uid)}
                isMe={uid === selfUid}
                subtitle={null}
                onPress={() => setPendingUid(isPending ? null : uid)}
                variant="default"
                right={
                  isPending ? (
                    <InlineConfirm
                      onConfirm={() => {
                        setPendingUid(null);
                        onPick(uid);
                      }}
                      onCancel={() => setPendingUid(null)}
                    />
                  ) : undefined
                }
              />
            </View>
          );
        })}
      </View>
    </PhaseCard>
  );
}

interface MediumViewProps {
  roomData: PlayerGamepadProps['roomData'];
  roles: { [uid: string]: LupusRole };
  deadUids: string[];
  compact?: boolean;
}

/** The Medium passively sees the true role of every dead player. */
function MediumView({ roomData, roles, deadUids, compact }: MediumViewProps) {
  if (deadUids.length === 0) {
    return (
      <StatusCard
        title="Nessun defunto"
        message="Quando qualcuno morirà, qui vedrai il suo vero ruolo."
        icon={<Text style={styles.deadEmoji}>👻</Text>}
      />
    );
  }
  return (
    <PhaseCard
      title="Voci dall'aldilà"
      tone="cyan"
      compact={compact}
      description="I veri ruoli dei morti:"
    >
      {deadUids.map((uid) => {
        const role = roles[uid] ?? 'villico';
        return (
          <Text key={uid} style={styles.mediumLine}>
            {ROLE_EMOJI[role]} <Text style={styles.seerName}>{playerName(roomData, uid)}</Text>
            {' — '}
            <Text style={{ color: ROLE_COLOR[role], fontFamily: fonts.bodySemi }}>
              {ROLE_LABEL[role]}
            </Text>
          </Text>
        );
      })}
    </PhaseCard>
  );
}

interface LupoNightViewProps {
  roomData: PlayerGamepadProps['roomData'];
  playerId: string;
  gameState: LupusGameState;
  aliveUids: string[];
}

function LupoNightView({ roomData, playerId, gameState, aliveUids }: LupoNightViewProps) {
  const roles = gameState.roles ?? {};
  const night = gameState.night ?? {};
  const lupoVotes = night.lupoVotes ?? {};
  const myPick = lupoVotes[playerId] ?? null;
  // Lone-wolf pick awaiting the inline ✓/✕ confirmation.
  const [pendingUid, setPendingUid] = useState<string | null>(null);

  const packNames = Object.entries(roles)
    .filter(([uid, role]) => role === 'lupo' && uid !== playerId)
    .map(([uid]) => playerName(roomData, uid));

  const targets = aliveUids.filter((uid) => roles[uid] !== 'lupo');
  const aliveLupi = aliveUids.filter((uid) => roles[uid] === 'lupo');
  const votesIn = Object.keys(lupoVotes).length;
  const isLoneWolf = aliveLupi.length === 1;

  // Every pick — first or change, lone wolf or pack — goes through the
  // inline ✓/✕ confirm. Confirmed picks stay visible to the other wolves.
  const handlePick = (uid: string) => {
    if (uid === myPick) return;
    setPendingUid(pendingUid === uid ? null : uid);
  };

  return (
    <PhaseCard
      title="Caccia notturna"
      tone="danger"
      description={
        packNames.length > 0
          ? `Il tuo branco: ${packNames.join(', ')}. Dovete scegliere TUTTI la stessa vittima entro il tempo, o vi asterrete.`
          : "Sei l'unico lupo. Scegli la vittima prima che scada il tempo."
      }
    >
      <View style={styles.voteList}>
        {targets.map((uid) => {
          const isMyPick = myPick === uid;
          const isPending = pendingUid === uid;
          const pickedBy = aliveLupi
            .filter((lupo) => lupoVotes[lupo] === uid)
            .map((lupo) => (lupo === playerId ? 'tu' : playerName(roomData, lupo)));
          return (
            <View
              key={uid}
              style={[styles.voteRow, isMyPick && styles.voteRowSelected]}
            >
              <PlayerSlot
                uid={uid}
                name={playerName(roomData, uid)}
                subtitle={null}
                onPress={() => handlePick(uid)}
                variant={isMyPick ? 'selected' : 'default'}
                right={
                  isPending ? (
                    <InlineConfirm
                      onConfirm={() => {
                        setPendingUid(null);
                        submitLupoVote(roomData.id, playerId, uid);
                      }}
                      onCancel={() => setPendingUid(null)}
                    />
                  ) : pickedBy.length > 0 ? (
                    <Text style={styles.packPicks} numberOfLines={1}>
                      🐺 {pickedBy.join(', ')}
                    </Text>
                  ) : undefined
                }
              />
            </View>
          );
        })}
      </View>
      <ProgressCounter
        completed={votesIn}
        total={aliveLupi.length}
        prefix="Lupi"
        suffix="hanno scelto"
        tone="warning"
        style={{ textAlign: 'center' }}
      />
    </PhaseCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  centered: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  centerGrow: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  votingScroll: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    backgroundColor: colors.surface,
  },
  roleBadgeEmoji: {
    fontSize: fontSize.sm,
  },
  roleBadgeLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  roundLabel: {
    color: colors.textMuted,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  voteList: {
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  abstainWrap: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  abstainConfirm: {
    position: 'absolute',
    right: spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  voteRow: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  voteRowSelected: {
    borderColor: colors.primary,
  },
  seerResult: {
    color: colors.textPrimary,
    fontFamily: fonts.body,
    fontSize: fontSize.lg,
    textAlign: 'center',
    lineHeight: 26,
  },
  seerName: {
    fontFamily: fonts.displayHeavy,
  },
  nightHint: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: spacing.md,
    fontStyle: 'italic',
  },
  mediumLine: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.md,
    lineHeight: 24,
  },
  packPicks: {
    color: colors.danger,
    fontFamily: fonts.bodySemi,
    fontSize: fontSize.xs,
    maxWidth: 120,
  },
  standbyEmoji: {
    fontSize: 56,
    textAlign: 'center',
    marginVertical: spacing.md,
  },
  deadEmoji: {
    fontSize: 48,
  },
  resultsCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.xl,
    alignItems: 'center',
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingBottom: spacing.md,
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  resultsLabel: {
    fontFamily: fonts.displayHeavy,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  resultsEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: fontSize.xl,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  resultsLupi: {
    color: colors.textSecondary,
    fontFamily: fonts.body,
    fontSize: fontSize.sm,
    textAlign: 'center',
  },
  resultsLupiNames: {
    color: colors.textPrimary,
    fontFamily: fonts.bodySemi,
  },
});
