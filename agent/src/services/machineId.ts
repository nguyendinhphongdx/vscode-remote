import crypto from 'crypto';
import os from 'os';

export function generateMachineId(): string {
  const hostname = os.hostname();
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown';

  const interfaces = os.networkInterfaces();
  const macs: string[] = [];
  for (const iface of Object.values(interfaces)) {
    if (!iface) continue;
    for (const info of iface) {
      if (!info.internal && info.mac && info.mac !== '00:00:00:00:00:00') {
        macs.push(info.mac);
      }
    }
  }
  macs.sort();

  const fingerprint = `${hostname}|${macs.join(',')}|${cpuModel}`;
  const hash = crypto.createHash('sha256').update(fingerprint).digest('hex');

  // Extract 9 digits from hash
  const num = BigInt('0x' + hash.slice(0, 16)) % 1000000000n;
  const digits = num.toString().padStart(9, '0');

  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
}
