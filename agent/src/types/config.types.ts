export interface PasswordEntry {
  hash: string;
  displayValue?: string;
}

export interface TotpConfig {
  secret: string;          // base32-encoded TOTP secret
  backupCodes: string[];   // one-time recovery codes (plaintext, hashed on use)
  enabledAt: string;       // ISO timestamp
}

export interface PersistedConfig {
  machineId: string;
  passwords: {
    random: PasswordEntry | null;
    fixed: { hash: string } | null;
  };
  totp: TotpConfig | null;   // null = 2FA not enabled
  settings: AgentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface AgentSettings {
  relayUrl: string;
  relaySecret: string;
  localPort: number;
  workspaceRoot: string | null;
  maxTerminals: number;
  maxFileSize: number;
  jwtSecret: string;
}
