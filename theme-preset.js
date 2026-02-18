/* 88st.cloud theme preset (safe/no-op + small utilities) */
(function () {
  try {
    // Allow per-page accent tweaks without breaking legacy pages.
    document.documentElement.style.setProperty('--accent-gold', '#f5e27a');
    document.documentElement.style.setProperty('--accent-gold-2', '#e7cf6a');
    document.documentElement.style.setProperty('--glass-border', 'rgba(255,255,255,.08)');
  } catch (e) {}
})();
