// ==========================================
//  config.js — Constantes y estado global
// ==========================================

const API_URL = "http://localhost:8001"; // Cambia esto por tu URL de producción

// --- Estado global ---
let rawSheetData = [];
let groupedData = [];
let currentPage = 1;
const itemsPerPage = 10;

// Catálogos cargados del backend
let catalogs = {
    periods: [],
    pilares: [],
    iniciativas: [],
    areas: [],
    owners: []
};

// --- Mapeo de columnas (datos normalizados) ---
const COL = {
    objective: 'objective',
    description: 'description',
    status: 'Status',
    target: 'Target Value',
    current: 'Current Value',
    baseline: 'Baseline Value',
    metric: 'Métrica',
    pilar: 'pilar',
    owner: 'owner',
    area: 'area',
    qy: 'quarter',
    percent: 'percent',
    objective_percent: 'objective_percent',
    iniciativa: 'iniciativa'
};

// --- Colores del semáforo ---
const COLORS = {
    celeste: '#0ea5e9',
    verde: '#22c55e',
    amarillo: '#f59e0b',
    rojo: '#ef4444'
};
