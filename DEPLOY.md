# Deploy

Questa versione implementa nove giochi nel catalogo: Impostore, Indovina la parola, Taboo, Che domanda?, Wavelength, Just One, Herd Mentality, Top Ten e Time’s Up. Lupus resta disabilitato. Le modifiche descritte sono nel repository: questo documento non attesta un deploy eseguito.

La pubblicazione richiede backend, regole database e client aggiornati insieme.

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

Le nuove stanze risiedono in `roomsV2/{id}`: `data` è una stringa JSON privata,
accessibile solo al backend. `server/roomCodec.ts` serializza lo stato per conservare
array e oggetti vuoti che RTDB eliminerebbe; accetta in lettura anche il precedente
formato a oggetto. La successiva scrittura salva lo stato nel nuovo formato.
`preview` e `views/{authUid}` restano oggetti RTDB: la preview contiene le informazioni
di ingresso, ogni vista è leggibile soltanto dal relativo utente autenticato.
Stato, preview e viste vengono aggiornati nella stessa transazione. Impostazioni e
contenuti personalizzati rimangono proprietà dello stato della stanza, dentro il JSON;
non sono percorsi RTDB interrogabili sotto `data`.

Un eventuale rollback del backend deve conservare il decoder dei due formati:
le versioni precedenti al codec non leggono le stanze già salvate come stringhe.
Il codec rifiuta stati privati superiori a 9 MB prima della scrittura.

I sei nuovi giochi sono registrati in `server/gameModules.ts`. I comandi
`<gameId>.<azione>` passano per `server/gameDispatch.ts`, con controlli di ruolo,
partecipazione e generazione (`matchId`, `phase`, `roundId`, `phaseVersion`);
Time’s Up verifica anche `actionVersion` per le azioni sulle carte. I partecipanti
sono congelati all’avvio: chi entra dopo osserva fino alla prossima partita.

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

`npm run test:integration` compila il backend ed esegue `tests/integration/*.test.mjs`
esclusivamente nel progetto emulator `demo-gameshub`. La suite include i sei nuovi
giochi e le verifiche delle viste private, dei comandi e della persistenza.
Per aprire l'app contro emulatori avviati localmente, impostare
`EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1`. Per testare più giocatori nello
stesso browser in sviluppo, usare `?cid=p1`, `?cid=p2`: anche Auth è isolata per
istanza. Per telefoni reali, usare l'IP LAN del computer invece di localhost.

I canali Hosting di anteprima condividono il backend del progetto: lo script
`deploy:staging` pubblica solo Hosting, quindi richiede già il backend compatibile.
