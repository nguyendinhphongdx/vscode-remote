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
  port: number;
  workspaceRoot: string;
  maxConnections: number;
  maxTerminals: number;
  maxFileSize: number;
  allowedOrigins: string[];
  jwtSecret: string;
}
