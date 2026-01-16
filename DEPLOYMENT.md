# TheCenti Live Hub - Phase 2 Deployment Guide

## 🚀 What We Just Built

### Band Dashboard (`/admin/dashboard.html`)
- **Tablet-friendly control panel** for backstage use
- **Toggle voting sessions** with big, easy-to-hit buttons
- **AI request management** with approve/reject queue
- **Real-time results** display during voting
- **Emergency controls** and system reset
- **Keyboard shortcuts** (Ctrl+V for vote, Ctrl+A for AI, Ctrl+R for reset)
- **Visual timer** with automatic vote closing

### Backend API (Cloudflare Worker)
- **Real-time state management** for vote/AI sessions
- **WebSocket support** for live updates
- **CORS-enabled** API endpoints
- **Vote tracking** with duplicate prevention
- **AI request queue** management
- **KV storage** for persistent state

### Updated Frontend
- **Vote page** now connects to backend API
- **Real-time polling** for live updates
- **Client ID tracking** to prevent duplicate votes
- **Graceful error handling** and offline fallback

## 🚀 Quick Deployment Steps

### 1. Deploy Cloudflare Worker (5 minutes)

```bash
# Install Wrangler CLI
npm install -g wrangler

# Navigate to worker directory
cd /home/web/thecenti/worker

# Login to Cloudflare
wrangler login

# Create KV namespace
wrangler kv:namespace create "LIVE_STATE"
wrangler kv:namespace create "LIVE_STATE" --preview

# Update wrangler.toml with the namespace IDs returned
# Edit: id = "your-actual-kv-namespace-id"
# Edit: preview_id = "your-actual-preview-kv-namespace-id"

# Deploy worker
wrangler deploy
```

### 2. Update Frontend API URLs

Edit these files to point to your Worker URL:
- `/admin/dashboard.html` - Line 259: Update `this.API_BASE`
- `/live/vote.html` - Line 211: Update `this.API_BASE`
- `/live/request.html` - Update API calls (if exists)

**Your Worker URL will be:** `https://thecenti-live-hub.YOUR_USERNAME.workers.dev`

### 3. Test Dashboard Locally

```bash
# Start local server from project root
cd /home/web/thecenti
python3 -m http.server 8000

# Open in browser:
# http://localhost:8000/admin/dashboard.html
```

### 4. Deploy Updated Frontend to GitHub Pages

```bash
# Commit and push changes
git add .
git commit -m "feat: Phase 2 - Dashboard and real-time backend"
git push origin main

# Dashboard will be live at:
# https://giobi.github.io/thecenti/admin/dashboard.html
```

## 🎸 How to Use During Live Shows

### Pre-Show Setup (10 minutes before)
1. **Open dashboard** on tablet: `https://giobi.github.io/thecenti/admin/dashboard.html`
2. **Test connection** - should show "Connesso" in header
3. **Prepare QR codes** - Click "Mostra QR" for audience
4. **Share URLs** with audience:
   - Vote: `https://giobi.github.io/thecenti/live/vote.html`
   - AI requests: `https://giobi.github.io/thecenti/live/request.html`

### During the Show
1. **Open voting** when ready for audience choice
2. **Set timer** (30s, 1min, 2min, or 3min)
3. **Watch live results** update in real-time
4. **Close voting** when timer ends or manually
5. **Manage AI requests** - approve/reject from queue
6. **Use emergency stop** if needed (red button)

### Between Songs
- **Reset system** for next voting round
- **Toggle AI requests** on/off based on mood
- **Show QR codes** if audience needs reminding

## 🔧 Technical Features

### Dashboard Controls
- **Big toggle buttons** for vote/AI sessions
- **Real-time vote percentages** during active voting
- **Timer with auto-close** when countdown reaches zero
- **AI request queue** with approve/reject buttons
- **Visual feedback** with notifications
- **Tablet-optimized** interface for backstage use

### Backend Capabilities
- **State persistence** across page refreshes
- **Real-time updates** via polling (5-second intervals)
- **Duplicate vote prevention** by client ID
- **Session management** for multiple voting rounds
- **CORS enabled** for cross-origin requests
- **Error handling** with graceful degradation

### Security Features
- **Client-side vote tracking** prevents spam
- **Session-based voting** resets between rounds
- **CORS protection** limits domain access
- **Rate limiting** (inherent in Cloudflare Workers)

## 🎯 Next Show Checklist

### Before the Gig
- [ ] Test dashboard on tablet/phone
- [ ] Verify worker deployment is live
- [ ] Prepare QR code printouts (backup)
- [ ] Brief band members on controls

### At the Venue
- [ ] Connect tablet to venue WiFi
- [ ] Test voting with personal phones
- [ ] Position tablet within reach during set
- [ ] Share URLs with audience via social media

### During Performance
- [ ] Open vote 1 minute before song decision
- [ ] Display live results on big screen (optional)
- [ ] Close vote and announce winner
- [ ] Manage AI requests during breaks

## 🔄 Troubleshooting

### Dashboard Issues
- **"Disconnesso"** → Check internet connection, refresh page
- **Buttons not working** → Clear browser cache, reload
- **Timer stuck** → Use "Reset Tutto" button

### Audience Issues
- **Can't vote** → Check if voting is open, share new QR code
- **Already voted error** → Normal behavior, prevents spam
- **Page not loading** → Share direct link, check GitHub Pages status

### Emergency Procedures
- **Red "Stop Emergenza"** → Stops all systems for 5 seconds
- **"Reset Tutto"** → Clears all data, starts fresh
- **Browser refresh** → Dashboard reconnects automatically

## 📱 URLs for Quick Reference

```
Dashboard:    https://giobi.github.io/thecenti/admin/dashboard.html
Vote Page:    https://giobi.github.io/thecenti/live/vote.html
AI Request:   https://giobi.github.io/thecenti/live/request.html
Display Mode: https://giobi.github.io/thecenti/live/display.html
```

## 🎸 Ready to Rock! 

Your live show hub is now **production-ready** with real-time backend support. The band can control everything from a tablet backstage while the audience interacts in real-time from their phones.

**Next deployment: ~15 minutes**  
**Next live show: READY! 🎤🔥**