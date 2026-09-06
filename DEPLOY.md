# Deploy su Firebase Spark

L'app usa il piano gratuito **Spark**: Firebase Hosting, Auth e Realtime Database.
Non richiede Cloud Functions né l'attivazione di Blaze. Tutti i nove giochi usano
lo stesso motore sul client e sincronizzano le azioni con transazioni RTDB.

## Staging

```sh
npm run deploy:staging
```

Lo script controlla TypeScript e test, compila il bundle e pubblica soltanto il
canale Hosting `staging`. Poi apre le finestre per il collaudo manuale.
Il canale usa il database condiviso della produzione; **le regole non vengono
modificate**. Il sito live rimane invariato.

Anteprima: https://gameshub-6b1ce--staging-5behpio3.web.app

Per una pubblicazione non interattiva, dopo i controlli:

```sh
npm run build:web
firebase hosting:channel:deploy staging --expires 7d --project gameshub-6b1ce
```

Le build pubbliche non caricano `.env`, azzerano la chiave Gemini e svuotano la
cache Metro. La generazione AI non è attiva nel bundle pubblico; sono disponibili
i contenuti predefiniti e quelli personalizzati. Il codice di sviluppo Gemini
rimane nel repository.

## Produzione

`npm run deploy:prod` richiede una copia di lavoro pulita, esegue controlli/build,
chiede la conferma per il sito live, fa push e distribuisce **solo Hosting**.
Non distribuisce Functions o regole database. Il deploy live non fa parte della
richiesta corrente di staging.

## Stanze e compatibilità con le regole esistenti

Le stanze Spark sono salvate sotto `rooms/{codice}`. La radice contiene soltanto
campi già consentiti dalle regole pubblicate. `gameData.spark.state` conserva lo
stato completo come JSON, incluse raccolte vuote, impostazioni e versioni delle
azioni; `gameData.spark.version` e `gameState.protocol` identificano il formato.
La UI ricava da questo stato la vista del proprio giocatore.

Le transazioni eseguono il motore condiviso e impediscono aggiornamenti persi o
punti duplicati. Non mostriamo aggiornamenti ottimistici prima della conferma.
Host, ruoli e fasi sono controllati dall'app: è una modalità per partite tra amici,
non un sistema antimanomissione. Tutto lo stato è leggibile dai client autorizzati
secondo le regole già pubblicate.

Le stanze create dal client live precedente non vengono convertite o sovrascritte:
si usa il link della stessa versione dell'host oppure si crea una stanza nuova.
Lupus resta nel codice ma non è selezionabile.

## Verifiche locali

```sh
npm ci
npm run typecheck
npm test
npm run test:integration  # Java 21, Auth + RTDB, nessuna Function
npm run build:web
```

`firebase.spark-test.json` usa una copia delle regole di produzione in
`tests/fixtures/spark.rules.json`, solo negli emulatori del progetto `demo-gameshub`.
La suite usa lo stesso SDK e trasporto dell'app, con utenti Auth distinti,
partite complete di tutti i giochi, concorrenza, rientro, realtime e chiusura.
I test chiudono il processo al completamento per i timer residui dell'SDK Firebase.

Per avviare gli emulatori senza eseguire i test:

```sh
firebase emulators:start --config firebase.spark-test.json --only auth,database --project demo-gameshub
```

Impostare `EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1` quando si avvia Expo
contro gli emulatori; per un telefono usare l'IP LAN. `?cid=p1` / `?cid=p2` separano
le identità web in sviluppo; in staging usare browser/profili distinti.

La cartella storica `server/` contiene i motori puri ora importati dai client.
`functions/` conserva l'implementazione server opzionale della fase precedente;
non è usata dall'app Spark. `npm run test:integration:server` resta disponibile
per collaudare quella variante, installandone prima le dipendenze.
