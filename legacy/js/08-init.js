
/**
 * WOX-Bin - 08-init.js
 * Landing check, goToApp, runAppInit, init IIFE.
 */
(function init() {
  if (shouldShowLanding()) {
    document.getElementById('landing-get-started').addEventListener('click', goToApp);
    const cta2 = document.getElementById('landing-get-started-2');
    if (cta2) cta2.addEventListener('click', goToApp);
    return;
  }
  document.getElementById('landing-page').classList.add('hidden');
  document.getElementById('app-container').classList.remove('hidden');
  runAppInit();
})();
