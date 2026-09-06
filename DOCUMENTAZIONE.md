# gamesHub - Documentazione

> Aggiornamento esperienza di gioco (7 settembre 2026): [home, votazione condivisa, niente punteggi/contenuti personalizzati e Just One a squadre](docs/implementation/party-experience.md). Questo aggiornamento sostituisce le descrizioni precedenti delle funzionalità rimosse.

## Panoramica del Progetto

**gamesHub** è una piattaforma di party game italiani multiplayer costruita con React Native ed Expo (web-first, ospitata su Firebase Hosting). Una stanza condivisa, un host e i giocatori che si collegano dal proprio telefono via QR code o link.

> Nota: il repository si chiama `impostore` per ragioni storiche, ma il prodotto è **gamesHub**.

**Versione:** 1.0.0

Il catalogo implementato contiene **nove giochi**. Lupus resta escluso. Questa documentazione descrive il codice del repository e non attesta la pubblicazione delle modifiche.

---

## Stack Tecnologico

- **React Native** 0.81 + **React** 19 + **Expo** 54 + **TypeScript** 5.9
- **Firebase Realtime Database** (stato di gioco in tempo reale) + **Auth anonima** + **Hosting**
- **Gemini API** (`@google/generative-ai`) conservata per lo sviluppo; non attiva nei bundle pubblici
- UI: `expo-linear-gradient`, `react-native-svg`, `react-native-qrcode-svg`, font **DM Sans**

---

## Architettura

### Plugin di gioco

Ogni gioco è un modulo autonomo sotto `src/games/<nome>/` che esporta un `GamePlugin` (vedi `src/core/types/gamePlugin.ts`):

```
GamePlugin {
  id, name, description, icon, minPlayers, maxPlayers
  SettingsPanel    // pannello impostazioni (home + lobby)
  HostDashboard    // barra azioni dell'host durante la partita
  PlayerGamepad    // schermata di gioco del singolo giocatore
  initGameState()  // inizializza la partita tramite una transazione
  startGame()      // avvia la partita tramite una transazione
  getDefaultSettings()
}
```

I plugin si registrano in `src/core/gameRegistry.ts`. Il core (stanze, lobby, giocatori) non conosce i dettagli dei giochi: legge solo `currentGameId` e delega ai componenti del plugin.

### Struttura

```
src/
├── core/
│   ├── ui/            # design system condiviso (vedi sotto)
│   ├── components/    # HomeScreen, LobbyScreen, WebPlayerScreen, AiDictionaryCard
│   ├── hooks/         # useRoomData, useAnonymousAuth, useClientId,
│   │                  # useCountdown, useKeepScreenAwake
│   ├── services/      # roomService, playerSelection, sessionStorage, geminiService
│   ├── types/         # CoreRoom, GamePlugin
│   ├── utils/         # capitalize…
│   └── gameRegistry.ts
├── games/
│   ├── impostore/     # ruoli segreti, votazioni, pagliaccio
│   ├── indovina/      # ognuno indovina la propria parola con domande sì/no
│   ├── taboo/         # squadre, carte con parole vietate, timer e buzzer
│   ├── che-domanda/   # domande numeriche diverse e deduzione dei ruoli
│   ├── wavelength/    # numero comune segreto da 1 a 10
│   ├── just-one/      # indizi singoli, duplicati e punteggio cooperativo
│   ├── herd-mentality/ # risposte raggruppate e pluralità
│   ├── top-ten/       # interpretazioni ordinate per intensità
│   └── times-up/      # stesso mazzo in tre round
└── screens/MainScreen.tsx   # router: home → lobby → partita
```

### Design system (`src/core/ui`)

Tema centralizzato in `theme.ts` (colori dark slate + cyan, spaziature, radius, font DM Sans). Componenti riutilizzabili:

- **Layout di gioco:** `PhaseCard`, `StatusCard`, `WordBox`, `MetaCorner`, `GameCard`, `FitContent`; i nuovi giochi usano anche `RoundLayout` in `src/core/components/newGames`. Carte adattive e controlli scorribili separati mantengono utilizzabili i bersagli touch.
- **Host:** `HostDashboardShell` (header + banner giocatori in attesa + azioni), `HostActionFooter`, `ProgressCounter`
- **Controlli:** `Button`, `GhostButton`, `Input`, `NumberSelector`, `SegmentedControl`, `Sheet`, `Pill`
- **Feedback:** `ErrorBanner`, `NoticeBanner`, `Toast`, `confirmDialog`
- **Giocatori:** `PlayerSlot`/`PlayerSlotEmpty`, `avatarColor`
- **Icone SVG condivise:** `icons.tsx` (EyeOff, Warning, Check, Trophy, Clock, Bell, Forbidden)

Regola: i componenti di gioco usano SEMPRE `colors/fonts/spacing/radius` dal tema, mai valori raw.

---

## I giochi

### Impostore (min 3)
Tutti conoscono la parola segreta tranne l'impostore (che riceve al massimo un indizio). Discussione a voce, poi votazione con eventuale ballottaggio; l'impostore eliminato può salvarsi indovinando la parola. Ruolo extra "Pagliaccio": vince se viene eliminato.

### Indovina la parola (min 2)
Ogni giocatore riceve una parola visibile solo agli altri (dal dizionario, dall'AI o scritte dai giocatori e distribuite con permutazione senza punti fissi). A turno si fanno domande sì/no per scoprire la propria.

### Taboo (min 4)
Due squadre (Blu/Rossa) bilanciate automaticamente. A turno un giocatore descrive le parole alla propria squadra senza usare le 5 parole vietate della carta; gli **avversari vedono la carta** e premono **TABÙ!** se sente una parola vietata. +1 indovinata, −1 tabù, passa = 0. Timer sincronizzato via timestamp RTDB (`turnEndsAt`); il client del descrittore chiude il turno allo scadere (l'host ha un fallback "Termina turno"). Vince la squadra con più punti dopo N turni per squadra.

Squadra che apre e ordine dei descrittori sono **sorteggiati a ogni partita** (`startTeam` in `gameState`). La carta ancora in mano allo scadere del tempo viene **scartata**, non passata al descrittore successivo. Le parole già uscite sono memorizzate **sulla stanza** (`gameData/taboo/usedWords`), quindi non tornano nemmeno nelle partite successive; esaurito il mazzo, tutte le parole rientrano rimescolate.

Logica pura testabile in `src/games/taboo/services/tabooPure.ts` (squadre, rotazione, punteggi, pesca del mazzo), carte in `data/cards.json`, generazione carte AI via `generateTabooCards`.


### Che domanda? (3–12)
Tutti rispondono con un numero a una domanda privata; gli impostori ricevono una domanda simile ma diversa. Dopo tutti gli invii si rivelano soltanto la domanda dei civili e le risposte. Discussione a turni, voto da 60 secondi e un eventuale ballottaggio da 30 secondi. L’espulso rivela la fazione. I civili vincono eliminando tutti gli impostori; gli impostori alla parità numerica. Nessun punteggio individuale.

### Wavelength (3–12, variante numerica)
Tutti tranne l’indovino ricevono lo stesso intero segreto da 1 a 10. L’indovino pone domande a voce e ascolta un esempio da ciascuno, quindi conferma un solo numero. Esatto: 2 punti; scarto di 1: 1 punto; altrimenti 0. Tutti indovinano una volta per giro, da 1 a 3 giri. Vince il punteggio individuale maggiore, con parità condivisa.

### Just One (3–10)
Gli autori vedono la parola e inviano un indizio di una sola parola; l’indovino non vede parola, autori o indizi grezzi. Il motore annulla tutti i duplicati normalizzati. Durante la revisione ogni autore può ritirare il proprio indizio; due autori distinti devono segnalare un indizio per invalidarlo. Dopo la conferma di tutti, l’indovino riceve gli indizi validi anonimi e ha un tentativo o passa. Risposta corretta, inclusi gli alias editoriali: +1 cooperativo; errore, passaggio o nessun indizio valido: 0. Da 5 a 20 parole, 8 di default.

### Herd Mentality (3–12)
Tutti rispondono privatamente alla stessa domanda, con 1–60 caratteri. Dopo tutti gli invii le risposte vengono mostrate e raggruppate per forma normalizzata. L’host può unire gruppi equivalenti e annullare le fusioni prima della conferma, conservando i testi originali. L’unico gruppo più grande assegna +1 a ogni membro anche senza superare il 50%; un pareggio in testa assegna 0. Da 5 a 20 domande, 8 di default; classifica individuale e vittoria condivisa in caso di parità.

### Top Ten (4–10)
Ogni partecipante, capitano incluso, riceve un numero distinto da 1 a 10 e interpreta a voce un tema secondo quell’intensità. Il capitano ordina tutti dal meno al più intenso; soltanto alla conferma si rivelano i numeri. Ogni coppia adiacente crescente vale +1 cooperativo, massimo N−1 per tema. Capitano a rotazione, da 3 a 10 temi, 5 di default.

### Time’s Up (4–12)
Due squadre con almeno due persone usano lo stesso mazzo di nomi per tre round: descrizione libera, una sola parola, solo mimo senza suoni. Solo il descrittore vede la carta corrente. Indovinata: +1; passa o violazione: la carta torna in fondo senza punti. Timer condiviso, squadre alternate e descrittori a rotazione; un annullamento dell’ultima azione è possibile solo nel turno ancora aperto. Esaurire il mazzo chiude il round; il terzo chiude la partita. Mazzo da 10–60 nomi (30 di default), turno da 30–90 secondi (45 di default). Nomi predefiniti, caricati in lobby o raccolti privatamente dai giocatori.

### Regole comuni dei sei nuovi giochi
I partecipanti sono congelati all’inizio della partita. Chi entra dopo resta spettatore fino alla partita successiva; disconnettersi non equivale a rispondere. L’host può annullare un round bloccato o terminare la partita, senza accesso aggiuntivo ai segreti. L’annullamento non assegna punti; in Time’s Up chiude il turno conservando i punti delle carte già indovinate. I risultati di round e partita sono distinti; tornando alla lobby si conservano impostazioni e contenuti riutilizzabili. I contenuti personalizzati sono validati dal motore e modificabili soltanto nella lobby, fino a 1.000 voci. Nessuna valutazione semantica automatica di indizi, risposte, voce o mimo.

### Lupus (disabilitato)
Il codice è conservato per sviluppo futuro, ma il gioco non è registrato nel catalogo né accettato dal motore.

---

## Database e sincronizzazione su Spark

L'app funziona con Firebase **Spark**, senza Cloud Functions. `roomCommand`
usa `sparkTransport`: legge lo stato, applica il motore sul client e salva il
risultato con una transazione RTDB. `subscribeToRoom` ascolta gli aggiornamenti
realtime. Conferme duplicate e richieste obsolete vengono gestite dai token
`matchId`, `phase`, `roundId`, `phaseVersion` e, per le carte, dalla loro versione.

Le stanze sono in `rooms/{codice}`. I campi alla radice rispettano le regole già
pubblicate; il JSON in `gameData.spark.state` conserva lo stato completo senza
perdere array e oggetti vuoti. Il formato è identificato da `spark.version: 1` e
`gameState.protocol: spark-v1`. Stanze di versioni precedenti non vengono migrate
né sovrascritte automaticamente.

Il motore condiviso rimane nella cartella storica `server/`, ma è codice puro
importato dal client. `gameModules.ts` registra i sei nuovi moduli; `gameDispatch.ts`
controlla le azioni e `projectRoom` prepara ciò che la schermata deve mostrare.
I tre giochi precedenti usano lo stesso trasporto. Le proiezioni nascondono i
segreti nell'interfaccia; lo stato completo è comunque accessibile ai client,
come concordato per l'uso tra amici. Non è richiesta una modifica alle regole.

La precedente variante con callable e `roomsV2` resta in `functions/` come codice
opzionale: l'app e il deploy standard non la usano e non richiedono Blaze.

## Identità e autenticazione

Ogni giocatore è identificato dal proprio Firebase Auth UID, anche con
accesso anonimo. L'identità non viene accettata dai parametri della richiesta.
L'account email è opzionale. Il rientro host verifica lo UID autenticato e
ripristina le impostazioni della stanza. In sviluppo `?cid=` isola anche
l'istanza Auth per simulare più partecipanti nello stesso browser.

Lupus non è registrato nel catalogo né accettato dal motore; i suoi file
restano disponibili per sviluppo futuro. In Indovina la propria parola non
viene mostrata nella propria schermata: la leggono gli altri partecipanti.

Per la migrazione dalle vecchie stanze e l'ordine di deploy vedere `DEPLOY.md`.

---

## Sviluppo

```bash
npm start            # server Expo
npm run web          # browser
npm test             # test node:test, motori e proiezioni incluse
npm run typecheck    # tsc --noEmit
npm run build:server # opzionale: compila la variante server conservata
npm run test:integration # Auth e RTDB negli emulatori, senza Functions
npm run build:web    # bundle statico in dist/ + PWA
npm run deploy:staging / deploy:prod
```

I test unitari usano `node:test` e il loader strip-types di Node; quelli server
usano anche `tests/helpers/serverLoader.ts` per caricare moduli TypeScript e dati
JSON senza avviare Firebase. `tests/integration/*.test.mjs` verifica le transazioni client con
Auth reale negli emulatori del progetto `demo-gameshub`, incluse viste di gioco,
partite complete, rientri, spettatori e richieste obsolete. Le verifiche browser
non sostituiscono i collaudi su dispositivi iOS/Android reali.

### Aggiungere un nuovo gioco

1. Crea `src/games/<nome>/` con tipi di vista, wrapper `roomCommand`, componenti e `GamePlugin`.
2. Implementa un `GameModule` puro condiviso con validazione di impostazioni/contenuti, transizioni e proiezioni private; registralo in `server/gameModules.ts`.
3. Riusa il dispatcher e i token di generazione. Concentra sorteggi e punteggi nel motore condiviso, senza duplicarli nei componenti UI.
4. Aggiungi test server e scenari emulatori per partita completa, permessi, privacy, retry e richieste obsolete.
5. Riusa il design system; `MainScreen` monta un `PlayerGamepad` e un `HostDashboard` compatto separato. Tieni i controlli fuori dalle carte scalate.
6. Registra il plugin in `src/core/gameRegistry.ts` dopo le verifiche e aggiorna la documentazione.

---

## Endpoint Live

- Web: `https://gameshub-6b1ce.web.app`
- Ingresso stanza: `https://gameshub-6b1ce.web.app?room=ABC123`
