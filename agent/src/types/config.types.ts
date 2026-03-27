export interface PasswordEntry {
  hash: string;
  displayValue: string;
}

export interface PersistedConfig {
  machineId: string;
  passwords: {
    random: PasswordEntry | null;
    fixed: { hash: string } | null;
  };
  settings: AgentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSettings {
  relayUrl: string;
  localPort: number;
  workspaceRoot: string | null;
  maxTerminals: number;
  maxFileSize: number;
  jwtSecret: string;
}
