import { fetchInspectionsData } from './inspections-fetcher.js';

const CACHE_KEY_INSPECTIONS = 'inspections_data_v1';

const statusContainer = document.getElementById('inspections-status');
// LISTY (Kontenery)
const overdueList = document.getElementById('inspections-overdue-list');
const upcomingList = document.getElementById('inspections-upcoming-list');
const endingList = document.getElementById('inspections-ending-list');
// KOMUNIKATY
const overdueNoData = document.getElementById('overdue-no-data');
const upcomingNoData = document.getElementById('upcoming-no-data');
const endingNoData = document.getElementById('ending-no-data');

// ELEMENTY MODALA
const modal = document.getElementById('inspection-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalTitle = document.getElementById('modal-title');

let lastKnownTimestampInspections = 0;
const REFRESH_INTERVAL_MS = 15000;
let allInspectionsData = []; 

// --- CACHE UTILS ---
function saveToCache(data, timestamp) {
    try {
        const cacheObj = { data, timestamp };
        sessionStorage.setItem(CACHE_KEY_INSPECTIONS, JSON.stringify(cacheObj));
    } catch(e) {}
}

function loadFromCache() {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY_INSPECTIONS);
        return cached ? JSON.parse(cached) : null;
    } catch(e) { return null; }
}

// --- NARZĘDZIA DATY ---

const parseDateToMidnight = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[\/\.]/);
    if (parts.length === 3) {
        // Format DD.MM.YYYY
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    return null;
};

const getDateOffset = (days) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return date;
};

// --- LOGIKA FILTROWANIA I KLASYFIKACJI ---

const getActiveDates = (item) => {
    const startDateStr = item['Data początkowa (po zmianie)'] || item['Data początkowa'];
    const endDateStr = item['Data końcowa (po zmianie)'] || item['Data końcowa'];
    
    return {
        start: parseDateToMidnight(startDateStr),
        end: parseDateToMidnight(endDateStr)
    };
};

// Pomocnicza funkcja do normalizacji statusu
const getNormStatus = (item) => item.Status ? item.Status.toLowerCase().trim() : '';

// 1. ZALEGŁE (OVERDUE)
const isOverdue = (item) => {
    const { start, end } = getActiveDates(item);
    const today = getDateOffset(0);
    const status = getNormStatus(item);

    // Warunek 1: Data rozpoczęcia < dzisiaj ORAZ status Zaplanowany/Przygotowany/Przełożony
    const pendingStatuses = ['zaplanowany', 'przygotowany', 'przełożony'];
    if (start && start < today && pendingStatuses.includes(status)) {
        return true;
    }

    // Warunek 2: Data zakończenia < dzisiaj ORAZ status W trakcie
    if (end && end < today && status === 'w trakcie') {
        return true;
    }

    return false;
};

// 2. ROZPOCZYNAJĄCE SIĘ (UPCOMING)
const isUpcoming = (item) => {
    // Jeśli zaległy, nie pokazuj tu
    if (isOverdue(item)) return false;

    const { start, end } = getActiveDates(item);
    if (!start) return false;
    
    const today = getDateOffset(0);
    const dayAfterTomorrow = getDateOffset(2);
    const status = getNormStatus(item);

    // Warunek 3: Jednodniowe (Start == End)
    if (end && start.getTime() === end.getTime()) {
        // Wyświetlaj w rozpoczynających się JEŚLI status NIE JEST "W trakcie" ani "Wykonany"
        const runningStatuses = ['w trakcie', 'wykonany'];
        if (runningStatuses.includes(status)) return false; // Należy do Ending
        
        // Sprawdź datę (Dzisiaj/Jutro)
        return (start >= today && start < dayAfterTomorrow);
    }

    // Standardowe wielodniowe
    return (start >= today && start < dayAfterTomorrow);
};

// 3. KOŃCZĄCE SIĘ (ENDING)
const isEnding = (item) => {
    // Jeśli zaległy, nie pokazuj tu
    if (isOverdue(item)) return false;

    const { start, end } = getActiveDates(item);
    if (!end) return false;

    const today = getDateOffset(0);
    const dayAfterTomorrow = getDateOffset(2);
    const status = getNormStatus(item);

    // Warunek 3: Jednodniowe (Start == End)
    if (start && start.getTime() === end.getTime()) {
        // Wyświetlaj w kończących się JEŚLI status JEST "W trakcie" lub "Wykonany"
        const runningStatuses = ['w trakcie', 'wykonany'];
        if (runningStatuses.includes(status)) {
             // Sprawdź datę (Dzisiaj/Jutro)
            return (end >= today && end < dayAfterTomorrow);
        }
        return false; // Należy do Upcoming
    }

    // Standardowe wielodniowe
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
const getTypeClass = (type) => 'type-' + type.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');

const renderInspectionItem = (item, contextType) => {
    const { start, end } = getActiveDates(item);
    const statusClass = getStatusClass(item.Status || '');
    const typeClass = getTypeClass(item.Typ || '');
    const itemIdentifier = item.uniqueId; 
    const startDateChanged = item['Data początkowa (po zmianie)'];
    const endDateChanged = item['Data końcowa (po zmianie)'];
    const isRescheduled = (startDateChanged && startDateChanged.trim() !== '') || (endDateChanged && endDateChanged.trim() !== '');
    const rescheduledClass = isRescheduled ? 'is-rescheduled' : '';
    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    const dateRange = `${dateDisplayStart} – ${dateDisplayEnd}`;
    let dateColorClass = '';
    if (contextType === 'overdue') dateColorClass = 'date-overdue';
    else if (contextType === 'upcoming') dateColorClass = 'date-upcoming';
    else if (contextType === 'ending') dateColorClass = 'date-ending';

    return `
        <div class="inspection-item ${statusClass} ${rescheduledClass}" data-id="${itemIdentifier}" onclick="showInspectionDetails(this)">
            <div class="inspection-header">
                <p class="registration-info">${item.Rejestracja} (${item['Numer tab']})</p>
                <span class="status-tag">${item.Status || 'Brak statusu'}</span>
            </div>
            <p class="inspection-meta">
                <span class="type-tag ${typeClass}">${item.Typ}</span>
                <span class="inspection-dates ${dateColorClass}">${dateRange}</span>
            </p>
        </div>
    `;
};


// --- OBSŁUGA MODALA ---
const getStatusTextColor = (status) => {
    switch (status.toLowerCase().trim()) {
        case 'w trakcie': return 'color: #3498db; font-weight: bold;';
        case 'zaplanowany': return 'color: #f7a0b3; font-weight: bold;';
        case 'wykonany': return 'color: #2ecc71; font-weight: bold;';
        case 'przygotowany': return 'color: #9b59b6; font-weight: bold;';
        case 'anulowany': return 'color: #95a5a6;';
        case 'przełożony': return 'color: #f1c40f; font-weight: bold;';
        case 'niewykonany': return 'color: #e67e22; font-weight: bold;';
        case 'problem': return 'color: #c0392b; font-weight: 900;';
        default: return '';
    }
};

const renderModalDetails = (item) => {
    const startDateStr = item['Data początkowa'];
    const endDateStr = item['Data końcowa'];
    const startDateChanged = item['Data początkowa (po zmianie)'];
    const endDateChanged = item['Data końcowa (po zmianie)'];
    const statusStyle = getStatusTextColor(item.Status || '');  

    const hasDelay = item.Opóźnienie && item.Opóźnienie !== '0';
    const isPlanChanged = startDateChanged || endDateChanged;

    let html = '';
    html += `<h4>INFO PODSTAWOWE</h4>`;
    html += `<div class="modal-grid">`;
    html += `<div class="modal-grid-item"><strong>Rejestracja (Tab):</strong> <b>${item.Rejestracja || 'N/A'}</b> (<b>${item['Numer tab'] || 'N/A'}</b>)</div>`;
    html += `<div class="modal-grid-item"><strong>Typ przeglądu:</strong> <span class="modal-highlight"><b>${item.Typ || 'N/A'}</b></span></div>`;
    html += `<div class="modal-grid-item"><strong>Status:</strong> <span style="${statusStyle}"><b>${item.Status || 'N/A'}</b></span></div>`;
    html += `<div class="modal-grid-item"><strong>Ilość godzin:</strong> <b>${item['Ilość godzin'] || 'N/A'}</b></div>`;
    html += `</div><hr>`;
    html += `<h4>DATY (${isPlanChanged ? 'PLANOWANE VS AKTUALNE' : 'PLANOWANE'})</h4>`;
    html += `<div class="modal-grid">`;
    html += `<div class="modal-grid-item"><strong>Data pocz. planowana:</strong> ${startDateStr || 'N/A'}</div>`;
    html += `<div class="modal-grid-item"><strong>Data końcowa planowana:</strong> ${endDateStr || 'N/A'}</div>`;
    html += `</div>`;

    if (isPlanChanged) {
        html += `<h4 style="grid-column: 1 / -1;">AKTUALNY HARMONOGRAM</h4>`;
        html += `<div class="modal-delay-section" style="grid-column: 1 / -1;">`;       

        if (hasDelay) {
            html += `<p style="margin-bottom: 5px; color: #e74c3c; font-weight: 800;"><i class="fas fa-exclamation-triangle"></i> PRZEŁOŻONY/OPÓŹNIONY O: <b>${item.Opóźnienie}</b></p>`;
        } else {
            html += `<p class="modal-highlight" style="margin-bottom: 5px;">Daty zostały zmienione.</p>`;
        }       

        html += `<div class="modal-grid" style="grid-template-columns: 1fr 1fr; gap: 10px 30px; margin-top: 10px;">`;
        html += `<p class="modal-grid-item"><strong>Nowa Data początkowa:</strong> <span class="modal-highlight"><b>${startDateChanged || 'N/A'}</b></span></p>`;
        html += `<p class="modal-grid-item"><strong>Nowa Data końcowa:</strong> <span class="modal-highlight"><b>${endDateChanged || 'N/A'}</b></span></p>`;
        html += `</div>`;
        html += `<p style="margin-top: 5px; margin-bottom: 0;"><strong>Powód opóźnienia:</strong> ${item['Powód opóźnienia'] || 'Brak'}</p>`;
        html += `</div>`;
    }   

    html += `<hr>`;
    html += `<h4>LOGISTYKA I GOTOWOŚĆ</h4>`;
    html += `<div class="modal-grid">`;
    html += `<div class="modal-grid-item"><strong>Samolot zastępczy (SZ):</strong> <b>${item['Samolot zastępczy'] || 'Brak'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>Konieczność sprowadzenia SZ:</strong> <b>${item['Konieczność sprowadzenia SZ'] || 'NIE'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>SZ innego przewoźnika:</strong> <b>${item['SZ innego przewoźnika'] || 'NIE'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>Samolot gotowy:</strong> <b>${item['Samolot gotowy'] || 'NIE'}</b></div>`;
    html += `<div class="modal-grid-item"><strong>SZ gotowy:</strong> <b>${item['SZ gotowy'] || 'NIE'}</b></div>`;
    html += `</div><hr>`;
    html += `<h4>DODATKOWE INFORMACJE</h4>`;
    html += `<p style="margin: 0;">${item['Dodatkowe informacje'] || 'Brak'}</p>`;
    return html;
};

window.showInspectionDetails = (element) => {
    const id = parseInt(element.getAttribute('data-id'));
    const item = allInspectionsData.find(d => d.uniqueId === id);
    if (item) {
        modalTitle.textContent = `Szczegóły: ${item.Rejestracja} (${item['Numer tab']})`;
        modalDetailsContent.innerHTML = renderModalDetails(item);
        modal.style.display = "block";
    } else {
        alert('Nie znaleziono szczegółów dla tego przeglądu.');
    }
};

const closeModal = () => {
    modal.style.display = "none";
};



if (closeModalBtn) {
    closeModalBtn.onclick = closeModal;
}

window.onclick = function(event) {
    // Sprawdzamy, czy modal w ogóle istnieje na tej podstronie
    if (modal && event.target == modal) {
        closeModal();
    }
}


// --- AKTUALIZACJA UI (CORE) ---

const updateUIInspections = (allData) => {
    // Jeśli nie ma list, jesteśmy prawdopodobnie na stronie logowania - nic nie renderujemy
    if (!upcomingList) return;

    allInspectionsData = allData.map((item, index) => ({ ...item, uniqueId: index }));
    
    const overdue = allInspectionsData.filter(isOverdue);
    const upcoming = allInspectionsData.filter(isUpcoming);
    const ending = allInspectionsData.filter(isEnding);

    const toggleSection = (listElement, dataArray, contextType) => {
        if (!listElement) return;
        const parentSection = listElement.closest('.subsection');
        if (dataArray.length > 0) {
            if (parentSection) parentSection.style.display = 'block';
            listElement.innerHTML = dataArray.map(item => renderInspectionItem(item, contextType)).join('');
        } else {
            if (parentSection) parentSection.style.display = 'none';
            listElement.innerHTML = '';
        }
    };

    toggleSection(overdueList, overdue, 'overdue');
    toggleSection(upcomingList, upcoming, 'upcoming');
    toggleSection(endingList, ending, 'ending');

    let globalNoDataMsg = document.getElementById('global-inspections-no-data');
    const totalCount = overdue.length + upcoming.length + ending.length;

    if (totalCount === 0) {
        if (!globalNoDataMsg) {
            globalNoDataMsg = document.createElement('p');
            globalNoDataMsg.id = 'global-inspections-no-data';
            globalNoDataMsg.className = 'no-data';
            globalNoDataMsg.style.textAlign = 'center';
            globalNoDataMsg.style.padding = '20px';
            globalNoDataMsg.textContent = 'Brak zaplanowanych przeglądów na najbliższy czas.';
            if (statusContainer && statusContainer.parentNode) statusContainer.parentNode.insertBefore(globalNoDataMsg, statusContainer.nextSibling);
        }
        globalNoDataMsg.style.display = 'block';
    } else {
        if (globalNoDataMsg) globalNoDataMsg.style.display = 'none';
    }

    if(statusContainer) statusContainer.classList.add('hidden');
    if (overdueNoData) overdueNoData.style.display = 'none';
    if (upcomingNoData) upcomingNoData.style.display = 'none';
    if (endingNoData) endingNoData.style.display = 'none';
};

const checkAndUpdateInspectionsData = async () => {
    // 1. Load from cache first
    const cached = loadFromCache();
    if (cached && lastKnownTimestampInspections === 0) {
        // console.log("[Inspections] 📂 Załadowano z cache.");
        lastKnownTimestampInspections = cached.timestamp;
        updateUIInspections(cached.data);
    } else if (lastKnownTimestampInspections === 0 && statusContainer) {
        statusContainer.textContent = 'Ładowanie przeglądów...';
        statusContainer.classList.remove('hidden');
    }
    
    // 2. Fetch new
    const result = await fetchInspectionsData();
    
    if (result.error) {
        if(statusContainer) {
             statusContainer.textContent = `Błąd: ${result.error}`;
             statusContainer.classList.remove('hidden');
        }
        return;
    }
    
    if (result.timestamp > lastKnownTimestampInspections || lastKnownTimestampInspections === 0) {
        console.log(`[Inspections] Nowe dane! Timestamp: ${result.timestamp}`);
        lastKnownTimestampInspections = result.timestamp;
        
        saveToCache(result.data, result.timestamp); // Save
        updateUIInspections(result.data);
    } else {
        if(statusContainer) statusContainer.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setInterval(checkAndUpdateInspectionsData, REFRESH_INTERVAL_MS);
    checkAndUpdateInspectionsData();
});

// EXPORT DANYCH DLA INNYCH MODUŁÓW
// export const getAllInspections = () => allInspectionsData;
// export const forceRefreshInspections = () => checkAndUpdateInspectionsData();

// EKSPORT DANYCH DLA INNYCH MODUŁÓW (Z poprawką na Cache)
export const getAllInspections = () => {
    // 1. Jeśli mamy dane w pamięci (allInspectionsData), zwróć je
    if (allInspectionsData && allInspectionsData.length > 0) {
        return allInspectionsData;
    }

    // 2. Jeśli pamięć jest pusta, spróbuj pobrać z Cache (sessionStorage)
    const cached = loadFromCache();
    if (cached && cached.data) {
        console.log("[Inspections Loader] RAM pusta, zwracam dane z Cache dla Modala.");
        // Opcjonalnie: wypełnij allInspectionsData, żeby następnym razem było szybciej
        allInspectionsData = cached.data.map((item, index) => ({ ...item, uniqueId: index }));
        return allInspectionsData;
    }

    return [];
};

export const forceRefreshInspections = () => checkAndUpdateInspectionsData();