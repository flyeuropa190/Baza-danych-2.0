import { fetchInspectionsData } from './inspections-fetcher.js';

const statusContainer = document.getElementById('inspections-status');
const upcomingList = document.getElementById('inspections-upcoming-list');
const endingList = document.getElementById('inspections-ending-list');
const upcomingNoData = document.getElementById('upcoming-no-data');
const endingNoData = document.getElementById('ending-no-data');

// NOWE ELEMENTY MODALA
const modal = document.getElementById('inspection-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalTitle = document.getElementById('modal-title');

let lastKnownTimestampInspections = 0;
const REFRESH_INTERVAL_MS = 15000;

// NOWA GLOBALNA PAMIĘĆ DANYCH
let allInspectionsData = []; 

// --- NARZĘDZIA DATY ---
// ... (parseDateToMidnight i getDateOffset pozostają bez zmian) ...
/**
 * Konwertuje datę w formacie DD/MM/YYYY na obiekt Date o północy.
 */
const parseDateToMidnight = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[\/\.]/);
    if (parts.length === 3) {
        // YYYY, MM (0-indeks), DD
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    return null;
};

/**
 * Zwraca datę za 'days' dni od dzisiaj o północy.
 */
const getDateOffset = (days) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};

// --- LOGIKA FILTROWANIA ---
// ... (getActiveDates, isUpcoming, isEnding pozostają bez zmian) ...
/**
 * Pobiera aktywną datę rozpoczęcia/zakończenia z pól 'po zmianie'.
 */
const getActiveDates = (item) => {
    const startDateStr = item['Data początkowa (po zmianie)'] || item['Data początkowa'];
    const endDateStr = item['Data końcowa (po zmianie)'] || item['Data końcowa'];
    
    return {
        start: parseDateToMidnight(startDateStr),
        end: parseDateToMidnight(endDateStr)
    };
};

/**
 * Sprawdza, czy przegląd rozpoczyna się dzisiaj lub jutro.
 */
const isUpcoming = (item) => {
    const { start } = getActiveDates(item);
    if (!start) return false;

    const today = getDateOffset(0);
    const tomorrow = getDateOffset(1);
    const dayAfterTomorrow = getDateOffset(2);
    
    // Rozpoczyna się dzisiaj LUB rozpoczyna się jutro
    return (start >= today && start < dayAfterTomorrow);
};

/**
 * Sprawdza, czy przegląd kończy się dzisiaj lub jutro.
 */
const isEnding = (item) => {
    const { end } = getActiveDates(item);
    if (!end) return false;

    const today = getDateOffset(0);
    const dayAfterTomorrow = getDateOffset(2);
    
    // Kończy się dzisiaj LUB kończy się jutro
    return (end >= today && end < dayAfterTomorrow);
};


// --- RENDEROWANIE I STYLOWANIE ---

const getStatusClass = (status) => {
    switch (status.toLowerCase().trim()) {
        case 'w trakcie': return 'status-in-progress'; 
        case 'zaplanowany': return 'status-planned'; 
        case 'wykonany': return 'status-completed'; 
        case 'przygotowany': return 'status-prepared'; 
        case 'anulowany': return 'status-cancelled'; 
        case 'przełożony': return 'status-postponed'; 
        case 'niewykonany': return 'status-unperformed'; 
        case 'problem': return 'status-problem'; 
        default: return 'status-default';
    }
};

const getTypeClass = (type) => {
    // Prosta konwersja do bezpiecznej klasy (np. A-CHECK -> type-a-check)
    return 'type-' + type.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
};

const renderInspectionItem = (item, isUpcoming) => {
    const { start, end } = getActiveDates(item);
    const statusClass = getStatusClass(item.Status || '');
    const typeClass = getTypeClass(item.Typ || '');
    
    // ZMIANA: Używamy unikalnego ID dodanego w updateUIInspections
    const itemIdentifier = item.uniqueId; 

    // Wyświetlanie dat
    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    const dateRange = `${dateDisplayStart} – ${dateDisplayEnd}`;

    // Dodano atrybut data-id z unikalnym indeksem
    return `
        <div class="inspection-item ${statusClass}" data-id="${itemIdentifier}" onclick="showInspectionDetails(this)">
            <div class="inspection-header">
                <p class="registration-info">${item.Rejestracja} (${item['Numer tab']})</p>
                <span class="status-tag">${item.Status || 'Brak statusu'}</span>
            </div>
            <p class="inspection-meta">
                <span class="type-tag ${typeClass}">${item.Typ}</span>
                <span class="inspection-dates ${isUpcoming ? 'upcoming' : 'ending'}">
                    ${dateRange}
                </span>
            </p>
        </div>
    `;
};


// --- OBSŁUGA MODALA ---

/**
 * Funkcja pomocnicza, która mapuje status na kolor (dla tekstu w modalu).
 */
const getStatusTextColor = (status) => {
    switch (status.toLowerCase().trim()) {
        case 'w trakcie': return 'color: #3498db; font-weight: bold;';      // Niebieski
        case 'zaplanowany': return 'color: #f7a0b3; font-weight: bold;';   // Lekki róż
        case 'wykonany': return 'color: #2ecc71; font-weight: bold;';      // Zielony
        case 'przygotowany': return 'color: #9b59b6; font-weight: bold;';  // Fioletowy
        case 'anulowany': return 'color: #95a5a6;';                       // Szary
        case 'przełożony': return 'color: #f1c40f; font-weight: bold;';    // Żółty
        case 'niewykonany': return 'color: #e67e22; font-weight: bold;';   // Lekko czerwony (pomarańczowy)
        case 'problem': return 'color: #c0392b; font-weight: 900;';        // Czerwony + bardzo gruby
        default: return '';
    }
};

/**
 * Funkcja do formatowania szczegółów wewnątrz modala, ulepszona pod kątem czytelności.
 * @param {object} item - Obiekt danych przeglądu.
 */
const renderModalDetails = (item) => {
    const startDateStr = item['Data początkowa'];
    const endDateStr = item['Data końcowa'];
    const startDateChanged = item['Data początkowa (po zmianie)'];
    const endDateChanged = item['Data końcowa (po zmianie)'];
    const statusStyle = getStatusTextColor(item.Status || '');
    
    // Sprawdzenie, czy doszło do zmiany/opóźnienia
    const hasDelay = item.Opóźnienie && item.Opóźnienie !== '0';
    const isPlanChanged = startDateChanged || endDateChanged;

    let html = '';
    
    // ----------------------------------------------------
    // --- SEKCJA INFO PODSTAWOWE ---
    // ----------------------------------------------------
    html += `<h4>INFO PODSTAWOWE</h4>`;
    html += `<div class="modal-grid">`;
    
    html += `<div class="modal-grid-item"><strong>Rejestracja (Tab):</strong> <b>${item.Rejestracja || 'N/A'}</b> (<b>${item['Numer tab'] || 'N/A'}</b>)</div>`;
    html += `<div class="modal-grid-item"><strong>Typ przeglądu:</strong> <span class="modal-highlight"><b>${item.Typ || 'N/A'}</b></span></div>`;
    
    html += `<div class="modal-grid-item"><strong>Status:</strong> <span style="${statusStyle}"><b>${item.Status || 'N/A'}</b></span></div>`;
    html += `<div class="modal-grid-item"><strong>Ilość godzin:</strong> <b>${item['Ilość godzin'] || 'N/A'}</b></div>`;
    
    html += `</div><hr>`;


    // ----------------------------------------------------
    // --- SEKCJA DATY PLANOWANE ---
    // ----------------------------------------------------
    html += `<h4>DATY (${isPlanChanged ? 'PLANOWANE VS AKTUALNE' : 'PLANOWANE'})</h4>`;
    html += `<div class="modal-grid">`;
    
    html += `<div class="modal-grid-item"><strong>Data pocz. planowana:</strong> ${startDateStr || 'N/A'}</div>`;
    html += `<div class="modal-grid-item"><strong>Data końcowa planowana:</strong> ${endDateStr || 'N/A'}</div>`;
    
    html += `</div>`; // Zamykamy grid dat planowanych
    
    // ----------------------------------------------------
    // --- SEKCJA ZMIANY DAT (WARUNKOWO) ---
    // ----------------------------------------------------
    if (isPlanChanged) {
        html += `<h4 style="grid-column: 1 / -1;">AKTUALNY HARMONOGRAM</h4>`;
        
        // Zastosowanie klasy dla zmiany planu
        html += `<div class="modal-delay-section" style="grid-column: 1 / -1;">`; 
        
        // Komunikat o opóźnieniu
        if (hasDelay) {
            // Styl inline, aby zapewnić poprawne zawijanie na telefonach
            html += `<p style="margin-bottom: 5px; color: #e74c3c; font-weight: 800;"><i class="fas fa-exclamation-triangle"></i> PRZEŁOŻONY/OPÓŹNIONY O: <b>${item.Opóźnienie}</b></p>`;
        } else {
            html += `<p class="modal-highlight" style="margin-bottom: 5px;">Daty zostały zmienione.</p>`;
        }
        
        // Wiersze z nowymi datami
        html += `<div class="modal-grid" style="grid-template-columns: 1fr 1fr; gap: 10px 30px; margin-top: 10px;">`;
        html += `<p class="modal-grid-item"><strong>Nowa Data początkowa:</strong> <span class="modal-highlight"><b>${startDateChanged || 'N/A'}</b></span></p>`;
        html += `<p class="modal-grid-item"><strong>Nowa Data końcowa:</strong> <span class="modal-highlight"><b>${endDateChanged || 'N/A'}</b></span></p>`;
        html += `</div>`; // Zamykamy grid wewnątrz sekcji opóźnienia
        
        html += `<p style="margin-top: 5px; margin-bottom: 0;"><strong>Powód opóźnienia:</strong> ${item['Powód opóźnienia'] || 'Brak'}</p>`;
        
        html += `</div>`; // Zamykamy modal-delay-section
    }
    
    html += `<hr>`;


    // ----------------------------------------------------
    // --- SEKCJA LOGISTYKA I GOTOWOŚĆ ---
    // ----------------------------------------------------
    html += `<h4>LOGISTYKA I GOTOWOŚĆ</h4>`;
    html += `<div class="modal-grid">`;
    
    html += `<div class="modal-grid-item"><strong>Samolot zastępczy (SZ):</strong> <b>${item['Samolot zastępczy'] || 'Brak'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>Konieczność sprowadzenia SZ:</strong> <b>${item['Konieczność sprowadzenia SZ'] || 'NIE'}</b></div>`;
    
    html += `<div class="modal-grid-item"><strong>SZ innego przewoźnika:</strong> <b>${item['SZ innego przewoźnika'] || 'NIE'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>Samolot gotowy:</strong> <b>${item['Samolot gotowy'] || 'NIE'}</b></div>`;
    
    html += `<div class="modal-grid-item"><strong>SZ gotowy:</strong> <b>${item['SZ gotowy'] || 'NIE'}</b></div>`;
    html += `</div><hr>`;

    // ----------------------------------------------------
    // --- SEKCJA DODATKOWE INFORMACJE ---
    // ----------------------------------------------------
    html += `<h4>DODATKOWE INFORMACJE</h4>`;
    html += `<p style="margin: 0;">${item['Dodatkowe informacje'] || 'Brak'}</p>`;


    return html;
};

/**
 * Pokazuje modal z danymi klikniętego przeglądu.
 */
window.showInspectionDetails = (element) => {
    // ZMIANA: Pobieramy ID i konwertujemy je na liczbę całkowitą (integer)
    const id = parseInt(element.getAttribute('data-id'));
    
    // Znajdujemy pełny obiekt danych po unikalnym ID
    const item = allInspectionsData.find(d => 
        d.uniqueId === id
    );

    if (item) {
        modalTitle.textContent = `Szczegóły: ${item.Rejestracja} (${item['Numer tab']})`;
        modalDetailsContent.innerHTML = renderModalDetails(item);
        modal.style.display = "block";
    } else {
        alert('Nie znaleziono szczegółów dla tego przeglądu.');
    }
};

/**
 * Zamyka modal.
 */
const closeModal = () => {
    modal.style.display = "none";
};

// Zamykanie modala przez przycisk 'x'
closeModalBtn.onclick = closeModal;

// Zamykanie modala po kliknięciu poza nim
window.onclick = function(event) {
    if (event.target == modal) {
        closeModal();
    }
}


// --- FUNKCJE GŁÓWNE (POPRAWIONE) ---

const updateUIInspections = (allData) => {
    // ZMIANA: Zapisujemy całe dane do pamięci globalnej, dodając unikalny ID
    allInspectionsData = allData.map((item, index) => ({
        ...item,
        uniqueId: index // Używamy indeksu w tablicy jako unikalnego ID
    }));
    
    // 1. Filtrowanie (teraz filtrujemy nową tablicę z uniqueId)
    const upcoming = allInspectionsData.filter(isUpcoming);
    const ending = allInspectionsData.filter(item => isEnding(item) && !isUpcoming(item));

    // 2. Renderowanie
    upcomingList.innerHTML = upcoming.length > 0 ? upcoming.map(item => renderInspectionItem(item, true)).join('') : '';
    endingList.innerHTML = ending.length > 0 ? ending.map(item => renderInspectionItem(item, false)).join('') : '';

    // 3. Statusy
    upcomingNoData.style.display = upcoming.length === 0 ? 'block' : 'none';
    endingNoData.style.display = ending.length === 0 ? 'block' : 'none';

    statusContainer.classList.add('hidden');
};


const checkAndUpdateInspectionsData = async () => {
    // Pokazujemy ładowanie tylko przy starcie lub błędzie
    if (lastKnownTimestampInspections === 0) {
        statusContainer.textContent = 'Ładowanie przeglądów...';
        statusContainer.classList.remove('hidden');
    }
    
    const result = await fetchInspectionsData();
    
    if (result.error) {
        statusContainer.textContent = `Błąd: Nie udało się pobrać danych przeglądów: ${result.error}`;
        statusContainer.classList.remove('hidden');
        return;
    }
    
    // Sprawdzamy, czy dane są nowsze LUB czy jest to pierwsze ładowanie.
    if (result.timestamp > lastKnownTimestampInspections || lastKnownTimestampInspections === 0) {
        console.log(`[Inspections Fetch] ${lastKnownTimestampInspections === 0 ? 'Pierwsze ładowanie' : 'Nowe dane'}! Timestamp: ${result.timestamp}`);
        lastKnownTimestampInspections = result.timestamp;
        updateUIInspections(result.data);
    } else {
        // Dane są aktualne i nie było błędu. Cicho ukrywamy status.
        statusContainer.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Uruchomienie pętli Pollingu
    setInterval(checkAndUpdateInspectionsData, REFRESH_INTERVAL_MS);
    
    // Pierwsze pobranie
    checkAndUpdateInspectionsData();
});