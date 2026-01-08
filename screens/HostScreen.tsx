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
  const [hostPlayerData, setHostPlayerData] = useState<Player | null>(null);
  const [hostRevealed, setHostRevealed] = useState(false);
  const [updateTimeout, setUpdateTimeout] = useState<NodeJS.Timeout | null>(null);

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
      <StatusBar style="auto" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Crea Stanza</Text>

      {!roomId ? (
        <View style={styles.createSection}>
          <Text style={styles.label}>Numero di Impostori</Text>
          <TextInput
            style={styles.input}
            value={numImpostors}
            onChangeText={setNumImpostors}
            keyboardType="number-pad"
            placeholder="1"
          />
          
          <View style={styles.switchContainer}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Abilita indizio per impostore</Text>
              <Switch
                value={hintEnabled}
                onValueChange={setHintEnabled}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={hintEnabled ? '#007AFF' : '#f4f3f4'}
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

          <TouchableOpacity
            onPress={handleCreateRoom}
            disabled={loading}
          >
            <LinearGradient
              colors={loading ? ['#ccc', '#ccc'] : ['#007AFF', '#0051D5']}
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
      ) : (
        <View style={styles.roomSection}>
          <Text style={styles.roomId}>Stanza: {roomId}</Text>
          <Text style={styles.status}>
            Status: {roomData?.status === 'waiting' ? 'In attesa' : 'Attiva'}
          </Text>
          <Text style={styles.playerCount}>
            Giocatori: {getPlayerCount()}
          </Text>

          {roomData?.status === 'waiting' && (
            <>
              <View style={styles.settingsSection}>
                <Text style={styles.label}>Numero di Impostori</Text>
                <TextInput
                  style={styles.input}
                  value={numImpostors}
                  onChangeText={setNumImpostors}
                  keyboardType="number-pad"
                  placeholder="1"
                />
              </View>

              <View style={styles.settingsSection}>
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
                      trackColor={{ false: '#767577', true: '#81b0ff' }}
                      thumbColor={hintEnabled ? '#007AFF' : '#f4f3f4'}
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

              {/* Lista giocatori */}
              {roomData?.players && Object.keys(roomData.players).length > 0 && (
                <View style={styles.playersListSection}>
                  <Text style={styles.label}>Giocatori nella stanza:</Text>
                  {Object.entries(roomData.players).map(([uid, player]) => (
                    <View key={uid} style={styles.playerRow}>
                      <Text style={styles.playerName}>
                        {player.name || 'Giocatore senza nome'} {uid === hostId && '(Host)'}
                      </Text>
                      {uid !== hostId && (
                        <TouchableOpacity
                          onPress={() => handleRemovePlayer(uid)}
                          style={styles.removeButton}
                        >
                          <Text style={styles.removeButtonText}>Rimuovi</Text>
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
                    disabled={loading || getPlayerCount() < 1}
                    style={styles.fullWidthButton}
                  >
                    <LinearGradient
                      colors={getPlayerCount() < 1 ? ['#ccc', '#ccc'] : ['#007AFF', '#0051D5']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[styles.button, styles.primaryButton]}
                    >
                      <Text style={styles.primaryButtonText}>
                        {loading ? 'Avvio...' : 'Avvia Partita'}
                      </Text>
                    </LinearGradient>
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
              <TouchableOpacity
                onPress={handleEndGame}
                disabled={loading}
                style={[styles.fullWidthButton, styles.terminateButton]}
              >
                <LinearGradient
                  colors={['#FF3B30', '#D70015']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.button, styles.primaryButton, styles.fullWidthButton]}
                >
                  <Text style={styles.primaryButtonText}>
                    {loading ? 'Terminazione...' : 'Termina Partita'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
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
                    colors={['#007AFF', '#0051D5']}
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
                    <Text style={styles.modalTitle}>Sei un civile.</Text>
                    <Text style={styles.modalSubtitle}>La parola è:</Text>
                    <Text style={styles.modalWord}>{roomData?.word}</Text>
                    {hostPlayerData.isFirst && (
                      <Text style={styles.firstPlayerText}>Sei il primo giocatore.</Text>
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
                      <Text style={styles.firstPlayerText}>Sei il primo giocatore</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    color: '#333',
  },
  createSection: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  button: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 22,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidthButton: {
    width: '100%',
  },
  terminateButton: {
    marginTop: 15,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButtonText: {
    color: '#007AFF',
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
    color: '#333',
  },
  status: {
    fontSize: 16,
    marginBottom: 5,
    color: '#666',
  },
  playerCount: {
    fontSize: 16,
    marginBottom: 20,
    color: '#666',
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
    color: '#333',
    textAlign: 'center',
  },
  qrContainer: {
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  linkSection: {
    width: '100%',
    marginVertical: 20,
  },
  linkLabel: {
    fontSize: 16,
    marginBottom: 10,
    color: '#333',
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginBottom: 10,
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
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
  switchContainer: {
    width: '100%',
    marginVertical: 20,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
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
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  readyCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginTop: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalWord: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalHintLabel: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalHint: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
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
    marginTop: 20,
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  playerName: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  removeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FF3B30',
    borderRadius: 6,
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

