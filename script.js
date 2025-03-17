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

// Inicialización del canvas
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;
ctx.imageSmoothingEnabled = false;

// Matriz de píxeles
let pixels = new Array(GRID_WIDTH).fill(null)
    .map(() => new Array(GRID_HEIGHT).fill('#FFFFFF'));

// Conexión WebSocket
const socket = io(window.location.origin);

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

// Eventos del mouse
canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - offsetX) / (PIXEL_SIZE * scale));
    const y = Math.floor((e.clientY - rect.top - offsetY) / (PIXEL_SIZE * scale));
    
    document.getElementById('mouseCoords').textContent = `Coordenadas: ${x}, ${y}`;

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

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - offsetX) / (PIXEL_SIZE * scale));
    const y = Math.floor((e.clientY - rect.top - offsetY) / (PIXEL_SIZE * scale));

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        const color = document.getElementById('colorPicker').value;
        socket.emit('placePixel', { x, y, color });
    }
});

// Controles de zoom
document.getElementById('zoomIn').addEventListener('click', () => {
    scale *= 1.2;
    updateCanvasTransform();
});

document.getElementById('zoomOut').addEventListener('click', () => {
    scale *= 0.8;
    updateCanvasTransform();
});

document.getElementById('resetZoom').addEventListener('click', () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    updateCanvasTransform();
});

function updateCanvasTransform() {
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}

// Inicialización
drawCanvas(); 