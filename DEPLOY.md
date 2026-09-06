# Deploy

Questa versione richiede backend, regole database e client aggiornati insieme.

1. `npm ci` e `npm ci --prefix functions`.
2. `npm run typecheck`, `npm test`, `npm run test:integration` (Java 21).
3. `npm run build:web`.
4. `firebase deploy --only functions`.
5. Dopo il successo del backend: `firebase deploy --only database,hosting`.

`npm run deploy:prod` esegue build, controlli, push e deploy con conferma.
Il backend callable `gameCommand` è in `europe-west1`. Le regole negano tutte
le scritture client sulle stanze: non pubblicare soltanto il nuovo client senza
aver distribuito il backend.

## Dati e compatibilità

Le nuove stanze risiedono in `roomsV2/{id}`: `data` è accessibile solo al backend,
`preview` contiene informazioni di ingresso, `views/{authUid}` è leggibile solo
dal giocatore corrispondente. Stato e viste vengono aggiornati nella stessa
transazione. I mazzi personalizzati e le impostazioni appartengono alla stanza.

Le vecchie stanze sotto `rooms` diventano inaccessibili al cambio delle regole:
è necessario crearne di nuove. Non viene migrata automaticamente l'identità
`clientId`, che non provava la titolarità del giocatore. La nuova identità è
sempre Firebase Auth UID, anche per utenti anonimi. Il job di pulizia gestisce
entrambi gli schemi e ricontrolla l'attività in transazione prima di eliminare.

Lupus resta nel sorgente ma è escluso dal registro e dalle azioni del backend.
In Indovina la propria parola non viene inviata al dispositivo: gli altri
partecipanti la leggono dai loro telefoni. La modalità di visualizzazione della
propria parola sul proprio telefono è stata rimossa per conservarne la segretezza.

## Verifica locale

`npm run test:integration` usa esclusivamente il progetto emulator `demo-gameshub`.
Per aprire l'app contro emulatori avviati localmente, impostare
`EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1`. Per testare più giocatori nello
stesso browser in sviluppo, usare `?cid=p1`, `?cid=p2`: anche Auth è isolata per
istanza. Per telefoni reali, usare l'IP LAN del computer invece di localhost.

I canali Hosting di anteprima condividono il backend del progetto: lo script
`deploy:staging` pubblica solo Hosting, quindi richiede già il backend compatibile.
