const express = require("express");
const cors = require("cors");
const path = require("path");
const mqtt = require("mqtt");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración MQTT
const MQTT_CONFIG = {
    broker: "mqtts://l46d1e5e.ala.us-east-1.emqxsl.com:8883",
    topic: "idgs09/2020171026",
    username: "big-data-001",
    password: "1Q2W3E4R5T6Y"
};

// Cliente MQTT
let mqttClient = null;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// Rutas OTA
const otaRoutes = require("./routes/ota");
app.use("/api/ota", otaRoutes);

// Almacenamiento en memoria para los datos del sensor
let sensorData = {
    temperature: null,
    humidity: null,
    led_amarillo: 0,
    led_verde: 0,
    led_rojo: 0,
    state: "IDLE",
    timestamp: null,
    version: "1.0",
    uuid: "2020171026"
};

// Historial de datos (últimos 100 registros)
let dataHistory = [];

// NOTA: Este endpoint ya no se usa porque los datos ahora vienen por MQTT
// Mantenemos el endpoint por compatibilidad pero los datos reales vienen de MQTT
app.post("/api/sensor-data", (req, res) => {
    console.log("⚠️  Endpoint POST /api/sensor-data llamado, pero los datos ahora vienen por MQTT");
    console.log("Datos recibidos (ignorados):", req.body);
    
    res.json({
        success: true,
        message: "Endpoint disponible pero los datos se obtienen vía MQTT",
        note: "Los datos del dashboard se actualizan automáticamente desde el broker MQTT"
    });
});

// Endpoint para obtener los datos actuales del sensor
app.get("/api/sensor-data", (req, res) => {
    res.json({
        success: true,
        data: sensorData,
        lastUpdate: new Date(sensorData.timestamp * 1000).toISOString()
    });
});

// Endpoint para obtener el historial de datos
app.get("/api/sensor-history", (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const history = dataHistory.slice(-limit);
    
    res.json({
        success: true,
        data: history,
        count: history.length
    });
});

// Endpoint para obtener estadísticas
app.get("/api/sensor-stats", (req, res) => {
    if (dataHistory.length === 0) {
        return res.json({
            success: true,
            data: {
                minTemp: null,
                maxTemp: null,
                avgTemp: null,
                avgHumidity: null,
                totalReadings: 0
            }
        });
    }
    
    const temperatures = dataHistory.map(d => d.temperature).filter(t => t !== null);
    const humidities = dataHistory.map(d => d.humidity).filter(h => h !== null);
    
    const stats = {
        minTemp: temperatures.length > 0 ? Math.min(...temperatures) : null,
        maxTemp: temperatures.length > 0 ? Math.max(...temperatures) : null,
        avgTemp: temperatures.length > 0 ? 
            Math.round((temperatures.reduce((a, b) => a + b, 0) / temperatures.length) * 10) / 10 : null,
        avgHumidity: humidities.length > 0 ? 
            Math.round((humidities.reduce((a, b) => a + b, 0) / humidities.length) * 10) / 10 : null,
        totalReadings: dataHistory.length
    };
    
    res.json({
        success: true,
        data: stats
    });
});

// Endpoint de estado del servidor
app.get("/api/status", (req, res) => {
    res.json({
        success: true,
        server: "Climate Dashboard Node.js HTTPS Server",
        version: "1.0.0",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        dataPoints: dataHistory.length,
        ssl: true
    });
});

// Servir el dashboard (index.html) en la ruta raíz
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Función para conectar al broker MQTT
function connectMQTT() {
    console.log(`🔌 Conectando al broker MQTT: ${MQTT_CONFIG.broker}`);
    
    const options = {
        username: MQTT_CONFIG.username,
        password: MQTT_CONFIG.password,
        reconnectPeriod: 5000,
        connectTimeout: 30000,
        clean: true
    };
    
    mqttClient = mqtt.connect(MQTT_CONFIG.broker, options);
    
    mqttClient.on('connect', () => {
        console.log(`✅ Conectado al broker MQTT`);
        console.log(`📡 Suscribiéndose al tópico: ${MQTT_CONFIG.topic}`);
        
        mqttClient.subscribe(MQTT_CONFIG.topic, (err) => {
            if (err) {
                console.error(`❌ Error al suscribirse al tópico ${MQTT_CONFIG.topic}:`, err);
            } else {
                console.log(`✅ Suscrito exitosamente al tópico: ${MQTT_CONFIG.topic}`);
            }
        });
    });
    
    mqttClient.on('message', (topic, message) => {
        try {
            console.log(`📨 Mensaje recibido del tópico ${topic}:`);
            const data = JSON.parse(message.toString());
            console.log('Datos MQTT:', data);
            
            // Actualizar datos actuales con los 3 LEDs
            sensorData = {
                temperature: data.temperatura || data.temperature,
                humidity: data.humedad || data.humidity,
                led_amarillo: data.led_amarillo || 0,
                led_verde: data.led_verde || 0,
                led_rojo: data.led_rojo || 0,
                state: data.estado || data.state || "IDLE",
                timestamp: data.timestamp || Math.floor(Date.now() / 1000),
                version: data.version || "1.0",
                uuid: data.uuid || "2020171026"
            };
            
            // Agregar al historial
            dataHistory.push({
                ...sensorData,
                timestamp: sensorData.timestamp
            });
            
            // Mantener solo los últimos 100 registros
            if (dataHistory.length > 100) {
                dataHistory.shift();
            }
            
            console.log(`📊 Datos actualizados desde MQTT. Historial: ${dataHistory.length} registros`);
            
        } catch (error) {
            console.error('❌ Error procesando mensaje MQTT:', error);
        }
    });
    
    mqttClient.on('error', (error) => {
        console.error('❌ Error de conexión MQTT:', error);
    });
    
    mqttClient.on('close', () => {
        console.log('🔌 Conexión MQTT cerrada');
    });
    
    mqttClient.on('reconnect', () => {
        console.log('🔄 Reintentando conexión MQTT...');
    });
}

// Crear servidor HTTPS
app.listen(PORT, () => {
    connectMQTT();
    console.log(`Servidor en Render escuchando en puerto ${PORT}`);
});

// Manejo de errores
process.on("uncaughtException", (error) => {
    console.error("Error no capturado:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Promesa rechazada no manejada:", reason);
});