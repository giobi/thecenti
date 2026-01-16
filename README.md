# TheCenti - Live Show Hub 🎸🎤

**Il trio party band che trasforma ogni live in un'esperienza interattiva!**

Una band bizzarra che suona di tutto con **mani e piedi**, ora potenziata dall'AI per coinvolgere il pubblico in tempo reale.

## 🚀 Cosa c'è di Nuovo

### Live Show Hub Interattivo
- **🗳️ Voto Scaletta**: Il pubblico sceglie la prossima canzone
- **🤖 AI Song Generator**: Richieste personalizzate generate con intelligenza artificiale  
- **📺 Display Mode**: Proiezione in tempo reale per seguire il live
- **📱 Mobile First**: Tutto ottimizzato per smartphone del pubblico

### Features
- ⚡ **Interazione Real-time**: Voti, richieste, feedback istantaneo
- 🎵 **1000 Combinazioni AI**: Generi × Ritmi × Complessità per canzoni uniche
- 🎭 **Personalità Conservata**: Mantiene l'ironia e il tone bizzarro originale
- 📊 **Analytics Live**: Traccia partecipazione e preferenze del pubblico

## 📁 Struttura Progetto

```
thecenti.github.io/
├── index.html              # Home page con personalità band
├── live/                   # Hub interattivo live show
│   ├── vote.html          # Voto scaletta pubblico  
│   ├── request.html       # Richiesta canzone AI
│   └── display.html       # Modalità proiezione
├── assets/
│   ├── images/            # Logo, favicon, foto band
│   ├── css/style.css      # Design system "Party Band Bizzarro"
│   └── js/main.js         # Interattività e easter eggs
└── README.md              # Questo file
```

## 🎨 Design System

### **Tema: "Live Stage"**
- **Colori**: Stage black (#0a0a0a) + Spotlight gold (#ffd700) + Energy red (#ff4444)
- **Font**: Syne (display) + Quicksand (body) - combo "Sans Friendly"
- **Layout**: Mobile-first con grid responsive e card system
- **Effetti**: Glow, pulse, sparkles, glass morphism

### **User Experience**
- **⚡ Velocità**: Ogni interazione < 5 secondi
- **📱 Mobile-first**: 90% pubblico usa smartphone durante live
- **🎭 Personalità**: Ironia originale + tech innovation seamless

## 🚀 Architettura MVP → Full Platform

### **Fase 1: MVP Static (GitHub Pages)** ✅
- [x] Home page con Bio, Scaletta, Contatti
- [x] Live Hub frontend (vote + request + display)
- [x] Design system completo
- [x] Assets da sito attuale

### **Fase 2: Backend Dynamic (Cloudflare Workers)**
- [ ] API endpoint `/api/vote/` per gestione voti real-time
- [ ] Queue system `/api/ai-request/` per richieste AI
- [ ] Admin dashboard `/api/admin/` per band (NEXT button)
- [ ] WebSocket per aggiornamenti live

### **Fase 3: AI Platform (Laravel API)**
- [ ] Sistema generazione canzoni (1000 combinazioni)
- [ ] Integrazione Instagram Stories (@thecenti tag)
- [ ] Analytics partecipazione e metrics
- [ ] Database scalette e performance history

## 🎵 Sistema AI Generazione Canzoni

### **Prodotto Cartesiano: 1000 Combinazioni**
```
10 Generi × 10 Ritmi × 10 Livelli Complessità = 1000 possibilità
```

**Strategia UX**: NON chiede preferenze musicali dirette, ma:
1. **Personalità** del festeggiato (chip selection)
2. **Aneddoti/ricordi** significativi (textarea)  
3. **Contesto** della festa (dropdown)

**Output**: Canzone personalizzata con:
- Strofa 1 (CECCO): introduzione personaggio
- Strofa 2 (MAURO): sviluppo aneddoto  
- Strofa 3 (GIOBI): climax festa attuale
- Ritornello: celebrativo dopo ogni strofa
- Bridge: cambio dinamico/armonico

## 🎤 User Journey Live

### **Pubblico al Live**
1. QR Code sul palco → `thecenti.github.io/live`
2. **Voto veloce**: 2-3 opzioni, tap & done (< 5 sec)
3. **Richiesta AI**: Form minimal (nome + occasione + personalità) 
4. **Feedback visual**: "Richiesta in coda #3" + tempo stimato

### **Band sul Palco**  
1. Tablet backstage → `/live/admin` (TODO: Fase 2)
2. **NEXT button**: avanza scaletta
3. **Toggle AI**: apri/chiudi richieste
4. **Queue monitor**: richieste AI pending

### **Proiezione**
1. **Display mode**: `/live/display` 
2. **Font gigante**: prossima canzone + vote status
3. **QR code**: partecipazione pubblico
4. **AI progress**: "Generando canzone per Mario..."

## 🛠️ Tech Stack

### **Frontend** (Fase 1 - Attuale)
- **HTML5**: Semantico, accessibile
- **CSS3**: Custom properties, Grid, Flexbox, animations
- **Vanilla JS**: Interattività, WebSocket ready
- **GitHub Pages**: Hosting gratuito, HTTPS, CDN

### **Backend** (Fase 2-3 - Roadmap)
- **Cloudflare Workers**: Edge computing, low latency
- **Laravel API**: AI generation, admin, analytics
- **WebSocket**: Real-time updates
- **SQLite/MySQL**: Data persistence

## 🎯 Prossimi Step

### **Immediate (Week 1-2)**
1. **Setup GitHub repo** + autenticazione  
2. **Deploy GitHub Pages** per testing live
3. **Test con pubblico piccolo** (casa/amici)

### **Short-term (Month 1)**
4. **Cloudflare Workers** per voti real-time
5. **Laravel API MVP** per AI generation
6. **Primo live vero** con sistema completo

### **Long-term (Q2 2026)**  
7. **Analytics dashboard** per band
8. **Integrazione social** (Instagram, TikTok)
9. **Monetization**: corporate events, licensing

## 🎸 Chi Siamo

**Cecco, Mauro e Giobi** - I TheCenti che i Led Zeppelin hanno definito "una band" (e noi siamo d'accordo!)

Una band bizzarra che suona per interi quarti d'ora, con strumenti che superano abbondantemente le dieci corde, mentre diverse persone confermano di aver scelto di venire ai nostri concerti.

### **Social**
- 📷 **Instagram**: [@thecentiband](https://www.instagram.com/thecentiband)
- 💬 **Contatti**: [Messenger](https://ig.me/m/thecentiband)
- 📋 **Scaletta Live**: [Google Sheets](https://docs.google.com/spreadsheets/d/e/2PACX-1vS0ni2IISFnoW0TSh4MtJ8xvWkMk6hHvoXVVkM_ffiTJgwwTt0aBTOm6DyiOdAMZMJQ-hcPZyMtA0n9/pubhtml?gid=131553727&single=true)
- 🎨 **Media Kit**: [Canva](https://www.canva.com/design/DAGWkreh2UY/JaA6fSPLg9oI7yZUdDttfA/edit)

---

## 🔧 Development

### **Local Setup**
```bash
# Clone repository (quando creata)
git clone https://github.com/thecenti/thecenti.github.io.git
cd thecenti.github.io

# Serve locally
python3 -m http.server 8000
# Visit: http://localhost:8000
```

### **Deploy**
```bash
# Push to main branch auto-deploys to GitHub Pages
git add .
git commit -m "🎸 Update live hub"
git push origin main
# Live at: https://thecenti.github.io
```

### **Easter Eggs**
- **Konami Code** (↑↑↓↓←→←→BA): Party mode rainbow effect!
- **Display Mode Controls**: 
  - `→` / `Space`: Next song
  - `←`: Previous song  
  - `V`: Toggle vote panel
  - `A`: Toggle AI status
  - `F`: Fullscreen
  - `ESC`: Exit fullscreen

---

**Made with ❤️ and 🎸 by TheCenti + Anacleto AI**

*"Faccio un peto e risolvo il problema. Saggezza e flatulenza in egual misura."* 🦉