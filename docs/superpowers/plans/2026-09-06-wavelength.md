# Wavelength — numero comune — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rilasciare Wavelength — numero comune come plugin completo e autonomo.

**Architecture:** `wavelengthModule` implementa GameModule della fase 0; client con tre componenti GamePlugin e wrapper roomCommand. Segreti e punti esclusivamente server.

**Tech Stack:** TypeScript, React Native/Expo, Firebase callable + RTDB, node:test ed emulatori esistenti.

**Spec:** [progetto funzionale](../specs/2026-09-06-new-games-design.md), sezione Wavelength; [base e criteri comuni](2026-09-06-new-games.md).

## Vincoli globali

Firebase UID e autorizzazione per fase/ruolo; partecipanti congelati, spettatori dalla partita successiva; nessun segreto alla vista host; carte adattive e controlli almeno 44×44; niente AI per arbitrare; italiano; Lupus resta disabilitato. Le regole e i limiti numerici della sezione corrispondente della spec sono vincolanti per questo piano.

## File e interfacce

- Creare `server/games/wavelength.ts`: modulo `wavelengthModule`, validazione e transizioni server.
- Creare `server/data/wavelength.json`: contenuti originali validati; dati riservati fuori dal bundle UI.
- Creare `src/games/wavelength/types.ts`, `index.ts`, `services/wavelengthLogic.ts`.
- Creare `src/games/wavelength/components/SettingsPanel.tsx`, `HostDashboard.tsx`, `PlayerGamepad.tsx`.
- Creare `tests/server/wavelength.test.ts`, `tests/integration/wavelength.test.mjs`.
- Modificare `server/gameModules.ts`; al rilascio modificare `src/core/gameRegistry.ts`, `DOCUMENTAZIONE.md` e includere il nuovo file di integrazione nello script `test:integration`.

**Consuma:** `GameModule`, `getGameModule`, `RoundExpected`, `roomCommand(roomId, method, [payload])`, `FitContent`, `useGameAction`, `HostDashboardShell`, `loadServer` dalla fase 0.

**Produce:** `wavelengthModule: GameModule`, plugin con ID `wavelength`, impostazioni `{ cycles: number }` e funzioni pure `scoreGuess(target: number, guess: number): number`. I helper sono esportati dal modulo server per il collaudo; la UI non li usa per attribuire punteggi.

**Comandi specifici**, prefisso `wavelength.`: markHeard({targetUid: string}), beginGuess({}), submitGuess({value: number}), nextRound({}). Il payload non contiene l’UID dell’autore; l’attore viene da Auth. Restano disponibili le azioni comuni validate nella fase 0.

**Stato:** `clues → guessing → roundResults → clues/results`.

**Riservato:** target: un unico intero 1–10, nascosto soltanto all’indovino e agli spettatori.

**Vista client:** guesserUid, turnOrder, heardUids, punteggi; target soltanto ai rispondenti prima della rivelazione, poi a tutti; guess e distance solo al risultato.

## Task 1 — motore e proiezioni

- [ ] Scrivere in `tests/server/wavelength.test.ts` il test iniziale:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
test('wavelength: regola fondamentale', () => {
  const {scoreGuess} = loadServer('server/games/wavelength.ts');
  assert.equal(scoreGuess(8, 8), 2);
  assert.equal(scoreGuess(8, 7), 1);
  assert.equal(scoreGuess(8, 6), 0);
  assert.equal(scoreGuess(1, 10), 0);
});
```

- [ ] Eseguire `node --experimental-strip-types --no-warnings --test tests/server/wavelength.test.ts`; verificare un fallimento dovuto alla funzionalità assente.
- [ ] Implementare helper e modulo `wavelengthModule`: Estrarre un solo target per round. Ruotare l’indovino su participantUids e completare cycles giri (default 1, limite 1–3). Solo l’indovino marca ogni rispondente come ascoltato e conferma un’ipotesi intera 1–10. Calcolare punti una volta e mostrare il numero solo dopo la conferma.
- [ ] Validare settings e contenuti sul server prima di start; predisporre il dataset: 20 suggerimenti facoltativi originali. Il core funziona anche con domande formulate liberamente a voce.
- [ ] Aggiungere test delle seguenti transizioni e proiezioni, poi eseguire nuovamente il test specifico:
  - Con target 8, tutti i rispondenti leggono esattamente 8; l’indovino e lo spettatore non hanno target nel JSON.
  - L’host che è indovino non vede target e non può usare una vista speciale per leggerlo.
  - Doppia submitGuess assegna un solo punteggio; value 0, 11, 2.5 e UID di altro attore sono rifiutati.
  - Ogni partecipante diventa indovino una volta per ciclo; un nuovo ingresso non allunga il ciclo corrente.
- [ ] Confermare stato input non mutato dall’engine, punteggi aggiornati una sola volta e token obsoleti rifiutati. Registrare il modulo nel registro server; revisione e commit mirato del backend, senza catalogo client.

## Task 2 — interfaccia completa

- [ ] Definire i tipi delle impostazioni, dello stato autorevole e della vista separatamente: la vista client non rende obbligatori i campi riservati. Default, min/max e testi delle regole devono coincidere con la spec e con validateSettings.
- [ ] Implementare wrapper di rete con questo schema, sostituendo `action` solo con un comando elencato sopra:

```ts
import {roomCommand} from '../../../core/services/roomCommand';
export const sendAction = (roomId: string, action: string, payload: unknown) =>
  roomCommand(roomId, 'wavelength.' + action, [payload]);
```

- [ ] Implementare le tre componenti del plugin: Indovino: ordine degli interlocutori, marcatura ascoltato e un’unica tastiera di dieci numeri. Rispondenti: carta col numero comune e invito a dare un esempio a voce. Nessun input numerico separato per interlocutore; risultato con numero scelto, numero vero e scarto.
- [ ] Tutte le azioni asincrone espongono stato di invio ed errore; bozza preservata su errore, segreto eliminato dalla schermata al cambio ruolo/partita. Nessun avanzamento fase locale ottimistico.
- [ ] Usare fixture per ogni fase, ospite/host/spettatore, testi massimi e dati incompleti durante il rientro. Verificare che il componente non monti una carta con campi non autorizzati mancanti.
- [ ] Eseguire TypeScript e controlli browser alle sei dimensioni della spec; controllare tastiera, focus, rotazione e azioni con bersaglio stabile. Revisione e commit mirato delle UI.

## Task 3 — integrazione e attivazione

- [ ] Scrivere lo scenario emulatori in `tests/integration/wavelength.test.mjs` usando Auth reale e chiamate gameCommand: creare stanza, inizializzare, completare partita, entrare tardi, rientrare e ripetere l’ultima conferma.
- [ ] Verificare i JSON di tutti i ruoli contro i casi del Task 1; tentare anche azioni host da ospite, azioni di un altro round e lettura di una vista altrui. Devono essere rifiutate senza modificare punti o fase.
- [ ] Eseguire tutti i comandi della checklist comune, inclusi integrazione Firebase e build web; prova nativa o limite dichiarato. Correggere ogni regressione nei giochi già esistenti.
- [ ] Aggiungere import e voce del plugin al registry client solo ora; aggiornare documentazione di regole, limiti e contenuti. Rieseguire TypeScript/build per verificare l’inclusione effettiva nel catalogo.
- [ ] Commit del rilascio del solo gioco; eventuale deploy coordinato backend/client segue una richiesta di pubblicazione, non questa pianificazione.
