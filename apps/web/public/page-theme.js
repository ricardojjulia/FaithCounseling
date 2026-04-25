(function applyFaithColorScheme() {
  const stored = localStorage.getItem('churchcore.colorScheme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const useDark = stored === 'dark' || ((!stored || stored === 'auto') && prefersDark);
  document.documentElement.setAttribute('data-color-scheme', useDark ? 'dark' : 'light');
})();
