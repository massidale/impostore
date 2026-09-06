# Sei nuovi giochi: progetto funzionale

Stato: proposta di progettazione; nessun nuovo gioco è stato implementato o reso disponibile. Le descrizioni dell’utente sono il riferimento. Le regole aggiuntive qui sotto sono varianti proposte per l’app, non una dichiarazione delle regole ufficiali dei prodotti omonimi.

## Obiettivo e ordine di lavoro

Aggiungere sei giochi indipendenti al catalogo esistente, mantenendo Taboo, Impostore e Indovina funzionanti e Lupus non raggiungibile.

Ordine proposto: **Che domanda? → Wavelength → Just One → Herd Mentality → Top Ten → Time’s Up**. Si parte dalle due idee descritte più nel dettaglio dall’utente; successivamente si riusano raccolta e normalizzazione delle risposte, prima di affrontare ordinamento e mazzo persistente su tre round. Ogni gioco viene pubblicato soltanto dopo avere completato backend, interfaccia e verifiche.

## Decisioni confermate dall’utente

1. **Che domanda?**: i civili ricevono la stessa domanda, gli impostori una domanda diversa ma simile. Dopo le risposte numeriche viene mostrata a tutti soltanto la domanda dei civili.
2. **Wavelength**: tutti i partecipanti tranne l’indovino ricevono **lo stesso numero segreto da 1 a 10**. L’indovino deve trovare quel singolo numero ascoltando gli esempi di ciascuno.

Le altre impostazioni qui definite (punteggi, numero di round e gestione dei pareggi) sono proposte iniziali per l’app, modificabili prima dell’esecuzione.

## Vincoli comuni

- Firebase Auth UID è l’unica identità delle azioni; l’host non ha accesso aggiuntivo ai segreti.
- Stato autorevole e punteggi sono calcolati nel backend con transazioni RTDB.
- I client leggono soltanto preview e proiezione privata; le regole Firebase non vengono allargate.
- Ogni partita congela i partecipanti all’avvio. Chi entra dopo resta spettatore fino alla partita successiva, coerentemente con il backend attuale. Il termine «round» nelle nuove interfacce non deve promettere un ingresso anticipato.
- Disconnessione non equivale a risposta. Il rientro conserva ruolo, turno e invii; l’host può annullare un round bloccato senza assegnare punti oppure terminare la partita. Non si inventano risposte per gli assenti.
- Le richieste portano matchId, roundId e phaseVersion. La versione cambia al cambio fase, non a ogni risposta simultanea. Doppio invio e doppia assegnazione punti non producono duplicati.
- Nessun array completo di segreti o mazzo futuro viene serializzato nelle viste client.
- Carte con testo a capo e adattamento allo spazio disponibile tramite FitContent; controlli di gioco separati dalle carte quando possibile. Liste lunghe, moduli e ordinamenti devono rimanere scorribili e utilizzabili, senza ridurre indiscriminatamente i bersagli touch.
- Interfacce in italiano, funzionanti su web e React Native. Niente riconoscimento vocale, analisi del mimo o valutazione semantica tramite AI nell’MVP.
- Punteggi di fine round e fine partita sono distinti e persistiti; il ritorno in lobby conserva soltanto impostazioni e contenuti riutilizzabili.
- Limite iniziale di ogni gioco definito sotto, verificato sia nel plugin sia dal server. La stanza continua ad avere il limite complessivo di 30 utenti.
- Contenuti iniziali scritti per l’app; non copiare mazzi commerciali. Caricamento personalizzato validato e riservato alla lobby.

## 1. Che domanda?

**Giocatori:** 3–12. **Impostori:** 1 di default; massimo floor((partecipanti − 1) / 2). Nessun pagliaccio e nessun tentativo finale di indovinare una parola.

Ogni partecipante legge privatamente una domanda e inserisce un numero. I civili leggono la domanda principale e gli impostori una domanda alternativa. La domanda ricevuta non è etichettata come «civile» o «impostore»: nessuno riceve una conferma esplicita della propria fazione prima dei risultati.

Una coppia di contenuto contiene `id`, `question`, `alternateQuestion` e un dominio numerico condiviso: `min`, `max`, `decimals`. Esempio: «Quanti cappelli hai in casa?» / «Quanti bagni hai in casa?», interi 0–100. Non usare confronti in cui una domanda produce quasi sempre risposte impossibili per l’altra.

Accettare solo numeri finiti nel dominio indicato: zero è valido. L’interfaccia accetta virgola o punto decimale, ma non separatori delle migliaia; normalizza prima dell’invio. Rifiutare stringhe vuote, NaN, Infinity, notazione scientifica e cifre oltre la precisione configurata. Il backend ripete tutte le verifiche.

**Fasi:** `answering → discussion → voting → elimination → discussion/voting oppure results`.

Durante `answering` sono visibili solo la propria domanda, la propria risposta e lo stato «ha risposto» degli altri. L’ultimo invio valido blocca gli invii e rivela contemporaneamente domanda principale e tutte le risposte associate ai nomi.

In `discussion`, ordine dei parlanti visibile, primo giocatore ruotato tra partite; parla uno alla volta a voce. L’oratore corrente o l’host avanza al successivo. Dopo un giro completo l’host apre il voto. Nessuna registrazione audio. La domanda alternativa e i ruoli restano privati.

**Voto:** 60 secondi; ognuno vota un altro partecipante non eliminato, può cambiare voto prima della chiusura, vede soltanto il proprio voto e il conteggio complessivo degli invii. Chiusura anticipata quando tutti hanno votato. Chi non vota entro la scadenza si astiene; nessun voto significa nessuna espulsione e un nuovo giro di discussione.

**Pareggio:** un ballottaggio di 30 secondi fra i più votati; se persiste, nessuna espulsione. Gli eventuali candidati non possono votare sé stessi e possono votare gli altri candidati. L’eliminazione rivela la fazione dell’espulso; gli eliminati osservano e non votano più.

**Vittoria:** civili se tutti gli impostori sono espulsi; impostori se raggiungono la parità numerica con i civili. Se restano almeno due impostori e i civili sono ancora in maggioranza, si discute e vota di nuovo usando la stessa domanda e le risposte iniziali. Risultato finale con ruoli, entrambe le domande e risposte; nessun punteggio individuale nell’MVP.

## 2. Wavelength — variante numerica descritta dall’utente

**Giocatori:** 3–12. Un giocatore per turno è l’indovino; tutti gli altri ricevono **lo stesso intero segreto fra 1 e 10**. L’indovino non riceve il numero, anche quando è l’host.

Il numero è un voto/intensità, non la posizione di un cursore su una scala grafica. L’app realizza questa variante descritta dall’utente, senza sostituirla con un altro regolamento.

**Fasi:** `clues → guessing → roundResults`, poi nuovo indovino o `results`.

L’indovino pone a voce una domanda a ciascuno, nell’ordine mostrato; le domande possono essere diverse. Esempio: «Se fosse una razza di cane, quale sarebbe per bellezza?». Se il numero comune è 8, ciascuno dà un esempio che secondo lui vale 8/10. Il numero non va pronunciato. L’indovino marca «ascoltato» ogni interlocutore; dopo tutti gli esempi sceglie **un solo numero** tramite dieci pulsanti grandi e conferma una sola volta.

Solo allora si rivelano il numero comune e lo scarto. Solo l’indovino può confermare; l’host può annullare il turno ma non rispondere al suo posto. Nessun numero individuale e nessuna lista di ipotesi per partecipante.

**Punteggio proposto:** 2 punti per numero esatto, 1 per scarto pari a 1, 0 altrimenti. I punti appartengono all’indovino. Un giro completo: tutti indovinano una volta; classifica finale e vittoria condivisa in caso di parità. A ogni turno viene estratto un nuovo numero comune; sono ammesse ripetizioni casuali per evitare deduzioni dai turni precedenti. Domande a voce; suggerimenti opzionali dell’app, senza obbligare a usarli.

## 3. Just One

**Giocatori:** 3–10. Cooperativo. **Partita:** 8 parole di default, configurabile 5–20. L’indovino cambia a ogni parola.

**Fasi:** `clues → review → guessing → roundResults → clues/results`.

Tutti tranne l’indovino vedono la parola obiettivo e inviano un indizio di una sola parola (massimo 30 caratteri). Una parola ammette lettere Unicode e apostrofi interni, ma non spazi, cifre o emoji. L’indovino non vede parola, indizi grezzi o autori.

Dopo tutti gli invii, il server normalizza Unicode, maiuscole, accenti e apostrofi equivalenti; annulla **tutti** gli indizi con la stessa forma normalizzata, non ne conserva uno. Esempio: «Caffè», «CAFFE» vengono entrambi cancellati. La stessa normalizzazione rifiuta un indizio identico all’obiettivo. Non usare stemming o sinonimi automatici: «mare» e «marino» non sono dichiarati duplicati dal codice.

In `review` gli autori possono ritirare il proprio indizio o segnalare un indizio non valido. Ogni autore conferma «pronto»; una segnalazione invalida l’indizio solo se almeno due autori distinti la confermano. L’indovino non partecipa. La regola evita che il solo host possa vedere il segreto quando è l’indovino. Alla chiusura, gli indizi validi sono anonimi e mescolati.

L’indovino ha un tentativo scritto, oppure passa. Risposta confrontata con obiettivo e alias editoriali tramite normalizzazione; non usare correzione semantica remota. Nessun indizio valido: round fallito automaticamente. **Punti:** +1 per parola indovinata, 0 per errore/passaggio; risultato cooperativo su 8. Ogni round consuma una sola parola, anche in caso di errore.

## 4. Herd Mentality

**Giocatori:** 3–12. **Partita:** 8 domande, configurabile 5–20. Tutti rispondono, senza ruoli segreti.

**Fasi:** `answering → review → roundResults → answering/results`.

Domanda pubblica, risposte private da 1–60 caratteri. Dopo tutti gli invii, mostrare risposte e gruppi senza ancora assegnare punti. Normalizzazione: Unicode, maiuscole, accenti, spazi ripetuti e punteggiatura esterna; mantenere distinti gli apostrofi interni quando cambiano il termine. Non fondere sinonimi automaticamente.

In `review` l’host può unire gruppi che il tavolo considera equivalenti, con anteprima pubblica; ad esempio «coca cola» e «Coca-Cola». Il server conserva risposte originali e raggruppamenti, permettendo di annullare una fusione prima della conferma. Non si modifica il testo inviato.

**Punti:** +1 a ogni membro del gruppo più numeroso, anche se non supera il 50% dei giocatori. Se due o più gruppi sono a pari merito al primo posto, nessuno prende punti. Tutte risposte diverse: zero punti. Conferma host assegna i punti una sola volta; classifica cumulativa, vincitori condivisi in caso di parità finale. Nessuna penalità aggiuntiva o gettone speciale nell’MVP.

## 5. Top Ten

**Giocatori:** 4–10, capitano incluso fra i rispondenti. Cooperativo. **Partita:** 5 temi, configurabile 3–10; capitano ruotato a ogni tema.

Ognuno riceve un intero distinto da 1 a 10. Il tema contiene due estremi espliciti, ad esempio «Inventa una scusa per arrivare tardi: 1 = quasi credibile, 10 = completamente assurda». Il capitano conosce solo il proprio numero.

**Fasi:** `performing → ordering → roundResults → performing/results`.

Tutti interpretano a voce il tema nell’ordine mostrato; oratore o host marca il completamento. L’app mostra nomi e tema, non prova a valutare voce o recitazione. Il capitano dispone tutti i partecipanti dal meno al più intenso; dispone anche sé stesso. L’ordinamento usa pulsanti su/giù accessibili, con trascinamento opzionale. Conferma unica prima della rivelazione; la lista deve contenere tutti e soli i partecipanti una volta ciascuno.

**Punteggio proposto:** +1 punto cooperativo per ogni coppia adiacente nell’ordine proposto con numeri crescenti; massimo N−1 per tema. Il round è perfetto soltanto se tutte le coppie sono crescenti. Totale finale su `(N−1) × temi`, senza vite o eliminazioni. Rivelazione simultanea di tutti i numeri dopo la conferma.

## 6. Time’s Up / tre round con lo stesso mazzo

**Giocatori:** 4–12, due squadre con almeno due giocatori ciascuna. **Mazzo:** 30 nomi di default, configurabile 10–60; personaggi o nomi personalizzati, non una griglia per lettere di «nomi, cose, città». **Turno:** 45 secondi, configurabile 30–90.

La stessa lista immutabile di ID carta viene usata in tutti e tre i round. Ogni carta contiene `id`, `name`, `aliases`. Mazzo predefinito originale o contributi privati dei giocatori in una fase `collecting` senza assegnare autori pubblici; duplicati normalizzati rimossi prima della partenza e contributi insufficienti segnalati senza inventare carte.

**Fasi:** `collecting` opzionale, poi `ready → turn → turnResults`, ripetute; `roundResults` alla fine del mazzo; `results` dopo il terzo round.

1. Descrizione libera, senza dire nome o alias.
2. Una sola parola per carta; niente spiegazioni aggiuntive.
3. Solo mimo; niente parole né suoni.

Squadre alternate e descrittori ruotati dentro ciascuna squadra. Solo il descrittore vede la carta corrente; gli altri controllano le regole al tavolo. Il descrittore marca «indovinata», «passa» o «violazione». Indovinata: +1 punto e carta tolta dal round; passa/violazione: carta in fondo alla coda, zero punti. Le carte saltate non vengono escluse dal round.

Timer autorevole server: alla scadenza la carta irrisolta torna in coda. L’ultima carta risolta chiude il round immediatamente; si ricostruisce la coda da tutti gli ID originali, rimescolati, e si inizia con l’altra squadra. Il terzo esaurimento chiude la partita, senza generare un quarto round.

Un solo annullamento per l’ultima azione, nello stesso turno ancora aperto; non riaprire round o timer conclusi. Doppio tap sulla stessa versione della carta non assegna due punti. I contributi e il mazzo futuro non sono leggibili dai client; una carta già indovinata può essere ricordata dalle persone, come previsto dai tre round. Vince la squadra col totale maggiore; parità condivisa.

## Contenuti e verifiche editoriali

Primo rilascio di ogni gioco: almeno 30 coppie/domande/temi originali per Che domanda?, Herd Mentality e Top Ten; 100 parole obiettivo con alias per Just One; 100 nomi con alias per Time’s Up; 20 suggerimenti facoltativi per Wavelength. Per Che domanda? validare soprattutto che entrambe le domande ammettano lo stesso tipo e intervallo numerico. Ogni mazzo ha ID stabili e non ripete una carta nella stessa partita salvo il riciclo previsto da Time’s Up.

Importazioni ammesse: JSON per coppie/domande/temi strutturati; lista di parole/nomi per Just One e Time’s Up. Massimo 1.000 voci per nuovo gioco e 120 caratteri per domanda/tema, 60 per parola/nome; validazione server, nessun testo usato come chiave RTDB.

## Criteri di completamento

Per ogni gioco: partita completa su almeno tre client e host giocante; rientro durante ogni fase; doppi invii e invii simultanei; spettatore tardivo; richiesta con ruolo falso; richiesta della fase/round precedente; segreti assenti dal JSON del destinatario errato; punteggio finale verificabile; errore di rete visibile e ritentabile senza perdere la bozza.

UI: 320×480, 320×568, 390×844, 667×375, 844×390 e 1280×800; host/giocatore/spettatore, testo massimo, tastiera aperta e rotazione. Controlli principali almeno 44×44 CSS px prima di eventuali trasformazioni: i controlli interattivi non devono stare in un contenitore che li riduce sotto tale dimensione. Test browser automatici e verifica su iOS/Android reali prima di dichiarare completato il supporto nativo.
