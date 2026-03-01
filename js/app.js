// ==========================================
//  app.js — Punto de entrada de la aplicación
// ==========================================

window.onload = async () => {
    checkLocalSession();
    await fetchLatestData();
    await fetchCatalogs();
};
