// ==========================================
//  data.js — Procesamiento y transformación de datos
// ==========================================

/**
 * Normaliza un item del backend para que sus campos coincidan
 * con las claves definidas en COL, sin importar cómo los nombre el backend.
 */
function normalizeRow(item) {
    const first = (...vals) => {
        for (const v of vals) {
            if (v !== undefined && v !== null && v !== '') return v;
        }
        return null;
    };

    const normalized = {
        objective: first(
            item.objective, item.objectiveName, item.objectiveDescription,
            item.objective_description, item.objectiveTitle, item.objective_title
        ) ?? '',

        description: first(
            item.description, item.krDescription, item.keyResultDescription,
            item.key_result_description, item.krName, item.keyResultName
        ) ?? '',

        percent: first(
            item.percent, item.percentProgress, item.percent_progress, item.progress
        ),

        area: first(item.area, item.areaName, item.area_name) ?? '',
        owner: first(item.owner, item.ownerName, item.owner_name) ?? '',
        quarter: first(item.quarter, item.quarterYear, item.quarter_year, item.period) ?? '',
        pilar: first(item.pilar, item.pilarName, item.pilar_name, item.strategicPillar, item.strategic_pillar) ?? '',
        iniciativa: first(item.iniciativa, item.iniciativaName, item.iniciativa_name, item.strategicInitiative, item.strategic_initiative) ?? '',

        'Status': first(item['Status'], item.status) ?? '',
        'Target Value': first(item['Target Value'], item.targetValue, item.target_value) ?? 0,
        'Current Value': first(item['Current Value'], item.currentValue, item.current_value) ?? 0,
        'Baseline Value': first(item['Baseline Value'], item.baselineValue, item.baseline_value) ?? 0,
        'Métrica': first(item['Métrica'], item.metricName, item.metric_name) ?? '',
        objective_percent: item.objective_percent ?? 0,
    };

    return { ...item, ...normalized };
}

/**
 * Busca el nombre de un catálogo por su ID.
 */
function resolveId(catalog, id, nameKey = 'name') {
    if (!catalog || !id) return '';
    const found = catalog.find(c => c.id === id || c.id === String(id));
    return found ? (found[nameKey] || found.name || '') : '';
}

/**
 * Aplana la estructura anidada de objetivos con sus KRs en filas planas.
 * Cada fila representa un KR con los datos del objetivo padre incluidos.
 */
function flattenObjectives(objectives) {
    const rows = [];

    objectives.forEach(obj => {
        const objectiveName = obj.description || obj.name || obj.title || obj.objectiveName || 'Sin nombre';

        const pilarName = resolveId(catalogs.pilares, obj.pilarId);
        const iniciativaName = resolveId(catalogs.iniciativas, obj.iniciativaId);
        const periodName = resolveId(catalogs.periods, obj.periodId);

        const krs = obj.keyResults || obj.key_results || obj.krs || [];

        if (krs.length === 0) {
            rows.push({
                objective: objectiveName,
                description: '(Sin Key Results)',
                percent: 0,
                area: '',
                owner: '',
                quarter: periodName,
                pilar: pilarName,
                iniciativa: iniciativaName,
                'Status': '',
                'Target Value': 0,
                'Current Value': 0,
                'Baseline Value': 0,
                'Métrica': '',
                objective_percent: 0,
                _objectiveId: obj.id,
            });
            return;
        }

        krs.forEach(kr => {
            const areaName = (kr.area && typeof kr.area === 'string')
                ? kr.area
                : (kr.areaName || resolveId(catalogs.areas, kr.areaId) || '');

            const ownerName = (kr.owner && typeof kr.owner === 'string')
                ? kr.owner
                : (kr.ownerName ||
                    resolveId(catalogs.owners, kr.ownerId, 'name') || '');

            const baseline = parseFloat(kr.baselineValue ?? kr.baseline_value ?? 0);
            const target = parseFloat(kr.targetValue ?? kr.target_value ?? 0);
            const current = parseFloat(kr.currentValue ?? kr.current_value ?? 0);
            const dataType = (kr.dataType ?? kr.data_type ?? '').toUpperCase();

            let percent;
            if (dataType === 'TIME') {
                percent = (target !== baseline)
                    ? ((current - baseline) / (target - baseline)) * 100
                    : (current >= target ? 100 : 0);
            } else {
                percent = target > 0 ? (current / target) * 100 : 0;
            }

            percent = Math.round(Math.max(0, Math.min(100, percent)) * 100) / 100;

            rows.push({
                objective: objectiveName,
                pilar: pilarName,
                iniciativa: iniciativaName,
                quarter: kr.quarter ?? kr.quarterYear ?? kr.period ?? periodName,

                description: kr.description || kr.krDescription || kr.keyResultDescription || kr.name || '',
                percent: percent,
                area: areaName,
                owner: ownerName,
                dataType: (kr.dataType ?? kr.data_type ?? '').toUpperCase(),

                'Status': kr.status || kr['Status'] || '',
                'Target Value': kr.targetValue ?? kr.target_value ?? 0,
                'Current Value': kr.currentValue ?? kr.current_value ?? 0,
                'Baseline Value': kr.baselineValue ?? kr.baseline_value ?? 0,
                'Métrica': kr.metricName ?? kr.metric_name ?? kr['Métrica'] ?? '',
                objective_percent: 0,

                _objectiveId: obj.id,
                _krId: kr.id,
                _areaId: kr.areaId ?? kr.area_id,
                _ownerId: kr.ownerId ?? kr.owner_id,
                _code: kr.code || '',
                _metricName: kr.metricName ?? kr.metric_name ?? '',
                _notesBlockers: kr.notesBlockers ?? kr.notes_blockers ?? '',
            });
        });
    });

    return rows;
}

/**
 * Calcula el porcentaje de progreso de un Key Result.
 */
function calculateKRProgress(dataItem) {
    const rawPercent = dataItem[COL.percent];
    if (rawPercent !== undefined && rawPercent !== null && rawPercent !== '') {
        const p = Number(rawPercent);
        if (!isNaN(p)) {
            return Math.min(100, Math.max(0, p));
        }
    }

    const current = parseFloat(dataItem['Current Value']) || 0;
    const target = parseFloat(dataItem['Target Value']) || 0;
    const baseline = parseFloat(dataItem['Baseline Value']) || 0;

    if (target === baseline) return current >= target ? 100 : 0;

    let progress = (target > baseline)
        ? ((current - baseline) / (target - baseline)) * 100
        : ((baseline - current) / (baseline - target)) * 100;

    return Math.max(0, Math.min(100, parseFloat(progress.toFixed(2))));
}

/**
 * Agrupa datos por una clave para el renderizado de tarjetas.
 */
function groupData(data, key, viewType) {
    const groups = {};
    data.forEach(item => {
        const val = item[key] || "Sin asignar";
        if (!groups[val]) {
            groups[val] = {
                title: val,
                extra: (viewType === 'Objetivo') ? `${item[COL.qy]} | ${item[COL.iniciativa]}` : `Vista por ${viewType}`,
                krs: []
            };
        }
        groups[val].krs.push(item);
    });
    return Object.values(groups);
}
