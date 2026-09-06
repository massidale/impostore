# Sei nuovi party game — registro di implementazione

Piano: [nuovi giochi](../superpowers/plans/2026-09-06-new-games.md).
Base pubblicata: `28df368`. Ramo: `codex/six-party-games`.

L’utente ha autorizzato l’implementazione parallela dei sei giochi. Tre agenti hanno
lavorato ciascuno su due giochi; il coordinatore ha curato contratti condivisi,
registri, integrazione e collaudo. Il ramo usa il workspace esistente per conservare
le dipendenze installate ed evitare blocchi del filesystem sincronizzato.

## Implementazione completata

- **Che domanda?** Due domande correlate, risposte numeriche private, discussione,
  voto, ballottaggio ed espulsioni. Dominio numerico e precisione validati sul server.
- **Wavelength.** Un solo numero comune 1–10 per tutti tranne l’indovino, interlocutori
  ordinati, un tentativo, punteggi e rotazione completa con storico dei turni.
- **Just One.** Raccolta privata, eliminazione di tutti gli indizi duplicati,
  revisione con segnalazioni distinte, un tentativo o passaggio, punteggio cooperativo.
- **Herd Mentality.** Risposte private, raggruppamento normalizzato, unione/annullamento
  dei gruppi da parte dell’host e punti alla pluralità unica; parità senza punti.
- **Top Ten.** Numeri distinti, interpretazioni a turno, riordinamento di tutti i
  partecipanti da parte del capitano e punteggio cooperativo.
- **Time’s Up.** Due squadre, stesso mazzo in tre round, timer server, carte private,
  passaggio/violazione/annullamento, contenuti predefiniti o contributi dei giocatori.
- Tutti hanno impostazioni, regole, contenuti italiani, contenuti personalizzati,
  viste host/giocatore/spettatore, risultati e ritorno alla lobby.
- Il catalogo contiene nove giochi. Lupus resta nel codice e non è raggiungibile.

## Contratti e correzioni comuni

- Dispatcher modulare con autorizzazione, partecipanti congelati, token di partita,
  round e fase; versione della carta per le azioni sequenziali di Time’s Up.
- Viste costruite per allowlist; nessun accesso speciale dell’host ai segreti.
- Carte misurate e ridimensionate con FitContent; liste e comandi scorrono a
  dimensione naturale. Testi lunghi a capo.
- Pulsanti condivisi con ruolo e stato accessibili espliciti, verificati anche tramite
  i selettori semantici del browser.
- Stato autorevole salvato come JSON privato: RTDB eliminava raccolte vuote e
  rompeva le azioni successive. Il decoder legge anche le stanze a oggetto precedenti;
  viste pubbliche/private e pulizia delle stanze restano compatibili.
- Corrette la visualizzazione della parità Herd quando Firebase omette `winners: []`,
  la validazione dei domini numerici impossibili, i retry delle azioni e i riavvii.

## Verifiche eseguite

- `npm test`: **173 test superati**, nessun fallimento.
- `npm run typecheck`, `npm run build:server`, `npm run build:web`: superati.
- `npm run test:integration`: **7 scenari completi superati** con Auth, Functions e
  Realtime Database reali negli emulatori (uno esistente e uno per ciascun nuovo gioco).
  Inclusi segreti per ruolo, richieste duplicate/obsolete, concorrenza, ingressi tardivi,
  conclusione e riavvio delle partite.
- Revisione indipendente dei moduli e delle correzioni di serializzazione: nessun
  problema concreto rimasto dopo le correzioni; regressioni coperte dai test.
- Browser Chromium: **858 fixture × 6 viewport = 5.148 scenari**, nessun crash.
  Sette misure iniziali erano state prese prima del completamento della misurazione
  della carta invisibile: ricontrollate dopo il rendering, tutte superate.
- Browser Chromium: **984 verifiche aggiuntive** con testi senza spazi ai limiti,
  tutte le fasi e viste host/giocatore/spettatore; nessun overflow o carta fuori area.
  Viewport: 320×480, 320×568, 390×844, 667×375, 844×390 e 1280×800.
- Invio dei sei comandi principali dalla UI verificato nel browser; rotazione
  a componente montato e pulsanti di almeno 44 px verificati.
- Fixture riproducibili: `node --experimental-strip-types tests/ui/newGamesFixtures.ts`.
  Generazione tramite motori/proiezioni reali, controllo di determinismo e simulazione
  delle raccolte vuote rimosse da Firebase nelle viste.

## Scostamenti dal piano iniziale e limiti

- Implementazione parallela e commit integrato anziché sei rilasci sequenziali,
  in base all’ultima richiesta dell’utente. Nessun deploy eseguito.
- Dataset JSON riservati al server e suite di integrazione condivisa
  `tests/integration/new-games.test.mjs`, anziché sei file separati.
- Le prove native su dispositivi iOS/Android, inclusa la tastiera di sistema, restano
  da eseguire; il collaudo visivo effettuato riguarda il browser.
- I testi estremi vengono ridotti per mantenere la carta intera: sui viewport più
  piccoli la leggibilità dipende inevitabilmente dalla quantità di contenuto.
