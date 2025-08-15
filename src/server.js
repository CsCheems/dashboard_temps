const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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

// Endpoint para recibir datos del ESP32
app.post("/api/sensor-data", (req, res) => {
    try {
        console.log("Datos recibidos del ESP32:", req.body);
        
        // Actualizar datos actuales con los 3 LEDs
        sensorData = {
            temperature: req.body.temperatura || req.body.temperature,
            humidity: req.body.humedad || req.body.humidity,
            led_amarillo: req.body.led_amarillo || 0,
            led_verde: req.body.led_verde || 0,
            led_rojo: req.body.led_rojo || 0,
            state: req.body.estado || req.body.state || "IDLE",
            timestamp: req.body.timestamp || Math.floor(Date.now() / 1000),
            version: req.body.version || "1.0",
            uuid: req.body.uuid || "2020171026"
        };
        
        // Agregar al historial
        dataHistory.push({...sensorData});
        
        // Mantener solo los últimos 100 registros
        if (dataHistory.length > 100) {
            dataHistory.shift();
        }
        
        res.json({ 
            success: true, 
            message: "Datos recibidos correctamente",
            data: sensorData 
        });
        
    } catch (error) {
        console.error("Error procesando datos del sensor:", error);
        res.status(500).json({ 
            success: false, 
            message: "Error procesando datos del sensor" 
        });
    }
});

// Endpoint para obtener los datos actuales (para el dashboard)
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

// Crear servidor HTTPS
app.listen(PORT, () => {
    console.log(`Servidor en Render escuchando en puerto ${PORT}`);
});

// Manejo de errores
process.on("uncaughtException", (error) => {
    console.error("Error no capturado:", error);
});

process.on("unhandledRejection", (reason, promise) => {
    console.error("Promesa rechazada no manejada:", reason);
});