import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';

const serverDir = process.cwd();
const projectDir = path.dirname(serverDir);
const serverEntry = path.join(serverDir, 'dist', 'index.js');
const dataFile = path.join(serverDir, '.tmp-local-data-test.json');
const port = 3101;
const baseUrl = `http://127.0.0.1:${port}`;

async function waitForServer(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        return;
      }
    } catch {
      // server not ready yet
    }
    await delay(250);
  }
  throw new Error('Server did not become ready in time');
}

test('falls back to local storage when MySQL is unavailable', async (t) => {
  if (existsSync(dataFile)) {
    rmSync(dataFile, { force: true });
  }

  const child = spawn(process.execPath, [serverEntry], {
    cwd: serverDir,
    env: {
      ...process.env,
      PORT: String(port),
      DB_HOST: '127.0.0.1',
      DB_PORT: '3306',
      DB_USER: 'root',
      DB_PASSWORD: '',
      DB_NAME: 'amblyopia_training',
      JWT_SECRET: 'test-secret',
      CLIENT_URL: 'http://localhost:3000',
      LOCAL_DATA_FILE: dataFile,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let logs = '';
  child.stdout.on('data', (chunk) => {
    logs += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    logs += chunk.toString();
  });

  t.after(() => {
    child.kill();
    if (existsSync(dataFile)) {
      rmSync(dataFile, { force: true });
    }
  });

  await waitForServer(`${baseUrl}/health`);

  const registerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '13800138000',
      password: 'secret123',
      nickname: 'Test Parent',
    }),
  });

  assert.equal(registerRes.status, 201, logs);
  const registerData = await registerRes.json();
  assert.ok(registerData.token);
  assert.ok(registerData.user?.id);
  assert.ok(registerData.familyId);

  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '13800138000',
      password: 'secret123',
    }),
  });

  assert.equal(loginRes.status, 200, logs);
  const loginData = await loginRes.json();
  assert.ok(loginData.token);

  const authHeaders = { Authorization: `Bearer ${loginData.token}` };

  const meRes = await fetch(`${baseUrl}/api/auth/me`, { headers: authHeaders });
  assert.equal(meRes.status, 200, logs);
  const meData = await meRes.json();
  assert.equal(meData.phone, '13800138000');

  const familyRes = await fetch(`${baseUrl}/api/family`, { headers: authHeaders });
  assert.equal(familyRes.status, 200, logs);
  const familyData = await familyRes.json();
  assert.equal(familyData.owner_id, meData.id);

  const childrenRes = await fetch(`${baseUrl}/api/family/children`, { headers: authHeaders });
  assert.equal(childrenRes.status, 200, logs);
  const childrenData = await childrenRes.json();
  assert.deepEqual(childrenData, []);
});
