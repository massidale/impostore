# Istruzioni di Deployment - Firebase Hosting

## 🚀 Deploy su Firebase Hosting

### Prerequisiti
```bash
npm install -g firebase-tools
firebase login
```

### Deploy
```bash
firebase deploy --only hosting
```

La pagina sarà disponibile su:
- `https://impostore-c0ef1.web.app`
- `https://impostore-c0ef1.firebaseapp.com`

### Aggiorna URL nell'app
Dopo il deploy, aggiorna `WEB_PAGE_URL` in `screens/HostScreen.tsx`:
```typescript
const WEB_PAGE_URL = 'https://impostore-c0ef1.web.app';
```

## 📝 Note

- La pagina HTML è standalone e non richiede build
- Le credenziali Firebase sono già configurate nella pagina HTML
- Il progetto Firebase è già configurato in `.firebaserc`

