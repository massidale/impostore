import { ComponentType } from 'react';
import { CoreRoom } from './room';

// ── Standardized props for game plugin components ──
// Settings/state are `unknown` at the core boundary: the registry holds
// heterogeneous plugins, so each specific plugin narrows via cast at its
// own edge (component body / lifecycle hook).

export interface SettingsPanelProps {
  onSettingsChange: (settings: unknown) => void;
  settings: unknown;
  /** Present when the panel is rendered inside an existing room (lobby).
   *  Absent on HomeScreen, before a room is created. */
  roomId?: string;
}

export interface HostDashboardProps {
  roomData: CoreRoom;
  hostId: string;
}

export interface PlayerGamepadProps {
  roomData: CoreRoom;
  playerId: string;
}

// ── Game Plugin contract ──

export interface GamePlugin {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  minPlayers: number;
  maxPlayers: number;

  SettingsPanel: ComponentType<SettingsPanelProps>;
  HostDashboard: ComponentType<HostDashboardProps>;
  PlayerGamepad: ComponentType<PlayerGamepadProps>;

  initGameState: (roomId: string, settings: unknown) => Promise<void>;
  startGame: (roomId: string) => Promise<void>;

  getDefaultSettings: () => unknown;
}
