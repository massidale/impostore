# Migrazione a Spark — 7 settembre 2026

L'utente ha scelto il piano gratuito, la logica client e le regole di produzione
invariate: l'app serve a partite tra amici. Questa decisione sostituisce il
requisito precedente di autorità server e segreti inaccessibili ai client.

## Implementazione

- I motori puri già collaudati sono importati dal client; nessuna duplicazione
  delle regole dei nove giochi.
- `sparkTransport` esegue transazioni RTDB su `rooms/{codice}` e ascolta gli
  aggiornamenti realtime. L'app non usa più callable, polling o `roomsV2`.
- `sparkRoom` conserva lo stato completo in JSON sotto `gameData.spark`, con
  soli campi consentiti alla radice. Array/oggetti vuoti restano integri.
- Le proiezioni mantengono ruoli, parole e risposte nascosti nelle schermate;
  lo stato resta accessibile ai client, come accettato dall'utente.
- Le stanze di altre versioni sono riconosciute e non vengono sovrascritte.
- I clone degli stati non dipendono da `structuredClone` del browser/runtime.
- Staging e script produzione distribuiscono solo Hosting. Nessun cambio delle
  regole e nessuna attivazione di Blaze. Cloud Functions resta codice opzionale.
- Le build pubbliche escludono la chiave Gemini e ricompilano senza cache.

## Verifiche

- TypeScript e build web superati; **175 test unitari** superati.
- **8 scenari di integrazione** superati usando lo stesso SDK e trasporto dell'app,
  Auth e RTDB negli emulatori, con copia delle regole già pubblicate e senza Functions.
  Copertura: partite complete dei nove giochi, concorrenza, retry, realtime,
  chiusura ripetuta e protezione delle stanze della versione precedente.
- Browser sullo staging reale: quattro profili autenticati distinti, creazione
  stanza, tutti i nove giochi avviati e terminati tornando alla lobby, catalogo
  senza Lupus, quattro risposte numeriche fino alla discussione in Che domanda?,
  risposte raggruppate e punteggiate in Herd Mentality. Nessun errore JavaScript
  e nessuna richiesta Cloud Functions. Stanza di collaudo eliminata al termine.
- Tutti i 26 file del bundle controllati: chiave Gemini assente.
- Regole di produzione rilette dopo il deploy e confrontate con la copia iniziale:
  identiche. Il sito live non è stato distribuito.
- Prove native iOS/Android ancora non eseguite su dispositivi reali.

Staging: https://gameshub-6b1ce--staging-5behpio3.web.app
