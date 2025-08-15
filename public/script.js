// Dashboard Climate Control - JavaScript
class ClimateDashboard {
    constructor() {
        this.apiBaseUrl = '/api';
        this.updateInterval = 5000; // 5 segundos
        this.charts = {};
        this.isConnected = false;
        this.lastData = null;
        this.otaInfo = null;
        
        this.init();
    }

    async init() {
        this.showLoading(true);
        this.setupEventListeners();
        this.setupOTAEventListeners();
        await this.initializeCharts();
        this.startDataPolling();
        this.loadOTAInfo();
        this.showLoading(false);
    }

    setupEventListeners() {
        // Chart period buttons
        document.querySelectorAll('.btn-chart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.btn-chart').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.updateChartPeriod(e.target.dataset.period);
            });
        });

        // Handle page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stopDataPolling();
            } else {
                this.startDataPolling();
            }
        });
    }

    async initializeCharts() {
        // Temperature Chart
        const tempCtx = document.getElementById('temperatureChart');
        if (tempCtx) {
            this.charts.temperature = new Chart(tempCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Temperatura (°C)',
                        data: [],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#ef4444',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: '#334155',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: '#334155',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 12
                                },
                                callback: function(value) {
                                    return value + '°C';
                                }
                            }
                        }
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: '#ef4444'
                        }
                    }
                }
            });
        }

        // Humidity Chart
        const humCtx = document.getElementById('humidityChart');
        if (humCtx) {
            this.charts.humidity = new Chart(humCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Humedad (%)',
                        data: [],
                        borderColor: '#06b6d4',
                        backgroundColor: 'rgba(6, 182, 212, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#06b6d4',
                        pointBorderColor: '#ffffff',
                        pointBorderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            grid: {
                                color: '#334155',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 12
                                }
                            }
                        },
                        y: {
                            grid: {
                                color: '#334155',
                                drawBorder: false
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 12
                                },
                                callback: function(value) {
                                    return value + '%';
                                }
                            },
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    startDataPolling() {
        this.fetchCurrentData();
        this.fetchHistoryData();
        this.fetchStats();
        
        this.pollingInterval = setInterval(() => {
            this.fetchCurrentData();
            this.fetchHistoryData();
            this.fetchStats();
        }, this.updateInterval);
    }

    stopDataPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }

    async fetchCurrentData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sensor-data`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.updateUI(result.data);
                    this.setConnectionStatus(true);
                    this.lastData = result.data;
                }
            } else {
                throw new Error('Failed to fetch data');
            }
        } catch (error) {
            console.error('Error fetching current data:', error);
            this.setConnectionStatus(false);
        }
    }

    async fetchHistoryData() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sensor-history?limit=50`);
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data.length > 0) {
                    this.updateCharts(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching history data:', error);
        }
    }

    async fetchStats() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/sensor-stats`);
            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    this.updateStats(result.data);
                }
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    }

    updateUI(data) {
        // Update temperature
        const tempValue = document.getElementById('temperatureValue');
        const tempTrend = document.getElementById('temperatureTrend');
        if (tempValue && data.temperature !== null) {
            tempValue.textContent = data.temperature.toFixed(1);
            
            // Update trend
            if (this.lastData && this.lastData.temperature !== null) {
                const diff = data.temperature - this.lastData.temperature;
                this.updateTrend(tempTrend, diff, '°C');
            }
        }

        // Update humidity
        const humValue = document.getElementById('humidityValue');
        const humTrend = document.getElementById('humidityTrend');
        if (humValue && data.humidity !== null) {
            humValue.textContent = data.humidity.toFixed(1);
            
            // Update trend
            if (this.lastData && this.lastData.humidity !== null) {
                const diff = data.humidity - this.lastData.humidity;
                this.updateTrend(humTrend, diff, '%');
            }
        }

        // Update system status
        const systemStatus = document.getElementById('systemStatus');
        if (systemStatus) {
            systemStatus.textContent = data.state || 'IDLE';
            systemStatus.className = `status-badge ${(data.state || 'idle').toLowerCase()}`;
        }

        // Update LEDs
        this.updateLED('amarillo', data.led_amarillo || 0);
        this.updateLED('verde', data.led_verde || 0);
        this.updateLED('rojo', data.led_rojo || 0);

        // Update last update time
        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate && data.timestamp) {
            const date = new Date(data.timestamp * 1000);
            lastUpdate.textContent = `Última actualización: ${date.toLocaleString('es-ES')}`;
        }

        // Update device info
        const deviceUuid = document.getElementById('deviceUuid');
        const deviceVersion = document.getElementById('deviceVersion');
        if (deviceUuid && data.uuid) deviceUuid.textContent = data.uuid;
        if (deviceVersion && data.version) deviceVersion.textContent = data.version;
    }

    updateTrend(element, diff, unit) {
        if (!element) return;
        
        const icon = element.querySelector('i');
        const span = element.querySelector('span');
        
        element.classList.remove('up', 'down');
        
        if (Math.abs(diff) < 0.1) {
            icon.className = 'fas fa-minus';
            span.textContent = 'Sin cambios';
        } else if (diff > 0) {
            icon.className = 'fas fa-arrow-up';
            span.textContent = `+${diff.toFixed(1)}${unit}`;
            element.classList.add('up');
        } else {
            icon.className = 'fas fa-arrow-down';
            span.textContent = `${diff.toFixed(1)}${unit}`;
            element.classList.add('down');
        }
    }

    updateLED(color, status) {
        const statusElement = document.getElementById(`led${color.charAt(0).toUpperCase() + color.slice(1)}Status`);
        const lightElement = document.getElementById(`led${color.charAt(0).toUpperCase() + color.slice(1)}Light`);
        
        if (statusElement) {
            const statusText = statusElement.querySelector('.status-text');
            
            if (statusText) {
                statusText.textContent = status ? 'Encendido' : 'Apagado';
            }
        }
        
        if (lightElement) {
            // Remover todas las clases de estado
            lightElement.classList.remove('amarillo-on', 'verde-on', 'rojo-on');
            
            // Agregar la clase correspondiente si está encendido
            if (status) {
                lightElement.classList.add(`${color}-on`);
            }
        }
    }

    updateCharts(historyData) {
        if (!historyData || historyData.length === 0) return;

        // Prepare data for charts
        const labels = historyData.map(item => {
            const date = new Date(item.timestamp * 1000);
            return date.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
        });

        const temperatureData = historyData.map(item => item.temperature);
        const humidityData = historyData.map(item => item.humidity);

        // Update temperature chart
        if (this.charts.temperature) {
            this.charts.temperature.data.labels = labels;
            this.charts.temperature.data.datasets[0].data = temperatureData;
            this.charts.temperature.update('none');
        }

        // Update humidity chart
        if (this.charts.humidity) {
            this.charts.humidity.data.labels = labels;
            this.charts.humidity.data.datasets[0].data = humidityData;
            this.charts.humidity.update('none');
        }
    }

    updateStats(stats) {
        const elements = {
            minTemp: document.getElementById('minTemp'),
            maxTemp: document.getElementById('maxTemp'),
            avgTemp: document.getElementById('avgTemp'),
            avgHumidity: document.getElementById('avgHumidity')
        };

        if (elements.minTemp && stats.minTemp !== null) {
            elements.minTemp.textContent = `${stats.minTemp.toFixed(1)}°C`;
        }
        
        if (elements.maxTemp && stats.maxTemp !== null) {
            elements.maxTemp.textContent = `${stats.maxTemp.toFixed(1)}°C`;
        }
        
        if (elements.avgTemp && stats.avgTemp !== null) {
            elements.avgTemp.textContent = `${stats.avgTemp.toFixed(1)}°C`;
        }
        
        if (elements.avgHumidity && stats.avgHumidity !== null) {
            elements.avgHumidity.textContent = `${stats.avgHumidity.toFixed(1)}%`;
        }
    }

    updateChartPeriod(period) {
        // This would filter the data based on the selected period
        // For now, we'll just refetch the data
        this.fetchHistoryData();
    }

    setConnectionStatus(connected) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;

        this.isConnected = connected;
        
        const icon = statusElement.querySelector('i');
        const span = statusElement.querySelector('span');
        
        statusElement.classList.remove('connected', 'disconnected');
        
        if (connected) {
            statusElement.classList.add('connected');
            icon.className = 'fas fa-wifi';
            span.textContent = 'Conectado';
        } else {
            statusElement.classList.add('disconnected');
            icon.className = 'fas fa-wifi-slash';
            span.textContent = 'Desconectado';
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            if (show) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        }
    }

    // =================== OTA Methods ===================
    setupOTAEventListeners() {
        // Check Update Button
        const checkBtn = document.getElementById('checkUpdateBtn');
        if (checkBtn) {
            checkBtn.addEventListener('click', () => this.checkForUpdates());
        }

        // Force Update Button
        const updateBtn = document.getElementById('forceUpdateBtn');
        if (updateBtn) {
            updateBtn.addEventListener('click', () => this.forceUpdate());
        }

        // Rollback Button
        const rollbackBtn = document.getElementById('rollbackBtn');
        if (rollbackBtn) {
            rollbackBtn.addEventListener('click', () => this.rollbackFirmware());
        }
    }

    async loadOTAInfo() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/ota/info`);
            if (response.ok) {
                this.otaInfo = await response.json();
                this.updateOTADisplay();
            }
        } catch (error) {
            console.error('Error loading OTA info:', error);
        }
    }

    updateOTADisplay() {
        if (!this.otaInfo) return;

        // Update version info
        const currentVersionEl = document.getElementById('currentVersion');
        const availableVersionEl = document.getElementById('availableVersion');
        const updateStatusEl = document.getElementById('updateStatus');

        if (currentVersionEl) {
            currentVersionEl.textContent = this.otaInfo.currentVersion;
        }

        if (availableVersionEl && this.otaInfo.firmware.available) {
            availableVersionEl.textContent = this.otaInfo.firmware.version;
        }

        if (updateStatusEl) {
            if (this.otaInfo.firmware.available) {
                updateStatusEl.textContent = 'Actualización disponible';
                updateStatusEl.style.color = '#f59e0b';
            } else {
                updateStatusEl.textContent = 'Sistema actualizado';
                updateStatusEl.style.color = '#22c55e';
            }
        }

        // Update changelog
        this.updateChangelog();
    }

    updateChangelog() {
        if (!this.otaInfo || !this.otaInfo.changelog) return;

        const changelogList = document.getElementById('changelogList');
        if (!changelogList) return;

        changelogList.innerHTML = '';

        this.otaInfo.changelog.forEach(item => {
            const changelogItem = document.createElement('div');
            changelogItem.className = 'changelog-item';
            
            changelogItem.innerHTML = `
                <div class="changelog-version">v${item.version}</div>
                <div class="changelog-date">${item.date}</div>
                <ul class="changelog-changes">
                    ${item.changes.map(change => `<li>${change}</li>`).join('')}
                </ul>
            `;
            
            changelogList.appendChild(changelogItem);
        });
    }

    async checkForUpdates() {
        const checkBtn = document.getElementById('checkUpdateBtn');
        if (checkBtn) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
        }

        try {
            await this.loadOTAInfo();
            
            if (this.otaInfo && this.otaInfo.firmware.available) {
                this.showNotification('Nueva actualización disponible!', 'success');
            } else {
                this.showNotification('No hay actualizaciones disponibles', 'info');
            }
        } catch (error) {
            console.error('Error checking for updates:', error);
            this.showNotification('Error verificando actualizaciones', 'error');
        } finally {
            if (checkBtn) {
                checkBtn.disabled = false;
                checkBtn.innerHTML = '<i class="fas fa-search"></i> Verificar Actualizaciones';
            }
        }
    }

    async forceUpdate() {
        if (!this.otaInfo || !this.otaInfo.firmware.available) {
            this.showNotification('No hay firmware disponible para actualizar', 'warning');
            return;
        }

        const updateBtn = document.getElementById('forceUpdateBtn');
        const progressContainer = document.getElementById('otaProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');

        if (updateBtn) {
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Actualizando...';
        }

        if (progressContainer) {
            progressContainer.style.display = 'block';
        }

        try {
            // Simulate update progress
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress > 100) progress = 100;

                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }

                if (progressText) {
                    if (progress < 30) {
                        progressText.textContent = 'Descargando firmware...';
                    } else if (progress < 70) {
                        progressText.textContent = 'Instalando actualización...';
                    } else if (progress < 95) {
                        progressText.textContent = 'Verificando integridad...';
                    } else {
                        progressText.textContent = 'Finalizando actualización...';
                    }
                }

                if (progress >= 100) {
                    clearInterval(progressInterval);
                    
                    // Call force update API
                    fetch(`${this.apiBaseUrl}/ota/force-update`, {
                        method: 'POST'
                    }).then(response => {
                        if (response.ok) {
                            this.showNotification('Actualización iniciada en el ESP32', 'success');
                            if (progressText) {
                                progressText.textContent = 'Actualización completada!';
                            }
                        } else {
                            throw new Error('Error en la actualización');
                        }
                    }).catch(error => {
                        console.error('Error forcing update:', error);
                        this.showNotification('Error iniciando actualización', 'error');
                    });

                    // Hide progress after 3 seconds
                    setTimeout(() => {
                        if (progressContainer) {
                            progressContainer.style.display = 'none';
                        }
                        if (updateBtn) {
                            updateBtn.disabled = false;
                            updateBtn.innerHTML = '<i class="fas fa-download"></i> Forzar Actualización';
                        }
                    }, 3000);
                }
            }, 200);

        } catch (error) {
            console.error('Error during update:', error);
            this.showNotification('Error durante la actualización', 'error');
            
            if (progressContainer) {
                progressContainer.style.display = 'none';
            }
            if (updateBtn) {
                updateBtn.disabled = false;
                updateBtn.innerHTML = '<i class="fas fa-download"></i> Forzar Actualización';
            }
        }
    }

    async rollbackFirmware() {
        const rollbackBtn = document.getElementById('rollbackBtn');
        if (rollbackBtn) {
            rollbackBtn.disabled = true;
            rollbackBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Revirtiendo...';
        }

        try {
            // Simulate rollback process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            this.showNotification('Rollback simulado - Funcionalidad no implementada', 'info');
        } catch (error) {
            console.error('Error during rollback:', error);
            this.showNotification('Error durante el rollback', 'error');
        } finally {
            if (rollbackBtn) {
                rollbackBtn.disabled = false;
                rollbackBtn.innerHTML = '<i class="fas fa-undo"></i> Rollback';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
            max-width: 300px;
        `;

        // Set background color based on type
        const colors = {
            success: '#10b981',
            error: '#ef4444',
            warning: '#f59e0b',
            info: '#3b82f6'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        notification.textContent = message;
        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const dashboard = new ClimateDashboard();
    
    // Make dashboard globally available for debugging
    window.dashboard = dashboard;
    
    console.log('🚀 Climate Dashboard initialized');
    console.log('📊 Dashboard instance available as window.dashboard');
});

