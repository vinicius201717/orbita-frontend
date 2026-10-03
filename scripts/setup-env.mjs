import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
if (existsSync('.env.local')) console.log('.env.local preserved.');
else {
  writeFileSync(
    '.env.local',
    readFileSync('.env.example', 'utf8').replace(
      'replace-with-64-hex-characters',
      randomBytes(32).toString('hex'),
    ),
    { mode: 0o600 },
  );
  console.log('.env.local created.');
}
