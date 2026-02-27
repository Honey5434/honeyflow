/**
 * Mehroz - AI Personal Assistant
 * Smart Task Scheduling & Reminder Engine
 * 
 * Architecture:
 * - LocalStorage persistence for tasks
 * - Web Notifications API for desktop alerts
 * - Web Speech API for voice alerts
 * - Service Worker ready for future integrations (WhatsApp, Telegram, Email)
 */

class MehrozAssistant {
    constructor() {
        this.tasks = [];
        this.init();
    }

    init() {
        this.loadTasks();
        this.setupEventListeners();
        this.updateClock();
        this.renderAllTasks();
        this.startRemindersCheck();
        this.setDefaultDates();
        
        // Request notification permission
        this.requestNotificationPermission();
    }

    /**
     * LocalStorage Management
     */
    loadTasks() {
        const stored = localStorage.getItem('mehrozTasks');
        this.tasks = stored ? JSON.parse(stored) : [];
    }

    saveTasks() {
        localStorage.setItem('mehrozTasks', JSON.stringify(this.tasks));
        this.updateStats();
    }

    /**
     * Set default date to today and time to current time
     */
    setDefaultDates() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('taskDate').value = today;
        
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        document.getElementById('taskTime').value = `${hours}:${minutes}`;
    }

    /**
     * Clock Widget
     */
    updateClock() {
        const updateTime = () => {
            const now = new Date();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            document.getElementById('clockTime').textContent = `${hours}:${minutes}`;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    /**
     * Task Management
     */
    addTask(name, date, time, type) {
        const task = {
            id: Date.now(),
            name,
            date,
            time,
            type,
            completed: false,
            createdAt: new Date().toISOString(),
            reminderSent: false
        };
        
        this.tasks.push(task);
        this.saveTasks();
        this.renderAllTasks();
    }

    deleteTask(id) {
        this.tasks = this.tasks.filter(task => task.id !== id);
        this.saveTasks();
        this.renderAllTasks();
    }

    toggleTaskComplete(id) {
        const task = this.tasks.find(t => t.id === id);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            this.renderAllTasks();
        }
    }

    /**
     * Render Tasks
     */
    renderAllTasks() {
        const today = new Date().toISOString().split('T')[0];
        
        const todayTasks = this.tasks.filter(t => t.date === today).sort((a, b) => {
            return a.time.localeCompare(b.time);
        });
        
        const upcomingTasks = this.tasks.filter(t => t.date > today).sort((a, b) => {
            if (a.date === b.date) return a.time.localeCompare(b.time);
            return a.date.localeCompare(b.date);
        });
        
        this.renderTaskList('todayTasksList', todayTasks);
        this.renderTaskList('upcomingTasksList', upcomingTasks);
        this.updateStats();
    }

    renderTaskList(elementId, tasks) {
        const container = document.getElementById(elementId);
        
        if (tasks.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">${elementId === 'todayTasksList' ? '✨' : '📋'}</div>
                    <div class="empty-text">${elementId === 'todayTasksList' ? 'No tasks for today yet.' : 'No upcoming tasks.'}<br>Add one to get started!</div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = tasks.map(task => {
            const [year, month, day] = task.date.split('-');
            const taskDate = new Date(year, month - 1, day);
            const dateStr = taskDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            
            return `
                <div class="task-item ${task.completed ? 'completed' : 'fade-in'}" data-task-id="${task.id}">
                    <div class="task-content">
                        <div class="task-name">${this.escapeHtml(task.name)}</div>
                        <div class="task-meta">
                            <span class="task-type ${task.type}">${this.getTaskTypeLabel(task.type)}</span>
                            <span class="task-time">🕐 ${task.time}</span>
                            ${elementId === 'upcomingTasksList' ? `<span style="color: var(--text-light);">${dateStr}</span>` : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-btn task-complete-btn" data-task-id="${task.id}" title="${task.completed ? 'Mark pending' : 'Mark complete'}">
                            ${task.completed ? '✓' : '○'}
                        </button>
                        <button class="task-btn task-delete-btn" data-task-id="${task.id}" title="Delete task">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        container.querySelectorAll('.task-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleTaskComplete(parseInt(btn.dataset.taskId));
            });
        });
        
        container.querySelectorAll('.task-delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Delete this task?')) {
                    this.deleteTask(parseInt(btn.dataset.taskId));
                }
            });
        });
    }

    getTaskTypeLabel(type) {
        const labels = {
            work: '💼 Work',
            meeting: '📞 Meeting',
            study: '📚 Study',
            personal: '🎯 Personal'
        };
        return labels[type] || type;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Statistics
     */
    updateStats() {
        const today = new Date().toISOString().split('T')[0];
        const thisWeek = new Date();
        thisWeek.setDate(thisWeek.getDate() - 7);
        const thisWeekStr = thisWeek.toISOString().split('T')[0];
        
        const todayTasks = this.tasks.filter(t => t.date === today).length;
        const completedTasks = this.tasks.filter(t => {
            return t.completed && t.date >= thisWeekStr && t.date <= today;
        }).length;
        const pendingTasks = this.tasks.filter(t => !t.completed).length;
        
        document.getElementById('todayCount').textContent = todayTasks;
        document.getElementById('completedCount').textContent = completedTasks;
        document.getElementById('pendingCount').textContent = pendingTasks;
    }

    /**
     * Reminder Engine
     */
    startRemindersCheck() {
        setInterval(() => {
            this.checkAndTriggerReminders();
        }, 30000); // Check every 30 seconds
        
        // Also check immediately on load
        this.checkAndTriggerReminders();
    }

    checkAndTriggerReminders() {
        const now = new Date();
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const currentDate = now.toISOString().split('T')[0];
        
        this.tasks.forEach(task => {
            if (task.date === currentDate && task.time === currentTime && !task.reminderSent && !task.completed) {
                this.triggerReminder(task);
                task.reminderSent = true;
                this.saveTasks();
            }
        });
    }

    triggerReminder(task) {
        // Show notification popup
        this.showNotificationPopup(task);
        
        // Play sound
        this.playNotificationSound();
        
        // Voice alert
        this.playVoiceAlert(task);
        
        // Desktop notification (if permitted)
        this.sendDesktopNotification(task);
    }

    /**
     * Notification Popup
     */
    showNotificationPopup(task) {
        const container = document.getElementById('notificationContainer');
        
        const isMeeting = task.type === 'meeting';
        const title = isMeeting ? '🎯 Meeting Alert' : '⏰ Task Reminder';
        const message = isMeeting ? 'Your meeting is starting now. Please join on time.' : `It's time to complete your task.`;
        
        const notif = document.createElement('div');
        notif.className = `notification-popup ${isMeeting ? 'meeting' : ''} fade-in`;
        notif.innerHTML = `
            <button class="notification-close">✕</button>
            <div class="notification-title">${title}</div>
            <div style="font-size: 14px; font-weight: 600; color: var(--text-dark); margin: 12px 0;">${this.escapeHtml(task.name)}</div>
            <div class="notification-message">${message}</div>
            <div style="margin-top: 16px; display: flex; gap: 8px;">
                <button class="btn btn-secondary btn-small" style="flex: 1; width: auto;">Done</button>
                <button class="btn btn-small" style="flex: 1; width: auto; background: #E5E7EB; color: var(--text-dark);">Snooze 5min</button>
            </div>
        `;
        
        container.appendChild(notif);
        
        // Close button
        notif.querySelector('.notification-close').addEventListener('click', () => {
            notif.style.animation = 'slideIn 0.4s ease reverse';
            setTimeout(() => notif.remove(), 400);
        });
        
        // Done button
        notif.querySelector('button:nth-of-type(2)').addEventListener('click', () => {
            this.toggleTaskComplete(task.id);
            notif.style.animation = 'slideIn 0.4s ease reverse';
            setTimeout(() => notif.remove(), 400);
        });
        
        // Snooze button
        notif.querySelector('button:nth-of-type(3)').addEventListener('click', () => {
            task.reminderSent = false;
            this.saveTasks();
            notif.style.animation = 'slideIn 0.4s ease reverse';
            setTimeout(() => notif.remove(), 400);
        });
        
        // Auto remove after 8 seconds
        setTimeout(() => {
            if (notif.parentElement) {
                notif.style.animation = 'slideIn 0.4s ease reverse';
                setTimeout(() => notif.remove(), 400);
            }
        }, 8000);
    }

    /**
     * Desktop Notification
     */
    requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    sendDesktopNotification(task) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const isMeeting = task.type === 'meeting';
            const title = isMeeting ? 'Meeting Alert' : 'Task Reminder';
            
            new Notification(title, {
                body: this.escapeHtml(task.name),
                icon: '✨',
                tag: `task-${task.id}`,
                requireInteraction: true
            });
        }
    }

    /**
     * Sound Alert
     */
    playNotificationSound() {
        try {
            // Create a simple beep sound using Web Audio API
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Professional soft alert sound
            oscillator.frequency.value = 800; // Hz
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            console.log('Audio not available:', e);
        }
    }

    /**
     * Voice Alert
     */
    playVoiceAlert(task) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            speechSynthesis.cancel();
            
            const isMeeting = task.type === 'meeting';
            let message = isMeeting 
                ? 'Hi, your meeting is starting now. Please join on time.'
                : `Hello, this is Mehroz. It's time to complete your task: ${task.name}`;
            
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.rate = 0.95;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.lang = 'en-US';
            
            speechSynthesis.speak(utterance);
        }
    }

    /**
     * Event Listeners
     */
    setupEventListeners() {
        // Form submission
        document.getElementById('taskForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('taskName').value.trim();
            const date = document.getElementById('taskDate').value;
            const time = document.getElementById('taskTime').value;
            const type = document.getElementById('taskType').value;
            
            if (name && date && time && type) {
                this.addTask(name, date, time, type);
                document.getElementById('taskForm').reset();
                this.setDefaultDates();
                
                // Show success feedback
                this.showFeedback('Task scheduled successfully! ✓');
            }
        });
    }

    showFeedback(message) {
        const container = document.getElementById('notificationContainer');
        const feedback = document.createElement('div');
        feedback.className = 'notification-popup fade-in';
        feedback.style.cssText = 'top: 60px; background: linear-gradient(135deg, #D4A574 0%, #C49A5F 100%); color: white; border-left: none;';
        feedback.innerHTML = `<div class="notification-title" style="color: white;">${message}</div>`;
        
        container.appendChild(feedback);
        
        setTimeout(() => {
            feedback.style.animation = 'slideIn 0.4s ease reverse';
            setTimeout(() => feedback.remove(), 400);
        }, 2000);
    }
}

/**
 * Architecture for Future Integrations
 * These placeholder functions enable:
 * - WhatsApp alerts (via Twilio API)
 * - Telegram bot notifications (via Telegram Bot API)
 * - Email reminders (via Email Service)
 * - AI productivity suggestions (via ML model)
 */

class NotificationChannels {
    /**
     * WhatsApp Integration
     * @param {string} phoneNumber - User's WhatsApp number
     * @param {object} task - Task object
     */
    static async sendWhatsAppAlert(phoneNumber, task) {
        // Future: Connect to Twilio WhatsApp API
        // POST to /api/notifications/whatsapp
        console.log('WhatsApp alert:', phoneNumber, task);
    }

    /**
     * Telegram Integration
     * @param {string} telegramUserId - User's Telegram ID
     * @param {object} task - Task object
     */
    static async sendTelegramAlert(telegramUserId, task) {
        // Future: Connect to Telegram Bot API
        // POST to /api/notifications/telegram
        console.log('Telegram alert:', telegramUserId, task);
    }

    /**
     * Email Integration
     * @param {string} email - User's email
     * @param {object} task - Task object
     */
    static async sendEmailReminder(email, task) {
        // Future: Connect to Email Service (SendGrid, AWS SES, etc.)
        // POST to /api/notifications/email
        console.log('Email reminder:', email, task);
    }
}

class AIProductivity {
    /**
     * Get productivity suggestions
     * @param {array} tasks - Array of user tasks
     */
    static async getSuggestions(tasks) {
        // Future: Connect to AI model for productivity insights
        // POST to /api/ai/suggestions
        console.log('AI suggestions for tasks:', tasks);
    }

    /**
     * Analyze task patterns
     * @param {array} tasks - Array of user tasks
     */
    static async analyzePatterns(tasks) {
        // Future: ML model for time management optimization
        // POST to /api/ai/analyze
        console.log('Pattern analysis:', tasks);
    }
}

/**
 * Service Worker Registration (for future PWA features)
 */
if ('serviceWorker' in navigator) {
    // Future: Register service worker for offline support and push notifications
    // navigator.serviceWorker.register('sw.js');
}

/**
 * Initialize the application
 */
document.addEventListener('DOMContentLoaded', () => {
    window.mehroz = new MehrozAssistant();
});