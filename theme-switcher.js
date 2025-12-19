document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');

  // Funkcja nakładająca motyw
  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark-mode');
    } else {
      document.documentElement.classList.remove('dark-mode');
    }
  };

  // 1. Sprawdź zapisany motyw przy starcie
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  }

  // 2. Obsługa kliknięcia (WZMOCNIONA)
  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault(); // Zapobiega ewentualnemu odświeżeniu
      
      // Bezpośrednie przełączenie na dokumencie
      const isDark = document.documentElement.classList.toggle('dark-mode');
      
      // Zapis do pamięci
      localStorage.setItem('theme', isDark ? 'dark' : 'light');     
    
    });
  }
});