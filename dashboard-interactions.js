// plik: dashboard-interactions.js

document.addEventListener('DOMContentLoaded', () => {

    // Słownik mapowania: Klucz z Dashboardu -> Fraza do wyszukiwarki we Flocie
    const statusMap = {
        "Dostępne": "Dostępny",
        "Uziemione": "Uziemiony",
        "Zaparkowane": "Zaparkowany",
        "Samoloty zastępcze": "Samolot zastępczy",
        "Do przeglądu": "Do przeglądu",
        "Przegląd": "Przegląd",
        "Do odstawienia": "Do odstawienia",
        "Naprawa": "Naprawa",
        "Awaria": "Awaria",
        "Nieczynne": "Nieczynny",
        "Delegacja": "Delegacja",
        "Zamówione": "Zamówiony"
    };
    
    // --- 1. Obsługa kliknięcia w STATUS (Przekierowanie do Flota.html) ---
    const stanyList = document.getElementById('dashboard-stany-list');
    
    if (stanyList) {
        stanyList.addEventListener('click', (e) => {
            const target = e.target.closest('[data-status]');
            
            if (target) {
                const rawStatus = target.getAttribute('data-status');
                
                // 1. Sprawdzamy, czy status jest na liście ignorowanych
                if (rawStatus === "POSIADANE" || rawStatus === "ŁĄCZNIE") {
                    console.log(`[dashboard] Status "${rawStatus}" jest wyłączony z wyszukiwania.`);
                    return;
                }

                // 2. Pobieramy zmapowaną wartość (jeśli nie ma w słowniku, bierzemy oryginał)
                const searchString = statusMap[rawStatus] || rawStatus;
                
                // 3. Przekierowanie
                window.location.href = `Flota-Spis.html?search=${encodeURIComponent(searchString)}`;
            }
        });
    }

    // --- 2. Obsługa kliknięcia w KONTROLKĘ (Otwarcie Modala) ---
    const kontrolkaList = document.getElementById('dashboard-kontrolka-list');
    if (kontrolkaList) {
        kontrolkaList.addEventListener('click', (e) => {
            const target = e.target.closest('[data-reg]');
            if (target) {
                const registration = target.getAttribute('data-reg');
                // Tutaj przekazujemy rejestrację bezpośrednio, bo ona się nie zmienia
                window.location.href = `Flota-Spis.html?search=${encodeURIComponent(registration)}`;
            }
        });
    }
});
