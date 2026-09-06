# Partite singole e indovino — 7 settembre 2026

Wavelength e Just One cooperativo ora terminano dopo un numero o una parola. La lobby offre il selettore condiviso “Chi indovina?”. Dopo l’esito l’host può scegliere “Gioca ancora” oppure tornare alla lobby.

La rotazione è memorizzata per gioco nella stanza e avanza una sola volta, anche se dopo il risultato si torna alla lobby. Riprende dal prossimo partecipante in ordine circolare, salta chi è uscito e ammette gli spettatori al nuovo avvio. Un cambio manuale nelle impostazioni sostituisce la scelta automatica. Cambiare gioco e poi tornare non azzera il cursore.

`server/guesserRotation.ts` condivide il salvataggio e l’avanzamento; `core/utils/guesserRotation.ts` gestisce il successore. Il comando `replay` è una sola transazione: verifica host, risultato e versione della partita, promuove gli spettatori e avvia una nuova partita. Le richieste duplicate non possono saltare un giocatore.

Just One a squadre mantiene il numero uguale di parole e la sua rotazione interna; Time’s Up mantiene i tre round sullo stesso mazzo.

Verifiche: TypeScript, 194 test unitari, 12 scenari Firebase, build web. Collaudo UI con tre partecipanti: scelta manuale, esito singolo Wavelength, Gioca ancora in entrambi i giochi, persistenza del prossimo indovino nella lobby. Nessuna modifica alle regole Firebase.
