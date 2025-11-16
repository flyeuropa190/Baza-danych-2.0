// Plik: mobile-menu.js (Zaktualizowany)

document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose'); // NOWY PRZYCISK
    const menuPanel = document.getElementById('mobile-menu-panel');

    const toggleMenu = (targetExpanded) => {
        const isExpanded = targetExpanded !== undefined ? targetExpanded : menuToggle.getAttribute('aria-expanded') === 'true' || false;
        const newExpandedState = !isExpanded;

        // 1. Zmień stan przycisku
        menuToggle.setAttribute('aria-expanded', newExpandedState);
        
        // 2. Zmień stan panelu menu
        menuPanel.setAttribute('aria-hidden', !newExpandedState);

        // 3. Zablokuj scrollowanie body
        document.body.style.overflow = newExpandedState ? 'hidden' : '';

        if (!newExpandedState) {
            // Jeśli menu jest ZAMYKANE, przenieś focus z powrotem na przycisk otwierający.
            // Zapobiega to ukryciu aktywnego focusa.
            menuToggle.focus();
        }
    };

    

    if (menuToggle && menuPanel) {
        // Obsługa otwierania przyciskiem hamburgera
        menuToggle.addEventListener('click', () => toggleMenu());
        
        // Obsługa zamykania nowym przyciskiem "X"
        if (menuClose) {
            menuClose.addEventListener('click', () => toggleMenu(true)); // Użyj 'true' aby wymusić zamknięcie
        }

        // 4. Zamknij menu po kliknięciu linku w menu
        menuPanel.querySelectorAll('a.sm-panel-item').forEach(link => {
            link.addEventListener('click', () => {
                // Wymuś zamknięcie menu
                menuToggle.setAttribute('aria-expanded', 'false');
                menuPanel.setAttribute('aria-hidden', 'true');
                document.body.style.overflow = '';
            });
        });
    }

    const currentPath = window.location.pathname.split('/').pop();
        const navLinks = menuPanel.querySelectorAll('a.sm-panel-item');

        navLinks.forEach(link => {
            const linkPath = link.getAttribute('href');
            
            // Porównaj ostatnią część ścieżki (np. "StronaGlowna.html")
            if (linkPath === currentPath) {
                link.classList.add('active');
            } else if (currentPath === '' && linkPath === 'StronaGlowna.html') {
                // Specjalna obsługa, jeśli strona główna jest ładowana jako '/'
                link.classList.add('active');
            }
        });
});


