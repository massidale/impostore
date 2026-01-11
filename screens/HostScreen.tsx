import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Share,
  SafeAreaView,
  Switch,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import { createRoom, startGame, endGame, subscribeToRoom, updateHeartbeat, updateNumImpostors, deleteRoom, markPlayerAsRevealed, getRoomData, updateHintSettings, removePlayerFromRoom } from '../services/roomService';
import { generateHostId } from '../utils/uuid';
import { Room, Player } from '../types/game';
import { generateWordsForTopic } from '../services/geminiService';
import { setCustomWords, resetToDefaultWords } from '../services/wordService';

const WEB_PAGE_URL = 'https://impostore-c0ef1.web.app';

export default function HostScreen() {
  const [numImpostors, setNumImpostors] = useState('1');
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintOnlyFirst, setHintOnlyFirst] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomData, setRoomData] = useState<Room | null>(null);
  const [hostId] = useState(() => generateHostId());
  const [loading, setLoading] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [hostPlayerData, setHostPlayerData] = useState<Player | null>(null);
  const [hostRevealed, setHostRevealed] = useState(false);
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);
  const [customTopic, setCustomTopic] = useState('');
  const [generatingWords, setGeneratingWords] = useState(false);
  const [usingCustomWords, setUsingCustomWords] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);
  const [savedTopic, setSavedTopic] = useState(''); // Topic salvato dopo generazione riuscita

  useEffect(() => {
    if (roomId) {
      const unsubscribe = subscribeToRoom(roomId, async (room) => {
        setRoomData(room);
        // Sincronizza il numero di impostori con quello della stanza
        if (room?.numImpostors) {
          setNumImpostors(room.numImpostors.toString());
        }
        // Sincronizza le impostazioni dell'indizio
        if (room?.hintEnabled !== undefined) {
          setHintEnabled(room.hintEnabled);
        }
        if (room?.hintOnlyFirst !== undefined) {
          setHintOnlyFirst(room.hintOnlyFirst);
        }
        // Se la stanza non esiste più, resetta
        if (!room) {
          setRoomId(null);
          setShowRoleModal(false);
          setHostPlayerData(null);
          setHostRevealed(false);
          return;
        }
        
        // Ottieni i dati del giocatore host
        if (room.players && room.players[hostId]) {
          const playerData = room.players[hostId];
          setHostPlayerData(playerData);
          setHostRevealed(playerData.revealed || false);
        } else {
          setHostPlayerData(null);
          setHostRevealed(false);
        }
      });
      return unsubscribe;
    }
  }, [roomId, hostId]);

  // Heartbeat: aggiorna periodicamente per indicare che l'host è connesso
  useEffect(() => {
    if (!roomId) return;

    const heartbeatInterval = setInterval(() => {
      updateHeartbeat(roomId).catch((error) => {
        console.error('Errore aggiornamento heartbeat:', error);
      });
    }, 10000); // Aggiorna ogni 10 secondi

    return () => {
      clearInterval(heartbeatInterval);
    };
  }, [roomId]);

  // Cleanup: elimina la stanza quando il componente viene smontato
  useEffect(() => {
    return () => {
      if (roomId) {
        deleteRoom(roomId).catch((error) => {
          console.error('Errore eliminazione stanza:', error);
        });
      }
    };
  }, [roomId]);

  const handleCreateRoom = async () => {
    const impostors = parseInt(numImpostors, 10);
    if (isNaN(impostors) || impostors < 1) {
      Alert.alert('Errore', 'Inserisci un numero valido di impostori');
      return;
    }

    setLoading(true);
    try {
      const newRoomId = await createRoom(impostors, hostId, hintEnabled, hintOnlyFirst);
      setRoomId(newRoomId);
    } catch (error) {
      Alert.alert('Errore', 'Impossibile creare la stanza');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!roomId) return;

    setLoading(true);
    try {
      await startGame(roomId, hostId);
      setShowRoleModal(true);
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile avviare la partita');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevealRole = async () => {
    if (!roomId || !hostId) return;
    
    try {
      await markPlayerAsRevealed(roomId, hostId);
      setHostRevealed(true);
    } catch (error) {
      console.error('Errore nel rivelare il ruolo:', error);
    }
  };

  const handleEndGame = async () => {
    if (!roomId) return;

    Alert.alert(
      'Termina Partita',
      'Sei sicuro di voler terminare la partita? I giocatori torneranno in attesa.',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Termina',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await endGame(roomId);
              setShowRoleModal(false);
              setHostRevealed(false);
              Alert.alert('Successo', 'La partita è stata terminata');
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile terminare la partita');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleShareLink = async () => {
    if (!roomId) return;

    const url = `${WEB_PAGE_URL}?room=${roomId}`;
    try {
      await Share.share({
        message: `Unisciti alla stanza: ${url}`,
        url,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopyLink = () => {
    if (!roomId) return;

    const url = `${WEB_PAGE_URL}?room=${roomId}`;
    Clipboard.setString(url);
    Alert.alert('Copiato!', 'Link copiato negli appunti');
  };

  // Aggiornamento automatico del numero di impostori
  useEffect(() => {
    if (!roomId || !roomData || roomData.status !== 'waiting') return;

    const impostors = parseInt(numImpostors, 10);
    if (isNaN(impostors) || impostors < 1) return;
    if (impostors === roomData.numImpostors) return;

    // Debounce: aspetta 500ms dopo l'ultima modifica
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        await updateNumImpostors(roomId, impostors);
      } catch (error: any) {
        console.error('Errore aggiornamento numero impostori:', error);
      }
    }, 500);

    setUpdateTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [numImpostors, roomId, roomData?.numImpostors, roomData?.status]);

  // Aggiornamento automatico delle impostazioni indizio
  useEffect(() => {
    if (!roomId || !roomData || roomData.status !== 'waiting') return;
    if (hintEnabled === roomData.hintEnabled && hintOnlyFirst === roomData.hintOnlyFirst) return;

    // Debounce: aspetta 500ms dopo l'ultima modifica
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }

    const timeout = setTimeout(async () => {
      try {
        await updateHintSettings(roomId, hintEnabled, hintOnlyFirst);
      } catch (error: any) {
        console.error('Errore aggiornamento impostazioni indizio:', error);
      }
    }, 500);

    setUpdateTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [hintEnabled, hintOnlyFirst, roomId, roomData?.hintEnabled, roomData?.hintOnlyFirst, roomData?.status]);

  const handleGenerateWords = async () => {
    if (!customTopic.trim()) {
      Alert.alert('Errore', 'Inserisci un argomento per generare le parole');
      return;
    }

    setGeneratingWords(true);
    const topicToGenerate = customTopic.trim();
    try {
      const result = await generateWordsForTopic(topicToGenerate);
      setCustomWords(result.words);
      setUsingCustomWords(true);
      setUsedFallback(result.usedFallback);
      if (result.usedFallback) {
        Alert.alert('Attenzione', `Non è stato possibile generare parole personalizzate per "${topicToGenerate}". Usando parole di default.`);
      } else {
        setSavedTopic(topicToGenerate); // Salva il topic solo dopo generazione riuscita
        Alert.alert('Successo', `Generate 20 parole sul tema "${topicToGenerate}"`);
      }
    } catch (error: any) {
      Alert.alert('Errore', error.message || 'Impossibile generare le parole');
      console.error(error);
    } finally {
      setGeneratingWords(false);
    }
  };

  const handleResetWords = () => {
    resetToDefaultWords();
    setUsingCustomWords(false);
    setUsedFallback(false);
    setCustomTopic('');
    setSavedTopic('');
    Alert.alert('Successo', 'Parole ripristinate al dizionario predefinito');
  };

  const handleRemovePlayer = async (playerUid: string) => {
    if (!roomId) return;

    Alert.alert(
      'Rimuovi Giocatore',
      'Sei sicuro di voler rimuovere questo giocatore dalla stanza?',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Rimuovi',
          style: 'destructive',
          onPress: async () => {
            try {
              await removePlayerFromRoom(roomId, playerUid);
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile rimuovere il giocatore');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const handleDeleteRoom = () => {
    if (!roomId) return;

    Alert.alert(
      'Elimina Stanza',
      'Sei sicuro di voler eliminare la stanza? Tutti i giocatori verranno disconnessi.',
      [
        {
          text: 'Annulla',
          style: 'cancel',
        },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteRoom(roomId);
              setRoomId(null);
              setRoomData(null);
              setShowRoleModal(false);
              setHostPlayerData(null);
              setHostRevealed(false);
            } catch (error: any) {
              Alert.alert('Errore', error.message || 'Impossibile eliminare la stanza');
              console.error(error);
            }
          },
        },
      ]
    );
  };

  const getPlayerCount = () => {
    if (!roomData?.players) return 0;
    return Object.keys(roomData.players).length;
  };

  const getReadyCount = () => {
    if (!roomData?.players) return 0;
    return Object.values(roomData.players).filter(player => player.revealed).length;
  };

  const roomUrl = roomId ? `${WEB_PAGE_URL}?room=${roomId}` : '';

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      {!roomId ? (
        <View style={styles.createRoomContainer}>
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Crea Stanza</Text>
            <View style={styles.createSection}>
              <Text style={styles.label}>Numero di Impostori</Text>
              <View style={styles.numberSelector}>
                <TouchableOpacity
                  style={[styles.numberButton, parseInt(numImpostors, 10) <= 1 && styles.numberButtonDisabled]}
                  onPress={() => {
                    const current = parseInt(numImpostors, 10) || 1;
                    if (current > 1) setNumImpostors((current - 1).toString());
                  }}
                  disabled={parseInt(numImpostors, 10) <= 1}
                >
                  <Text style={styles.numberButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.numberValue}>{numImpostors}</Text>
                <TouchableOpacity
                  style={styles.numberButton}
                  onPress={() => {
                    const current = parseInt(numImpostors, 10) || 1;
                    setNumImpostors((current + 1).toString());
                  }}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Abilita indizio per impostore</Text>
                  <Switch
                    value={hintEnabled}
                    onValueChange={setHintEnabled}
                    trackColor={{ false: '#4b5563', true: '#3b82f6' }}
                    thumbColor={hintEnabled ? '#60a5fa' : '#9ca3af'}
                  />
                </View>

                {hintEnabled && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Indizio solo al primo giocatore</Text>
                    <Switch
                      value={hintOnlyFirst}
                      onValueChange={setHintOnlyFirst}
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={hintOnlyFirst ? '#007AFF' : '#f4f3f4'}
                    />
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
          <View style={styles.bottomButtonContainer}>
            <TouchableOpacity
              onPress={handleCreateRoom}
              disabled={loading}
              style={styles.fullWidthButton}
            >
              <LinearGradient
                colors={loading ? ['#4b5563', '#4b5563'] : ['#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.button, styles.primaryButton]}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? 'Creazione...' : 'Crea Stanza'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
      <View style={styles.createRoomContainer}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.title}>{`Stanza: ${roomId}`}</Text>
        <View style={styles.roomSection}>
          <Text style={styles.status}>
            Status: {roomData?.status === 'waiting' ? 'In attesa' : 'Attiva'}
          </Text>
          <Text style={styles.playerCount}>
            Giocatori: {getPlayerCount()}
          </Text>

          {roomData?.status === 'waiting' && (
            <>
              {/* Lista giocatori */}
              {roomData?.players && Object.keys(roomData.players).length > 0 && (
                <View style={styles.playersListSection}>
                  <Text style={styles.label}>Giocatori nella stanza:</Text>
                  {Object.entries(roomData.players).map(([uid, player]) => (
                    <View key={uid} style={styles.playerItemContainer}>
                      <View style={styles.playerRow}>
                        <Text style={styles.playerName}>
                          {uid === hostId ? (
                            <Text style={styles.youBadge}>Tu</Text>
                          ) : (
                            player.name || 'Giocatore senza nome'
                          )}
                        </Text>
                        {uid === hostId && (
                          <Text style={styles.hostBadge}>Host</Text>
                        )}
                      </View>
                      {uid === hostId ? (
                        <View style={styles.placeholderButton} />
                      ) : (
                        <TouchableOpacity
                          onPress={() => handleRemovePlayer(uid)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.qrSection}>
                <Text style={styles.qrLabel}>Scansiona il QR Code per unirti:</Text>
                <View style={styles.qrContainer}>
                  <QRCode
                    value={roomUrl}
                    size={200}
                    backgroundColor="white"
                    color="black"
                  />
                </View>
              </View>

              <View style={styles.linkSection}>
                <Text style={styles.linkLabel}>Oppure condividi il link:</Text>
                <Text style={styles.linkText} selectable>
                  {roomUrl}
                </Text>
                <View style={styles.buttonsContainer}>
                  <View style={styles.secondaryButtonsRow}>
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton, styles.secondaryButtonFlex]}
                      onPress={handleCopyLink}
                    >
                      <Text style={styles.secondaryButtonText}>Copia Link</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.secondaryButton, styles.secondaryButtonFlex]}
                      onPress={handleShareLink}
                    >
                      <Text style={styles.secondaryButtonText}>Condividi</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={handleStartGame}
                    disabled={loading || getPlayerCount() < 2}
                    style={styles.fullWidthButton}
                  >
                    <LinearGradient
                      colors={getPlayerCount() < 2 ? ['#4b5563', '#4b5563'] : ['#2563eb', '#1d4ed8']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.button, styles.primaryButton]}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loading ? 'Avvio...' : 'Avvia Partita'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setShowSettingsModal(true)}
                    style={[styles.button, styles.secondaryButton, styles.fullWidthButton, styles.settingsButton]}
                  >
                    <Text style={styles.secondaryButtonText}>Impostazioni Stanza</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleDeleteRoom}
                    style={[styles.fullWidthButton, styles.deleteButton]}
                  >
                    <Text style={styles.deleteButtonText}>Elimina Stanza</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {roomData?.status === 'active' && (
            <>
              <View style={styles.activeSection}>
                <Text style={styles.activeText}>
                  La partita è iniziata! I giocatori possono vedere i loro ruoli.
                </Text>
                <Text style={styles.readyCount}>
                  Pronti: {getReadyCount()}/{getPlayerCount()}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowRoleModal(true)}
                style={[styles.button, styles.secondaryButton, styles.fullWidthButton]}
              >
                <Text style={styles.secondaryButtonText}>Vedi il tuo ruolo</Text>
              </TouchableOpacity>
              {roomData?.players && (() => {
                const firstPlayer = Object.entries(roomData.players).find(([_, player]) => player.isFirst);
                if (firstPlayer) {
                  const [uid, player] = firstPlayer;
                  const isHost = uid === hostId;
                  if (isHost) {
                    return (
                      <Text style={styles.firstPlayerInfo}>
                        Il primo giocatore sei <Text style={styles.firstPlayerHighlight}>tu</Text>
                      </Text>
                    );
                  }
                  const playerName = player.name || 'Giocatore senza nome';
                  return (
                    <Text style={styles.firstPlayerInfo}>
                      Il primo giocatore è <Text style={styles.firstPlayerHighlight}>{playerName}</Text>
                    </Text>
                  );
                }
                return null;
              })()}
            </>
          )}
        </View>
      </ScrollView>
      {roomData?.status === 'active' && (
        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            onPress={handleEndGame}
            disabled={loading}
            style={[styles.fullWidthButton, styles.terminateButtonOutline]}
          >
            <Text style={styles.terminateButtonText}>
              {loading ? 'Terminazione...' : 'Termina Partita'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
      </View>
      )}

      {/* Modal per mostrare il ruolo dell'host */}
      <Modal
        visible={showRoleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!hostRevealed ? (
              <>
                <Text style={styles.modalTitle}>Tocca per scoprire la parola</Text>
                <TouchableOpacity
                  onPress={handleRevealRole}
                  style={styles.revealButton}
                >
                  <LinearGradient
                    colors={['#2563eb', '#1d4ed8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.button, styles.primaryButton]}
                  >
                    <Text style={styles.primaryButtonText}>Scopri</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : hostPlayerData?.role ? (
              <>
                {hostPlayerData.role === 'civilian' ? (
                  <>
                    <Text style={styles.modalTitle}>Sei un civile</Text>
                    <Text style={styles.modalSubtitle}>La parola è:</Text>
                    <Text style={styles.modalWord}>{roomData?.word}</Text>
                    {hostPlayerData.isFirst && (
                      <Text style={styles.firstPlayerText}>Sei il <Text style={styles.firstPlayerHighlight}>primo</Text> giocatore.</Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text style={styles.modalTitle}>Sei l'impostore</Text>
                    <Text style={styles.modalSubtitle}>
                      Non conosci la parola.
                    </Text>
                    {roomData?.hintEnabled && 
                     (!roomData?.hintOnlyFirst || hostPlayerData.isFirst) && 
                     roomData?.hint && (
                      <>
                        <Text style={styles.modalHintLabel}>Indizio:</Text>
                        <Text style={styles.modalHint}>{roomData.hint}</Text>
                      </>
                    )}
                    {hostPlayerData.isFirst && (
                      <Text style={styles.firstPlayerText}>Sei il <Text style={styles.firstPlayerHighlight}>primo</Text> giocatore</Text>
                    )}
                  </>
                )}
              </>
            ) : (
              <Text style={styles.modalTitle}>Ruolo non ancora assegnato</Text>
            )}
            <TouchableOpacity
              onPress={() => setShowRoleModal(false)}
              style={[styles.button, styles.secondaryButton, styles.modalCloseButton]}
            >
              <Text style={styles.secondaryButtonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal per le impostazioni stanza */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Impostazioni Stanza</Text>

            <View style={styles.settingsModalSection}>
              <Text style={styles.label}>Numero di Impostori</Text>
              <View style={styles.numberSelector}>
                <TouchableOpacity
                  style={[styles.numberButton, parseInt(numImpostors, 10) <= 1 && styles.numberButtonDisabled]}
                  onPress={() => {
                    const current = parseInt(numImpostors, 10) || 1;
                    if (current > 1) setNumImpostors((current - 1).toString());
                  }}
                  disabled={parseInt(numImpostors, 10) <= 1}
                >
                  <Text style={styles.numberButtonText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.numberValue}>{numImpostors}</Text>
                <TouchableOpacity
                  style={[styles.numberButton, parseInt(numImpostors, 10) >= getPlayerCount() && styles.numberButtonDisabled]}
                  onPress={() => {
                    const current = parseInt(numImpostors, 10) || 1;
                    if (current < getPlayerCount()) setNumImpostors((current + 1).toString());
                  }}
                  disabled={parseInt(numImpostors, 10) >= getPlayerCount()}
                >
                  <Text style={styles.numberButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingsModalSection}>
              <View style={styles.switchContainer}>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>Abilita indizio per impostore</Text>
                  <Switch
                    value={hintEnabled}
                    onValueChange={(value) => {
                      setHintEnabled(value);
                      if (!value) {
                        setHintOnlyFirst(false);
                      }
                    }}
                    trackColor={{ false: '#4b5563', true: '#3b82f6' }}
                    thumbColor={hintEnabled ? '#60a5fa' : '#9ca3af'}
                  />
                </View>

                {hintEnabled && (
                  <View style={styles.switchRow}>
                    <Text style={styles.switchLabel}>Indizio solo al primo giocatore</Text>
                    <Switch
                      value={hintOnlyFirst}
                      onValueChange={setHintOnlyFirst}
                      trackColor={{ false: '#4b5563', true: '#3b82f6' }}
                      thumbColor={hintOnlyFirst ? '#60a5fa' : '#9ca3af'}
                    />
                  </View>
                )}
              </View>
            </View>

            <View style={styles.settingsModalSection}>
              <Text style={styles.label}>Personalizza Parole (AI)</Text>
              {usingCustomWords && !usedFallback && savedTopic && (
                <View style={styles.customWordsActive}>
                  <Text style={styles.customWordsActiveText}>
                    {`Usando parole personalizzate: "${savedTopic}"`}
                  </Text>
                </View>
              )}
              <TextInput
                style={styles.topicInput}
                placeholder="Es: Film di fantascienza, Cucina italiana..."
                placeholderTextColor="#6b7280"
                value={customTopic}
                onChangeText={setCustomTopic}
                editable={!generatingWords}
              />
              <View style={styles.topicButtonsRow}>
                <View style={styles.topicButtonFlex}>
                  <TouchableOpacity
                    onPress={handleGenerateWords}
                    disabled={generatingWords || !customTopic.trim()}
                  >
                    <LinearGradient
                      colors={generatingWords || !customTopic.trim() ? ['#4b5563', '#4b5563'] : ['#8b5cf6', '#7c3aed']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.generateButton}
                    >
                      <Text style={styles.generateButtonText}>
                        {generatingWords ? 'Attendi...' : 'Genera'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
                <View style={styles.topicButtonFlex}>
                  <TouchableOpacity
                    onPress={handleResetWords}
                    disabled={!usingCustomWords}
                    style={[styles.resetButton, !usingCustomWords && styles.disabledButton]}
                  >
                    <Text style={[styles.resetButtonText, !usingCustomWords && styles.disabledButtonText]}>Ripristina</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowSettingsModal(false)}
              style={[styles.button, styles.secondaryButton, styles.modalCloseButton]}
            >
              <Text style={styles.secondaryButtonText}>Chiudi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  createRoomContainer: {
    flex: 1,
  },
  bottomButtonContainer: {
    padding: 20,
    paddingTop: 10,
    backgroundColor: '#111827',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#fff',
  },
  createSection: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#e5e7eb',
  },
  input: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#1f2937',
    color: '#fff',
    marginBottom: 8,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  terminateButton: {
    marginTop: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  roomSection: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  roomId: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#fff',
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
    color: '#9ca3af',
  },
  playerCount: {
    fontSize: 16,
    marginBottom: 20,
    color: '#9ca3af',
  },
  settingsSection: {
    width: '100%',
    marginBottom: 20,
  },
  qrSection: {
    alignItems: 'center',
    marginVertical: 20,
    width: '100%',
  },
  qrLabel: {
    fontSize: 16,
    marginBottom: 15,
    color: '#e5e7eb',
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  linkSection: {
    width: '100%',
    marginVertical: 20,
  },
  linkLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#e5e7eb',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#60a5fa',
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 12,
  },
  secondaryButtonFlex: {
    flex: 1,
  },
  activeSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: 'transparent',
    borderRadius: 8,
    width: '100%',
  },
  activeText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  switchContainer: {
    width: '100%',
    marginVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
    paddingVertical: 6,
  },
  switchLabel: {
    fontSize: 16,
    color: '#e5e7eb',
    flex: 1,
    marginRight: 10,
  },
  firstPlayerSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  firstPlayerLabel: {
    color: 'white',
    fontSize: 14,
    marginBottom: 5,
  },
  firstPlayerText: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 10,
  },
  firstPlayerHighlight: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  firstPlayerInfo: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    textAlign: 'center',
  },
  readyCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginTop: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#9ca3af',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalWord: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#60a5fa',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalHintLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#9ca3af',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  revealButton: {
    width: '100%',
    marginTop: 20,
  },
  modalCloseButton: {
    marginTop: 20,
    width: '100%',
  },
  playersListSection: {
    width: '100%',
    marginTop: 8,
    marginBottom: 20,
  },
  playerItemContainer: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  playerRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  playerName: {
    fontSize: 16,
    color: '#e5e7eb',
  },
  hostBadge: {
    fontSize: 14,
    color: '#60a5fa',
    marginLeft: 8,
  },
  youBadge: {
    fontSize: 16,
    color: '#e5e7eb',
    fontWeight: '600',
  },
  removeButton: {
    width: 44,
    height: 44,
    backgroundColor: '#dc2626',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  placeholderButton: {
    width: 44,
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  numberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  numberButton: {
    width: 48,
    height: 48,
    backgroundColor: '#2563eb',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonDisabled: {
    backgroundColor: '#4b5563',
  },
  numberButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: '600',
  },
  numberValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    minWidth: 60,
    textAlign: 'center',
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: 12,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsButton: {
    marginTop: 12,
  },
  settingsModalSection: {
    width: '100%',
    marginBottom: 20,
  },
  topicInput: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#111827',
    color: '#fff',
    marginTop: 8,
    marginBottom: 12,
  },
  topicButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  topicButtonFlex: {
    flex: 1,
  },
  generateButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6b7280',
  },
  resetButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  customWordsActive: {
    backgroundColor: '#7c3aed20',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#7c3aed',
  },
  customWordsActiveText: {
    color: '#a78bfa',
    fontSize: 14,
    textAlign: 'center',
  },
  disabledButton: {
    borderColor: '#374151',
    opacity: 0.5,
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  terminateButtonOutline: {
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminateButtonText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

