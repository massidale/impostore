// Removes rooms whose last mutation is older than STALENESS_MS.
// Intended to be run daily via GitHub Actions (see .github/workflows/cleanup.yml).
//
// Requires env var FIREBASE_SERVICE_ACCOUNT containing the JSON of a service
// account with Realtime Database write access.

const admin = require('firebase-admin');

const DATABASE_URL =
  'https://gameshub-6b1ce-default-rtdb.europe-west1.firebasedatabase.app';
const STALENESS_MS = 60 * 60 * 1000; // 1 hour

function parseServiceAccount() {
  // Prefer base64-encoded variant — robust against GitHub's multi-line secret
  // mangling that strips \n inside the private_key field.
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  let raw;
  if (b64) {
    raw = Buffer.from(b64, 'base64').toString('utf8');
  } else {
    raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  }
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_B64 (or FIREBASE_SERVICE_ACCOUNT) env var');
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Service account is not valid JSON: ${e.message}`);
  }
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount()),
    databaseURL: DATABASE_URL,
  });

  const db = admin.database();
  const cutoff = Date.now() - STALENESS_MS;
  let total = 0;
  let stale = 0;
  for (const root of ['rooms', 'roomsV2']) {
    const snap = await db.ref(root).once('value');
    const candidates = [];
    snap.forEach((child) => {
      total += 1;
      const room = root === 'roomsV2' ? child.val()?.data : child.val();
      if (Number(room?.updatedAt ?? room?.createdAt ?? 0) < cutoff) candidates.push(child.key);
    });
    for (const id of candidates) {
      const result = await db.ref(`${root}/${id}`).transaction((value) => {
        if (!value) return undefined;
        const room = root === 'roomsV2' ? value.data : value;
        return Number(room?.updatedAt ?? room?.createdAt ?? 0) < cutoff ? null : undefined;
      });
      if (result.committed) stale += 1;
    }
  }

  console.log(
    `[cleanup] scanned=${total} removed=${stale} cutoff=${new Date(
      cutoff
    ).toISOString()}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
