import { fetchInspectionsData } from './inspections-fetcher.js';

const statusContainer = document.getElementById('inspections-status');
const upcomingList = document.getElementById('inspections-upcoming-list');
const endingList = document.getElementById('inspections-ending-list');
const upcomingNoData = document.getElementById('upcoming-no-data');
const endingNoData = document.getElementById('ending-no-data');

let lastKnownTimestampInspections = 0;
const REFRESH_INTERVAL_MS = 15000;

// --- NARZĘDZIA DATY ---

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
        case 'wykonany': return 'status-completed'; // Zmienione z 'zakończony' na 'wykonany'
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
    
    // Wyświetlanie dat
    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    const dateRange = `${dateDisplayStart} – ${dateDisplayEnd}`;

    // Dodano wyświetlanie STATUSU
    return `
        <div class="inspection-item ${statusClass}">
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
}

// --- FUNKCJE GŁÓWNE ---

const updateUIInspections = (allData) => {
    // 1. Filtrowanie
    const upcoming = allData.filter(isUpcoming);
    const ending = allData.filter(item => isEnding(item) && !isUpcoming(item)); // Wykluczamy te, które i zaczynają, i kończą

    // 2. Renderowanie
    upcomingList.innerHTML = upcoming.length > 0 ? upcoming.map(item => renderInspectionItem(item, true)).join('') : '';
    endingList.innerHTML = ending.length > 0 ? ending.map(item => renderInspectionItem(item, false)).join('') : '';

    // 3. Statusy
    upcomingNoData.style.display = upcoming.length === 0 ? 'block' : 'none';
    endingNoData.style.display = ending.length === 0 ? 'block' : 'none';

    statusContainer.textContent = `Ostatnie sprawdzenie: ${new Date().toLocaleTimeString()}. Aktywnych przeglądów w najbliższych 2 dniach: ${upcoming.length + ending.length}.`;
    statusContainer.classList.add('hidden');
};

const checkAndUpdateInspectionsData = async () => {
    statusContainer.textContent = 'Ładowanie przeglądów...';
    
    const result = await fetchInspectionsData();
    
    if (result.error) {
        statusContainer.textContent = `Błąd: Nie udało się pobrać danych przeglądów: ${result.error}`;
        statusContainer.classList.remove('hidden');
        return;
    }
    
    if (result.timestamp > lastKnownTimestampInspections) {
        console.log(`[Inspections Fetch] Nowe dane! Timestamp: ${result.timestamp}`);
        lastKnownTimestampInspections = result.timestamp;
        updateUIInspections(result.data);
    } else if (lastKnownTimestampInspections === 0) {
        // Pierwsze ładowanie
        lastKnownTimestampInspections = result.timestamp;
        updateUIInspections(result.data);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Uruchomienie pętli Pollingu
    setInterval(checkAndUpdateInspectionsData, REFRESH_INTERVAL_MS);
    
    // Pierwsze pobranie
    checkAndUpdateInspectionsData();
});