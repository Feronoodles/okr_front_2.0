// ==========================================
//  auth.js — Autenticación y sesión
// ==========================================

/**
 * Maneja el inicio de sesión del usuario.
 */
async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    toggleLoading(true);
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: user, password: pass })
        });
        if (response.ok) {
            const data = await response.json();
            const token = data.jwtToken || data.token || data.accessToken || data.jwt;
            const refreshToken = data.refreshToken || data.refresh_token || data.refreshJwt;

            if (token) {
                localStorage.setItem('token', token);
                if (refreshToken) {
                    localStorage.setItem('refreshToken', refreshToken);
                }
                location.reload();
            } else {
                console.error("No se encontró token en la respuesta");
                alert("Error: No se recibió token del servidor");
            }
        } else {
            alert("Credenciales incorrectas");
        }
    } catch (e) {
        console.error("Error login:", e);
    } finally {
        toggleLoading(false);
    }
}

/**
 * Actualiza la interfaz según el estado de autenticación.
 */
function updateUI(isLogged) {
    const loginForm = document.getElementById('login-form');
    const adminLogged = document.getElementById('admin-logged');
    const adminPanel = document.getElementById('admin-panel');
    const authStatus = document.getElementById('auth-status');

    if (isLogged) {
        if (loginForm) loginForm.style.setProperty('display', 'none', 'important');
        if (adminLogged) adminLogged.style.setProperty('display', 'flex', 'important');
        if (adminPanel) adminPanel.style.setProperty('display', 'block', 'important');
        if (authStatus) authStatus.innerText = "Modo Administrador";
    } else {
        if (loginForm) loginForm.style.setProperty('display', 'flex', 'important');
        if (adminLogged) adminLogged.style.setProperty('display', 'none', 'important');
        if (adminPanel) adminPanel.style.setProperty('display', 'none', 'important');
        if (authStatus) authStatus.innerText = "Modo Lectura";
    }
}

/**
 * Cierra la sesión del usuario.
 */
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    location.reload();
}

/**
 * Verifica si hay una sesión activa al cargar la página.
 */
function checkLocalSession() {
    const token = localStorage.getItem('token');
    if (token) updateUI(true);
}

/**
 * Controla la visibilidad del overlay de carga.
 */
function toggleLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}
