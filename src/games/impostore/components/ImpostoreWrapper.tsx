import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CoreRoom } from '../../../core/types/room';
import { ImpostoreGameState } from '../types';
import { endImpostoreGame, startVoting } from '../services/impostoreLogic';
import ImpostorePlayerGamepad from './ImpostorePlayerGamepad';
import ImpostoreHostDashboard from './ImpostoreHostDashboard';

interface ImpostoreWrapperProps {
  roomData: CoreRoom<ImpostoreGameState>;
  hostId: string;
}

export default function ImpostoreWrapper({ roomData, hostId }: ImpostoreWrapperProps) {
  
  return (
    <View style={styles.container}>
      {/* 1. Host Dashboard (Poteri Globali) */}
      <ImpostoreHostDashboard roomData={roomData} hostId={hostId} />
      
      <View style={styles.divider} />

      {/* 2. Player Gamepad (Il controller di gioco per l'Host) */}
      <ImpostorePlayerGamepad roomData={roomData} playerId={hostId} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#374151',
    marginVertical: 20,
  }
});
