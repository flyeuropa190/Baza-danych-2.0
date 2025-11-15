// Plik: theme-switcher.js

document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const htmlEl = document.documentElement; // <html> tag

  // Funkcja do zastosowania motywu
  const applyTheme = (theme) => {
    // Teraz 'dark' oznacza dodanie klasy, 'light' (domyślny) oznacza jej brak
    if (theme === 'dark') {
      htmlEl.classList.add('dark-mode');
    } else {
      htmlEl.classList.remove('dark-mode');
    }
  };

  // 1. Sprawdź zapisany motyw przy ładowaniu strony
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    applyTheme(savedTheme);
  } else {
    // Jeśli nie ma zapisanego motywu, DOMYŚLNIE jest to 'light' (bez klasy)
  }

  // 2. Obsługa kliknięcia przełącznika
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      // Przełącz klasę, która aktywuje motyw ciemny
      htmlEl.classList.toggle('dark-mode');
      
      // Zapisz wybór w localStorage
      if (htmlEl.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
      } else {
        localStorage.setItem('theme', 'light');
      }
    });
  }
});