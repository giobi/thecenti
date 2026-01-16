// Dashboard JavaScript
class TheCentiDashboard {
    constructor() {
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
            // In production, this will be your Cloudflare Worker WebSocket endpoint
            // For now, we'll simulate the connection
            setTimeout(() => {
                this.updateConnectionStatus(true);
                this.startHeartbeat();
            }, 1000);
            
            // Simulate some initial data
            setTimeout(() => {
                this.updateVoteResults([
                    { name: 'Albachiara', votes: 42 },
                    { name: 'Vita Spericolata', votes: 31 },
                    { name: 'Sally', votes: 27 }
                ]);
            }, 2000);
            
        } catch (error) {
            console.error('WebSocket connection failed:', error);
            this.updateConnectionStatus(false);
        }
    }

    startHeartbeat() {
        setInterval(() => {
            if (!this.state.connected) {
                this.connectWebSocket();
            }
        }, 30000); // Check every 30 seconds
    }

    // Vote Control Methods
    toggleVote() {
        const newState = !this.state.voteOpen;
        this.state.voteOpen = newState;
        
        // Send to WebSocket/API
        this.sendStateUpdate('vote', newState);
        
        // Update UI
        this.updateVoteStatus(newState);
        this.updateToggleButton('toggleVote', newState, 'APRI VOTI', 'CHIUDI VOTI');
        
        if (newState) {
            this.showNotification('✅ Votazione APERTA! Il pubblico può ora votare.', 'success');
        } else {
            this.showNotification('🔒 Votazione CHIUSA. Risultati finali salvati.', 'info');
        }
    }

    toggleAI() {
        const newState = !this.state.aiEnabled;
        this.state.aiEnabled = newState;
        
        // Send to WebSocket/API
        this.sendStateUpdate('ai', newState);
        
        // Update UI
        this.updateAIStatus(newState);
        this.updateToggleButton('toggleAI', newState, 'ABILITA AI', 'DISABILITA AI');
        
        if (newState) {
            this.showNotification('🤖 AI ABILITATA! Il pubblico può fare richieste.', 'success');
        } else {
            this.showNotification('🚫 AI DISABILITATA. Richieste bloccate.', 'info');
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
    approveRequest(queueItem) {
        const requestText = queueItem.querySelector('.request-text').textContent;
        
        // Send approval to backend
        this.sendAIAction('approve', {
            text: requestText,
            timestamp: Date.now()
        });
        
        // Animate and remove from queue
        queueItem.style.transform = 'translateX(100%)';
        queueItem.style.opacity = '0';
        
        setTimeout(() => {
            queueItem.remove();
        }, 300);
        
        this.showNotification(`✅ Richiesta approvata: "${requestText.substring(0, 30)}..."`, 'success');
    }

    rejectRequest(queueItem) {
        const requestText = queueItem.querySelector('.request-text').textContent;
        
        // Send rejection to backend
        this.sendAIAction('reject', {
            text: requestText,
            timestamp: Date.now()
        });
        
        // Animate and remove from queue
        queueItem.style.transform = 'translateX(-100%)';
        queueItem.style.opacity = '0';
        
        setTimeout(() => {
            queueItem.remove();
        }, 300);
        
        this.showNotification(`❌ Richiesta rifiutata`, 'info');
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
    sendStateUpdate(type, value) {
        const data = {
            type: type,
            value: value,
            timestamp: Date.now()
        };
        
        console.log('Sending state update:', data);
        
        // In production, this would send to your Cloudflare Worker
        // For now, we'll just log it
        
        // Example WebSocket send:
        // if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
        //     this.websocket.send(JSON.stringify(data));
        // }
        
        // Example fetch to API:
        // fetch('/api/update-state', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify(data)
        // });
    }

    sendAIAction(action, data) {
        console.log('AI Action:', action, data);
        // Similar to sendStateUpdate but for AI-specific actions
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