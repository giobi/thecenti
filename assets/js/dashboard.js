// Dashboard JavaScript
class TheCentiDashboard {
    constructor() {
        this.API_BASE = 'https://thecenti-live-hub.giobi.workers.dev';
        this.state = {
            voteOpen: false,
            aiEnabled: false,
            connected: false,
            timer: null,
            countdown: 0
        };
        
        this.websocket = null;
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
        
        const action = newState ? 'start_vote' : 'close_vote';
        const result = await this.sendVoteAction(action);
        
        if (result) {
            this.state.voteOpen = newState;
            this.updateVoteStatus(newState);
            this.updateToggleButton('toggleVote', newState, 'APRI VOTI', 'CHIUDI VOTI');
            
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

    updateVoteResults(results) {
        const resultsContainer = document.getElementById('liveResults');
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-votes">Nessun voto ancora</div>';
            return;
        }
        
        const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);
        
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
                    <div class="request-text">${request.text}</div>
                    <div class="request-meta">Da: ${request.userName} • ${this.formatTimeAgo(request.timestamp)} • Mood: ${request.mood}</div>
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