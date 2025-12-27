document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const menuClose = document.getElementById('menuClose');
    const menuPanel = document.getElementById('mobile-menu-panel');

    // --- 1. Funkcja Toggle Menu Głównego ---
    const toggleMenu = (forceClose = false) => {
        const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
        const shouldClose = forceClose || isExpanded;

        menuToggle.setAttribute('aria-expanded', !shouldClose);
        menuPanel.setAttribute('aria-hidden', shouldClose);
        document.body.style.overflow = shouldClose ? '' : 'hidden';

        if (shouldClose) {
            menuToggle.focus();
        }
    };

    if (menuToggle && menuPanel) {
        menuToggle.addEventListener('click', () => toggleMenu());
        if (menuClose) {
            menuClose.addEventListener('click', () => toggleMenu(true));
        }
    }

    // --- 2. Obsługa Akordeonów (Submenu) ---
    const accordionTriggers = document.querySelectorAll('.accordion-trigger');

    accordionTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault(); // Zapobiegamy przeładowaniu, jeśli to button
            
            // Przełącz klasę 'open' na przycisku (dla koloru i obrotu strzałki)
            trigger.classList.toggle('open');
            
            // Znajdź sąsiednie submenu (ul.sm-submenu)
            const submenu = trigger.nextElementSibling;
            if (submenu) {
                submenu.classList.toggle('open');
            }

            // Opcjonalnie: Zamknij inne otwarte akordeony (dla efektu "tylko jeden otwarty")
            // Odkomentuj poniższy blok, jeśli chcesz to zachowanie:
                    accordionTriggers.forEach(otherTrigger => {
                if (otherTrigger !== trigger && otherTrigger.classList.contains('open')) {
                    otherTrigger.classList.remove('open');
                    otherTrigger.nextElementSibling.classList.remove('open');
                }
            });
            
        });
    });

    // --- 3. Obsługa aktywnego linku i zamykanie menu po kliknięciu linku końcowego ---
    const currentPath = window.location.pathname.split('/').pop() || 'StronaGlowna.html';
    
    // Pobierz wszystkie linki (zarówno główne jak i w submenu)
    const allLinks = menuPanel.querySelectorAll('a');

    allLinks.forEach(link => {
        const linkPath = link.getAttribute('href');

        // Logika Active State
        if (linkPath === currentPath) {
            link.classList.add('active');
            
            // Jeśli link jest w submenu, otwórz automatycznie rodzica (akordeon)
            const parentSubmenu = link.closest('.sm-submenu');
            if (parentSubmenu) {
                parentSubmenu.classList.add('open');
                const parentTrigger = parentSubmenu.previousElementSibling; // Button accordion-trigger
                if (parentTrigger) {
                    parentTrigger.classList.add('open');
                }
            }
        }

        // Zamykanie menu po kliknięciu w konkretny link (nie w nagłówek kategorii)
        link.addEventListener('click', () => {
            toggleMenu(true);
        });
    });
});