// Removes rooms whose last mutation is older than STALENESS_MS.
// Intended to be run daily via GitHub Actions (see .github/workflows/cleanup.yml).
//
// Requires env var FIREBASE_SERVICE_ACCOUNT containing the JSON of a service
// account with Realtime Database write access.

const admin = require('firebase-admin');

const DATABASE_URL =
  'https://impostore-c0ef1-default-rtdb.europe-west1.firebasedatabase.app';
const STALENESS_MS = 60 * 60 * 1000; // 1 hour

function parseServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT env var');
  }
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT is not valid JSON: ${e.message}`);
  }
}

async function main() {
  admin.initializeApp({
    credential: admin.credential.cert(parseServiceAccount()),
    databaseURL: DATABASE_URL,
  });

  const db = admin.database();
  const cutoff = Date.now() - STALENESS_MS;
  const snap = await db.ref('rooms').once('value');

  const removals = {};
  let total = 0;
  let stale = 0;

  snap.forEach((child) => {
    total += 1;
    const room = child.val() || {};
    const last = Number(room.updatedAt ?? room.createdAt ?? 0);
    if (last < cutoff) {
      removals[child.key] = null;
      stale += 1;
    }
  });

  if (stale > 0) {
    await db.ref('rooms').update(removals);
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
