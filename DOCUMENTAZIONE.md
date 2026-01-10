# IMPOSTORE - Documentazione Completa

## Panoramica del Progetto

**Impostore** e un gioco multiplayer party game italiano (ispirato a "Among Us" / "Mafia") costruito con React Native ed Expo. L'app utilizza Firebase Realtime Database come backend e include sia client mobile (React Native) che web (HTML/JavaScript).

**Versione:** 1.0.0
**Stato:** In sviluppo attivo

---

## Stack Tecnologico

### Frontend Mobile
- **React Native:** 0.81.5
- **React:** 19.1.0
- **Expo:** ~54.0.30
- **TypeScript:** ~5.9.2

### Librerie UI
- **expo-linear-gradient:** Sfondi gradient
- **react-native-qrcode-svg:** Generazione QR code
- **expo-clipboard:** Operazioni clipboard
- **expo-sharing:** Condivisione nativa

### Backend
- **Firebase Realtime Database:** Database in tempo reale
- **Firebase Authentication:** Autenticazione anonima
- **Firebase Hosting:** Hosting web

### Web Client
- **Tailwind CSS:** (via CDN)
- **Vanilla JavaScript**

---

## Struttura del Progetto

```
impostore/
├── App.tsx                    # Entry point dell'applicazione
├── index.ts                   # Registrazione componente root
├── package.json               # Dipendenze e script
├── app.json                   # Configurazione Expo
├── tsconfig.json              # Configurazione TypeScript
├── firebase.json              # Configurazione Firebase Hosting
│
├── assets/                    # Asset dell'app
│   ├── icon.png              # Icona app
│   ├── favicon.png           # Favicon web
│   ├── adaptive-icon.png     # Icona adattiva Android
│   └── splash-icon.png       # Immagine splash screen
│
├── screens/                   # Schermate React Native
│   └── HostScreen.tsx        # Schermata principale host
│
├── services/                  # Logica business e API
│   ├── roomService.ts        # Gestione stanze (Firebase CRUD)
│   ├── roleService.ts        # Logica assegnazione ruoli
│   └── wordService.ts        # Gestione parole e indizi
│
├── config/                    # File di configurazione
│   └── firebase.ts           # Inizializzazione Firebase
│
├── types/                     # Definizioni TypeScript
│   └── game.ts               # Tipi dominio gioco
│
├── utils/                     # Funzioni di utilita
│   └── uuid.ts               # Generazione ID host
│
├── data/                      # Dati statici
│   ├── words.json            # 95+ parole italiane
│   └── hints.json            # Indizi per ogni parola
│
└── web/                       # Applicazione web
    └── index.html            # Client HTML standalone
```

---

## Funzionalita Implementate

### 1. Gestione Stanze

- **Creazione stanze** con ID alfanumerico di 6 caratteri
- **Configurazione** impostazioni prima dell'inizio
- **Lista giocatori** sincronizzata in tempo reale
- **Auto-pulizia** stanze dopo 30 secondi di inattivita host (meccanismo heartbeat)
- **Eliminazione stanza** (solo host)

### 2. Gestione Giocatori

- Ingresso tramite **QR code** o **link URL**
- **Validazione** nome giocatore e controllo unicita
- **Sincronizzazione** in tempo reale
- **Rimozione** giocatori specifici (solo host)
- Identificazione univoca tramite **Firebase UID**

### 3. Impostazioni Gioco

- **Numero impostori:** Configurabile (1 a N, dove N < giocatori totali)
- **Sistema indizi:**
  - Attivabile/disattivabile per impostori
  - Opzione indizio solo al primo giocatore
  - 95 parole italiane con indizi predefiniti

### 4. Stati del Gioco

#### Stato: Waiting (Attesa)
- Giocatori possono unirsi
- Host configura impostazioni
- Pronto per iniziare con almeno 1 giocatore

#### Stato: Active (Attivo)
- Tutti i giocatori hanno ruoli assegnati
- Giocatori visualizzano il proprio ruolo
- Host vede conteggio "pronti" in tempo reale
- Gioco continua fino a terminazione manuale

### 5. Sistema Ruoli

#### Civile
- Conosce la **parola segreta**
- Cerca di identificare l'impostore

#### Impostore
- **NON** conosce la parola segreta
- Riceve un **indizio** (se abilitato)
- Cerca di mimetizzarsi e indovinare la parola

#### Primo Giocatore
- Selezionato casualmente
- Usato per restrizioni indizi
- Visualizzato ai giocatori

### 6. Interfacce Utente

#### Mobile (React Native)
- **HostScreen:** Schermata unica che gestisce tutto
  - Form creazione stanza
  - Interfaccia gestione stanza
  - Lista giocatori
  - QR code e condivisione link
  - Modal impostazioni
  - Modal visualizzazione ruolo
  - Modal fine gioco

#### Web (Vanilla HTML/JS)
- **Ingresso giocatore:** Form nome con validazione
- **Stato attesa:** Spinner di caricamento
- **Stato attivo:** Schermata visualizzazione ruolo

### 7. Condivisione e Distribuzione

- **QR Code:** Incorporato nella schermata host
- **Condivisione URL:** Dialog nativo + copia clipboard
- **Link Web:** `https://impostore-c0ef1.web.app?room={roomId}`

---

## Meccaniche di Gioco

### Inizializzazione
1. Host crea stanza e imposta numero impostori
2. Giocatori entrano tramite QR/link e inseriscono nome
3. Host puo modificare impostazioni durante l'attesa
4. Host avvia il gioco

### Assegnazione Ruoli (Fisher-Yates shuffle)
1. Assegnazione casuale ruoli civile/impostore
2. Selezione casuale primo giocatore
3. Ruoli salvati in Firebase

### Gameplay
1. I civili vedono la parola e discutono/accusano
2. Gli impostori non conoscono la parola ma ascoltano
3. Gli impostori possono vedere gli indizi (configurabile)
4. Il gioco continua fino a terminazione manuale

### Fine Gioco
1. Nuova parola selezionata (diversa dalla precedente)
2. Tutti i ruoli resettati
3. Stanza torna in stato "waiting"
4. Giocatori possono rigiocare

---

## Schema Database Firebase

```
/rooms/{roomId}/
├── word: string                    # Parola segreta
├── hint: string | null             # Indizio per impostori
├── status: 'waiting' | 'active'    # Stato gioco
├── numImpostors: number            # Numero impostori
├── hostId: string                  # UUID host
├── createdAt: number               # Timestamp creazione
├── lastHeartbeat: number           # Ultimo heartbeat
├── hintEnabled: boolean            # Indizi abilitati
├── hintOnlyFirst: boolean          # Indizi solo primo
├── firstPlayerId: string           # UID primo giocatore
│
└── players/
    └── {playerUid}/
        ├── role: 'civilian' | 'impostor' | null
        ├── joinedAt: number
        ├── revealed: boolean
        ├── name: string
        └── isFirst: boolean
```

---

## Servizi

### roomService.ts
Funzioni principali:
- `createRoom()` - Crea nuova stanza
- `getRoomData()` - Ottiene dati stanza
- `deleteRoom()` - Elimina stanza
- `addPlayerToRoom()` - Aggiunge giocatore
- `removePlayerFromRoom()` - Rimuove giocatore
- `startGame()` - Avvia gioco
- `endGame()` - Termina gioco
- `subscribeToRoom()` - Sottoscrizione real-time
- `isNameAvailable()` - Validazione nome

### roleService.ts
- `assignRoles()` - Assegna ruoli (Fisher-Yates)
- `selectFirstPlayer()` - Seleziona primo giocatore

### wordService.ts
- `getRandomWord()` - Parola casuale italiana
- `getHint()` - Ottiene indizio per parola

---

## Tipi TypeScript

```typescript
type RoomStatus = 'waiting' | 'active';
type PlayerRole = 'civilian' | 'impostor' | null;

interface Player {
  role: PlayerRole;
  joinedAt: number;
  isFirst?: boolean;
  revealed?: boolean;
  name?: string;
}

interface Room {
  word: string;
  hint?: string;
  status: RoomStatus;
  numImpostors: number;
  hostId: string;
  createdAt: number;
  hintEnabled?: boolean;
  hintOnlyFirst?: boolean;
  firstPlayerId?: string;
  lastHeartbeat?: number;
  players?: { [uid: string]: Player };
}
```

---

## Gestione Stato

### Mobile (React Hooks)
- `useState` per stato UI (modal, input, loading)
- `useEffect` per sottoscrizioni Firebase
- Sincronizzazione real-time tramite `subscribeToRoom()`

### Web (Vanilla JS)
- Variabili locali per stato
- Listener Firebase `onValue()`
- Aggiornamenti UI tramite innerHTML

---

## Design UI/UX

### Schema Colori (Dark Mode)
- **Background:** `#111827`
- **Surface:** `#1f2937`
- **Primary:** `#2563eb`
- **Accent:** `#60a5fa`
- **Text:** `#fff`
- **Error:** `#ef4444`

### Tipografia
- Titoli: 28px bold
- Body: 16px regular
- Parola gioco: 48px bold blue

---

## Deployment

### Sviluppo Mobile
```bash
npm start          # Server Expo
npm run android    # Emulatore Android
npm run ios        # Simulatore iOS
npm run web        # Browser web
```

### Deploy Web (Firebase Hosting)
```bash
firebase deploy --only hosting
```

### Endpoint Live
- Web: `https://impostore-c0ef1.web.app`
- Deep link: `https://impostore-c0ef1.web.app?room=ABC123`

---

## Note Tecniche

1. **Lingua:** UI interamente in italiano
2. **Sicurezza:** Firebase auth anonima (nessun login richiesto)
3. **Performance:** Debouncing su impostazioni (500ms)
4. **Affidabilita:** Meccanismo heartbeat previene stanze fantasma
5. **Responsivita:** Design mobile-first, max-width constraints
