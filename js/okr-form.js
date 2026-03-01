// ==========================================
//  okr-form.js — Modal de creación de OKRs
// ==========================================

// --- Selects y catálogos ---

/**
 * Llena un select con datos de un catálogo.
 */
function populateSelect(selectId, data, valueKey = 'id', textKey = 'name') {
    const select = document.getElementById(selectId);
    if (!select) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        select.appendChild(option);
    });

    const newOption = document.createElement('option');
    newOption.value = '__new__';
    newOption.textContent = '➕ Crear nuevo...';
    select.appendChild(newOption);
}

/**
 * Carga objetivos existentes en el select.
 */
async function loadExistingObjectives() {
    try {
        const response = await fetch(`${API_URL}/objectives?page=0&size=100`);
        if (!response.ok) {
            console.error('Error al cargar objetivos:', response.status);
            return;
        }

        const data = await response.json();
        const objectives = Array.isArray(data) ? data : (data.content || []);

        const select = document.getElementById('existing-objective');
        if (!select) return;

        while (select.options.length > 1) {
            select.remove(1);
        }

        if (objectives.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '(No hay objetivos creados aún)';
            opt.disabled = true;
            select.appendChild(opt);
            return;
        }

        objectives.forEach(obj => {
            const id = obj.id ?? obj.objectiveId ?? obj.objective_id;
            const option = document.createElement('option');
            option.value = id;
            option.textContent = obj.description || obj.name || `Objetivo #${id}`;
            option.dataset.periodId = obj.periodId;
            option.dataset.pilarId = obj.pilarId;
            option.dataset.iniciativaId = obj.iniciativaId;
            select.appendChild(option);
        });
    } catch (e) {
        console.error('Error al cargar objetivos:', e);
    }
}

/**
 * Maneja la selección de catálogo (muestra input si se elige "Crear nuevo").
 */
function handleCatalogSelect(catalogType) {
    const select = document.getElementById(catalogType);
    const input = document.getElementById(`${catalogType}-new`);

    if (select.value === '__new__') {
        input.style.display = 'block';
        input.required = true;
        select.required = false;
    } else {
        input.style.display = 'none';
        input.required = false;
        select.required = true;
        input.value = '';
    }
}

/**
 * Obtiene el ID de un catálogo existente o crea uno nuevo.
 */
async function getOrCreateCatalog(fieldName, catalogEndpoint) {
    const select = document.getElementById(fieldName);
    const input = document.getElementById(`${fieldName}-new`);

    if (select.value && select.value !== '__new__') {
        return parseInt(select.value);
    }

    if (select.value === '__new__' && input.value.trim()) {
        const newName = input.value.trim();
        const payload = { name: newName };

        const response = await apiFetch(`${API_URL}/${catalogEndpoint}`, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const newItem = await response.json();
            return newItem.id;
        } else {
            const errorText = await response.text();
            let errorMsg = `No se pudo crear el nuevo ${fieldName}`;
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) errorMsg += `: ${errorData.message}`;
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }
            throw new Error(errorMsg);
        }
    }

    throw new Error(`Debe seleccionar o crear un ${fieldName}`);
}

// --- Modal ---

/**
 * Abre el modal de creación de OKR.
 */
function openCreateOKRModal() {
    const modal = document.getElementById('create-okr-modal');
    if (!modal) return;

    populateSelect('period', catalogs.periods);
    populateSelect('pilar', catalogs.pilares);
    populateSelect('iniciativa', catalogs.iniciativas);
    populateSelect('area', catalogs.areas);
    populateSelect('owner', catalogs.owners, 'id', 'name');

    loadExistingObjectives();

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

/**
 * Cierra el modal (sin confirmación, uso interno después de guardar).
 */
function closeCreateOKRModal() {
    const modal = document.getElementById('create-okr-modal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    resetOKRForm();
}

/**
 * Cierra el modal con confirmación (para Cancel y X).
 */
function confirmCloseCreateOKRModal() {
    if (confirm('¿Estás seguro de que deseas cerrar? Se perderán los datos ingresados.')) {
        closeCreateOKRModal();
    }
}

/**
 * Alterna entre crear nuevo objetivo o agregar a existente.
 */
function toggleObjectiveMode() {
    const mode = document.querySelector('input[name="objective-type"]:checked').value;
    const newSection = document.getElementById('new-objective-section');
    const existingSection = document.getElementById('existing-objective-section');

    if (mode === 'new') {
        newSection.style.display = 'block';
        existingSection.style.display = 'none';
        document.getElementById('period').required = true;
        document.getElementById('pilar').required = true;
        document.getElementById('iniciativa').required = true;
        document.getElementById('objective-description').required = true;
        document.getElementById('existing-objective').required = false;
    } else {
        newSection.style.display = 'none';
        existingSection.style.display = 'block';
        document.getElementById('existing-objective').required = true;
        document.getElementById('period').required = false;
        document.getElementById('pilar').required = false;
        document.getElementById('iniciativa').required = false;
        document.getElementById('objective-description').required = false;
        loadExistingObjectives();
    }
}

/**
 * Limpia el formulario de OKR.
 */
function resetOKRForm() {
    const form = document.getElementById('okr-form');
    if (form) form.reset();

    const newInputIds = ['period-new', 'pilar-new', 'iniciativa-new', 'area-new', 'owner-new'];
    newInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.style.display = 'none';
            input.value = '';
            input.required = false;
        }
    });

    const newSection = document.getElementById('new-objective-section');
    const existingSection = document.getElementById('existing-objective-section');
    if (newSection) newSection.style.display = 'block';
    if (existingSection) existingSection.style.display = 'none';

    ['baseline-value', 'target-value', 'current-value'].forEach(id => {
        const input = document.getElementById(id);
        if (input) disableTimeMask(input);
    });
}

// --- Tipo de dato y máscara de tiempo ---

/**
 * Actualiza los placeholders según el tipo de dato seleccionado.
 */
function updateValuePlaceholders() {
    const dataType = document.getElementById('data-type').value;
    const baseline = document.getElementById('baseline-value');
    const target = document.getElementById('target-value');
    const current = document.getElementById('current-value');

    const timeFields = [baseline, target, current];

    timeFields.forEach(f => { f.value = ''; });

    switch (dataType) {
        case 'money':
            baseline.placeholder = '1000';
            target.placeholder = '5000';
            current.placeholder = '3000';
            break;
        case 'percent':
            baseline.placeholder = '0';
            target.placeholder = '100';
            current.placeholder = '50';
            break;
        case 'integer':
            baseline.placeholder = '0';
            target.placeholder = '100';
            current.placeholder = '50';
            break;
        case 'time':
            baseline.placeholder = 'HH:MM:SS';
            target.placeholder = 'HH:MM:SS';
            current.placeholder = 'HH:MM:SS';
            break;
        default:
            baseline.placeholder = '0';
            target.placeholder = '100';
            current.placeholder = '50';
    }

    if (dataType === 'time') {
        timeFields.forEach(f => enableTimeMask(f));
    } else {
        timeFields.forEach(f => disableTimeMask(f));
    }
}

function formatTimeValue(rawDigits) {
    let result = '';
    for (let i = 0; i < rawDigits.length && i < 6; i++) {
        if (i === 2 || i === 4) result += ':';
        result += rawDigits[i];
    }
    return result;
}

function handleTimeMaskInput(e) {
    const input = e.target;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    const formatted = formatTimeValue(digits);
    input.value = formatted;
    const pos = formatted.length;
    input.setSelectionRange(pos, pos);
}

function handleTimeMaskKeydown(e) {
    const input = e.target;
    const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
        'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (allowed.includes(e.key)) return;
    if (e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) {
        e.preventDefault();
        return;
    }
    const currentDigits = input.value.replace(/\D/g, '');
    if (currentDigits.length >= 6) {
        e.preventDefault();
    }
}

function handleTimeMaskPaste(e) {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    const digits = pasted.replace(/\D/g, '').slice(0, 6);
    e.target.value = formatTimeValue(digits);
}

function enableTimeMask(input) {
    input.addEventListener('input', handleTimeMaskInput);
    input.addEventListener('keydown', handleTimeMaskKeydown);
    input.addEventListener('paste', handleTimeMaskPaste);
    input.dataset.timeMask = 'true';
    input.maxLength = 8;
}

function disableTimeMask(input) {
    if (input.dataset.timeMask === 'true') {
        input.removeEventListener('input', handleTimeMaskInput);
        input.removeEventListener('keydown', handleTimeMaskKeydown);
        input.removeEventListener('paste', handleTimeMaskPaste);
        delete input.dataset.timeMask;
        input.removeAttribute('maxLength');
    }
}

function isValidTimeFormat(value) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
    return timeRegex.test(value);
}

/**
 * Valida y parsea un valor según su tipo de dato.
 */
function parseValueByType(value, dataType) {
    if (!value) return 0;
    const strVal = String(value).trim();

    if (dataType === 'time') {
        if (!isValidTimeFormat(strVal)) {
            throw new Error('Formato de tiempo inválido. Use HH:MM:SS');
        }
        const parts = strVal.split(':');
        return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + (parseInt(parts[2]) || 0);
    }

    if (dataType === 'money' || dataType === 'percent') {
        return parseFloat(strVal.replace(/[^0-9.-]/g, '')) || 0;
    }

    if (dataType === 'integer') {
        return parseInt(strVal) || 0;
    }

    return parseFloat(strVal) || 0;
}

// --- Validación ---

/**
 * Valida el formulario completo de OKR.
 */
function validateOKRForm() {
    const mode = document.querySelector('input[name="objective-type"]:checked').value;

    if (mode === 'new') {
        const period = document.getElementById('period').value;
        const periodNew = document.getElementById('period-new').value.trim();
        const pilar = document.getElementById('pilar').value;
        const pilarNew = document.getElementById('pilar-new').value.trim();
        const iniciativa = document.getElementById('iniciativa').value;
        const iniciativaNew = document.getElementById('iniciativa-new').value.trim();
        const description = document.getElementById('objective-description').value.trim();

        if (!period || (period === '__new__' && !periodNew)) {
            alert('❌ Debe seleccionar un Período o crear uno nuevo');
            return false;
        }
        if (!pilar || (pilar === '__new__' && !pilarNew)) {
            alert('❌ Debe seleccionar un Pilar Estratégico o crear uno nuevo');
            return false;
        }
        if (!iniciativa || (iniciativa === '__new__' && !iniciativaNew)) {
            alert('❌ Debe seleccionar una Iniciativa Estratégica o crear una nueva');
            return false;
        }
        if (!description) {
            alert('❌ Debe ingresar una descripción del objetivo');
            return false;
        }
    } else {
        const existingObjective = document.getElementById('existing-objective').value;
        if (!existingObjective) {
            alert('❌ Debe seleccionar un objetivo existente');
            return false;
        }
    }

    const area = document.getElementById('area').value;
    const areaNew = document.getElementById('area-new').value.trim();
    const owner = document.getElementById('owner').value;
    const ownerNew = document.getElementById('owner-new').value.trim();

    if (!area || (area === '__new__' && !areaNew)) {
        alert('❌ Debe seleccionar un Área o crear una nueva');
        return false;
    }
    if (!owner || (owner === '__new__' && !ownerNew)) {
        alert('❌ Debe seleccionar un Owner o crear uno nuevo');
        return false;
    }

    const code = document.getElementById('code').value.trim();
    const krDescription = document.getElementById('kr-description').value.trim();
    const metricName = document.getElementById('metric-name').value.trim();

    if (!code) {
        alert('❌ Debe ingresar un código para el Key Result');
        return false;
    }
    if (!krDescription) {
        alert('❌ Debe ingresar una descripción para el Key Result');
        return false;
    }
    if (!metricName) {
        alert('❌ Debe ingresar un nombre de métrica');
        return false;
    }

    const dataType = document.getElementById('data-type').value;
    const baseline = document.getElementById('baseline-value').value;
    const target = document.getElementById('target-value').value;
    const current = document.getElementById('current-value').value;

    try {
        parseValueByType(baseline, dataType);
        parseValueByType(target, dataType);
        parseValueByType(current, dataType);
        return true;
    } catch (e) {
        alert(e.message);
        return false;
    }
}

// --- Envío del formulario ---

/**
 * Maneja el envío del formulario de creación de OKR.
 */
async function handleCreateOKRSubmit(event) {
    event.preventDefault();

    if (!validateOKRForm()) return;

    const token = localStorage.getItem('token');
    if (!token) {
        alert("No has iniciado sesión. Por favor inicia sesión.");
        return;
    }

    toggleLoading(true);

    try {
        const mode = document.querySelector('input[name="objective-type"]:checked').value;
        const dataType = document.getElementById('data-type').value;

        const areaId = await getOrCreateCatalog('area', 'areas');
        const ownerId = await getOrCreateCatalog('owner', 'owners');

        const keyResult = {
            areaId: areaId,
            ownerId: ownerId,
            code: document.getElementById('code').value.trim(),
            description: document.getElementById('kr-description').value.trim(),
            metricName: document.getElementById('metric-name').value.trim(),
            dataType: dataType.toUpperCase(),
            baselineValue: parseValueByType(document.getElementById('baseline-value').value, dataType),
            targetValue: parseValueByType(document.getElementById('target-value').value, dataType),
            currentValue: parseValueByType(document.getElementById('current-value').value, dataType),
            status: document.getElementById('status').value.toUpperCase().replace(/ /g, '_'),
            notesBlockers: document.getElementById('notes-blockers').value.trim() || null
        };

        let response;

        if (mode === 'new') {
            const periodId = await getOrCreateCatalog('period', 'periods');
            const pilarId = await getOrCreateCatalog('pilar', 'pilares');
            const iniciativaId = await getOrCreateCatalog('iniciativa', 'iniciativas');

            const objectivePayload = {
                periodId: periodId,
                pilarId: pilarId,
                iniciativaId: iniciativaId,
                description: document.getElementById('objective-description').value.trim()
            };

            const objResponse = await apiFetch(`${API_URL}/objectives`, {
                method: 'POST',
                body: JSON.stringify(objectivePayload)
            });

            if (!objResponse.ok) {
                const errText = await objResponse.text();
                throw new Error(`No se pudo crear el objetivo: ${errText}`);
            }

            const newObjective = await objResponse.json();
            const newObjectiveId = newObjective.id ?? newObjective.objectiveId;

            if (!newObjectiveId) {
                throw new Error('El backend no devolvió el ID del objetivo creado');
            }

            response = await apiFetch(`${API_URL}/keyresults`, {
                method: 'POST',
                body: JSON.stringify({ ...keyResult, objectiveId: newObjectiveId })
            });

        } else {
            const objectiveId = document.getElementById('existing-objective').value;

            if (!objectiveId) {
                alert('❌ Debe seleccionar un objetivo existente');
                toggleLoading(false);
                return;
            }

            response = await apiFetch(`${API_URL}/keyresults`, {
                method: 'POST',
                body: JSON.stringify({ ...keyResult, objectiveId: parseInt(objectiveId) })
            });
        }

        if (response.ok) {
            alert("✅ OKR creado exitosamente");
            closeCreateOKRModal();
            location.reload();
        } else {
            const errorText = await response.text();
            console.error("❌ Error del backend:", {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });

            let errorMsg = "Error al crear OKR";
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                    errorMsg += `: ${errorData.message}`;
                } else if (Array.isArray(errorData)) {
                    errorMsg += `: ${errorData.map(e => `${e.campo}: ${e.error}`).join(', ')}`;
                }
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }

            alert("❌ " + errorMsg);
        }
    } catch (e) {
        console.error("Error al crear OKR:", e);
        alert("Hubo un error al crear el OKR: " + e.message);
    } finally {
        toggleLoading(false);
    }
}

// ==========================================
//  Editar / Eliminar Objetivos
// ==========================================

/**
 * Llena un select simple (sin opción "Crear nuevo").
 */
function populateEditSelect(selectId, data, selectedId, valueKey = 'id', textKey = 'name') {
    const select = document.getElementById(selectId);
    if (!select) return;

    while (select.options.length > 1) {
        select.remove(1);
    }

    data.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        if (item[valueKey] == selectedId) option.selected = true;
        select.appendChild(option);
    });
}

/**
 * Abre el modal de edición de un objetivo, cargando sus datos actuales.
 */
async function openEditObjectiveModal(objectiveId) {
    toggleLoading(true);
    try {
        const response = await apiFetch(`${API_URL}/objectives/${objectiveId}`);
        if (!response.ok) {
            throw new Error('No se pudo obtener el objetivo');
        }

        const objective = await response.json();

        // Llenar el formulario con los datos actuales
        document.getElementById('edit-objective-id').value = objectiveId;
        document.getElementById('edit-objective-description').value = objective.description || '';

        // Llenar selects con el valor actual seleccionado
        populateEditSelect('edit-period', catalogs.periods, objective.periodId);
        populateEditSelect('edit-pilar', catalogs.pilares, objective.pilarId);
        populateEditSelect('edit-iniciativa', catalogs.iniciativas, objective.iniciativaId);

        // Mostrar modal
        document.getElementById('edit-objective-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error('Error al cargar objetivo:', e);
        alert('❌ Error al cargar el objetivo: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Cierra el modal de edición.
 */
function closeEditObjectiveModal() {
    const modal = document.getElementById('edit-objective-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Maneja el envío del formulario de edición de objetivo.
 */
async function handleEditObjectiveSubmit(event) {
    event.preventDefault();

    const objectiveId = document.getElementById('edit-objective-id').value;
    const description = document.getElementById('edit-objective-description').value.trim();
    const periodId = parseInt(document.getElementById('edit-period').value);
    const pilarId = parseInt(document.getElementById('edit-pilar').value);
    const iniciativaId = parseInt(document.getElementById('edit-iniciativa').value);

    if (!description) {
        alert('❌ La descripción es obligatoria');
        return;
    }
    if (!periodId || !pilarId || !iniciativaId) {
        alert('❌ Todos los campos son obligatorios');
        return;
    }

    toggleLoading(true);
    try {
        const response = await apiFetch(`${API_URL}/objectives/${objectiveId}`, {
            method: 'PUT',
            body: JSON.stringify({
                description,
                periodId,
                pilarId,
                iniciativaId
            })
        });

        if (response.ok) {
            alert('✅ Objetivo actualizado exitosamente');
            closeEditObjectiveModal();
            await fetchLatestData();
        } else {
            const errorText = await response.text();
            let errorMsg = 'Error al actualizar objetivo';
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) errorMsg += `: ${errorData.message}`;
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }
            alert('❌ ' + errorMsg);
        }
    } catch (e) {
        console.error('Error al actualizar objetivo:', e);
        alert('❌ Error al actualizar: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina un objetivo con confirmación.
 */
async function deleteObjective(objectiveId) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este objetivo?\n\nEsto eliminará también todos los Key Results asociados.\nEsta acción no se puede deshacer.')) {
        return;
    }

    toggleLoading(true);
    try {
        const response = await apiFetch(`${API_URL}/objectives/${objectiveId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Objetivo eliminado exitosamente');
            await fetchLatestData();
        } else {
            const errorText = await response.text();
            let errorMsg = 'Error al eliminar objetivo';
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) errorMsg += `: ${errorData.message}`;
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }
            alert('❌ ' + errorMsg);
        }
    } catch (e) {
        console.error('Error al eliminar objetivo:', e);
        alert('❌ Error al eliminar: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}

// ==========================================
//  Editar / Eliminar Key Results
// ==========================================

/**
 * Actualiza placeholders del formulario de edición de KR según el tipo de dato.
 */
function updateEditKRPlaceholders() {
    const dataType = document.getElementById('edit-kr-data-type').value;
    const baseline = document.getElementById('edit-kr-baseline');
    const target = document.getElementById('edit-kr-target');
    const current = document.getElementById('edit-kr-current');

    switch (dataType) {
        case 'money':
            baseline.placeholder = '1000';
            target.placeholder = '5000';
            current.placeholder = '3000';
            break;
        case 'time':
            baseline.placeholder = 'HH:MM:SS';
            target.placeholder = 'HH:MM:SS';
            current.placeholder = 'HH:MM:SS';
            break;
        default:
            baseline.placeholder = '0';
            target.placeholder = '100';
            current.placeholder = '50';
    }
}

/**
 * Abre el modal de edición de un Key Result, cargando sus datos actuales.
 */
async function openEditKRModal(krId) {
    toggleLoading(true);
    try {
        const response = await apiFetch(`${API_URL}/keyresults/${krId}`);
        if (!response.ok) {
            throw new Error('No se pudo obtener el Key Result');
        }

        const kr = await response.json();

        // Llenar campos ocultos
        document.getElementById('edit-kr-id').value = krId;
        document.getElementById('edit-kr-objective-id').value = kr.objectiveId ?? '';

        // Llenar selects con catálogos
        populateEditSelect('edit-kr-area', catalogs.areas, kr.areaId);
        populateEditSelect('edit-kr-owner', catalogs.owners, kr.ownerId);

        // Llenar campos de texto
        document.getElementById('edit-kr-code').value = kr.code || '';
        document.getElementById('edit-kr-metric').value = kr.metricName || '';
        document.getElementById('edit-kr-description').value = kr.description || '';
        document.getElementById('edit-kr-notes').value = kr.notesBlockers || '';

        // Data type (convertir de ENUM a value del select)
        const dataTypeMap = { 'MONEY': 'money', 'PERCENT': 'percent', 'INTEGER': 'integer', 'TIME': 'time' };
        const dtValue = dataTypeMap[(kr.dataType || '').toUpperCase()] || '';
        document.getElementById('edit-kr-data-type').value = dtValue;

        // Status
        document.getElementById('edit-kr-status').value = (kr.status || '').toUpperCase().replace(/ /g, '_');

        // Valores numéricos
        if (dtValue === 'time') {
            // Convertir segundos a HH:MM:SS para mostrar
            document.getElementById('edit-kr-baseline').value = secondsToTime(kr.baselineValue ?? 0);
            document.getElementById('edit-kr-target').value = secondsToTime(kr.targetValue ?? 0);
            document.getElementById('edit-kr-current').value = secondsToTime(kr.currentValue ?? 0);
        } else {
            document.getElementById('edit-kr-baseline').value = kr.baselineValue ?? 0;
            document.getElementById('edit-kr-target').value = kr.targetValue ?? 0;
            document.getElementById('edit-kr-current').value = kr.currentValue ?? 0;
        }

        updateEditKRPlaceholders();

        // Mostrar modal
        document.getElementById('edit-kr-modal').style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } catch (e) {
        console.error('Error al cargar Key Result:', e);
        alert('❌ Error al cargar el Key Result: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Convierte segundos a formato HH:MM:SS para mostrar en el formulario.
 */
function secondsToTime(totalSeconds) {
    const s = Math.abs(Math.round(totalSeconds));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Cierra el modal de edición de KR.
 */
function closeEditKRModal() {
    const modal = document.getElementById('edit-kr-modal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

/**
 * Maneja el envío del formulario de edición de Key Result.
 */
async function handleEditKRSubmit(event) {
    event.preventDefault();

    const krId = document.getElementById('edit-kr-id').value;
    const objectiveId = document.getElementById('edit-kr-objective-id').value;
    const dataType = document.getElementById('edit-kr-data-type').value;

    if (!dataType) {
        alert('❌ Debe seleccionar un tipo de dato');
        return;
    }

    toggleLoading(true);
    try {
        const payload = {
            objectiveId: parseInt(objectiveId),
            areaId: parseInt(document.getElementById('edit-kr-area').value),
            ownerId: parseInt(document.getElementById('edit-kr-owner').value),
            code: document.getElementById('edit-kr-code').value.trim(),
            description: document.getElementById('edit-kr-description').value.trim(),
            metricName: document.getElementById('edit-kr-metric').value.trim(),
            dataType: dataType.toUpperCase(),
            baselineValue: parseValueByType(document.getElementById('edit-kr-baseline').value, dataType),
            targetValue: parseValueByType(document.getElementById('edit-kr-target').value, dataType),
            currentValue: parseValueByType(document.getElementById('edit-kr-current').value, dataType),
            status: document.getElementById('edit-kr-status').value,
            notesBlockers: document.getElementById('edit-kr-notes').value.trim() || null
        };

        const response = await apiFetch(`${API_URL}/keyresults/${krId}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert('✅ Key Result actualizado exitosamente');
            closeEditKRModal();
            await fetchLatestData();
        } else {
            const errorText = await response.text();
            let errorMsg = 'Error al actualizar Key Result';
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) errorMsg += `: ${errorData.message}`;
                else if (Array.isArray(errorData)) {
                    errorMsg += `: ${errorData.map(e => `${e.campo}: ${e.error}`).join(', ')}`;
                }
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }
            alert('❌ ' + errorMsg);
        }
    } catch (e) {
        console.error('Error al actualizar Key Result:', e);
        alert('❌ Error al actualizar: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Elimina un Key Result con confirmación.
 */
async function deleteKeyResult(krId) {
    if (!confirm('⚠️ ¿Estás seguro de eliminar este Key Result?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    toggleLoading(true);
    try {
        const response = await apiFetch(`${API_URL}/keyresults/${krId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('✅ Key Result eliminado exitosamente');
            await fetchLatestData();
        } else {
            const errorText = await response.text();
            let errorMsg = 'Error al eliminar Key Result';
            try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) errorMsg += `: ${errorData.message}`;
            } catch (e) {
                errorMsg += `: ${errorText}`;
            }
            alert('❌ ' + errorMsg);
        }
    } catch (e) {
        console.error('Error al eliminar Key Result:', e);
        alert('❌ Error al eliminar: ' + e.message);
    } finally {
        toggleLoading(false);
    }
}
