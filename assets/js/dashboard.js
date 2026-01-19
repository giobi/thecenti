// Dashboard JavaScript
class TheCentiDashboard {
    constructor() {
        this.API_BASE = 'https://thecenti-live-hub.giobi.workers.dev';
        this.state = {
            voteOpen: false,
            aiEnabled: false,
            connected: false,
            timer: null,
            countdown: 0,
            currentCluster: null,
            currentOptions: []
        };
        
        this.websocket = null;
        this.setlistData = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeUI();
        this.connectWebSocket();
    }

    bindEvents() {
        // Toggle buttons
        document.getElementById('toggleVote').addEventListener('click', () => this.toggleVote());
        document.getElementById('toggleAI').addEventListener('click', () => this.toggleAI());
        
        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
        
        // Cluster selector
        document.getElementById('clusterSelect').addEventListener('change', (e) => this.onClusterChange(e));
        document.getElementById('generateSongs').addEventListener('click', () => this.generateRandomSongs());
        
        // Quick actions
        document.getElementById('resetAll').addEventListener('click', () => this.resetAll());
        document.getElementById('showQR').addEventListener('click', () => this.showQRModal());
        document.getElementById('emergencyStop').addEventListener('click', () => this.emergencyStop());
        
        // Modal close
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('qrModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });
        
        // AI queue actions
        this.bindQueueActions();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    bindQueueActions() {
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-approve')) {
                this.approveRequest(e.target.closest('.queue-item'));
            } else if (e.target.classList.contains('btn-reject')) {
                this.rejectRequest(e.target.closest('.queue-item'));
            }
        });
    }

    initializeUI() {
        this.updateConnectionStatus(false);
        this.updateVoteStatus(false);
        this.updateAIStatus(false);
        this.updateTimerDisplay('--:--');
        
        // Load setlist data for cluster management
        this.loadSetlistData();
    }

    // WebSocket Connection
    connectWebSocket() {
        try {
            // Connect to real API and check status
            this.checkConnectionStatus();
            
            // Start polling for real-time updates
            this.startPolling();
            
        } catch (error) {
            console.error('API connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    async checkConnectionStatus() {
        try {
            const response = await fetch(`${this.API_BASE}/api/state`);
            if (response.ok) {
                const state = await response.json();
                this.updateConnectionStatus(true);
                this.updateVoteStatus(state.voteOpen || false);
                this.updateAIStatus(state.aiEnabled || false);
                
                // Load initial data
                this.loadVoteResults();
                this.loadAIQueue();
                this.loadGeneratedSongs();
            } else {
                throw new Error('API not responding');
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            this.updateConnectionStatus(false);
            // Retry in 10 seconds
            setTimeout(() => this.checkConnectionStatus(), 10000);
        }
    }

    startPolling() {
        // Poll for updates every 3 seconds
        setInterval(() => {
            if (this.state.connected) {
                this.loadVoteResults();
                this.loadAIQueue();
                this.loadGeneratedSongs();
            }
        }, 3000);
    }

    startHeartbeat() {
        setInterval(() => {
            if (!this.state.connected) {
                this.connectWebSocket();
            }
        }, 30000); // Check every 30 seconds
    }

    // Vote Control Methods
    async toggleVote() {
        const newState = !this.state.voteOpen;

        // Check if songs have been generated
        if (newState && (!this.state.currentOptions || this.state.currentOptions.length === 0)) {
            this.showNotification('⚠️ Prima devi generare 3 canzoni con "Genera 3 Canzoni"!', 'error');
            return;
        }

        let result;
        if (newState) {
            // Opening vote - send CURRENT generated songs, not hardcoded!
            const songTitles = this.state.currentOptions.map(song => song.name);
            console.log('[DEBUG] Opening vote with songs:', songTitles);

            result = await this.sendVoteAction('start_vote', {
                songs: songTitles
            });
        } else {
            // Closing vote
            result = await this.sendVoteAction('close_vote');
        }
        
        if (result) {
            this.state.voteOpen = newState;
            this.updateVoteStatus(newState);
            this.updateToggleButton('toggleVote', newState, 'APRI VOTI', 'CHIUDI VOTI');
            
            // Update NEXT buttons visibility
            this.updateNextButtonsVisibility();
            
            if (newState) {
                this.showNotification('✅ Votazione APERTA! Il pubblico può ora votare.', 'success');
            } else {
                this.showNotification('🔒 Votazione CHIUSA. Risultati finali salvati.', 'info');
            }
        }
    }

    async toggleAI() {
        const newState = !this.state.aiEnabled;
        
        const result = await this.sendStateUpdate('aiEnabled', newState);
        
        if (result) {
            this.state.aiEnabled = newState;
            this.updateAIStatus(newState);
            this.updateToggleButton('toggleAI', newState, 'ABILITA AI', 'DISABILITA AI');
            
            if (newState) {
                this.showNotification('🤖 AI ABILITATA! Il pubblico può fare richieste.', 'success');
            } else {
                this.showNotification('🚫 AI DISABILITATA. Richieste bloccate.', 'info');
            }
        }
    }

    startTimer() {
        const timerSelect = document.getElementById('voteTimer');
        const seconds = parseInt(timerSelect.value);
        
        if (this.state.timer) {
            clearInterval(this.state.timer);
        }
        
        this.state.countdown = seconds;
        this.updateTimerDisplay(this.formatTime(seconds));
        
        this.state.timer = setInterval(() => {
            this.state.countdown--;
            this.updateTimerDisplay(this.formatTime(this.state.countdown));
            
            if (this.state.countdown <= 0) {
                clearInterval(this.state.timer);
                this.state.timer = null;
                this.onTimerFinished();
            }
        }, 1000);
        
        this.showNotification(`⏰ Timer avviato: ${seconds} secondi`, 'info');
    }

    onTimerFinished() {
        // Auto-close voting when timer ends
        if (this.state.voteOpen) {
            this.toggleVote();
        }
        
        this.showNotification('⏰ TEMPO SCADUTO! Votazione automaticamente chiusa.', 'warning');
        this.updateTimerDisplay('FINITO');
        
        // Flash the timer display
        const timerDisplay = document.getElementById('timerDisplay');
        timerDisplay.style.animation = 'flash 1s ease-in-out 3';
    }

    // AI Queue Management
    async approveRequest(queueItem) {
        const requestId = queueItem.dataset.requestId;
        const requestText = queueItem.querySelector('.request-text').textContent;

        const result = await this.sendAIAction('approve_request', { requestId });

        if (result) {
            // Animate and remove from queue
            queueItem.style.transform = 'translateX(100%)';
            queueItem.style.opacity = '0';

            setTimeout(() => {
                queueItem.remove();
            }, 300);

            this.showNotification(`✅ Richiesta approvata: "${requestText.substring(0, 30)}..."`, 'success');

            // Auto-trigger song generation
            this.showNotification('🎵 Avvio generazione canzone...', 'info');
            await this.generateSong(requestId);
        }
    }

    async generateSong(requestId) {
        try {
            this.showNotification('⏳ Generando canzone con Gemini AI... (può richiedere 10-30s)', 'info');

            console.log('[DEBUG] Starting song generation for requestId:', requestId);

            const result = await this.sendAIAction('generate_song', { requestId });

            console.log('[DEBUG] Generation result:', result);

            if (result && result.success) {
                const songTitle = result.song?.lyrics?.title || 'Senza titolo';
                this.showNotification(`✅ Canzone generata: "${songTitle}"`, 'success');
                console.log('[DEBUG] Generated song:', result.song);
                // Reload generated songs list
                this.loadGeneratedSongs();
            } else {
                const errorMsg = result?.error || 'Unknown error';
                const errorDetail = result?.message || '';
                throw new Error(`Generation failed: ${errorMsg} - ${errorDetail}`);
            }
        } catch (error) {
            console.error('Song generation error:', error);
            this.showNotification(`❌ Errore generazione: ${error.message}`, 'error');

            // Show detailed error in console for debugging
            console.error('Full error details:', error);
        }
    }

    async rejectRequest(queueItem) {
        const requestId = queueItem.dataset.requestId;
        const requestText = queueItem.querySelector('.request-text').textContent;

        const result = await this.sendAIAction('reject_request', { requestId });

        if (result) {
            // Animate and remove from queue
            queueItem.style.transform = 'translateX(-100%)';
            queueItem.style.opacity = '0';

            setTimeout(() => {
                queueItem.remove();
            }, 300);

            this.showNotification(`❌ Richiesta rifiutata`, 'info');
        }
    }

    // Generated Songs Management
    async loadGeneratedSongs() {
        try {
            const response = await this.sendAIAction('list_generated_songs', {});
            if (response && response.success) {
                const songs = response.songs.filter(s => s.status !== 'played');
                this.renderGeneratedSongs(songs);
            }
        } catch (error) {
            console.error('Failed to load generated songs:', error);
        }
    }

    renderGeneratedSongs(songs) {
        const container = document.getElementById('generatedSongsContainer');
        if (!container) {
            console.warn('[WARN] generatedSongsContainer not found in DOM');
            return;
        }

        if (!songs || songs.length === 0) {
            container.innerHTML = '<div class="no-requests">Nessuna canzone generata</div>';
            return;
        }

        // Filter out malformed songs
        const validSongs = songs.filter(song => song.lyrics && song.lyrics.title);
        console.log('[DEBUG] Rendering', validSongs.length, 'valid generated songs (filtered from', songs.length, ')');

        container.innerHTML = validSongs.map(song => `
            <div class="generated-song-item" data-song-id="${song.id}" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 15px; margin-bottom: 1rem;">
                <div class="song-info">
                    <div class="song-title" style="font-size: 1.2rem; font-weight: 700; color: var(--accent-gold);">${song.lyrics.title}</div>
                    <div class="song-meta" style="font-size: 0.9rem; color: var(--text-gray); margin-top: 0.5rem;">
                        Per: ${song.dedicatedTo} • ${song.occasion} • ${song.genre || 'rock'}
                    </div>
                    <div class="song-status-badge ${song.status}" style="display: inline-block; padding: 0.25rem 0.75rem; border-radius: 15px; font-size: 0.8rem; font-weight: 600; margin-top: 0.5rem; ${song.status === 'active' ? 'background: #ff4444; color: white;' : 'background: #8b5cf6; color: white;'}">${song.status === 'active' ? '🎸 IN LIVE' : '📝 Pronta'}</div>
                </div>
                <div class="song-actions" style="display: flex; gap: 0.5rem;">
                    <button class="btn-preview" onclick="dashboard.previewSong('${song.id}')" style="padding: 0.5rem 1rem; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; background: #8b5cf6; color: white;">👁️ Preview</button>
                    ${song.status !== 'active' ? `<button class="btn-set-current" onclick="dashboard.setCurrentSong('${song.id}')" style="padding: 0.5rem 1rem; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; background: #ffd700; color: #1a1a2e;">▶️ Set Current</button>` : ''}
                    <button class="btn-mark-played" onclick="dashboard.markPlayed('${song.id}')" style="padding: 0.5rem 1rem; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; background: #ff4444; color: white;">✅ Played</button>
                </div>
            </div>
        `).join('');
    }

    async setCurrentSong(songId) {
        try {
            const result = await this.sendAIAction('set_current_song', { songId });

            if (result && result.success) {
                const songTitle = result.currentSong?.title || 'Canzone';
                this.showNotification(`🎸 "${songTitle}" è ora in live!`, 'success');
                this.loadGeneratedSongs();
            }
        } catch (error) {
            console.error('Failed to set current song:', error);
            this.showNotification('❌ Errore impostazione canzone corrente', 'error');
        }
    }

    async markPlayed(songId) {
        if (!confirm('Sei sicuro di voler archiviare questa canzone?')) {
            return;
        }

        try {
            const result = await this.sendAIAction('mark_played', { songId });

            if (result && result.success) {
                this.showNotification('✅ Canzone archiviata!', 'success');
                this.loadGeneratedSongs();
            }
        } catch (error) {
            console.error('Failed to mark played:', error);
            this.showNotification('❌ Errore archiviazione', 'error');
        }
    }

    async previewSong(songId) {
        try {
            const response = await this.sendAIAction('list_generated_songs', {});
            if (!response || !response.success) return;

            const song = response.songs.find(s => s.id === songId);
            if (!song) return;

            // Check if song has valid lyrics
            if (!song.lyrics || !song.lyrics.title) {
                this.showNotification('❌ Canzone malformata (lyrics mancanti)', 'error');
                return;
            }

            // Show modal with lyrics
            const modal = document.getElementById('qrModal');
            const modalContent = modal.querySelector('.modal-content');

            modalContent.innerHTML = `
                <span class="close" onclick="dashboard.closeModal()">&times;</span>
                <h2 style="color: var(--accent-gold); margin-bottom: var(--space-lg);">
                    ${song.lyrics.title}
                </h2>
                <p style="color: var(--text-gray); margin-bottom: var(--space-xl);">
                    Per: <strong>${song.dedicatedTo}</strong> • ${song.occasion}
                </p>

                <div class="lyrics-preview" style="max-height: 60vh; overflow-y: auto; text-align: left;">
                    <div style="margin-bottom: var(--space-lg);">
                        <h3 style="color: var(--accent-purple);">Strofa 1</h3>
                        ${song.lyrics.verse1.map(line => `<p>${line}</p>`).join('')}
                    </div>

                    <div style="margin-bottom: var(--space-lg);">
                        <h3 style="color: var(--accent-gold);">Ritornello</h3>
                        ${song.lyrics.chorus.map(line => `<p>${line}</p>`).join('')}
                    </div>

                    <div style="margin-bottom: var(--space-lg);">
                        <h3 style="color: var(--accent-purple);">Strofa 2</h3>
                        ${song.lyrics.verse2.map(line => `<p>${line}</p>`).join('')}
                    </div>

                    <div style="margin-bottom: var(--space-lg);">
                        <h3 style="color: var(--accent-red);">Bridge</h3>
                        ${song.lyrics.bridge.map(line => `<p>${line}</p>`).join('')}
                    </div>

                    <div>
                        <h3 style="color: var(--accent-gold);">Ritornello Finale</h3>
                        ${song.lyrics.finalChorus.map(line => `<p>${line}</p>`).join('')}
                    </div>
                </div>
            `;

            modal.style.display = 'block';

        } catch (error) {
            console.error('Preview error:', error);
        }
    }

    // Emergency and Reset Functions
    resetAll() {
        if (!confirm('⚠️ Sei sicuro di voler resettare tutto? Questa azione non può essere annullata.')) {
            return;
        }
        
        // Reset all states
        if (this.state.timer) {
            clearInterval(this.state.timer);
            this.state.timer = null;
        }
        
        this.state.voteOpen = false;
        this.state.aiEnabled = false;
        this.state.countdown = 0;
        
        // Update UI
        this.updateVoteStatus(false);
        this.updateAIStatus(false);
        this.updateTimerDisplay('--:--');
        this.updateToggleButton('toggleVote', false, 'APRI VOTI', 'CHIUDI VOTI');
        this.updateToggleButton('toggleAI', false, 'ABILITA AI', 'DISABILITA AI');
        
        // Clear vote results
        this.updateVoteResults([]);
        
        // Clear AI queue
        document.getElementById('aiQueue').innerHTML = '<div class="no-requests">Nessuna richiesta in coda</div>';
        
        // Send reset to backend
        this.sendStateUpdate('reset', true);
        
        this.showNotification('🔄 Sistema resettato completamente', 'info');
    }

    emergencyStop() {
        if (!confirm('🚨 STOP DI EMERGENZA - Questo fermerà immediatamente tutte le attività. Confermi?')) {
            return;
        }
        
        // Emergency shutdown
        this.resetAll();
        this.updateConnectionStatus(false);
        
        // Show emergency message
        this.showNotification('🚨 STOP DI EMERGENZA ATTIVATO', 'error');
        
        // Disable all controls temporarily
        const buttons = document.querySelectorAll('button');
        buttons.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        });
        
        // Re-enable after 5 seconds
        setTimeout(() => {
            buttons.forEach(btn => {
                btn.disabled = false;
                btn.style.opacity = '1';
            });
            this.connectWebSocket();
        }, 5000);
    }

    // UI Update Methods
    updateConnectionStatus(connected) {
        this.state.connected = connected;
        const statusIndicator = document.getElementById('connectionStatus');
        const dot = statusIndicator.querySelector('.status-dot');
        const text = statusIndicator.querySelector('.status-text');
        
        if (connected) {
            dot.classList.remove('offline');
            dot.classList.add('online');
            text.textContent = 'Connesso';
        } else {
            dot.classList.remove('online');
            dot.classList.add('offline');
            text.textContent = 'Disconnesso';
        }
    }

    updateVoteStatus(isOpen) {
        const statusBadge = document.getElementById('voteStatus').querySelector('.status-badge');
        statusBadge.textContent = isOpen ? 'APERTO' : 'CHIUSO';
        statusBadge.className = `status-badge ${isOpen ? 'open' : 'closed'}`;
    }

    updateAIStatus(isEnabled) {
        const statusBadge = document.getElementById('aiStatus').querySelector('.status-badge');
        statusBadge.textContent = isEnabled ? 'ABILITATO' : 'DISABILITATO';
        statusBadge.className = `status-badge ${isEnabled ? 'open' : 'closed'}`;
    }

    updateToggleButton(buttonId, isActive, inactiveText, activeText) {
        const button = document.getElementById(buttonId);
        const textSpan = button.querySelector('.btn-text');
        
        if (isActive) {
            button.classList.add('active');
            textSpan.textContent = activeText;
        } else {
            button.classList.remove('active');
            textSpan.textContent = inactiveText;
        }
    }

    updateTimerDisplay(timeText) {
        document.getElementById('timerDisplay').textContent = timeText;
    }

    updateVoteResults(resultsData) {
        const resultsContainer = document.getElementById('liveResults');

        // Handle both array (legacy) and object with results property
        const results = Array.isArray(resultsData) ? resultsData : (resultsData.results || []);
        const totalVotes = resultsData.totalVotes || results.reduce((sum, result) => sum + result.votes, 0);

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-votes">Nessun voto ancora</div>';
            return;
        }

        resultsContainer.innerHTML = results.map(result => {
            const percentage = totalVotes > 0 ? Math.round((result.votes / totalVotes) * 100) : 0;
            return `
                <div class="result-item">
                    <span class="song-name">${result.name}</span>
                    <span class="vote-percent">${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    // Utility Methods
    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    showQRModal() {
        document.getElementById('qrModal').style.display = 'block';
    }

    closeModal() {
        document.getElementById('qrModal').style.display = 'none';
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 2rem',
            backgroundColor: this.getNotificationColor(type),
            color: 'white',
            borderRadius: '10px',
            fontWeight: 'bold',
            zIndex: '9999',
            maxWidth: '400px',
            boxShadow: '0 8px 25px rgba(0, 0, 0, 0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }

    getNotificationColor(type) {
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196F3'
        };
        return colors[type] || colors.info;
    }

    handleKeyboard(e) {
        // Keyboard shortcuts for quick actions
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'v':
                    e.preventDefault();
                    this.toggleVote();
                    break;
                case 'a':
                    e.preventDefault();
                    this.toggleAI();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetAll();
                    break;
                case 't':
                    e.preventDefault();
                    this.startTimer();
                    break;
            }
        }
        
        // Escape to close modal
        if (e.key === 'Escape') {
            this.closeModal();
        }
    }

    // Communication with Backend
    async sendStateUpdate(type, value) {
        const data = { [type]: value };
        
        try {
            const response = await fetch(`${this.API_BASE}/api/state`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const result = await response.json();
            console.log('State update success:', result);
            return result;

        } catch (error) {
            console.error('State update failed:', error);
            this.showNotification('Errore di connessione al server', 'error');
            return null;
        }
    }

    async sendVoteAction(action, data = {}) {
        try {
            const response = await fetch(`${this.API_BASE}/api/vote`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });

            if (!response.ok) {
                throw new Error(`Vote API error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('Vote action failed:', error);
            this.showNotification('Errore gestione voti', 'error');
            return null;
        }
    }

    async sendAIAction(action, data) {
        try {
            const response = await fetch(`${this.API_BASE}/api/ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, ...data })
            });

            if (!response.ok) {
                throw new Error(`AI API error: ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            console.error('AI action failed:', error);
            this.showNotification('Errore gestione AI requests', 'error');
            return null;
        }
    }

    async loadVoteResults() {
        try {
            const response = await fetch(`${this.API_BASE}/api/vote`);
            if (response.ok) {
                const voteData = await response.json();
                if (voteData.votes && voteData.songs) {
                    const results = this.calculateResults(voteData);
                    this.updateVoteResults(results);
                }
            }
        } catch (error) {
            console.error('Failed to load vote results:', error);
        }
    }

    async loadAIQueue() {
        try {
            const response = await fetch(`${this.API_BASE}/api/ai`);
            if (response.ok) {
                const queueData = await response.json();
                this.updateAIQueue(queueData.requests || []);
            }
        } catch (error) {
            console.error('Failed to load AI queue:', error);
        }
    }

    calculateResults(voteData) {
        const songCounts = {};
        const songNames = voteData.songs;

        songNames.forEach((song, index) => {
            songCounts[index] = 0;
        });

        Object.values(voteData.votes).forEach(vote => {
            if (songCounts.hasOwnProperty(vote.songIndex)) {
                songCounts[vote.songIndex]++;
            }
        });

        const results = songNames.map((name, index) => {
            const votes = songCounts[index] || 0;
            const percentage = voteData.totalVotes > 0 ? 
                Math.round((votes / voteData.totalVotes) * 100) : 0;
            
            return { name, votes, percentage };
        });

        return {
            results: results,
            totalVotes: voteData.totalVotes,
            lastUpdate: Date.now()
        };
    }

    updateAIQueue(requests) {
        const queueContainer = document.getElementById('aiQueue');

        if (!requests || requests.length === 0) {
            queueContainer.innerHTML = '<div class="no-requests">Nessuna richiesta in coda</div>';
            return;
        }

        queueContainer.innerHTML = requests.map(request => `
            <div class="queue-item" data-request-id="${request.id}">
                <div class="request-info">
                    <div class="request-text">
                        <strong>Per: ${request.dedicatedTo || 'N/A'}</strong> • ${request.occasion || 'N/A'}
                    </div>
                    <div class="request-meta">
                        Personalità: ${Array.isArray(request.personality) ? request.personality.join(', ') : request.personality || 'N/A'} • Da: ${request.userName} • ${this.formatTimeAgo(request.timestamp)}
                    </div>
                    <div class="request-story" style="font-size: 0.9rem; color: var(--text-gray); margin-top: var(--space-xs); max-height: 60px; overflow: hidden;">
                        ${(request.story || '').substring(0, 100)}${(request.story || '').length > 100 ? '...' : ''}
                    </div>
                </div>
                <div class="request-actions">
                    <button class="btn-approve">✅</button>
                    <button class="btn-reject">❌</button>
                </div>
            </div>
        `).join('');
    }

    formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'ora';
        const minutes = Math.floor(seconds / 60);
        return `${minutes} min fa`;
    }

    // Cluster Management Methods
    async loadSetlistData() {
        try {
            const response = await fetch('../setlist.json');
            if (response.ok) {
                this.setlistData = await response.json();
                console.log('Setlist data loaded:', this.setlistData.length, 'songs');
            } else {
                throw new Error('Failed to load setlist.json');
            }
        } catch (error) {
            console.error('Error loading setlist data:', error);
            this.showNotification('Errore caricamento dati setlist', 'error');
        }
    }

    onClusterChange(event) {
        const cluster = event.target.value;
        this.state.currentCluster = cluster;
        
        // Update cluster status
        const statusBadge = document.getElementById('clusterStatus').querySelector('.status-badge');
        if (cluster) {
            statusBadge.textContent = cluster.toUpperCase();
            statusBadge.className = 'status-badge open';
        } else {
            statusBadge.textContent = 'NESSUNO';
            statusBadge.className = 'status-badge';
        }
        
        // Hide vote options when cluster changes
        document.getElementById('voteOptions').style.display = 'none';
    }

    async generateRandomSongs() {
        if (!this.state.currentCluster) {
            this.showNotification('⚠️ Seleziona prima un cluster!', 'warning');
            return;
        }

        if (!this.setlistData) {
            await this.loadSetlistData();
        }

        const clusterSongs = this.getSongsByCluster(this.state.currentCluster);
        
        if (clusterSongs.length < 3) {
            this.showNotification(`⚠️ Il cluster ${this.state.currentCluster} ha solo ${clusterSongs.length} canzoni!`, 'warning');
            return;
        }

        // Generate 3 random songs
        const randomSongs = this.getRandomSongs(clusterSongs, 3);
        this.state.currentOptions = randomSongs;

        // Save to localStorage for vote page synchronization
        localStorage.setItem('thecenti_current_songs', JSON.stringify(
            randomSongs.map(song => ({ title: song.name, author: song.author }))
        ));

        // Display the options
        this.displayVoteOptions(randomSongs);

        // Show the vote options section
        document.getElementById('voteOptions').style.display = 'block';

        this.showNotification(`🎲 Generate 3 canzoni dal cluster ${this.state.currentCluster.toUpperCase()}`, 'success');
    }

    getSongsByCluster(cluster) {
        if (!this.setlistData) return [];
        
        // Define cluster filters based on our analysis
        const clusterFilters = {
            'italia': song => song.genre.includes('italiano') || song.genre.includes('italiano-'),
            '80s': song => song.genre.includes('80s'),
            'boyband': song => song.genre === '90s-pop' && (
                song.author.includes('Backstreet') || 
                song.author.includes('Take That') || 
                song.author.includes('NSYNC') ||
                song.name.includes('Back For Good') ||
                song.name.includes('I Want It That Way')
            ),
            'dance': song => song.genre.includes('edm') || 
                           song.genre.includes('dance') || 
                           song.genre.includes('disco') ||
                           song.vibe === 'ballare',
            'rock': song => song.genre.includes('rock') && 
                          !song.name.includes('Africa') && 
                          !song.name.includes('Feel') &&
                          !song.name.includes('Angels'),
            'ballad': song => song.name === 'Africa' || 
                            song.name === 'Feel' || 
                            song.name === 'Angels' || 
                            song.name === 'California Dreamin' ||
                            song.name === 'Iris' ||
                            song.vibe === 'cantare' && song.frequency >= 6,
            'filler': song => !song.genre.includes('italiano') && 
                            !song.genre.includes('80s') && 
                            !song.genre.includes('rock') &&
                            song.vibe === 'ballare',
            'revival': song => song.genre.includes('60s') || 
                             song.name.includes('Aquarius') ||
                             song.name.includes('Happy Together')
        };

        const filter = clusterFilters[cluster];
        if (!filter) return [];

        return this.setlistData.filter(filter);
    }

    getRandomSongs(songs, count) {
        const shuffled = [...songs].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, count);
    }

    displayVoteOptions(songs) {
        const optionList = document.getElementById('optionList');
        
        optionList.innerHTML = songs.map((song, index) => `
            <div class="vote-option" data-song-index="${index}">
                <div class="song-info">
                    <div class="song-title">${song.name}</div>
                    <div class="song-meta">${song.author} • ${song.genre} • ${song.frequency}x</div>
                </div>
                <div class="song-actions">
                    <button class="btn-next" onclick="dashboard.replaceSong(${index})">
                        🔄 NEXT
                    </button>
                </div>
            </div>
        `).join('');

        // Update voting state visibility
        this.updateNextButtonsVisibility();
    }

    replaceSong(songIndex) {
        if (!this.state.currentCluster || !this.setlistData) return;

        const clusterSongs = this.getSongsByCluster(this.state.currentCluster);
        
        // Get current songs to avoid duplicates
        const currentSongIds = this.state.currentOptions.map(song => song.id);
        
        // Filter out current songs
        const availableSongs = clusterSongs.filter(song => !currentSongIds.includes(song.id));
        
        if (availableSongs.length === 0) {
            this.showNotification('⚠️ Nessun altro pezzo disponibile in questo cluster!', 'warning');
            return;
        }

        // Pick a random replacement
        const randomSong = availableSongs[Math.floor(Math.random() * availableSongs.length)];
        
        // Replace the song
        this.state.currentOptions[songIndex] = randomSong;
        
        // Re-display options
        this.displayVoteOptions(this.state.currentOptions);
        
        this.showNotification(`🔄 Sostituito: ${randomSong.name}`, 'info');
    }

    updateNextButtonsVisibility() {
        const voteOptions = document.getElementById('voteOptions');
        const nextButtons = document.querySelectorAll('.btn-next');
        
        if (this.state.voteOpen) {
            voteOptions.classList.add('voting-active');
            nextButtons.forEach(btn => btn.style.display = 'none');
        } else {
            voteOptions.classList.remove('voting-active');
            nextButtons.forEach(btn => btn.style.display = 'block');
        }
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new TheCentiDashboard();
    
    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes flash {
            0%, 50%, 100% { background: rgba(255, 107, 53, 0.1); }
            25%, 75% { background: rgba(244, 67, 54, 0.3); }
        }
        
        .notification {
            animation: slideIn 0.3s ease;
        }
        
        @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }
    `;
    document.head.appendChild(style);
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TheCentiDashboard;
}