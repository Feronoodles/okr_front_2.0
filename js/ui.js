// ==========================================
//  ui.js — Renderizado, filtros y barras de progreso
// ==========================================

/**
 * Retorna el color del semáforo según el porcentaje.
 */
function getDynamicColor(p) {
    if (p >= 100) return COLORS.celeste;
    if (p > 70) return COLORS.verde;
    if (p >= 40) return COLORS.amarillo;
    return COLORS.rojo;
}

// --- Filtros ---

/**
 * Aplica los filtros seleccionados y re-renderiza.
 */
function applyFilters() {
    let filteredData = [...rawSheetData];

    const areaFilter = document.getElementById('f-Area')?.value;
    const ownerFilter = document.getElementById('f-Owner')?.value;
    const iniciativaFilter = document.getElementById('f-Iniciativa')?.value;
    const pilarFilter = document.getElementById('f-Pilar')?.value;
    const qyFilter = document.getElementById('f-QY')?.value;

    if (areaFilter && areaFilter !== 'all') {
        filteredData = filteredData.filter(item => item[COL.area] === areaFilter);
    }
    if (ownerFilter && ownerFilter !== 'all') {
        filteredData = filteredData.filter(item => item[COL.owner] === ownerFilter);
    }
    if (iniciativaFilter && iniciativaFilter !== 'all') {
        filteredData = filteredData.filter(item => item[COL.iniciativa] === iniciativaFilter);
    }
    if (pilarFilter && pilarFilter !== 'all') {
        filteredData = filteredData.filter(item => item[COL.pilar] === pilarFilter);
    }
    if (qyFilter && qyFilter !== 'all') {
        filteredData = filteredData.filter(item => item[COL.qy] === qyFilter);
    }

    const currentView = document.getElementById('view-selector')?.value || 'Objetivo';
    const currentKey = (currentView === 'Área') ? COL.area : COL.objective;

    groupedData = groupData(filteredData, currentKey, currentView);
    renderCards(currentView);
    updateFilteredProgressBar(filteredData);
}

/**
 * Genera los filtros dinámicos a partir de los datos.
 */
function createFilters() {
    const container = document.getElementById('dynamic-filters');
    if (!container || !rawSheetData.length) return;
    container.innerHTML = '';
    if (!Array.isArray(rawSheetData)) {
        console.error("rawSheetData no es un array válido:", rawSheetData);
        return;
    }

    const config = [
        { label: 'Área', key: COL.area, id: 'f-Area' },
        { label: 'Owner', key: COL.owner, id: 'f-Owner' },
        { label: 'Iniciativa', key: COL.iniciativa, id: 'f-Iniciativa' },
        { label: 'Pilar', key: COL.pilar, id: 'f-Pilar' },
        { label: 'Quarter/Year', key: COL.qy, id: 'f-QY' }
    ];

    config.forEach(item => {
        const vals = [...new Set(rawSheetData.map(row => row[item.key]))]
            .filter(v => v)
            .sort();

        // Reverse Quarter/Year to show newest first
        if (item.id === 'f-QY') vals.reverse();

        const div = document.createElement('div');
        div.className = 'filter-group';
        div.innerHTML = `
            <label>${item.label}</label>
            <select id="${item.id}" onchange="applyFilters()">
                <option value="all">Ver Todos</option>
                ${vals.map(v => `<option value="${v}">${v}</option>`).join('')}
            </select>`;
        container.appendChild(div);
    });

    const btn = document.createElement('button');
    btn.className = 'btn-clear';
    btn.innerHTML = '🔄 Limpiar Filtros';
    btn.onclick = () => {
        document.querySelectorAll('.filter-group select').forEach(s => s.value = 'all');
        applyFilters();
    };
    container.appendChild(btn);
}

// --- Renderizado de tarjetas ---

/**
 * Verifica si el usuario actual es admin (tiene token).
 */
function isAdminLogged() {
    return !!localStorage.getItem('token');
}

/**
 * Renderiza las tarjetas OKR con paginación.
 */
function renderCards(viewType) {
    const container = document.getElementById('okr-list-container');
    if (!container) return;
    container.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const pagedData = groupedData.slice(startIndex, startIndex + itemsPerPage);
    const isAdmin = isAdminLogged();

    pagedData.forEach((group, idx) => {
        let sumProgress = 0;

        const krsHtml = group.krs.map(kr => {
            const p = calculateKRProgress(kr);
            sumProgress += p;
            const color = getDynamicColor(p);
            const krId = kr._krId;

            // Botones de admin para cada KR
            const krActions = (isAdmin && krId) ? `
                <div class="kr-actions">
                    <button class="btn-icon-sm btn-edit" onclick='openEditKRModal(${JSON.stringify(krId)})' title="Editar KR">✏️</button>
                    <button class="btn-icon-sm btn-delete" onclick="deleteKeyResult(${krId})" title="Eliminar KR">🗑️</button>
                </div>` : '';

            // Info extra (owner, área, métrica)
            const ownerLabel = kr[COL.owner] ? `<span class="kr-tag">👤 ${kr[COL.owner]}</span>` : '';
            const areaLabel = kr[COL.area] ? `<span class="kr-tag">📁 ${kr[COL.area]}</span>` : '';
            const statusLabel = kr['Status'] ? `<span class="kr-tag kr-status-${kr['Status'].toLowerCase().replace(/_/g, '-')}">${kr['Status']}</span>` : '';

            return `
                <div class="kr-item" style="border-left-color: ${color}">
                    <div class="kr-header">
                        <div class="kr-info">
                            <span class="kr-description">${kr[COL.description] || 'Sin descripción'}</span>
                            <div class="kr-tags">
                                ${ownerLabel}${areaLabel}${statusLabel}
                            </div>
                        </div>
                        <div class="kr-right">
                            <span class="kr-percent" style="color:${color};">${p.toFixed(1)}%</span>
                            ${krActions}
                        </div>
                    </div>
                    <div class="progress-bg"><div class="progress-fill" style="width:${p}%; background:${color}"></div></div>
                </div>`;
        }).join('');

        const totalAvg = (sumProgress / group.krs.length).toFixed(1);
        const cardColor = getDynamicColor(totalAvg);
        const objectiveId = group.krs[0]?._objectiveId;

        // Botones de admin (solo si está logueado)
        const adminButtons = (isAdmin && objectiveId) ? `
            <div class="card-actions">
                <button class="btn-icon btn-edit" onclick="openEditObjectiveModal(${objectiveId})" title="Editar objetivo">
                    ✏️
                </button>
                <button class="btn-icon btn-delete" onclick="deleteObjective(${objectiveId})" title="Eliminar objetivo">
                    🗑️
                </button>
            </div>` : '';

        // Badge del pilar
        const pilar = group.krs[0]?.[COL.pilar];
        const pilarBadge = pilar ? `<span class="badge badge-pilar">${pilar}</span>` : '';

        const card = document.createElement('div');
        card.className = 'okr-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-header-left">
                    <h2 class="card-title">${group.title}</h2>
                    <div class="card-meta">
                        <small class="card-subtitle">${group.extra}</small>
                        ${pilarBadge}
                    </div>
                </div>
                <div class="card-header-right">
                    <div class="chart-wrapper">
                        <canvas id="chart-${idx}"></canvas>
                        <div class="chart-label">${totalAvg}%</div>
                    </div>
                    ${adminButtons}
                </div>
            </div>
            <div class="krs-container">${krsHtml}</div>
        `;

        container.appendChild(card);
        drawDoughnut(`chart-${idx}`, totalAvg, cardColor);
    });

    renderPaginationControls(viewType);
}

/**
 * Dibuja un gráfico doughnut (Chart.js).
 */
function drawDoughnut(id, p, c) {
    new Chart(document.getElementById(id), {
        type: 'doughnut',
        data: { datasets: [{ data: [p, 100 - p], backgroundColor: [c, '#f1f5f9'], borderWidth: 0 }] },
        options: { cutout: '80%', plugins: { tooltip: { enabled: false } }, events: [] }
    });
}

// --- Paginación ---

/**
 * Renderiza los controles de paginación.
 */
function renderPaginationControls(viewType) {
    const container = document.getElementById('pagination-controls');
    container.innerHTML = '';

    const totalPages = Math.ceil(groupedData.length / itemsPerPage);
    if (totalPages <= 1) return;

    // Botón Anterior
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerText = '«';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => { currentPage--; renderCards(viewType); window.scrollTo(0, 0); };
    container.appendChild(prevBtn);

    // Números de Página
    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button');
        btn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        btn.innerText = i;
        btn.onclick = () => { currentPage = i; renderCards(viewType); window.scrollTo(0, 0); };
        container.appendChild(btn);
    }

    // Botón Siguiente
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerText = '»';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => { currentPage++; renderCards(viewType); window.scrollTo(0, 0); };
    container.appendChild(nextBtn);
}

// --- Barras de progreso ---

/**
 * Actualiza la barra de progreso global (promedio de todos los objetivos).
 */
function updateGlobalProgressBar(data) {
    const globalBar = document.getElementById('global-progress-bar');
    const globalText = document.getElementById('global-progress-text');

    if (!globalBar || data.length === 0) return;

    const objectivesMap = {};
    data.forEach(item => {
        const name = String(item.objective).trim();
        if (!objectivesMap[name]) {
            objectivesMap[name] = { sum: 0, count: 0 };
        }
        objectivesMap[name].sum += parseFloat(item.percent || 0);
        objectivesMap[name].count++;
    });

    const avgs = Object.values(objectivesMap).map(o => o.sum / o.count);
    const totalAvg = Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);

    globalBar.style.width = `${totalAvg}%`;
    globalText.innerText = `${totalAvg}%`;

    if (totalAvg < 40) {
        globalBar.style.backgroundColor = '#dc3545';
        globalText.style.color = '#dc3545';
    } else if (totalAvg < 70) {
        globalBar.style.backgroundColor = '#ffc107';
        globalText.style.color = '#856404';
    } else {
        globalBar.style.backgroundColor = '#28a745';
        globalText.style.color = '#28a745';
    }
}

/**
 * Actualiza la barra de progreso filtrada.
 */
function updateFilteredProgressBar(data) {
    const bar = document.getElementById('filtered-progress-bar');
    const text = document.getElementById('filtered-progress-text');

    if (!bar || !text) return;

    if (!data || data.length === 0) {
        bar.style.width = '0%';
        text.innerText = '0%';
        bar.style.backgroundColor = '#e9ecef';
        return;
    }

    const objectivesMap = {};
    data.forEach(item => {
        const name = String(item.objective).trim();
        if (!objectivesMap[name]) {
            objectivesMap[name] = { sum: 0, count: 0 };
        }
        objectivesMap[name].sum += parseFloat(item.percent || 0);
        objectivesMap[name].count++;
    });

    const avgs = Object.values(objectivesMap).map(o => o.sum / o.count);
    const totalAvg = Math.round(avgs.reduce((a, b) => a + b, 0) / avgs.length);

    bar.style.width = `${totalAvg}%`;
    text.innerText = `${totalAvg}%`;

    if (totalAvg < 40) {
        bar.style.backgroundColor = '#dc3545';
        text.style.color = '#dc3545';
    } else if (totalAvg < 70) {
        bar.style.backgroundColor = '#ffc107';
        text.style.color = '#856404';
    } else {
        bar.style.backgroundColor = '#28a745';
        text.style.color = '#28a745';
    }
}
