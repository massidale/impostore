# Che domanda? — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rilasciare Che domanda? come plugin completo e autonomo.

**Architecture:** `cheDomandaModule` implementa GameModule della fase 0; client con tre componenti GamePlugin e wrapper roomCommand. Segreti e punti esclusivamente server.

**Tech Stack:** TypeScript, React Native/Expo, Firebase callable + RTDB, node:test ed emulatori esistenti.

**Spec:** [progetto funzionale](../specs/2026-09-06-new-games-design.md), sezione Che domanda?; [base e criteri comuni](2026-09-06-new-games.md).

## Vincoli globali

Firebase UID e autorizzazione per fase/ruolo; partecipanti congelati, spettatori dalla partita successiva; nessun segreto alla vista host; carte adattive e controlli almeno 44×44; niente AI per arbitrare; italiano; Lupus resta disabilitato. Le regole e i limiti numerici della sezione corrispondente della spec sono vincolanti per questo piano.

## File e interfacce

- Creare `server/games/che-domanda.ts`: modulo `cheDomandaModule`, validazione e transizioni server.
- Creare `server/data/che-domanda.json`: contenuti originali validati; dati riservati fuori dal bundle UI.
- Creare `src/games/che-domanda/types.ts`, `index.ts`, `services/cheDomandaLogic.ts`.
- Creare `src/games/che-domanda/components/SettingsPanel.tsx`, `HostDashboard.tsx`, `PlayerGamepad.tsx`.
- Creare `tests/server/che-domanda.test.ts`, `tests/integration/che-domanda.test.mjs`.
- Modificare `server/gameModules.ts`; al rilascio modificare `src/core/gameRegistry.ts`, `DOCUMENTAZIONE.md` e includere il nuovo file di integrazione nello script `test:integration`.

**Consuma:** `GameModule`, `getGameModule`, `RoundExpected`, `roomCommand(roomId, method, [payload])`, `FitContent`, `useGameAction`, `HostDashboardShell`, `loadServer` dalla fase 0.

**Produce:** `cheDomandaModule: GameModule`, plugin con ID `che-domanda`, impostazioni `{ numImpostors: number; votingSeconds: number }` e funzioni pure `parseNumericAnswer(input: string, domain: {min: number; max: number; decimals: number}): number`. I helper sono esportati dal modulo server per il collaudo; la UI non li usa per attribuire punteggi.

**Comandi specifici**, prefisso `che-domanda.`: submitAnswer({value: number}), nextSpeaker({}), startVoting({}), castVote({targetUid: string}), closeVoting({}). Il payload non contiene l’UID dell’autore; l’attore viene da Auth. Restano disponibili le azioni comuni validate nella fase 0.

**Stato:** `answering → discussion → voting → elimination → discussion/voting/results`.

**Riservato:** questionPair, impostorUids, questionByUid, answersByUid prima della discussione, votesByUid prima dell’esito.

**Vista client:** ownQuestion e ownAnswer durante answering; question e answersByUid durante discussion; proprio voto e conteggio durante voting; fazione eliminata e vincitori solo nelle fasi previste.

## Task 1 — motore e proiezioni

- [ ] Scrivere in `tests/server/che-domanda.test.ts` il test iniziale:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
test('che-domanda: regola fondamentale', () => {
  const {parseNumericAnswer} = loadServer('server/games/che-domanda.ts');
  const domain = {min: 0, max: 100, decimals: 1};
  assert.equal(parseNumericAnswer('0', domain), 0);
  assert.equal(parseNumericAnswer('1,5', domain), 1.5);
  for (const bad of ['', 'Infinity', '1e2', '101', '1,25']) {
    assert.throws(() => parseNumericAnswer(bad, domain));
  }
});
```

- [ ] Eseguire `node --experimental-strip-types --no-warnings --test tests/server/che-domanda.test.ts`; verificare un fallimento dovuto alla funzionalità assente.
- [ ] Implementare helper e modulo `cheDomandaModule`: Selezionare una coppia, assegnare due domande per fazione e congelare i partecipanti. Non inviare ruolo né domanda alternativa prima dell’esito. L’ultimo invio valido chiude answering nella stessa transazione. Gestire ordine dei parlanti, ballottaggio singolo, astensioni, eliminazioni e vittoria per parità numerica secondo la spec.
- [ ] Validare settings e contenuti sul server prima di start; predisporre il dataset: 30 coppie originali con dominio numerico condiviso; JSON con id, question, alternateQuestion, min, max, decimals.
- [ ] Aggiungere test delle seguenti transizioni e proiezioni, poi eseguire nuovamente il test specifico:
  - Con tre civili e due impostori, espellere un civile produce vittoria degli impostori; espellere l’ultimo impostore produce vittoria civile.
  - Tre invii simultanei con lo stesso phaseVersion vengono accettati; soltanto l’ultimo avanza la fase e rivela le risposte.
  - Pareggio → un ballottaggio; secondo pareggio → nessuno espulso. Timer server e astensioni non bloccano la fase.
  - Un impostore non legge domanda principale durante answering; civile e host non leggono domanda alternativa o ruoli altrui.
- [ ] Confermare stato input non mutato dall’engine, punteggi aggiornati una sola volta e token obsoleti rifiutati. Registrare il modulo nel registro server; revisione e commit mirato del backend, senza catalogo client.

## Task 2 — interfaccia completa

- [ ] Definire i tipi delle impostazioni, dello stato autorevole e della vista separatamente: la vista client non rende obbligatori i campi riservati. Default, min/max e testi delle regole devono coincidere con la spec e con validateSettings.
- [ ] Implementare wrapper di rete con questo schema, sostituendo `action` solo con un comando elencato sopra:

```ts
import {roomCommand} from '../../../core/services/roomCommand';
export const sendAction = (roomId: string, action: string, payload: unknown) =>
  roomCommand(roomId, 'che-domanda.' + action, [payload]);
```

- [ ] Implementare le tre componenti del plugin: Carta privata con domanda e campo numerico; tastiera decimale con normalizzazione della virgola. Vista confronto con tutte le risposte, evidenza dell’oratore, lista di voto con conferma. Conservare la risposta inviata durante il refresh e mostrare chi manca senza mostrare il suo numero.
- [ ] Tutte le azioni asincrone espongono stato di invio ed errore; bozza preservata su errore, segreto eliminato dalla schermata al cambio ruolo/partita. Nessun avanzamento fase locale ottimistico.
- [ ] Usare fixture per ogni fase, ospite/host/spettatore, testi massimi e dati incompleti durante il rientro. Verificare che il componente non monti una carta con campi non autorizzati mancanti.
- [ ] Eseguire TypeScript e controlli browser alle sei dimensioni della spec; controllare tastiera, focus, rotazione e azioni con bersaglio stabile. Revisione e commit mirato delle UI.

## Task 3 — integrazione e attivazione

- [ ] Scrivere lo scenario emulatori in `tests/integration/che-domanda.test.mjs` usando Auth reale e chiamate gameCommand: creare stanza, inizializzare, completare partita, entrare tardi, rientrare e ripetere l’ultima conferma.
- [ ] Verificare i JSON di tutti i ruoli contro i casi del Task 1; tentare anche azioni host da ospite, azioni di un altro round e lettura di una vista altrui. Devono essere rifiutate senza modificare punti o fase.
- [ ] Eseguire tutti i comandi della checklist comune, inclusi integrazione Firebase e build web; prova nativa o limite dichiarato. Correggere ogni regressione nei giochi già esistenti.
- [ ] Aggiungere import e voce del plugin al registry client solo ora; aggiornare documentazione di regole, limiti e contenuti. Rieseguire TypeScript/build per verificare l’inclusione effettiva nel catalogo.
- [ ] Commit del rilascio del solo gioco; eventuale deploy coordinato backend/client segue una richiesta di pubblicazione, non questa pianificazione.
