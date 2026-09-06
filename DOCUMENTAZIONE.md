# gamesHub - Documentazione

## Panoramica del Progetto

**gamesHub** è una piattaforma di party game italiani multiplayer costruita con React Native ed Expo (web-first, ospitata su Firebase Hosting). Una stanza condivisa, un host e i giocatori che si collegano dal proprio telefono via QR code o link.

> Nota: il repository si chiama `impostore` per ragioni storiche, ma il prodotto è **gamesHub**.

**Versione:** 1.0.0

---

## Stack Tecnologico

- **React Native** 0.81 + **React** 19 + **Expo** 54 + **TypeScript** 5.9
- **Firebase Realtime Database** (stato di gioco in tempo reale) + **Auth anonima** + **Hosting**
- **Gemini API** (`@google/generative-ai`) per dizionari/carte generate dall'AI
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
  initGameState()  // scrive gameState iniziale su RTDB
  startGame()      // avvia il round
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
│   └── taboo/         # squadre, carte con parole vietate, timer e buzzer
└── screens/MainScreen.tsx   # router: home → lobby → partita
```

### Design system (`src/core/ui`)

Tema centralizzato in `theme.ts` (colori dark slate + cyan, spaziature, radius, font DM Sans). Componenti riutilizzabili:

- **Layout di gioco:** `PhaseCard`, `StatusCard`, `WordBox`, `MetaCorner`, `GameCard`
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

### Lupus (disabilitato, codice conservato)
Ruoli segreti: Lupi, Veggente, Guardia, Villici (ruoli e stato vita vivono in `gameState`, non sui player — la whitelist delle regole RTDB ammette solo i campi di Impostore). Alternanza notte/giorno: di notte ogni ruolo agisce dal telefono (lupi scelgono la vittima, veggente scruta, guardia protegge — risoluzione automatica quando tutte le azioni sono inviate); di giorno annuncio dell'alba, discussione e votazione con timer avviata dall'host (pareggio = nessun eliminato). Vince il villaggio eliminando i lupi, i lupi alla parità. Logica pura in `lupusPure.ts`.

### Taboo (min 4)
Due squadre (Blu/Rossa) bilanciate automaticamente. A turno un giocatore descrive le parole alla propria squadra senza usare le 5 parole vietate della carta; gli **avversari vedono la carta** e premono **TABÙ!** se sente una parola vietata. +1 indovinata, −1 tabù, passa = 0. Timer sincronizzato via timestamp RTDB (`turnEndsAt`); il client del descrittore chiude il turno allo scadere (l'host ha un fallback "Termina turno"). Vince la squadra con più punti dopo N turni per squadra.

Squadra che apre e ordine dei descrittori sono **sorteggiati a ogni partita** (`startTeam` in `gameState`). La carta ancora in mano allo scadere del tempo viene **scartata**, non passata al descrittore successivo. Le parole già uscite sono memorizzate **sulla stanza** (`gameData/taboo/usedWords`), quindi non tornano nemmeno nelle partite successive; esaurito il mazzo, tutte le parole rientrano rimescolate.

Logica pura testabile in `src/games/taboo/services/tabooPure.ts` (squadre, rotazione, punteggi, pesca del mazzo), carte in `data/cards.json`, generazione carte AI via `generateTabooCards`.

---

## Schema Database Firebase e autorità

Le stanze correnti usano `roomsV2/{roomId}`:

- `data`: stato autorevole, accessibile soltanto al backend.
- `preview`: codice, stato generale e partecipanti, leggibili per entrare.
- `views/{authUid}`: vista privata leggibile soltanto da quel giocatore.

La callable `gameCommand` (`functions/index.ts`, regione `europe-west1`)
verifica Firebase Auth e i permessi dell'azione. Il motore `server/engine.ts`
esegue le regole in una transazione RTDB che aggiorna insieme stato e viste.
Il client non può scrivere direttamente nelle stanze. I comandi riportano
partita, fase e versione della carta per respingere azioni obsolete.

Le impostazioni sono in `data/settings`; i dizionari personalizzati e lo
storico delle carte appartengono a `data/gameData`. Il client riceve soltanto
le informazioni necessarie alla propria vista, senza mazzi futuri o storico
che permetta di ricavare parole segrete.

## Identità e autenticazione

Ogni giocatore è identificato dal proprio Firebase Auth UID, anche con
accesso anonimo. L'identità non viene accettata dai parametri della richiesta.
L'account email è opzionale. Il rientro host verifica lo UID autenticato e
ripristina le impostazioni della stanza. In sviluppo `?cid=` isola anche
l'istanza Auth per simulare più partecipanti nello stesso browser.

Lupus non è registrato nel catalogo né accettato dal backend; i suoi file
restano disponibili per sviluppo futuro. In Indovina la propria parola non
viene inviata al proprio dispositivo: la leggono gli altri partecipanti.

Per la migrazione dalle vecchie stanze e l'ordine di deploy vedere `DEPLOY.md`.

---

## Sviluppo

```bash
npm start            # server Expo
npm run web          # browser
npm test             # test (node:test, logica pura)
npm run typecheck    # tsc --noEmit
npm run build:web    # bundle statico in dist/ + PWA
npm run deploy:staging / deploy:prod
```

I test importano solo moduli "puri" (senza JSON/Firebase) sotto il loader strip-types di Node: la logica testabile va separata nei file `*Pure.ts`.

### Aggiungere un nuovo gioco

1. Crea `src/games/<nome>/` con `types.ts`, `services/` (logica pura + logica Firebase), `components/` (SettingsPanel, HostDashboard, PlayerGamepad) e `index.ts` che esporta il `GamePlugin`.
2. Registra il plugin in `src/core/gameRegistry.ts`.
3. Riusa i componenti di `src/core/ui` per restare coerente col design system.
4. Aggiungi i test della logica pura in `tests/<nome>/`.

---

## Endpoint Live

- Web: `https://gameshub-6b1ce.web.app`
- Ingresso stanza: `https://gameshub-6b1ce.web.app?room=ABC123`
