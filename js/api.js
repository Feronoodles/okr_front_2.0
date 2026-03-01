// ==========================================
//  api.js — Comunicación con el backend
// ==========================================

/**
 * Wrapper de fetch que agrega el token de autorización y maneja
 * la renovación automática cuando el token expira (HTTP 401).
 */
async function apiFetch(url, options = {}) {
    let token = localStorage.getItem('token');
    options.headers = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let response = await fetch(url, options);

    if (response.status === 401 || response.status === 403) {
        console.warn(`Token posiblemente expirado (${response.status}), intentando renovar...`);
        const refreshed = await tryRefreshToken();
        if (refreshed) {
            token = localStorage.getItem('token');
            options.headers['Authorization'] = `Bearer ${token}`;
            response = await fetch(url, options);
        } else {
            console.error('No se pudo renovar el token. Cerrando sesión.');
            handleLogout();
            throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
        }
    }
    return response;
}

/**
 * Intenta renovar el access token usando el refresh token guardado.
 * Retorna true si tuvo éxito, false si falló.
 */
async function tryRefreshToken() {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) return false;

    try {
        const res = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });

        if (res.ok) {
            const data = await res.json();
            const newToken = data.jwtToken || data.token || data.accessToken || data.jwt;
            if (newToken) {
                localStorage.setItem('token', newToken);
                const newRefresh = data.refreshToken || data.refresh_token;
                if (newRefresh) localStorage.setItem('refreshToken', newRefresh);
                console.log('Token renovado exitosamente.');
                return true;
            }
        }
    } catch (e) {
        console.error('Error al intentar renovar token:', e);
    }
    return false;
}

/**
 * Obtiene todos los catálogos del backend (períodos, pilares, etc.)
 */
async function fetchCatalogs() {
    try {
        const [periods, pilares, iniciativas, areas, owners] = await Promise.all([
            fetch(`${API_URL}/periods`).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/pilares`).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/iniciativas`).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/areas`).then(r => r.ok ? r.json() : []),
            fetch(`${API_URL}/owners`).then(r => r.ok ? r.json() : [])
        ]);

        catalogs.periods = (Array.isArray(periods) ? periods : (periods.content || [])).reverse();
        catalogs.pilares = Array.isArray(pilares) ? pilares : (pilares.content || []);
        catalogs.iniciativas = Array.isArray(iniciativas) ? iniciativas : (iniciativas.content || []);
        catalogs.areas = Array.isArray(areas) ? areas : (areas.content || []);
        catalogs.owners = Array.isArray(owners) ? owners : (owners.content || []);

        console.log('Catálogos cargados correctamente.');
    } catch (e) {
        console.error("Error al cargar catálogos:", e);
    }
}

/**
 * Obtiene los datos de objetivos y KRs del backend y los procesa.
 */
async function fetchLatestData() {
    toggleLoading(true);
    try {
        if (!catalogs.pilares.length && !catalogs.areas.length) {
            await fetchCatalogs();
        }

        const response = await fetch(`${API_URL}/objectives?page=0&size=100`);
        if (!response.ok) {
            console.error('Error al obtener objetivos:', response.status, response.statusText);
            return;
        }

        const data = await response.json();
        const objectives = Array.isArray(data) ? data : (data.content || []);

        rawSheetData = flattenObjectives(objectives);

        if (rawSheetData.length > 0) {
            createFilters();
            applyFilters();
            updateGlobalProgressBar(rawSheetData);
        } else {
            rawSheetData = objectives.map(obj => ({
                objective: obj.description || obj.name || 'Sin nombre',
                description: '(Sin Key Results)',
                percent: 0,
                area: '',
                owner: '',
                quarter: resolveId(catalogs.periods, obj.periodId) || '',
                pilar: resolveId(catalogs.pilares, obj.pilarId) || '',
                iniciativa: resolveId(catalogs.iniciativas, obj.iniciativaId) || '',
            }));
            createFilters();
            applyFilters();
            updateGlobalProgressBar(rawSheetData);
        }
    } catch (e) {
        console.error('Error fetching data:', e);
    } finally {
        toggleLoading(false);
    }
}
