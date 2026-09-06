# Esperienza di gioco — 7 settembre 2026

Modifiche richieste dopo la migrazione a Spark:

- Home con catalogo dei nove giochi, ingresso tramite codice sempre in alto e dettaglio del gioco. Il nome viene chiesto quando si crea o si entra nella stanza. QR e link continuano ad aprire la stanza direttamente.
- Votazione di Impostore riutilizzata da Che domanda: `VotingPanel` gestisce righe, conferma inline, invio, errori e timer. `core/voting/voting.ts` condivide validazione, conteggio e completamento dei voti. Le regole specifiche dei pareggi restano nei rispettivi motori.
- Discussioni a voce senza conferme per ciascun oratore in Che domanda, Wavelength e Top Ten. Restano l'indicazione iniziale e l'azione per aprire voto, tentativo o ordinamento.
- Nessun punto o classifica nei giochi. Restano gli esiti e le informazioni necessarie a giocare. Unica eccezione: Just One a squadre conta le parole indovinate per decretare la vittoria o la parità.
- Just One permette due squadre casuali bilanciate da quattro giocatori. Ogni squadra ha parole, indizi, revisione e indovino indipendenti. I due mazzi non si sovrappongono e hanno lo stesso numero di parole. Le azioni includono la versione della fase della propria squadra, senza bloccare l'altra squadra.
- Rimosse le interfacce per contenuti personalizzati, generazione AI e raccolta di parole dai giocatori. I motori usano i mazzi inclusi e rifiutano i comandi per caricare contenuti.
- Impostazioni numeriche uniformate al NumberSelector esistente. Tastierino Wavelength sempre su due righe (1–5, 6–10), con larghezze adattate allo spazio disponibile.

Firebase resta sul piano Spark. Nessuna modifica alle regole del database o all'hosting di produzione.

Verifiche: typecheck, 185 test unitari, 10 scenari Firebase con le regole già in uso, build web. Collaudo browser completato con quattro identità separate: catalogo e ingresso con codice/link, avvio e ritorno alla lobby dei nove giochi, voto inline, tastierino a 320/375/390/430 px e due round di squadra Just One concorrenti. Le stanze temporanee sono state eliminate.
