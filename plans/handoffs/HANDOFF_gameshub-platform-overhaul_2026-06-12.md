# gamesHub: overhaul UI/design-system, 2 nuovi giochi (Taboo, Lupus), auth opzionale, landing, tooling di test multiplayer

**Date:** 2026-06-12
**Status:** IN PROGRESS (codice completo e verificato; TUTTO NON COMMITTATO; provider Firebase Auth da abilitare in console; nessun deploy fatto)
**Bead(s):** none (`bd` non disponibile nel progetto)
**Epic:** none
**Chain:** `standalone-2ce9c69e` seq `1`
**Parent:** none — first in chain
**Prior chain:** none — first in chain

---

## Reference Documents

- `DOCUMENTAZIONE.md` — riscritta in questa sessione: architettura a plugin, design system, schema RTDB, identità/auth, procedura "aggiungere un gioco". È il riferimento aggiornato del progetto.
- `~/.claude/.../memory/MEMORY.md` — note utente: il prodotto si chiama **gamesHub** (repo `impostore` per ragioni storiche); preferenza "keep going without pausing".
- NON esiste CLAUDE.md di progetto.

## The Goal

Trasformare l'app da "due giochini con UI incoerente" a piattaforma di party game italiani solida: design system unico riusato da tutti i giochi, catalogo ampliato (Taboo e Lupus aggiunti a Impostore e Indovina), onboarding decente (landing con join-by-code, splash, account opzionale con nickname), e un workflow di test multiplayer locale che non richieda 5 telefoni. L'utente (paodal@gmail.com, hobbista, parla italiano, delega le decisioni di design ma dà feedback UX molto puntuale a raffica) vuole arrivare a una versione deployabile in staging/produzione su Firebase Hosting (`gameshub-6b1ce.web.app`).

## Where We Are

- **Stack**: React Native 0.81 + React 19 + Expo 54 + TS 5.9, Firebase RTDB + Auth + Hosting (progetto `gameshub-6b1ce`, RTDB europe-west1), Gemini (`gemini-2.5-flash`) per dizionari AI. Web-first; bundle in `dist/` via `scripts/build-web.sh`.
- **Architettura invariata nel suo nucleo**: plugin per gioco (`GamePlugin`), stanza in RTDB con `currentGameId` + `gameState` polimorfo, `MainScreen` come router, `useRoomData` su `subscribeToRoom`. La sessione ha ESTESO, non sostituito.
- **Lingua**: UI interamente in italiano; nome prodotto "gamesHub" ovunque.
- **Verifica finale sessione**: `npx tsc --noEmit` pulito; `npm test` **96/96 pass**; `npm run build:web` OK (ultima build INCLUDE tutto tranne le ultimissime modifiche Lupus/autoFocus/QR — rifare build prima del deploy).
- **NIENTE È COMMITTATO**: working tree su `main` con ~37 file modificati, ~30 nuovi, 3 cancellati (`git diff --stat`: 1298 insertions, 1996 deletions sui tracked). Ultimo commit `4e93ebc "modifiche ui"` è pre-sessione.
- **Sequenza di verifica usata per OGNI batch**: `npx tsc --noEmit` → `npm test` → (a fine batch) `npm run build:web`. Mai saltata; ripeterla a ogni modifica futura.
- **Stato build `dist/`**: l'ultima build include il redesign narratore ma NON: early-close sondaggio notte, rimozione emoji bottoni, icone SVG morte/vita, autoFocus rimossi, QR alzato. Rigenerare.
- **Design system** (`src/core/ui/`): nuovi componenti `WordBox`, `StatusCard`, `NoticeBanner`, `HostDashboardShell`, `GhostButton`, `MetaCorner`, `SegmentedControl`, `CountdownBar`, `GameRules` (collassabile), `icons.tsx` (EyeOff/Warning/Check/Trophy/Clock/Bell/Forbidden/User); `PlayerSlot` ha prop `subtitle` (null = nasconde riga Host/Giocatore); `GameCard.onPress` opzionale (modalità statica senza chevron); `Button`/`NumberSelector` portati su `fonts.*` (niente più fontWeight raw nei giochi); tema: aggiunti `teamBlue/teamRed(+Tint)`.
- **4 giochi registrati** in `src/core/gameRegistry.ts`: impostore 🎭 (min 3), indovina 🤔 (min 2), taboo 🚫 (min 4), lupus 🐺 (min 4). `GamePlugin` ora richiede `rules: string` (mostrate dal toggle "Regole" negli sheet impostazioni Home+Lobby); `SettingsPanelProps` ha `roomId?` e `roomData?` (lobby only).
- **Impostore**: votazione con timer (`votingSeconds` 15-300 default 60, `votingEndsAt` su RTDB), voto cambiabile fino a chiusura (riga selezionata bordo cyan + CheckIcon), chiusura su tutti-votato o timeout (`closeVotingByTimeout`, idempotente, effetto sul client host); 0 voti a timeout → si torna a `playing`; ballottaggio con timer fresco. Risultati minimal identici per tutti: ruolo vincitore + NOMI vincitori + parola rivelata (badge HAI VINTO/PERSO rimosso). Indizi default ON.
- **Indovina**: refactor su SegmentedControl/StatusCard/GhostButton/MetaCorner; logica invariata.
- **Taboo**: squadre Blu/Rossa con `teamMode: 'auto'|'manual'` (host assegna con chip per giocatore; min 2 per squadra validato a startGame; late joiner → squadra più piccola; `buildTeams` pure); turni alternati con `CountdownBar` da `turnEndsAt`; SOLO il descrittore ha i tasti: Indovinata!/Passa(n)/Tabù — gli avversari vedono la carta e segnalano A VOCE (hint sullo schermo); `maxSkips` per turno (default 3, tasto "Passa (n)" disabilitato a 0); undo singolo livello "↩ Annulla" in alto a dx (ripristina cursor/score/stats da `lastAction`); 81 carte it in `data/cards.json` + `generateTabooCards` AI; risultati minimal (titolo + scoreboard, niente roster).
- **Lupus** (il più complesso): ruoli e vita in `gameState.roles/alive` (NON su players: le regole RTDB whitelistano i campi player ai soli campi impostore — scelta deliberata, zero modifiche a `database.rules.json`). Ruoli: lupo/villico/veggente/guardia/medium/bocca. DUE timer: `nightSeconds` (default 60) e `votingSeconds` (default 90). Notte: lupi vedono le scelte del branco in tempo reale ("🐺 nome" per bersaglio), serve UNANIMITÀ entro il timer o si astengono; conferma dialog SOLO per ruoli singoli (veggente/guardia/bocca/lupo solitario), NO conferma con 2+ lupi; chi non agisce a timeout si astiene; chiusura anticipata quando tutto è completo (anche nei sondaggi narratore). Alba SENZA dettagli: solo nomi dei morti (anche 2 con bocca), mai ruolo né "salvato dalla guardia". Voto: astensione esplicita (`ABSTAIN='abstain'`, non conta nel tally), pareggio → ballottaggio tra i pari, secondo pareggio → nessun morto. Medium: vista passiva ruoli dei morti. Bocca di Rosa: visita un giocatore; lupi→lei = non in casa (nessun morto); lupi→ospite = muoiono entrambi.
- **Lupus narratore** (ridisegnato 2 volte su input utente — modello finale): col narratore l'app NON risolve NULLA (no morti automatiche, no win check, no fasi automatiche). Fase di riposo `'standby'`: i giocatori tengono la carta del ruolo. Console narratore (`LupusNarratorView`): sondaggi OPZIONALI "Avvia notte"/"Avvia voto" (raccolgono scelte coi timer e producono `lastNightReport`/`lastVoteReport` — eventi nominativi, voti per votante, astenuti), chiusura manuale/timer/quando tutti hanno agito; mappa ruoli con toggle SVG morto/vivo (`narratorSetAlive`, presa d'appunti senza win check); `customRoles` (nomi liberi assegnati su villici random — poteri gestiti dal narratore). Narratore = uid di un giocatore in stanza (escluso da ruoli/conteggi) **oppure** `EXTERNAL_NARRATOR='external'` → l'app distribuisce SOLO le carte (standby permanente, niente sondaggi, dashboard solo Termina).
- **Landing/flow**: `LandingScreen` (Crea stanza / Unisciti con codice 6 char, errore "stanza non esiste" che sostituisce il vecchio spinner infinito), back "‹ Indietro" sul catalogo, URL sync `?room=` al join manuale (refresh rientra), lobby con picker gioco collassato dietro "Cambia gioco".
- **Auth opzionale**: `authService.ts` (Google popup web-only; email+password con `sendEmailVerification`; mappa errori in italiano), `useAuthUser` (fallback anonimo), `AccountSheet` (login/registrati/profilo/reinvio verifica/logout) da icona account nell'header; **identità giocatore = UID account se registrato, altrimenti clientId per-device** (`identityId` in MainScreen); nickname = displayName precompilato host+guest. ⚠️ **BLOCCANTE: in Firebase console vanno abilitati i provider Google e Email/Password (oggi solo Anonymous)**.
- **Rientro host**: `lastHostedRoom` in sessionStore; al mount (senza `?room`) se la stanza esiste e `players[identity].isHost` → rientro automatico; pulito su delete/stanza sparita.
- **Bugfix importanti**: (1) freeze lista giocatori: `subscribeToRoom` era senza error-callback (listener cancellato moriva in silenzio) e `off(ref)` staccava TUTTI i listener → ora unsubscribe per-listener + retry 2s; (2) host non evidenziato per i guest: si confrontava la chiave player (clientId) con `hostId` (auth UID) → ora `player.isHost`; (3) guest rimosso dall'host restava su schermo morto → torna al join con banner e `clearRoomSession` (evita re-join silenzioso al refresh); (4) tastiera auto-aperta + sheet trascinato su: rimosso `autoFocus` (HomeScreen sheet, WebPlayerScreen).
- **Sheet**: chiusura swipe-down (PanResponder su handle+header, soglia dy>90 o vy>0.6, touchAction none su web) e tastiera in overlay via viewport `interactive-widget=overlays-content` iniettato da build-web.sh (solo build, non dev!).
- **Splash**: simbolo + wordmark + tagline 12px, fade-in, durata minima 1.4s (`MIN_SPLASH_MS`), alone cyan rimosso su richiesta.
- **Tooling test**: `npm run web` = `scripts/dev-host.sh` (expo start + finestra Chrome host 390×800 app-mode, profilo isolato, slot 0); `npm run web:browser` = vecchio comportamento; `npm run dev:multi -- ROOM [N]` = `scripts/dev-multi.sh` (N guest in finestre telefono affiancate da slot 1, profili `/tmp/gameshub-dev-pN`, auto-join via `?cid=pN&name=GiocatoreN`). Hook web: `?cid=` namespacea TUTTO lo storage per tab; `?name=` precompila e auto-entra (WebPlayerScreen). Entrambi attivi anche in prod (deliberato, innocuo — offerto gate non-prod, mai richiesto).
- **Workflow di test consigliato all'utente**: iterazione quotidiana in locale (`npm run web` + `dev:multi`, hot reload ~2s) vs `deploy:staging` (~2 min/giro) come tappa finale con telefono fisico; Device Mode di Chrome (Cmd+Shift+M) per il touch; iOS Simulator per i quirk WebKit (wake lock, 100dvh, safe-area), con N simulatori = N identità native.
- **Alternative testing scartate**: emulatori Android/iOS per il multiplayer quotidiano (pesanti, inutili per una web app); tab multiple senza `?cid=` (stesso localStorage = stesso giocatore — spiegato due volte).
- **Fondo alzato**: paddingBottom `xl` su HostDashboardShell/stickyFooter lobby/revealActions indovina + `env(safe-area-inset-bottom)` nel CSS build + QR box marginBottom xl.
- **Auth, stato preciso**: `useAuthUser` espone `{uid, isRegistered, displayName, email, emailVerified}`; AccountSheet con tre stati (login / registrati con nickname / profilo con notice "Da verificare" + reinvio); Google SOLO web (`Platform.OS !== 'web'` → errore parlante); il vecchio `useAnonymousAuth.ts` è stato CANCELLATO.
- **PWA**: build inietta manifest (name gamesHub, theme `#06B6D4`, bg `#0A0F1C`, icone 192/512 generate con sips), apple-touch meta, html/body 100dvh overflow hidden.
- **Memoria persistente aggiornata?** NO — nessuna nuova memoria scritta in sessione (le 2 esistenti bastavano); valutare se salvarne una su "narratore = zero automatismi" se si torna su Lupus.

## Session Timeline (estrazione chunked, 5 segmenti)

### Chunk 1 (early) — Overhaul + Taboo
- Richiesta iniziale: "revisiona tutto il progetto, migliora la ui… aggiungi il gioco taboo… astrai tutti gli elementi riutilizzabili… libertà di decidere".
- Esplorazione completa: 7232 righe nei file principali; i due gamepad esistenti erano i file più grossi (1120 e 1024 righe) pieni di stili duplicati e `fontWeight` raw.
- Creati 9 componenti core + util + hook; riscritti i 2 giochi esistenti; Taboo completo con TDD; dead code rimosso (`ImpostoreWrapper`, poi `GamePickerModal`); `DOCUMENTAZIONE.md` riscritta da zero (era ferma all'app mono-gioco pre-refactor).
- Verifica: typecheck, 70/70, build (girata in background con notifica).

### Chunk 2 (early-mid) — Deploy Q&A + tooling test
- Q&A: differenza build/deploy; `deploy:staging` usa canale preview isolato MA condivide il **Realtime Database di produzione**; `--live` sovrascrive l'hosting prod (con conferma); `npm run web` È uno script del progetto (non default npm).
- Problema individuato dall'utente: i link/QR generati puntavano sempre a prod (`WEB_PAGE_URL` hardcoded) → `getWebBaseUrl()`.
- Identità per-tab: spiegato che localStorage è condiviso tra tab; implementato `?cid=` (namespacing TUTTE le chiavi storage, non solo clientId — isola anche il nome salvato).
- `?name=` + auto-join; `dev-multi.sh`; poi su richiesta `npm run web` → finestra host formato telefono (`dev-host.sh`); guest spostati di uno slot per non sovrapporsi.
- Richiesta collaterale: guest rimosso dalla stanza deve cambiare schermata → fix con clear della room session.

### Chunk 3 (mid) — UX batch + bugfix (2 messaggi arrivati DURANTE il lavoro)
- Batch principale: fondo alzato, timer votazione Impostore con cambio voto, undo Taboo, regole per tutti i giochi, schermate finali minimal, Tabù riassegnato, limite passi.
- Messaggi in-flight: (1) sheet che si muove con la tastiera + swipe-down mancante; freeze lista giocatori; host non evidenziato per i guest. (2) niente descrizione gioco nei settings. (3) indizi default ON.
- Squadre manuali Taboo (dopo chiarimento sul significato di "solo chi ha la parola" → 3ª iterazione del Tabù).

### Chunk 4 (mid-late) — Landing, auth, Lupus v1
- Landing join/create; picker gioco collassato; descrizioni uniformi.
- Auth opzionale completa + identità account + rientro host; splash con durata minima (richiesta arrivata mid-task); poi ritocchi splash (no alone, tagline più piccola).
- Lupus v1: notte/giorno/voto con risoluzione automatica, veggente/guardia, 14 test.

### Chunk 5 (late) — Lupus espanso e ridisegnato
- Conferma veggente; alba senza dettagli; medium; bocca di rosa (ricerca web); regole con tutti i ruoli; narratore v1 (console + custom roles + kill manuale con win check).
- REDESIGN narratore (messaggio chiave): zero automatismi, sondaggi opzionali, report eventi, decisione sempre sua; due timer; unanimità lupi a vista; astensione; ballottaggio; narratore esterno cards-only.
- Rifiniture finali: chiusura anticipata notte nei sondaggi, no emoji sui bottoni, icone SVG morte/vita, autoFocus rimosso, QR alzato.
- Verifica finale: 96/96, typecheck, build.

## What We Tried (Chronological)

1. **(early) Brainstorming/frontend-design skills** invocate da policy; l'utente aveva delegato tutto ("ti lascio la libertà") → compresso il flusso: esplorazione → decisioni motivate → implementazione. Direzione estetica scelta: RAFFORZARE l'identità esistente (dark slate `#0A0F1C` + cyan `#06B6D4`, DM Sans) invece di stravolgerla — il problema era l'incoerenza, non la palette.
2. **(early) Astrazione prima dei refactor**: creati i componenti core e POI riscritti i giochi sopra di essi. Funzionato bene: le dashboard host sono passate da ~135 righe a wrapper di ~80 su `HostDashboardShell`.
3. **(early) Taboo in TDD**: test `tabooPure` scritti prima dell'implementazione (9 → 13 con buildTeams). Timer sincronizzato via timestamp RTDB (`turnEndsAt`) + countdown locale: pattern poi riusato per votazioni Impostore e notte/voto Lupus. Chi chiude a timeout: client "authoritative" (descrittore per Taboo, host per Impostore/Lupus auto, narratore per i sondaggi) con funzioni idempotenti (guard sulla fase) + ref anti-doppio-invio.
4. **(early-mid) Typecheck error su Platform.select cursor**: `cursor: 'grab'` non è nel tipo RN → risolto con `as object` sul ramo web.
5. **(mid) Firebase multi-path update con path sovrapposti** (`gameState` + `gameState/customRolesList` nello stesso update) sarebbe stato rifiutato → spostato `customRolesList` DENTRO l'oggetto initialState. Gotcha da ricordare per ogni `update()` RTDB.
6. **(mid) Tabù button: 3 iterazioni su feedback utente**: v1 descrittore "Tabù detto" + avversari "TABÙ!" → v2 SOLO avversari (etichetta "Tabù") → v3 FINALE: SOLO descrittore (un solo "potere" per non fare confusione; avversari arbitrano a voce). Non ritoccare senza chiedere.
7. **(mid) Freeze investigation**: ipotesi iniziali (StrictMode double-effect, Animated loop) scartate; causa più probabile identificata leggendo `subscribeToRoom`: onValue senza error callback muore in silenzio su hiccup di rete/refresh token → fix con retry. Non riprodotto direttamente ma il sintomo (refresh ripara) combacia.
8. **(mid-late) Lupus v1 con risoluzione automatica + narratore "supervisore"** → RIFATTO su richiesta esplicita: il narratore gestisce TUTTO lui, l'app solo informa. La v1 aveva `resolveNightVictim` a maggioranza con tie random e win check su narratorSetAlive: entrambi rimossi/sostituiti (`unanimousLupoTarget` + `applyNightDefenses`; narratorSetAlive senza win check).
9. **(late) Bocca di Rosa**: 2 ricerche web. La prima non ha trovato il ruolo (non è ufficiale di Lupus in Tabula); la seconda ha trovato la variante "prostituta": dorme fuori casa → implementata esattamente (lei targettata = nessun morto; ospite targettato = muoiono entrambi).
10. **(late) Croce ✝ su iOS** renderizzata come emoji colorata → sostituita con SVG monocromi (DeadIcon croce a tratto, ReviveIcon freccia circolare) inline in LupusNarratorView.
11. **(durante la sessione) Script test collaudato per sbaglio**: testando la validazione di dev-multi con il dev server attivo si sono aperte 4 finestre vere — funziona.
12. **(mid) Sheet + tastiera, ricerca soluzione web**: il movimento dello sheet `position:fixed bottom:0` con la tastiera dipende dal resize del viewport (Chrome/Android) o dallo scroll-into-view (iOS). Soluzione scelta: meta viewport `interactive-widget=overlays-content` (Chrome 108+, la tastiera si sovrappone senza ridimensionare) iniettata in build-web.sh via sed sulla meta generata da Expo (`width=device-width, initial-scale=1, shrink-to-fit=no` → + `viewport-fit=cover, interactive-widget=overlays-content`). iOS ignora il flag ma il sintomo principale era l'autofocus (vedi 14).
13. **(mid) Swipe-down sheet**: PanResponder solo sulla zona handle+header (non sul contenuto, che deve scrollare); `onMoveShouldSetPanResponder: dy>6 && |dy|>|dx|`; rilascio oltre soglia → anim 160ms a 600px → onClose; altrimenti spring back. `dragY` separato dallo slide di apertura (due translateY composti).
14. **(late) Tastiera auto-aperta**: causa = `autoFocus` sull'Input del nome dentro lo sheet: il focus partiva durante l'animazione di apertura e trascinava su la tendina. Rimosso anche dal join guest (stessa molestia all'arrivo da QR). Toccando il campo a mano il comportamento è corretto.
15. **(mid) Bug host non evidenziato**: scoperto leggendo WebPlayerScreen — `isHost={uid === roomData.hostId}` non può mai essere vero perché i player sono chiavati per clientId mentre hostId è l'auth UID. Fix: flag `player.isHost` scritto a createRoom. Allineata anche la Lobby.
16. **(mid-late) Vincolo regole RTDB scoperto prima di scrivere Lupus**: la whitelist `players/$uid` (`$other: {".validate": false}`, role regex `civilian|impostor|clown`) avrebbe rifiutato i ruoli lupus → deciso in anticipo di tenere tutto in `gameState` (che è `.validate: true`). Stesso motivo per cui Taboo tiene le squadre in gameState.
17. **(late) Audit colori bottoni su domanda dell'utente**: verdetto "semantica ok per i giocatori, troppe varianti nel codice"; `accent === primary` nel tema (stesso hex `#06B6D4`) quindi `accentOutline` è un duplicato concettuale. Cleanup proposto, in attesa di conferma.

## Meccaniche preesistenti da conoscere (non toccate ma rilevanti)

- **Impostore — Pagliaccio (clown)**: terzo ruolo opzionale; conosce la parola ma vince SOLO se viene eliminato lui. `Winner = civilians|impostor|clown`. L'impostore eliminato ha l'ultima chance indovinando la parola (`impostor_guess` phase).
- **Impostore — ballottaggio**: il voto del primo giocatore (`firstPlayerId`, anche destinatario opzionale dell'indizio) vale doppio nel runoff; pareggio persistente → random tra i pari.
- **Indovina — modalità players**: ognuno scrive una parola (max 60 char), distribuzione con permutazione di Sattolo (nessuno riceve la propria); auto-finalize all'ultimo invio. Modalità random può lanciare `NotEnoughWordsError` (code `INDOVINA_NOT_ENOUGH_WORDS`) se il dizionario è esaurito.
- **usedWords per sessione** (impostore/indovina): persistite in gameState, sopravvivono ai tweak settings, resettate SOLO al cambio dizionario (AI/reset) via `reset*UsedWords`.
- **Join a partita in corsa**: `addPlayerToRoom` flagga `waiting:true` se status active; i plugin lo escludono e ogni endGame promuove.
- **Nomi**: unicità case-insensitive nella stanza (`NameTakenError`), max 15 char host/guest, 30 nelle regole DB.

## Flussi UI post-refactor (mappa schermate)

- **Avvio**: Splash (≥1.4s) → MainScreen. Con `?room=` → spinner → WebPlayerScreen (join precompilato se account/`?name=`, auto-rejoin da sessione salvata). Senza → Landing.
- **Landing**: titolo "Pronti a giocare?", card "Crea una stanza" (Button primary lg) / divider "oppure" / card "Unisciti" (Input codice mono 6 char + Button secondary attivo a 6 char + ErrorBanner).
- **Catalogo** (`screen='create'`): "‹ Indietro", intro, GameCard×4 (descrizione completa, non troncata) → Sheet "Nuova partita · {gioco}": nome (NO autofocus) + SettingsPanel + GameRules collassata + footer "Crea Stanza".
- **Lobby host**: header stanza (codice mono grande + icone copia/share/QR), pill "In attesa"/"Impostazioni", lista giocatori (PlayerSlot con isHost da flag, rimozione ×), footer sticky "Avvia Partita" con helper "Servono ancora N giocatori". Sheet impostazioni: gioco corrente statico + "Cambia gioco" → catalogo; SettingsPanel con roomId+roomData; GameRules; footer "Elimina stanza" (dangerOutline). Sheet QR con codice e box alzato.
- **Partita (host)**: AppHeader compact + PlayerGamepad (flex) + HostDashboard (striscia inferiore con label "Host · {gioco}", ProgressCounter, banner "In attesa: nomi", azioni).
- **Header account** (landing+catalogo): icona UserIcon o avatar-iniziale colorato se registrato → AccountSheet.
- **Impostore gamepad**: pre-reveal (MetaCorner stanza/giocatori/pronti + icone pugnale/scudo/maschera + CTA reveal) → ruolo (icona cerchio, WordBox parola/indizio/???, GhostButton Nascondi, banner ultimo eliminato) → voto (CountdownBar + PhaseCard lista PlayerSlot, selezione cyan, progress) → guess impostore (input) → risultati minimal.
- **Indovina gamepad**: collecting (invio parola, progress) → playing (SegmentedControl Nascoste/Visibili, righe blur con long-press reveal, "Rivela parola" warningMuted → conferma → countdown 3 → parola fullscreen ruotata con binary-search font, doppio-tap/Nascondi).

## Key Decisions

- **Ruoli Lupus in `gameState`, non su `players`**: `database.rules.json` valida i campi player con whitelist (role limitato a `civilian|impostor|clown`); `gameState` è `.validate: true`. Evita di toccare le regole. Stesso pattern per teams di Taboo.
- **Identità: clientId per-device in localStorage, MA uid account quando registrato** — auth anonima resta solo per soddisfare `auth != null` nelle regole. `hostId` della stanza resta l'auth UID (regola delete).
- **`getWebBaseUrl()` dinamico** (window.location.origin) al posto di URL prod hardcoded: QR/link puntano sempre all'ambiente dell'host (localhost/staging/prod). Rende quasi inutile `deploy:staging --live`.
- **Timer pattern**: timestamp assoluto su RTDB + `useCountdown` (poll 250ms) + chiusura idempotente dal client designato. MAI countdown server-side.
- **Risultati identici per tutti, minimal, senza dettagli**: richiesto esplicitamente; vale per Impostore, Taboo, Lupus (alba senza ruolo/protezione).
- **Conferme solo per scelte one-shot di ruoli singoli**; i lupi in branco toggleano liberamente a vista.
- **AiDictionaryCard condivisa** con callback `onGenerate(topic)→string|null` / `onReset()`: il null segnala fallback (alert warning). Riusata da impostore/indovina/taboo.
- **Narrator esterno = sentinella `'external'`**, non un uid: cards-only, nessuna console.
- **Pareggi**: Impostore → ballottaggio con voto primo giocatore che vale doppio (logica preesistente conservata); Lupus → ballottaggio semplice, secondo pareggio nessun morto (niente tie-break random, scelta utente).
- **Variant cleanup proposto ma NON eseguito** (l'utente non ha confermato): rimuovere variant Button morte (`danger` pieno? ora usato da... verificare, `warning` pieno, `accent`) e rinominare `accentOutline`→`primaryOutline` (accent === primary nel tema, stesso hex).
- **Splash con durata minima invece che gated sui soli font**: i font spesso caricano in <300ms e la splash era invisibile; 1.4s dà il "beat" da app nativa richiesto. Timeout font a 2.5s resta come failsafe.
- **GameRules inline collassabile, non sheet annidato**: i Modal dentro Modal su native sono fragili; il +/− inline è robusto ovunque.
- **Custom roles trattati come villici dalla logica**: l'alternativa (estendere il type LupusRole a stringhe libere) avrebbe sporcato ogni switch; la mappa parallela `customRoles{uid:nome}` tiene il type system pulito e l'automazione fuori (come voluto).
- **Niente annuncio esito linciaggio in auto-mode**: coerente col principio "nessun dettaglio"; chi è eliminato lo scopre dalla schermata morto. Aperto a revisione (vedi Open Questions).
- **`fetchRoom` one-shot separato da `subscribeToRoom`**: il rientro host non deve aprire una subscription solo per un check.
- **Astensione come valore della stessa mappa votes** (sentinella) e non flag separato: il conteggio "hanno votato" include gli astenuti gratis e il cambio voto↔astensione è un singolo write.

## Evidence & Data

**Evoluzione test suite (tutti `node --experimental-strip-types --test`):**

| Momento | Tests | Note |
|---|---|---|
| Inizio sessione | 61 | core/impostore/indovina esistenti |
| + Taboo v1 | 70 | 9 test tabooPure |
| + buildTeams | 74 | squadre manuali |
| + Lupus v1 | 88 | 14 test lupusPure |
| + medium/bocca | 90 | resolveNightDeaths |
| Lupus redesign finale | **96** | 22 test lupusPure (unanimità, ABSTAIN, runoff, difese) |

**Catalogo giochi (stato finale):**

| Gioco | id | min | Meccanica timer | File logica pura |
|---|---|---|---|---|
| Impostore | `impostore` | 3 | votingSeconds 60 | impostoreVotePure, impostoreWordPure |
| Indovina | `indovina` | 2 | — | indovinaWordPure |
| Taboo | `taboo` | 4 | turnSeconds 60 | tabooPure (splitTeams/buildTeams/nextTurn/applyOutcome) |
| Lupus | `lupus` | 4 | nightSeconds 60 + votingSeconds 90 | lupusPure (unanimousLupoTarget/applyNightDefenses/computeLynchOutcome/lupusWinner/isNightComplete/assignLupusRoles) |

**Uso variant Button (audit fatto per la domanda colori):** primary 7, dangerMuted 4, warningMuted 3, accentOutline 2, success 1, secondary 1, dangerOutline 1; non usati: `warning`, `accent` (e `danger` pieno dopo la rimozione del buzzer Taboo... ricontare prima del cleanup).

**Script npm (stato finale):**

| Script | Cosa fa |
|---|---|
| `npm run web` | dev-host.sh: expo start + host in finestra Chrome 390×800 app-mode |
| `npm run web:browser` | expo start --web classico |
| `npm run dev:multi -- ROOM [N]` | N guest telefono-sized auto-join (cid/name) |
| `npm run build:web` | export + PWA + viewport overlays-content + safe-area CSS |
| `npm run deploy:staging` | typecheck+test+build+canale preview `staging` (7gg); `--live` sovrascrive prod |
| `npm run deploy:prod` | richiede working tree PULITO + push + deploy hosting+rules |

**Impostazioni di default per gioco (getDefaultSettings):**

| Gioco | Default |
|---|---|
| Impostore | numImpostors 1, numClowns 0, **hintEnabled true**, hintOnlyFirst false, votingSeconds 60 |
| Indovina | wordSource 'random' |
| Taboo | turnSeconds 60, turnsPerTeam 3, maxSkips 3, teamMode 'auto', manualTeams null |
| Lupus | numLupi 1, veggente ON, guardia ON, medium OFF, bocca OFF, votingSeconds 90, nightSeconds 60, narratorEnabled false, narratorUid null, customRoles [] |

**Range NumberSelector usati:** numImpostors min 1; numClowns min 0; votingSeconds 15-300 step 15 (Impostore) / 30-300 step 15 (Lupus); nightSeconds 30-300 step 15; turnSeconds 30-180 step 15; turnsPerTeam 1-10; maxSkips 0-10; numLupi 1-4.

**Componenti core/ui nuovi (inventario con scopo):**

| Componente | Scopo |
|---|---|
| `WordBox` | parola grande auto-fit con label, toni |
| `StatusCard` | stato centrato (attesa/eliminato/morto/caricamento) |
| `NoticeBanner` | banner tinta+badge (es. giocatori in attesa) |
| `HostDashboardShell` | chrome comune dashboard host (label, status slot, banner waiting, footer azioni) |
| `GhostButton` | azione secondaria pill su surfaceAlt (Nascondi, Annulla) |
| `MetaCorner` | MetadataBadge assoluto negli angoli (stanza/giocatori/pronti) |
| `SegmentedControl<T>` | segmenti equal-width, con/ senza descrizione |
| `CountdownBar` | secondi grandi + barra, vira ambra ≤20s e rossa ≤10s |
| `GameRules` | sezione Regole collassabile (+/−) negli sheet |
| `icons.tsx` | 8 icone SVG monocrome condivise |
| `AiDictionaryCard` (components) | card "Tema personalizzato" AI condivisa, callback onGenerate/onReset |

**Mappa errori auth (authService, messaggi italiani):** invalid-email, email-already-in-use, weak-password (min 6), wrong-password/user-not-found/invalid-credential → "Email o password errati", too-many-requests, popup-closed-by-user, network-request-failed; fallback generico.

**Env override degli script di test:** `BASE_URL` (default http://localhost:8081), `WIN_W`/`WIN_H` (390×800), `NAME_PREFIX` (Giocatore); profili in `${TMPDIR}/gameshub-dev-host` e `gameshub-dev-pN` (cleanup: `rm -rf`).

**`deploy-staging.sh` workflow integrato (preesistente, ora potenziato dall'URL dinamico):** typecheck+test+build, deploy canale, apre Chrome host (profilo isolato) sull'URL del canale, chiede il ROOM id a terminale, apre Chrome guest + Safari guest su `?room=`; con `getWebBaseUrl()` ORA anche il QR in-app punta al canale staging (prima era il motivo d'essere di `--live`). Cleanup profili: `rm -rf $TMPDIR/gameshub-staging-*`.

**URL utili:** prod `https://gameshub-6b1ce.web.app` · guest `?room=ABC123` · dev host `http://localhost:8081` · guest dev multi-tab `http://localhost:8081/?room=X&cid=p2&name=Giocatore2`.

**Fatti deployment accertati in sessione:** canale staging `https://gameshub-6b1ce--staging-*.web.app`, scadenza 7d, riusa lo stesso canale (non accumula ambienti); staging NON deploya le database rules; `deploy:prod` deploya hosting+database e pretende `git status` pulito; lo staging e il dev locale usano il DB di produzione (stanze vere, ripulite dal cron `cleanup.yml` via `updatedAt`).

**Funzioni Gemini (`geminiService.ts`, modello `gemini-2.5-flash`, key da `EXPO_PUBLIC_GEMINI_API_KEY`):**

| Funzione | Output | Usata da | Fallback |
|---|---|---|---|
| `generateWordsForTopic(topic)` | mappa `{parola: indizio-1-parola}` ×20 | Impostore | `usedFallback:true` su JSON vuoto |
| `generateWordsList(topic, 30)` | array stringhe | Indovina | idem |
| `generateTabooCards(topic, 20)` | `[{word, taboo[5]}]`, valida word + ≥3 taboo, slice a 5 | Taboo | idem |

Contratto `AiDictionaryCard.onGenerate`: ritorna messaggio di successo, o `null` per fallback (alert "Attenzione… uso default"); tutte le panel resettano `usedWords` su roomId dopo generate/reset.

**Formato carta Taboo (`data/cards.json`, 81 voci):** `{ "word": "Pizza", "taboo": ["Margherita","Forno","Mozzarella","Napoli","Pomodoro"] }` — italiano, 5 vietate ciascuna.

**Sentinelle / costanti chiave:** `ABSTAIN='abstain'` (lupusPure), `EXTERNAL_NARRATOR='external'` (lupus/types), `MIN_SPLASH_MS=1400` (App.tsx), retry subscribe 2000ms, soglia swipe sheet dy>90||vy>0.6, cid namespacing key `gameshub:clientId[:cid]`, `lastHostedRoom` key `gameshub:lastHostedRoom`.

**Fasi Lupus:** `setup | standby (solo narratore) | night | day | voting | results`. In narrator mode il round parte da 0 e si incrementa a ogni "Avvia notte".

**Ruoli Lupus (label/emoji/colore usati in gamepad e console):**

| Ruolo | Label | Emoji | Colore |
|---|---|---|---|
| lupo | Lupo | 🐺 | roleImpostor `#EF4444` |
| villico | Villico | 🏡 | roleCivilian `#10B981` |
| veggente | Veggente | 🔮 | primaryLight `#22D3EE` |
| guardia | Guardia | 🛡️ | warning `#F59E0B` |
| medium | Medium | 👻 | `#A78BFA` |
| bocca | Bocca di Rosa | 💋 | `#EC4899` |
| custom | (nome libero) | 🎭 | textPrimary |

**Schermata giocatore Lupus per fase (auto mode):**

| Fase | Lupo | Veggente | Guardia | Bocca | Medium | Villico/custom | Morto |
|---|---|---|---|---|---|---|---|
| (gate) | "Scopri il tuo ruolo" una volta per round, poi badge persistente in alto | ← idem | ← | ← | ← | ← | — |
| night | lista bersagli non-lupi con picks del branco a vista, countdown | pick con conferma → carta "Visione" col ruolo | pick (anche self) con conferma → "Protezione attiva" | pick (non self) con conferma → "Notte fuori casa" | lista morti con ruoli (o "Nessun defunto") | StatusCard "Il villaggio dorme" 🌙 | StatusCard "Sei morto" 🪦 |
| day | PhaseCard "L'alba": solo nomi morti o "Nessuna vittima"; medium vede anche i ruoli dei morti sotto | ← | ← | ← | ←+lista | ← | ← |
| voting | lista vivi (no self) + "Astieniti" + countdown + cambio voto | ← | ← | ← | ← | ← | StatusCard |
| results | Vincono i Lupi/Vince il Villaggio + "I lupi erano: …" — identica per tutti |

**Schermata giocatore Taboo per fase:**

| Fase | Descrittore | Compagni | Avversari |
|---|---|---|---|
| ready | "Inizia il turno (Ns)" + istruzioni | "Preparati a indovinare" | "Vedrai la sua carta: segnala a voce" |
| turn | carta + Indovinata!/Passa(n)/Tabù + ↩ Annulla in alto + timer | "INDOVINA!" gigante + timer + score | carta + hint arbitro (NESSUN bottone) + timer |
| results | "Vince la Squadra X"/Pareggio + scoreboard — identica per tutti |

**Commit pre-sessione (per riferimento, il lavoro NON è sopra nessun branch dedicato):**

| Hash | Messaggio |
|---|---|
| 4e93ebc | modifiche ui (HEAD attuale) |
| efa8164 | modifiche ui |
| 906d3ff | risoluzione bug |
| 859624d | ulteriori modifiche ux |
| 0fde86c | fix(cleanup): base64 service account secret |

**Inventario test (96 totali):**

| File | Test |
|---|---|
| tests/core/playerSelection.test.ts + sessionStorage.test.ts | preesistenti |
| tests/impostore/{voteOutcome,roleService,wordPure}.test.ts | preesistenti (voteOutcome copre già voti parziali) |
| tests/indovina/{sessionSimulation,wordService}.test.ts | preesistenti |
| tests/taboo/tabooPure.test.ts | 13 (shuffle, splitTeams×2, buildTeams×4, teamForTurn, describer, nextTurn×2, applyOutcome, winner) |
| tests/lupus/lupusPure.test.ts | 22 (assign×2, unanimous×4, defenses×6, lynch×6, winner×3, nightComplete) |

**RTDB paths Lupus (gameState):** `roles{uid:role}`, `alive{uid:bool}`, `night{lupoVotes{},protectTarget,protectDone,seerTarget,seerDone,boccaTarget,boccaDone}`, `nightEndsAt`, `lastNight{victims[],round}`, `votes{}`, `votingEndsAt`, `runoffCandidates[]`, `lastLynch{uid,role,round}`, `lastNightReport`, `lastVoteReport{votes,round}`, `winner`, `narratorUid`, `customRoles{uid:string}`, `customRolesList[]`.

## API delle logiche di gioco (superficie esportata, per orientarsi)

**`impostoreLogic.ts`:** initImpostoreGame(roomId, numImpostors, numClowns, hintEnabled, hintOnlyFirst, votingSeconds=60) · resetImpostoreUsedWords · startImpostoreGame · endImpostoreGame · markPlayerAsRevealed · startVoting (setta votingEndsAt) · castVote (overwrite + auto-evaluate) · **closeVotingByTimeout** (nuova) · submitImpostorGuess · updateImpostoreSettings(+votingSeconds).

**`indovinaLogic.ts`** (invariata): initIndovinaGame · resetIndovinaUsedWords · startIndovinaGame · submitPlayerWord (auto-finalize) · finalizeCollecting (Sattolo, nessuno riceve la propria) · endIndovinaGame.

**`tabooLogic.ts`:** initTabooGame · startTabooGame (buildTeams + validazione min 2 + deck shuffle) · beginTabooTurn · resolveTabooCard(outcome: correct|skip|taboo; guard maxSkips; scrive lastAction) · **undoTabooCard** · endTabooTurn (rotazione via nextTurn pure) · endTabooGame.

**`lupusLogic.ts`:** initLupusGame · startLupusGame (narratore in-room escluso; external incluso nei giocatori? NO: external non è un uid quindi nessuno escluso; validazioni min/specials; phase night|standby) · submitLupoVote/submitProtect/submitSeer/submitBoccaVisit (tutte → maybeResolveNightEarly) · closeNightByTimeout · startLynchVoting · castLupusVote(uid|ABSTAIN) · closeLupusVoting (eliminate/runoff/nolynch) · narratorStartNightPoll/narratorCloseNightPoll/narratorStartVotePoll/narratorCloseVotePoll · narratorSetAlive (NO win check) · endLupusGame. Helper interni: readGameState, hasNarrator, findAliveByRole, nightProgressOf, resolveNightNow.

**Pure (testate):** `tabooPure`: shuffleArray, splitTeams, buildTeams, teamForTurn, describerForTurn, nextTurn, applyOutcome, winnerFromScores. `lupusPure`: ABSTAIN, assignLupusRoles, unanimousLupoTarget, applyNightDefenses, computeLynchOutcome, lupusWinner, isNightComplete(NightProgress).

## Gotchas tecnici (costati tempo o non ovvi)

- **Node strip-types**: i test girano con `node --experimental-strip-types --test tests/**/*.test.ts`; qualunque import che tira dentro `react-native` o JSON nei moduli testati ESPLODE. Da qui la disciplina `*Pure.ts`.
- **RTDB multi-path `update()`**: path sovrapposti (padre+figlio nello stesso update) vengono RIFIUTATI da Firebase. Già morso una volta (customRolesList).
- **RTDB e contenitori vuoti**: array/oggetti vuoti diventano `null` alla lettura — tutti i consumer usano `?? []`/`?? {}` e `victims: deaths.length > 0 ? deaths : null` in scrittura.
- **Check vita narratore**: il narratore NON è nella mappa `alive` → i guard devono usare `alive[uid] !== true` (strict), non `!== false`, o il narratore passerebbe.
- **`open -na "Google Chrome" --args`**: i flag finestra (`--window-size/--window-position/--app`) sono onorati SOLO per istanze nuove con `--user-data-dir` dedicato; con Chrome già aperto sul profilo default vengono ignorati.
- **`sed -i ''`** (macOS BSD) usato in build-web.sh — non portabile su Linux senza modifica.
- **`expo start` senza `--web`** serve comunque il bundle web su :8081 e NON apre il browser → è il trucco di dev-host.sh. Porta occupata se un altro dev server gira.
- **Animated + drag**: lo sheet compone due translateY (slide apertura + dragY del gesto); resettare dragY quando `visible` torna true o il prossimo open parte traslato.
- **iOS emoji**: ✝ (e simili) vengono renderizzati emoji colorati; i glifi d'interfaccia devono essere SVG. Anche `interactive-widget` è ignorato da iOS Safari.
- **PanResponder vs ScrollView**: il drag-to-dismiss vive SOLO su handle+header; metterlo sull'intero sheet ucciderebbe lo scroll del contenuto.
- **PhaseCard `tone`**: neutral|cyan|warning|danger|success — usato come linguaggio dei toni in tutte le fasi di gioco.
- **`?cid=` + account registrato**: l'identità account (uid) BYPASSA il namespacing per-tab — i test multi-tab vanno fatti da ospiti anonimi.
- **Sheet dentro Sheet evitato**: GameRules è un collassabile inline perché i Modal annidati su native sono fragili.

## Code Analysis

- `GamePlugin` contract: `{id,name,description,rules,icon,minPlayers,maxPlayers, SettingsPanel,HostDashboard,PlayerGamepad, initGameState(roomId,settings),startGame(roomId),getDefaultSettings()}` — registrazione manuale in gameRegistry.
- `touchRoom(roomId, updates)` wrappa OGNI mutazione (bumpa `updatedAt` per il cleanup job GitHub Actions). Multi-path update: MAI path sovrapposti.
- `subscribeToRoom` ora: attach → onValue(cb, errCb{detach; retry 2s}) → unsubscribe per-listener; `cancelled` flag + clearTimeout.
- Settings flow lobby: ogni `onSettingsChange` chiama `plugin.initGameState(roomId, settings)` → lo stato si RESETTA a setup con i nuovi valori (per questo i settings panel devono sempre spalmare l'intero oggetto in `update()`).
- I gamepad ricevono `roomData` completo: TUTTI i ruoli/parole sono leggibili da ogni client (trust del party game, nessuna privacy server-side). Il veggente legge il ruolo del target localmente da `roles`.
- `filterActivePlayerUids` esclude i `waiting:true` (join a partita in corso); ogni `endGame` li promuove (`waiting:null`).
- Pattern "pure file" obbligatorio per i test: niente import JSON/firebase nei `*Pure.ts` (il loader strip-types di Node non regge).
- **Macchina a stati Lupus AUTO**: startGame→night(nightEndsAt)→[submit* → maybeResolveNightEarly se isNightComplete | closeNightByTimeout da host]→resolveNightNow(applyNightDefenses su unanimousLupoTarget; morti su alive; win check)→day→startLynchVoting(host)→voting(votingEndsAt)→[castLupusVote auto-chiude se tutti | closeLupusVoting da host a timeout]→eliminate/runoff/nolynch→night(round+1, nuovo nightEndsAt) o results.
- **Macchina a stati Lupus NARRATORE**: startGame→standby(round 0)→[narratorStartNightPoll→night(round+1)→chiusura manuale/timer/completa→standby+lastNightReport] e [narratorStartVotePoll→voting→chiusura manuale/timer→standby+lastVoteReport]; `hasNarrator()` corto-circuita OGNI risoluzione automatica (closeLupusVoting, closeNightByTimeout, auto-close su tutti-votato); morti SOLO via narratorSetAlive (senza win check); EXTERNAL → standby permanente.
- **Taboo flow**: ready→beginTabooTurn(describer, turnEndsAt, lastAction null)→turn→resolveTabooCard('correct'|'skip'|'taboo'; skip bloccato a maxSkips; scrive lastAction)→undoTabooCard (singolo livello, inverte score/stats/cursor)→endTabooTurn (timer dal describer con endedRef, o host) → nextTurn pure → ready/results. Deck wrappa a esaurimento (`cursor % deck.length`).
- **Impostore voting**: castVote sovrascrive (cambio voto); auto-evaluate quando votesCast ≥ vivi; closeVotingByTimeout valuta i parziali, 0 voti → playing; runoff resetta votes + nuovo votingEndsAt; finalizeElimination/endGame azzerano votingEndsAt.
- **Sessione/identità**: `makeSessionStore(adapter)` con chiavi `gameshub:clientId`, `gameshub:roomSession:{roomId}` (nome per auto-rejoin), `gameshub:lastHostedRoom`; web adapter namespacea con `?cid=` (sanificato `[a-zA-Z0-9_-]`, max 32). `identityId` in MainScreen = `isRegistered && uid ? uid : clientId`; tutte le prop a valle (`hostId`, `clientId`, `playerId`) ricevono identityId.
- **Host re-entry effect** (MainScreen): dipende solo da `identityId`, salta se `?room` in URL (path guest), `fetchRoom` one-shot, verifica `players[identity].isHost`, altrimenti pulisce la chiave.
- **AccountSheet**: `run(fn)` wrapper per busy/error; dopo register mostra notice e NON chiude (così l'utente legge dell'email di verifica); dopo login chiude; logout → onAuthStateChanged(null) → signInAnonymously automatico nel hook.
- **Sheet, doppia implementazione**: su web renderizza via `createPortal` su `document.body` (backdrop e sheet fixed, contenitore `100dvh`, `maxHeight` in dvh) — niente catena di flex parent; su native usa Modal + KeyboardAvoidingView (iOS padding). Il drag-to-dismiss è condiviso.
- **WebPlayerScreen auto-rejoin**: ref `attemptedAutoRejoin` (one-shot); ordine: già in stanza → hasJoined; altrimenti nome salvato in roomSession O `?name=` → addPlayerToRoom (NameTakenError → banner con invito a cambiare nome); il flusso "rimosso dall'host" resetta hasJoined+nome e cancella la roomSession.
- **Avatar**: `avatarColor(uid)` hash su palette di 8 colori, `avatarInitial(name)`; usati ovunque (PlayerSlot, chips squadre, header account).
- **Cleanup stanze**: GitHub Action `cleanup.yml` esegue `scripts/cleanup-stale-rooms.js` con service account base64; criterio = `updatedAt` stantio, motivo per cui OGNI write passa da `touchRoom`.
- **createRoom**: `hostId = auth UID` (regola delete `auth.uid === hostId`), record player chiavato per clientId/identityId con `isHost: true`; `generateRoomId()` 6 char A-Z0-9.
- **`resetPlayersToCore(roomId)`**: usato al cambio gioco in lobby per spogliare i player dei campi specifici (role, word…), tenendo joinedAt/name/isHost.

## Files Changed

### Core nuovo (untracked)
- `src/core/ui/`: WordBox, StatusCard, NoticeBanner, HostDashboardShell, GhostButton, MetaCorner, SegmentedControl, CountdownBar, GameRules, icons.tsx
- `src/core/components/`: LandingScreen, AccountSheet, AiDictionaryCard
- `src/core/hooks/`: useAuthUser, useCountdown, useKeepScreenAwake
- `src/core/services/authService.ts`, `src/core/utils/text.ts`, `src/core/utils/webBaseUrl.ts`
- `scripts/dev-host.sh`, `scripts/dev-multi.sh`
- `plans/handoffs/` (questo file)

### Giochi nuovi (untracked)
- `src/games/taboo/`: index, types, data/cards.json (81 carte), services/{tabooPure,tabooLogic,tabooCardService}, components/{TabooSettingsPanel,TabooHostDashboard,TabooPlayerGamepad}
- `src/games/lupus/`: index, types, services/{lupusPure,lupusLogic}, components/{LupusSettingsPanel,LupusHostDashboard,LupusPlayerGamepad,LupusNarratorView}
- `tests/taboo/tabooPure.test.ts` (13), `tests/lupus/lupusPure.test.ts` (22)

### Modificati (tracked)
- `App.tsx` (min splash), `package.json` (script), `scripts/build-web.sh` (viewport+safe-area-bottom), `DOCUMENTAZIONE.md` (riscritta)
- `src/screens/MainScreen.tsx` (landing/auth/identity/host-restore/account header) — +199 righe
- `src/core/components/{HomeScreen,LobbyScreen,WebPlayerScreen}.tsx`, `src/core/gameRegistry.ts`, `src/core/types/gamePlugin.ts`
- `src/core/services/{roomService,sessionStorage,sessionStoragePure,geminiService}.ts`
- `src/core/ui/{theme,index,Button,Input,NumberSelector,PlayerSlot,GameCard,Sheet,SplashScreen}.tsx`
- `src/games/impostore/*` (gamepad/dashboard/settings/logic/types/index), `src/games/indovina/*`

### Cancellati
- `src/core/components/GamePickerModal.tsx`, `src/games/impostore/components/ImpostoreWrapper.tsx`, `src/core/hooks/useAnonymousAuth.ts` (dead code / sostituiti)

### Dettaglio modifiche per file tracked (cosa e perché)
- `App.tsx` — splash con `MIN_SPLASH_MS=1400`: `fontsReady && minSplashElapsed` prima di MainScreen.
- `package.json` — script `web` → dev-host.sh, nuovo `web:browser`, nuovo `dev:multi`.
- `scripts/build-web.sh` — sed viewport `interactive-widget=overlays-content` + `padding-bottom: env(safe-area-inset-bottom)` su body.
- `src/screens/MainScreen.tsx` — useAuthUser al posto di useAnonymousAuth; `identityId`; stato `screen: landing|create`; `accountOpen`+AccountSheet+avatar header; `handleJoinByCode`; URL sync `?room`; stanza-sparita → landing con errore + clear lastHostedRoom; effetto rientro host; prefill hostName da displayName.
- `src/core/components/HomeScreen.tsx` — GameRules nello sheet, `onBack`, autoFocus rimosso.
- `src/core/components/LobbyScreen.tsx` — getWebBaseUrl, GameRules, picker collassato (`showGamePicker`, reset alla chiusura sheet), `roomData` ai SettingsPanel, `player.isHost`, stickyFooter+qrBox alzati.
- `src/core/components/WebPlayerScreen.tsx` — `defaultName` (nickname account), `?name=` auto-join, effetto "rimosso dall'host" (reset+banner+clearRoomSession), `player.isHost`, autoFocus rimosso.
- `src/core/services/roomService.ts` — subscribeToRoom con error-retry e unsubscribe per-listener; `fetchRoom()` one-shot; import `off` rimosso.
- `src/core/services/sessionStorage(.Pure).ts` — namespacing `?cid=`; API lastHostedRoom (get/set/clear).
- `src/core/services/geminiService.ts` — `generateTabooCards(topic, count)` con validazione carte (word + ≥3 taboo, slice 5).
- `src/core/types/gamePlugin.ts` — `rules` obbligatoria; `roomData?` nei SettingsPanelProps.
- `src/core/ui/theme.ts` — colori team. `Sheet.tsx` — drag-to-dismiss. `SplashScreen.tsx` — redesign. `Input.tsx` — secureTextEntry/keyboardType/autoCapitalize. `PlayerSlot.tsx` — subtitle. `GameCard.tsx` — onPress opzionale, descrizione non troncata. `Button/NumberSelector` — fonts del tema.
- `src/games/impostore/*` — votingSeconds end-to-end (types→logic→panel→index), gamepad rifatto su componenti core, risultati minimal con nomi vincitori, closeVotingByTimeout + effetto host, hint default ON, descrizione corta, rules.
- `src/games/indovina/*` — gamepad/panel su componenti core, descrizione corta, rules.

## User Feedback & Preferences (REQUIRED — never omit)

- "ti lascio la libertà di decidere come" — delega ampia sul design, MA poi corregge con precisione: aspettarsi iterazioni.
- Nome prodotto: **gamesHub** in ogni copy (memoria persistente).
- Tabù: "deve poter essere SOLO il giocatore che ha la carta… per non confondere troppo" (3ª iterazione, definitiva).
- Risultati: "ui più pulita e minimal… leva HAI VINTO/PERSO… la schermata finale sia sempre uguale per tutti".
- Lupus morte: "non dire se è stata protetta e non dare dettagli sulla morte".
- Narratore: "è LUI a gestire interamente la logica… il telefono si limita a dire gli eventi accaduti… la scelta finale su chi far fuori è sua" — non reintrodurre automatismi in narrator mode.
- "per tutti i ruoli singoli chiedi conferma… per i lupi se sono due no".
- Astensione e ballottaggio richiesti esplicitamente (voto di giorno).
- Descrizioni giochi: "brevi anche se non esaustive, tanto le regole sono scritte dopo" + stessa lunghezza per card uniformi; le meccaniche NON vanno nei settings panel ("deve essere tutto descritto solo nelle regole").
- Emoji: NON gradite sui bottoni (rimosse da Avvia notte/voto); icone devono essere minimal/monocrome (problema ✝ iOS).
- Tastiera: mai auto-aprire (autoFocus rimosso); lo sheet non deve muoversi con la tastiera.
- "alza il fondo dell'app di qualche millimetro" — gusto per spaziature respirabili in basso; poi "sposta anche il qrcode qualche millimetro più in alto come hai fatto con i bottoni" (pattern: quando approva un trattamento lo vuole esteso ovunque sia coerente).
- "leva la luce blu che si vede dietro il logo e rimpicciolisci la scritta sotto gameshub" — gusto sobrio anche sulla splash.
- "magari aggiungi anche la schermata di avvio che hanno le app con logo e nome" — apprezza i tocchi da app nativa.
- Indizi Impostore ON di default.
- Vuole poter testare "senza avere 5 cellulari": tooling di sviluppo multiplayer è un requisito di prima classe, non un nice-to-have.
- "npm run web non è uno script mio ma è di npm di default no?" — non dare per scontata la conoscenza del setup: spiegare cosa fanno gli script quando si toccano.
- Sul freeze: "riesci a capire perché?" — si fida della diagnosi ma la vuole motivata.
- Processo: "chain tool calls during approved multi-step implementations; no per-step recap" (memoria) — lavorare a lotti, riepilogo solo alla fine.
- Manda spesso messaggi DURANTE il lavoro con nuove richieste o correzioni: vanno incorporate nel batch corrente, non ignorate né rimandate.
- "se tutti i giocatori hanno scelto e confermato allora la notte finisce anche prima della scadenza" — le chiusure anticipate sono attese ovunque ci sia un timer.
- "il narratore esterno può utilizzare il pool per la votazione (sceglie lui se attivarla)" — i sondaggi sono strumenti opzionali, mai obbligatori.
- "con il narratore esterno l'host all'avvio sceglie un narratore (che può essere anche lui stesso)" + "totalmente esterno, senza che sia presente in lobby" — entrambe le varianti devono esistere.
- Vuole risposte con spiegazioni concrete quando chiede "perché/come" (build vs deploy, emulatori, clientId): apprezza il contesto tecnico in italiano semplice.
- Sicurezza deploy: ha verificato due volte che build/staging non tocchino la produzione prima di procedere.
- Ha accettato senza obiezioni che `?cid=`/`?name=` funzionino anche in prod dopo spiegazione onesta dei rischi (ma il gate non-prod resta offerto).

## Conoscenza di dominio acquisita (Q&A col proprietario)

- **gamesHub modello a stanza**: l'host crea la stanza dal suo device e GIOCA anche lui (MainScreen rende gamepad+dashboard insieme); i guest entrano via `?room=` (QR/link/codice landing). Una sola web app per entrambi i ruoli, routing a runtime.
- **Il QR è generato dalla Lobby** con `getWebBaseUrl()` — prima di questa sessione puntava sempre a prod, rendendo impossibile testare guest su staging/localhost via QR (motivo storico del flag `--live`).
- **Identità**: localStorage per browser-profile ⇒ due tab = stesso giocatore (da qui `?cid=` e i profili Chrome isolati negli script).
- **Bocca di Rosa non è una carta ufficiale** di Lupus in Tabula: è il nome popolare della variante "prostituta". Fonti usate: lupiilgioco.blogspot.com/2011/12/ruoli.html, scribd Personaggi-Lupus-in-Tabula, goblins.net varianti.
- **Ruoli ufficiali citati nelle fonti** (per future espansioni): Medium, Massone, Indemoniato, Criceto Mannaro, Cacciatore, Angelo Custode, Cappuccetto Rosso, Scemo del Villaggio, ecc.

## Where We're Going

1. **Commit** del lavoro (enorme, valutare se spezzare: core/ui+refactor, taboo, landing+auth+tooling, lupus) — `deploy:prod` RIFIUTA working tree sporco.
2. **Firebase console**: abilitare provider **Google** e **Email/Password** (Authentication → Sign-in method), altrimenti AccountSheet fallisce a runtime.
3. **`npm run build:web`** fresca (l'ultima build non include gli ultimissimi fix) → **`npm run deploy:staging`** → test E2E.
4. Possibile cleanup variant Button (proposto, non confermato dall'utente).
5. Valutare deploy prod quando lo staging convince.

### Idee future emerse ma non richieste (non impegnative)

- Annuncio esito linciaggio in auto-mode Lupus (vedi Open Questions).
- Ruoli Lupus aggiuntivi dalle fonti (Massone, Cacciatore, Indemoniato, Criceto Mannaro…) — l'infrastruttura ruoli+notte li accoglie facilmente.
- Generazione AI per carte/ruoli Lupus (pattern AiDictionaryCard già pronto).
- Persistenza punteggi tra partite / classifiche per account registrati (ora c'è l'identità stabile per farlo).
- Gate non-prod per gli hook `?cid=`/`?name=`.

### Checklist E2E suggerita per lo staging (mai eseguita)

- [ ] Landing: join con codice valido/invalido/stanza chiusa (errore al posto dello spinner); refresh dopo join manuale rientra.
- [ ] Auth: registrazione email (arriva la mail di verifica?), login, Google popup, logout→ospite, nickname precompilato host e guest, identità stabile cambiando device.
- [ ] Rientro host: chiudi tab host a partita in corso → riapri → sei dentro; elimina stanza → la chiave si pulisce.
- [ ] Sheet: swipe-down chiude; tastiera non muove la tendina (build!); niente tastiera auto all'apertura gioco.
- [ ] Impostore: timer voto, cambio voto, timeout con voti parziali, 0 voti → ritorno al gioco, ballottaggio, risultati con nomi+parola.
- [ ] Taboo: squadre manuali con validazione min 2, undo (anche su buzz errato), passi esauriti, fine turno da timer del descrittore E fallback host.
- [ ] Lupus auto: notte a timeout con lupi in disaccordo (nessun morto), unanimità chiude in anticipo, bocca entrambe le casistiche, astensioni, ballottaggio, secondo pareggio.
- [ ] Lupus narratore in stanza: sondaggi aperti/chiusi (manuale, timer, tutti-pronti), report nominativi, ✝/↺, custom roles assegnati.
- [ ] Lupus narratore esterno: tutti vedono solo la carta, dashboard host solo Termina.
- [ ] Guest rimosso dall'host → torna al join con banner, refresh NON rientra.
- [ ] QR da telefono fisico su staging → apre il canale staging (non prod).

## Risks & Blockers

- **Tutto non committato su `main`**: un reset/checkout distruggerebbe la sessione. Prima azione: commit.
- **Provider auth non abilitati in console** (fuori dal controllo del codice): Authentication → Sign-in method → abilitare Google (serve il support email) ed Email/Password. Senza, `signInWithPopup`/`createUser` falliscono con `auth/operation-not-allowed` (non mappato → messaggio generico).
- **Lupus narrator/poll flow mai testato end-to-end multi-client** (solo typecheck+unit). Punti delicati: chiusure idempotenti concorrenti (narratore manuale + suo timer effect nello stesso device), `runoffCandidates` su client con stato vecchio, round counter narrator (parte da 0), early-close del sondaggio notturno che richiede unanimità lupi (con lupi che non convergono il poll chiude SOLO a timer/manuale — comportamento voluto ma da spiegare al narratore?).
- **Race non transazionali accettate** (read-then-write su RTDB): doppio buzz Taboo, voto contemporaneo — stesso pattern del codice preesistente, rischio basso per party game.
- `?cid=`/`?name=` attivi anche in prod (scelta consapevole; gate non-prod offerto e mai richiesto).
- Lo sheet con tastiera è risolto SOLO nella build (viewport meta iniettato da build-web.sh) — in dev (`npm run web`) il comportamento keyboard può ancora differire.
- **Stanze pre-esistenti su RTDB** con vecchio schema gameState (es. lupus v1 con `lastNight.victimUid` singolare) potrebbero esistere in prod: i client nuovi leggono `victims` e ignorano il resto; il cleanup cron le spazzerà.
- `git status` mostra anche `.firebase/hosting.*.cache` e `.DS_Store` modificati: rumore da escludere nel commit (valutare .gitignore).

## Open Questions

- Spezzare il commit o monolitico? (preferenza utente non chiesta)
- Cleanup variant Button: procedere? (audit fatto, decisione in sospeso)
- Lupus: serve un annuncio esplicito dell'esito del linciaggio in auto-mode? (oggi: l'eliminato scopre morendo; coerente col "no dettagli" ma non confermato)
- Lupus narratore in-room: serve che possa anche RIENTRARE come giocatore senza ricreare la stanza? (oggi: il narratore resta narratore fino a Termina)
- Email di verifica: va resa BLOCCANTE per qualcosa? (oggi è solo informativa: si gioca anche senza verificare)
- Gate non-prod per `?cid=`/`?name=`: l'utente non l'ha chiesto, ma resta sul tavolo.
- Il file aperto nell'IDE a fine sessione era `~/Downloads/SKILL.md` — probabilmente sta esplorando il sistema skills, non c'entra col progetto.

## Quick Start for Next Session

```bash
# Stato
git status -s | head -40 && git log --oneline -3

# Riferimento progetto (aggiornato in questa sessione)
# DOCUMENTAZIONE.md

# File chiave da leggere per primi
# src/core/gameRegistry.ts                      ← catalogo
# src/core/types/gamePlugin.ts                  ← contratto plugin
# src/games/lupus/services/lupusLogic.ts        ← macchina a stati lupus (auto vs narratore)
# src/games/lupus/components/LupusNarratorView.tsx
# src/screens/MainScreen.tsx                    ← routing/identità/auth

# Verifica
npm run typecheck && npm test     # atteso: 96/96
npm run build:web                  # rigenerare prima di QUALSIASI deploy
                                   # (l'ultima build in dist/ è leggermente indietro)

# Test mirati
node --experimental-strip-types --no-warnings --test tests/lupus/lupusPure.test.ts   # 22
node --experimental-strip-types --no-warnings --test tests/taboo/tabooPure.test.ts   # 13

# Test multiplayer locale
npm run web                        # host in finestra telefono
npm run dev:multi -- <ROOM> 4      # 4 guest auto-join

# Console Firebase (manuale, fuori dal codice):
#   https://console.firebase.google.com/project/gameshub-6b1ce/authentication/providers
#   → abilitare "Google" (con support email) e "Email/Password"

# PROSSIMA AZIONE: committare il lavoro (escludendo .firebase/*.cache e
# .DS_Store), abilitare i provider auth in Firebase console, rifare
# build:web e deploy:staging per il primo test E2E della checklist.
```
