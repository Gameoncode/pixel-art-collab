// Configuración del canvas
const canvas = document.getElementById('pixelCanvas');
const ctx = canvas.getContext('2d');
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1000;
const PIXEL_SIZE = 10;
const GRID_WIDTH = CANVAS_WIDTH / PIXEL_SIZE;
const GRID_HEIGHT = CANVAS_HEIGHT / PIXEL_SIZE;

// Variables de control
let scale = 1;
let offsetX = 0;
let offsetY = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let lastTouchDistance = 0;
let isZooming = false;
let lastTap = 0;

// Inicialización del canvas
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// Matriz de píxeles
let pixels = new Array(GRID_WIDTH).fill(null)
    .map(() => new Array(GRID_HEIGHT).fill('#FFFFFF'));

// Conexión WebSocket
const socket = io(window.location.hostname === 'localhost' 
    ? 'http://localhost:3000'
    : 'https://pixel-art-collab.onrender.com');

socket.on('connect', () => {
    console.log('Conectado al servidor');
});

socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error);
});

socket.on('pixelUpdate', (data) => {
    pixels[data.x][data.y] = data.color;
    drawPixel(data.x, data.y, data.color);
});

socket.on('fullCanvas', (data) => {
    pixels = data;
    drawCanvas();
});

// Funciones de dibujo
function drawCanvas() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            drawPixel(x, y, pixels[x][y]);
        }
    }
}

function drawPixel(x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
    ctx.strokeStyle = '#CCCCCC';
    ctx.strokeRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
}

// Función para obtener coordenadas del pixel
function getPixelCoordinates(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.clientX || event.touches[0].clientX;
    const clientY = event.clientY || event.touches[0].clientY;
    
    // Ajustar las coordenadas según la transformación del canvas
    const x = Math.floor(((clientX - rect.left) / scale - offsetX) / PIXEL_SIZE);
    const y = Math.floor(((clientY - rect.top) / scale - offsetY) / PIXEL_SIZE);
    
    return { x, y };
}

// Eventos del mouse
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    const coords = getPixelCoordinates(e);
    document.getElementById('mouseCoords').textContent = `Coordenadas: ${coords.x}, ${coords.y}`;

    if (isDragging) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        offsetX += deltaX;
        offsetY += deltaY;
        lastX = e.clientX;
        lastY = e.clientY;
        updateCanvasTransform();
    }
});

canvas.addEventListener('mouseup', () => {
    isDragging = false;
});

canvas.addEventListener('click', (e) => {
    if (isDragging) return;
    
    const coords = getPixelCoordinates(e);
    if (placePixel(coords.x, coords.y)) {
        console.log('Pixel colocado en:', coords.x, coords.y);
    }
});

// Eventos táctiles
canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        isZooming = true;
        lastTouchDistance = getTouchDistance(e.touches);
    } else {
        const now = Date.now();
        if (now - lastTap < 300) { // Doble tap
            e.preventDefault();
            const coords = getPixelCoordinates(e);
            placePixel(coords.x, coords.y);
        }
        lastTap = now;
        
        isDragging = true;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
    }
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (isZooming && e.touches.length === 2) {
        const distance = getTouchDistance(e.touches);
        const deltaScale = distance / lastTouchDistance;
        scale *= deltaScale;
        scale = Math.min(Math.max(0.5, scale), 5); // Limitar zoom
        lastTouchDistance = distance;
        updateCanvasTransform();
    } else if (isDragging && e.touches.length === 1) {
        const deltaX = e.touches[0].clientX - lastX;
        const deltaY = e.touches[0].clientY - lastY;
        offsetX += deltaX;
        offsetY += deltaY;
        lastX = e.touches[0].clientX;
        lastY = e.touches[0].clientY;
        updateCanvasTransform();
    }
    
    const coords = getPixelCoordinates(e);
    document.getElementById('mouseCoords').textContent = `Coordenadas: ${coords.x}, ${coords.y}`;
});

canvas.addEventListener('touchend', () => {
    isDragging = false;
    isZooming = false;
});

// Función auxiliar para calcular la distancia entre dos toques
function getTouchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

// Función para colocar un pixel
function placePixel(x, y) {
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const color = document.getElementById('colorPicker').value;
        pixels[x][y] = color; // Actualizar matriz local inmediatamente
        drawPixel(x, y, color); // Dibujar inmediatamente
        socket.emit('placePixel', { x, y, color });
        return true;
    }
    return false;
}

// Controles de zoom
document.getElementById('zoomIn').addEventListener('click', () => {
    scale *= 1.2;
    scale = Math.min(scale, 5); // Limitar zoom máximo
    updateCanvasTransform();
});

document.getElementById('zoomOut').addEventListener('click', () => {
    scale *= 0.8;
    scale = Math.max(scale, 0.5); // Limitar zoom mínimo
    updateCanvasTransform();
});

document.getElementById('resetZoom').addEventListener('click', () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    updateCanvasTransform();
});

function updateCanvasTransform() {
    const container = canvas.parentElement;
    const containerRect = container.getBoundingClientRect();
    
    // Centrar el canvas inicialmente
    if (offsetX === 0 && offsetY === 0) {
        offsetX = (containerRect.width - CANVAS_WIDTH * scale) / 2;
        offsetY = (containerRect.height - CANVAS_HEIGHT * scale) / 2;
    }
    
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    canvas.style.transformOrigin = '0 0';
}

// Prevenir el zoom del navegador en dispositivos móviles
document.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

// Inicialización
drawCanvas();

// Agregar evento para actualización inicial
window.addEventListener('load', () => {
    updateCanvasTransform();
    drawCanvas();
});

// Agregar evento para redimensionamiento de ventana
window.addEventListener('resize', () => {
    updateCanvasTransform();
}); 