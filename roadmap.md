# IMPOSTORE - Roadmap

## Funzionalita Gia Implementate

### Core Game

- [x] **Creazione stanze** - ID alfanumerico 6 caratteri
- [x] **Sistema ruoli** - Civili e Impostori
- [x] **Parole segrete** - 95+ parole italiane con indizi
- [x] **Primo giocatore** - Selezione casuale
- [x] **Avvio/Fine gioco** - Controllo completo host

### Gestione Giocatori

- [x] **Ingresso tramite QR code** - Scansione rapida
- [x] **Ingresso tramite link URL** - Condivisione facile
- [x] **Validazione nomi** - Unicita e formato
- [x] **Lista giocatori real-time** - Sincronizzazione Firebase
- [x] **Rimozione giocatori** - Solo host
- [x] **Autenticazione anonima** - Firebase Auth

### Impostazioni

- [x] **Numero impostori** - Configurabile 1-N
- [x] **Sistema indizi** - Attivabile/disattivabile
- [x] **Indizi solo primo** - Restrizione opzionale
- [x] **Modifica durante attesa** - Lock durante gioco

### Interfaccia Host (Mobile)

- [x] **Form creazione stanza** - UI intuitiva
- [x] **Gestione stanza** - Dashboard completa
- [x] **QR code display** - Generazione automatica
- [x] **Condivisione link** - Native share + clipboard
- [x] **Modal impostazioni** - Configurazione rapida
- [x] **Modal ruolo** - Visualizzazione con tap
- [x] **Contatore pronti** - Giocatori che hanno visto ruolo
- [x] **Eliminazione stanza** - Pulizia completa

### Interfaccia Player (Web)

- [x] **Form ingresso** - Nome con validazione
- [x] **Stato attesa** - Loading spinner
- [x] **Visualizzazione ruolo** - Civile/Impostore
- [x] **Visualizzazione parola** - Solo civili
- [x] **Visualizzazione indizio** - Solo impostori (se abilitato)
- [x] **Indicatore primo giocatore** - Badge visivo

### Backend & Infrastruttura

- [x] **Firebase Realtime Database** - Sincronizzazione real-time
- [x] **Firebase Hosting** - Deploy web automatico
- [x] **Meccanismo heartbeat** - Pulizia stanze abbandonate (30s)
- [x] **Debouncing impostazioni** - Ottimizzazione scritture (500ms)

### Design & UX

- [x] **Dark mode** - Tema scuro completo
- [x] **Design responsive** - Mobile-first
- [x] **Gradient backgrounds** - UI moderna
- [x] **Feedback visivo** - Loading states, alerts
- [x] **Touch targets grandi** - Accessibilita mobile

---

## Funzionalita Future (Suggerimenti)

### Priorita Alta

- [ ] **Sistema votazione** - Vota per eliminare giocatori
- [ ] **Timer discussione** - Countdown per fasi gioco
- [ ] **Chat in-game** - Messaggistica real-time
- [ ] **Notifiche push** - Avvisi inizio gioco

### Priorita Media

- [ ] **Statistiche giocatore** - Vittorie/sconfitte
- [ ] **Leaderboard** - Classifica globale
- [ ] **Parole personalizzate** - Host aggiunge parole
- [ ] **Categorie parole** - Animali, cibi, luoghi, ecc.
- [ ] **Livelli difficolta** - Facile/Medio/Difficile
- [ ] **Modalita spettatore** - Osservare senza giocare

### Priorita Bassa

- [ ] **Supporto multilingua** - Inglese, spagnolo, ecc.
- [ ] **Effetti sonori** - Audio feedback
- [ ] **Musica sottofondo** - Ambientazione
- [ ] **Animazioni** - Transizioni fluide
- [ ] **Avatar giocatori** - Personalizzazione
- [ ] **Temi colore** - Scelta tema UI

### Miglioramenti Tecnici

- [ ] **Offline support** - Cache locale
- [ ] **Performance monitoring** - Analytics Firebase
- [ ] **Error tracking** - Sentry/Crashlytics
- [ ] **Unit tests** - Copertura servizi
- [ ] **E2E tests** - Cypress/Detox
- [ ] **CI/CD pipeline** - Deploy automatico

---

## Architettura Attuale

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT MOBILE                         │
│                  (React Native/Expo)                     │
│  ┌─────────────────────────────────────────────────┐    │
│  │              HostScreen.tsx                      │    │
│  │  - Creazione stanza    - Gestione giocatori     │    │
│  │  - Impostazioni        - Avvio/fine gioco       │    │
│  │  - QR code             - Visualizzazione ruolo  │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                      SERVICES                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐    │
│  │ roomService  │ │ roleService  │ │ wordService  │    │
│  │ - CRUD stanze│ │ - Assegna    │ │ - Parole     │    │
│  │ - Giocatori  │ │   ruoli      │ │ - Indizi     │    │
│  │ - Heartbeat  │ │ - Fisher-    │ │              │    │
│  │              │ │   Yates      │ │              │    │
│  └──────────────┘ └──────────────┘ └──────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                   FIREBASE RTDB                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │  /rooms/{roomId}/                               │    │
│  │    - word, hint, status                         │    │
│  │    - numImpostors, hostId                       │    │
│  │    - hintEnabled, hintOnlyFirst                 │    │
│  │    - players/{uid}/role, name, revealed         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                     CLIENT WEB                           │
│                   (Vanilla HTML/JS)                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │              web/index.html                      │    │
│  │  - Form ingresso       - Visualizzazione ruolo  │    │
│  │  - Stato attesa        - Parola/Indizio         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

---

## Flusso di Gioco

```
1. HOST CREA STANZA
   └── Imposta numero impostori e indizi

2. GIOCATORI SI UNISCONO
   └── Tramite QR code o link URL
   └── Inseriscono nome (validato)

3. HOST AVVIA GIOCO
   └── Ruoli assegnati casualmente
   └── Primo giocatore selezionato

4. GIOCATORI VEDONO RUOLI
   └── Civili: vedono parola
   └── Impostori: vedono indizio (se abilitato)

5. DISCUSSIONE (fuori app)
   └── Civili cercano impostore
   └── Impostori si mimetizzano

6. HOST TERMINA GIOCO
   └── Nuova parola selezionata
   └── Ruoli resettati
   └── Pronto per nuova partita
```

---

## Come Contribuire

1. **Fork** del repository
2. **Crea branch** per la feature (`git checkout -b feature/nome-feature`)
3. **Commit** modifiche (`git commit -m 'Aggiunge feature'`)
4. **Push** al branch (`git push origin feature/nome-feature`)
5. **Apri Pull Request**

---

## Contatti

**Progetto:** Impostore
**Repository:** [GitHub]
**Hosting:** https://impostore-c0ef1.web.app
