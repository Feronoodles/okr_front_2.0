let rawSheetData = [];
let groupedData = []; // Ahora es genérico (puede agrupar por Obj, Área o Dueño)

const COL = {
    objective: 'Objective',
    description: 'Descripción Key Results',
    status: 'Status',
    target: 'Target Value',
    current: 'Current Value',
    baseline: 'Baseline Value',
    metric: 'Métrica',
    pilar: 'Pilar Estratégico',
    owner: 'Owner',
    area: 'Área',
    qy: 'Quarter / Year',
    iniciativa: 'Iniciativa Estratégica'
};

// --- COLORES ---
function getDynamicColor(percent) {
    const p = parseFloat(percent);
    if (p >= 100) return '#0ea5e9'; // Celeste
    if (p > 70)   return '#22c55e'; // Verde
    if (p >= 40)  return '#f59e0b'; // Amarillo
    return '#ef4444';               // Rojo
}

// --- CARGA DE DATOS ---
document.getElementById('excel-upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(evt) {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { range: 2, defval: "" });
        
        rawSheetData = json.map(row => {
            let normalizedRow = {};
            Object.keys(row).forEach(key => normalizedRow[key.trim()] = row[key]);
            return normalizedRow;
        }).filter(row => row[COL.description] !== "");

        initDashboard();
    };
    reader.readAsBinaryString(file);
});

function initDashboard() {
    createFilters();
    applyFilters();
}

// --- CÁLCULOS ---
function timeToSeconds(val) {
    if (val === undefined || val === null || val === "") return 0;
    if (typeof val === 'number') return val * 86400; 
    if (typeof val === 'string' && val.includes(':')) {
        const p = val.split(':');
        return (+p[0] * 3600) + (+p[1] * 60) + (+p[2] || 0);
    }
    return parseFloat(val) || 0;
}

function calculateKRProgress(kr) {
    const m = String(kr[COL.metric]).toLowerCase();
    const isTime = String(kr[COL.current]).includes(":") || m.includes("tiempo") || m.includes("hora");
    let rawProg = 0;
    if (isTime) {
        let L = timeToSeconds(kr[COL.baseline]), M = timeToSeconds(kr[COL.target]), N = timeToSeconds(kr[COL.current]);
        let den = L - M;
        rawProg = (den !== 0) ? ((L - M) - (N - M)) / den * 100 : (N <= M ? 100 : 0);
    } else {
        let N = parseFloat(kr[COL.current]) || 0, M = parseFloat(kr[COL.target]) || 0;
        if (N <= 1 && N > 0 && M <= 1 && M > 0) { N *= 100; M *= 100; }
        rawProg = (M !== 0) ? (N / M) * 100 : (N > 0 ? 100 : 0);
    }
    return Math.min(Math.max(rawProg, 0), 100);
}

// --- BARRA GLOBAL ---
function updateGlobalProgress(filteredKRs, viewType) {
    const container = document.getElementById('global-stats-container');
    if (!container || filteredKRs.length === 0) return;

    let globalAvg = 0;
    if (viewType === 'objective') {
        const objGroups = {};
        filteredKRs.forEach(kr => {
            const name = kr[COL.objective];
            if (!objGroups[name]) objGroups[name] = [];
            objGroups[name].push(calculateKRProgress(kr));
        });
        const names = Object.keys(objGroups);
        globalAvg = (names.reduce((s, n) => s + (objGroups[n].reduce((a, b) => a + b, 0) / objGroups[n].length), 0) / names.length).toFixed(1);
    } else {
        globalAvg = (filteredKRs.reduce((s, kr) => s + calculateKRProgress(kr), 0) / filteredKRs.length).toFixed(1);
    }

    const color = getDynamicColor(globalAvg);
    container.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 15px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); margin-bottom: 25px; border-left: 10px solid ${color};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <div>
                    <span style="font-weight: 800; color: #1e293b; font-size: 15px; display: block;">PROGRESO PONDERADO (${viewType.toUpperCase()})</span>
                    <span style="font-size: 11px; color: #64748b;">Basado en la selección actual de filtros</span>
                </div>
                <span style="font-size: 32px; font-weight: 900; color: ${color};">${globalAvg}%</span>
            </div>
            <div style="background: #f1f5f9; height: 16px; border-radius: 8px; overflow: hidden;">
                <div style="width: ${globalAvg}%; height: 100%; background: ${color}; transition: width 1s ease-in-out;"></div>
            </div>
        </div>`;
}

// --- RENDERIZADO DINÁMICO ---
function renderCards(viewType) {
    const container = document.getElementById('okr-list-container');
    container.innerHTML = '';

    groupedData.forEach((group, index) => {
        let sumProgress = 0;
        const krsHtml = group.krs.map(kr => {
            let finalProg = calculateKRProgress(kr);
            sumProgress += finalProg;
            const color = getDynamicColor(finalProg);
            return `
                <div style="margin-bottom:12px; padding:12px; background:#f8fafc; border-radius:8px; border-left:5px solid ${color};">
                    <div style="display:flex; justify-content:space-between; align-items: flex-start; margin-bottom:4px;">
                        <div style="flex: 1; padding-right: 10px;">
                            <span style="font-weight:600; font-size:12px; display:block;">${kr[COL.description]}</span>
                            ${viewType !== 'objective' ? `<span style="font-size:10px; color:#6366f1; font-weight:bold;">Obj: ${kr[COL.objective]}</span>` : ''}
                        </div>
                        <div style="text-align: right; min-width: 80px;">
                            <div style="color:${color}; font-weight:bold; font-size:10px; text-transform: uppercase;">${kr[COL.status]}</div>
                            <div style="background:${color}; color:white; padding:1px 6px; border-radius:4px; font-size:10px; font-weight:bold; display: inline-block;">${finalProg.toFixed(1)}%</div>
                        </div>
                    </div>
                    <div style="background:#e2e8f0; height:6px; border-radius:3px; overflow:hidden; margin-top:8px;">
                        <div style="width:${finalProg}%; height:100%; background:${color}; transition: width 0.8s;"></div>
                    </div>
                </div>`;
        }).join('');

        const avgProgress = (sumProgress / group.krs.length).toFixed(1);
        const objColor = getDynamicColor(avgProgress);

        const card = document.createElement('div');
        card.className = 'okr-card';
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 15px; align-items: center;">
                <div style="flex: 1;">
                    <span style="background:#3b82f6; color:white; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:bold; text-transform:uppercase;">${viewType}</span>
                    <h2 style="margin:8px 0; color:#1e293b; font-size:16px;">${group.title}</h2>
                    <p style="font-size:11px; color:#64748b;">${group.extraInfo}</p>
                </div>
                <div style="width: 100px; height: 100px; position: relative;">
                    <canvas id="main-chart-${index}"></canvas>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: 800; font-size: 14px; color: ${objColor};">${avgProgress}%</div>
                </div>
            </div>
            <div>${krsHtml}</div>`;
        container.appendChild(card);
        drawCircle(`main-chart-${index}`, avgProgress, objColor);
    });
}



function groupDynamicData(data, key) {
    const groups = {};
    data.forEach(item => {
        const val = item[key] || "No asignado";
        if (!groups[val]) {
            groups[val] = { 
                title: val, 
                extraInfo: (key === COL.objective) ? `${item[COL.area]} | ${item[COL.qy]}` : `Vista por ${key}`,
                krs: [] 
            };
        }
        groups[val].krs.push(item);
    });
    return Object.values(groups);
}

// --- SOPORTE ---
function drawCircle(id, percent, color) {
    const ctx = document.getElementById(id);
    new Chart(ctx, {
        type: 'doughnut',
        data: { datasets: [{ data: [percent, 100 - percent], backgroundColor: [color, '#f1f5f9'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false }, legend: { display: false } }, events: [] }
    });
}

function createFilters() {
    const container = document.getElementById('dynamic-filters');
    container.innerHTML = '';
    const filterList = [COL.area, COL.owner, COL.iniciativa, COL.pilar, COL.qy];
    filterList.forEach(col => {
        const uniqueValues = [...new Set(rawSheetData.map(item => item[col]).filter(v => v))];
        const div = document.createElement('div');
        div.className = 'filter-group';
        div.innerHTML = `
            <label style="display:block; font-weight:bold; margin-top:10px; font-size:11px; color:#475569;">${col.toUpperCase()}</label>
            <select id="filter-${col.replace(/\s/g, '')}" onchange="applyFilters()" style="width:100%; padding:8px; border-radius:6px; border: 1px solid #cbd5e1; font-size:12px;">
                <option value="all">Ver Todos</option>
                ${uniqueValues.sort().map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>`;
        container.appendChild(div);
    });
}

// ... (mantenemos todo el código anterior de carga, cálculos y renderizado)

// --- NUEVA FUNCIÓN: LIMPIAR FILTROS ---
function clearFilters() {
    // 1. Buscamos todos los selectores dentro del contenedor de filtros
    const filters = document.querySelectorAll('#dynamic-filters select');
    
    // 2. Los ponemos todos en "all"
    filters.forEach(select => {
        select.value = 'all';
    });

    // 3. Ejecutamos la lógica de filtrado para refrescar la vista al estado inicial
    applyFilters();
}

// --- ACTUALIZACIÓN EN applyFilters PARA SEGURIDAD ---
function applyFilters() {
    let filtered = rawSheetData;
    
    // Obtenemos los elementos de forma segura
    const elArea = document.getElementById(`filter-${COL.area.replace(/\s/g, '')}`);
    const elOwner = document.getElementById(`filter-${COL.owner.replace(/\s/g, '')}`);
    const elInic = document.getElementById(`filter-${COL.iniciativa.replace(/\s/g, '')}`);
    const elPilar = document.getElementById(`filter-${COL.pilar.replace(/\s/g, '')}`);
    const elQY = document.getElementById(`filter-${COL.qy.replace(/\s/g, '')}`);

    const filters = {
        area: elArea ? elArea.value : 'all',
        owner: elOwner ? elOwner.value : 'all',
        iniciativa: elInic ? elInic.value : 'all',
        pilar: elPilar ? elPilar.value : 'all',
        qy: elQY ? elQY.value : 'all'
    };

    // Aplicar lógica de filtrado
    if (filters.area !== 'all') filtered = filtered.filter(item => String(item[COL.area]) === filters.area);
    if (filters.owner !== 'all') filtered = filtered.filter(item => String(item[COL.owner]) === filters.owner);
    if (filters.iniciativa !== 'all') filtered = filtered.filter(item => String(item[COL.iniciativa]) === filters.iniciativa);
    if (filters.pilar !== 'all') filtered = filtered.filter(item => String(item[COL.pilar]) === filters.pilar);
    if (filters.qy !== 'all') filtered = filtered.filter(item => String(item[COL.qy]) === filters.qy);

    // Determinar agrupación
    let viewType = 'objective';
    let groupKey = COL.objective;

    if (filters.owner !== 'all') {
        viewType = 'owner';
        groupKey = COL.owner;
    } else if (filters.area !== 'all') {
        viewType = 'area';
        groupKey = COL.area;
    }

    updateGlobalProgress(filtered, viewType);
    groupedData = groupDynamicData(filtered, groupKey);
    renderCards(viewType);
}
