# Herd Mentality — piano di implementazione

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rilasciare Herd Mentality come plugin completo e autonomo.

**Architecture:** `herdMentalityModule` implementa GameModule della fase 0; client con tre componenti GamePlugin e wrapper roomCommand. Segreti e punti esclusivamente server.

**Tech Stack:** TypeScript, React Native/Expo, Firebase callable + RTDB, node:test ed emulatori esistenti.

**Spec:** [progetto funzionale](../specs/2026-09-06-new-games-design.md), sezione Herd Mentality; [base e criteri comuni](2026-09-06-new-games.md).

## Vincoli globali

Firebase UID e autorizzazione per fase/ruolo; partecipanti congelati, spettatori dalla partita successiva; nessun segreto alla vista host; carte adattive e controlli almeno 44×44; niente AI per arbitrare; italiano; Lupus resta disabilitato. Le regole e i limiti numerici della sezione corrispondente della spec sono vincolanti per questo piano.

## File e interfacce

- Creare `server/games/herd-mentality.ts`: modulo `herdMentalityModule`, validazione e transizioni server.
- Creare `server/data/herd-mentality.json`: contenuti originali validati; dati riservati fuori dal bundle UI.
- Creare `src/games/herd-mentality/types.ts`, `index.ts`, `services/herdMentalityLogic.ts`.
- Creare `src/games/herd-mentality/components/SettingsPanel.tsx`, `HostDashboard.tsx`, `PlayerGamepad.tsx`.
- Creare `tests/server/herd-mentality.test.ts`, `tests/integration/herd-mentality.test.mjs`.
- Modificare `server/gameModules.ts`; al rilascio modificare `src/core/gameRegistry.ts`, `DOCUMENTAZIONE.md` e includere il nuovo file di integrazione nello script `test:integration`.

**Consuma:** `GameModule`, `getGameModule`, `RoundExpected`, `roomCommand(roomId, method, [payload])`, `FitContent`, `useGameAction`, `HostDashboardShell`, `loadServer` dalla fase 0.

**Produce:** `herdMentalityModule: GameModule`, plugin con ID `herd-mentality`, impostazioni `{ rounds: number }` e funzioni pure `majorityWinners(groups: string[][]): string[]; normalizeAnswer(value: string): string`. I helper sono esportati dal modulo server per il collaudo; la UI non li usa per attribuire punteggi.

**Comandi specifici**, prefisso `herd-mentality.`: submitAnswer({text: string}), mergeGroups({groupIds: string[]}), undoMerge({}), confirmResults({}), nextRound({}). Il payload non contiene l’UID dell’autore; l’attore viene da Auth. Restano disponibili le azioni comuni validate nella fase 0.

**Stato:** `answering → review → roundResults → answering/results`.

**Riservato:** answersByUid finché la raccolta non termina; mazzo futuro.

**Vista client:** question e stato invii; risposte, gruppi e fusioni durante review; punteggi soltanto dopo confirmResults.

## Task 1 — motore e proiezioni

- [ ] Scrivere in `tests/server/herd-mentality.test.ts` il test iniziale:

```ts
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadServer} from '../helpers/serverLoader.ts';
test('herd-mentality: regola fondamentale', () => {
  const {majorityWinners} = loadServer('server/games/herd-mentality.ts');
  assert.deepEqual(majorityWinners([['a','b'], ['c'], ['d'], ['e']]), ['a','b']);
  assert.deepEqual(majorityWinners([['a','b'], ['c','d']]), []);
  assert.deepEqual(majorityWinners([['a'], ['b'], ['c']]), []);
});
```

- [ ] Eseguire `node --experimental-strip-types --no-warnings --test tests/server/herd-mentality.test.ts`; verificare un fallimento dovuto alla funzionalità assente.
- [ ] Implementare helper e modulo `herdMentalityModule`: Raccogliere una risposta per partecipante, raggruppare con normalizzazione conservativa. Gruppi con ID server, non testi usati come chiavi RTDB. Consentire fusione/annullamento all’host soltanto durante review, verificando che ogni risposta appartenga a un solo gruppo. Assegnare +1 ai membri dell’unico gruppo più grande; pareggio al primo posto significa zero punti.
- [ ] Validare settings e contenuti sul server prima di start; predisporre il dataset: 30 domande originali che favoriscano risposte brevi e confrontabili. Riutilizzare server/textNormalization.ts di Just One, con funzione separata normalizeAnswer per non imporre la regola della parola singola.
- [ ] Aggiungere test delle seguenti transizioni e proiezioni, poi eseguire nuovamente il test specifico:
  - Un gruppo di due su cinque può vincere: conta la pluralità, non la maggioranza assoluta.
  - Prima dell’ultimo invio il client vede solo la propria risposta; dopo, vede tutte le risposte originali.
  - Fusione non può duplicare membri, includere UID estranei o modificare testo; undo ripristina esattamente i gruppi precedenti.
  - Due confirmResults concorrenti non duplicano punti; dopo la conferma non si modificano gruppi o risposte.
- [ ] Confermare stato input non mutato dall’engine, punteggi aggiornati una sola volta e token obsoleti rifiutati. Registrare il modulo nel registro server; revisione e commit mirato del backend, senza catalogo client.

## Task 2 — interfaccia completa

- [ ] Definire i tipi delle impostazioni, dello stato autorevole e della vista separatamente: la vista client non rende obbligatori i campi riservati. Default, min/max e testi delle regole devono coincidere con la spec e con validateSettings.
- [ ] Implementare wrapper di rete con questo schema, sostituendo `action` solo con un comando elencato sopra:

```ts
import {roomCommand} from '../../../core/services/roomCommand';
export const sendAction = (roomId: string, action: string, payload: unknown) =>
  roomCommand(roomId, 'herd-mentality.' + action, [payload]);
```

- [ ] Implementare le tre componenti del plugin: Domanda pubblica, risposta privata e attesa; review con gruppi, numerosità e anteprima delle fusioni; conferma host visibile; classifica cumulativa. Le liste possono scorrere, mantenendo domanda e pulsante di invio leggibili.
- [ ] Tutte le azioni asincrone espongono stato di invio ed errore; bozza preservata su errore, segreto eliminato dalla schermata al cambio ruolo/partita. Nessun avanzamento fase locale ottimistico.
- [ ] Usare fixture per ogni fase, ospite/host/spettatore, testi massimi e dati incompleti durante il rientro. Verificare che il componente non monti una carta con campi non autorizzati mancanti.
- [ ] Eseguire TypeScript e controlli browser alle sei dimensioni della spec; controllare tastiera, focus, rotazione e azioni con bersaglio stabile. Revisione e commit mirato delle UI.

## Task 3 — integrazione e attivazione

- [ ] Scrivere lo scenario emulatori in `tests/integration/herd-mentality.test.mjs` usando Auth reale e chiamate gameCommand: creare stanza, inizializzare, completare partita, entrare tardi, rientrare e ripetere l’ultima conferma.
- [ ] Verificare i JSON di tutti i ruoli contro i casi del Task 1; tentare anche azioni host da ospite, azioni di un altro round e lettura di una vista altrui. Devono essere rifiutate senza modificare punti o fase.
- [ ] Eseguire tutti i comandi della checklist comune, inclusi integrazione Firebase e build web; prova nativa o limite dichiarato. Correggere ogni regressione nei giochi già esistenti.
- [ ] Aggiungere import e voce del plugin al registry client solo ora; aggiornare documentazione di regole, limiti e contenuti. Rieseguire TypeScript/build per verificare l’inclusione effettiva nel catalogo.
- [ ] Commit del rilascio del solo gioco; eventuale deploy coordinato backend/client segue una richiesta di pubblicazione, non questa pianificazione.
