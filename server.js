const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Servir archivos estáticos
app.use(express.static('./'));

// Matriz de píxeles del servidor
const GRID_WIDTH = 100;
const GRID_HEIGHT = 100;
let pixels = new Array(GRID_WIDTH).fill(null)
    .map(() => new Array(GRID_HEIGHT).fill('#FFFFFF'));

// Manejar conexiones de Socket.IO
io.on('connection', (socket) => {
    console.log('Usuario conectado');

    // Enviar el estado actual del canvas al nuevo usuario
    socket.emit('fullCanvas', pixels);

    // Manejar la colocación de píxeles
    socket.on('placePixel', (data) => {
        const { x, y, color } = data;
        
        // Validar coordenadas
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
            pixels[x][y] = color;
            // Emitir actualización a todos los clientes
            io.emit('pixelUpdate', { x, y, color });
        }
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado');
    });
});

// Ruta de estado para monitoreo
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
http.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
}); 