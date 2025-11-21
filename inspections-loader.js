import { fetchInspectionsData } from './inspections-fetcher.js';

const statusContainer = document.getElementById('inspections-status');
const upcomingList = document.getElementById('inspections-upcoming-list');
const endingList = document.getElementById('inspections-ending-list');
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

// --- NARZĘDZIA DATY ---

const parseDateToMidnight = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[\/\.]/);
    if (parts.length === 3) {
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

// --- LOGIKA FILTROWANIA ---

const getActiveDates = (item) => {
    const startDateStr = item['Data początkowa (po zmianie)'] || item['Data początkowa'];
    const endDateStr = item['Data końcowa (po zmianie)'] || item['Data końcowa'];
    
    return {
        start: parseDateToMidnight(startDateStr),
        end: parseDateToMidnight(endDateStr)
    };
};

const isUpcoming = (item) => {
    const { start } = getActiveDates(item);
    if (!start) return false;
    const today = getDateOffset(0);
    const dayAfterTomorrow = getDateOffset(2);
    return (start >= today && start < dayAfterTomorrow);
};

const isEnding = (item) => {
    const { end } = getActiveDates(item);
    if (!end) return false;
    const today = getDateOffset(0);
    const dayAfterTomorrow = getDateOffset(2);
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
    return 'type-' + type.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
};

const renderInspectionItem = (item, isUpcoming) => {
    const { start, end } = getActiveDates(item);
    const statusClass = getStatusClass(item.Status || '');
    const typeClass = getTypeClass(item.Typ || '');
    const itemIdentifier = item.uniqueId; 

    // Sprawdzenie czy przegląd jest przełożony (czy pola "po zmianie" są wypełnione)
    const startDateChanged = item['Data początkowa (po zmianie)'];
    const endDateChanged = item['Data końcowa (po zmianie)'];
    // Uznajemy za przełożony, jeśli którakolwiek z dat "po zmianie" istnieje i nie jest pusta
    const isRescheduled = (startDateChanged && startDateChanged.trim() !== '') || (endDateChanged && endDateChanged.trim() !== '');
    const rescheduledClass = isRescheduled ? 'is-rescheduled' : '';

    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    const dateRange = `${dateDisplayStart} – ${dateDisplayEnd}`;

    return `
        <div class="inspection-item ${statusClass} ${rescheduledClass}" data-id="${itemIdentifier}" onclick="showInspectionDetails(this)">
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

closeModalBtn.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) closeModal();
}

const updateUIInspections = (allData) => {
    allInspectionsData = allData.map((item, index) => ({
        ...item,
        uniqueId: index 
    }));
    
    const upcoming = allInspectionsData.filter(isUpcoming);
    const ending = allInspectionsData.filter(item => isEnding(item) && !isUpcoming(item));

    upcomingList.innerHTML = upcoming.length > 0 ? upcoming.map(item => renderInspectionItem(item, true)).join('') : '';
    endingList.innerHTML = ending.length > 0 ? ending.map(item => renderInspectionItem(item, false)).join('') : '';

    upcomingNoData.style.display = upcoming.length === 0 ? 'block' : 'none';
    endingNoData.style.display = ending.length === 0 ? 'block' : 'none';

    statusContainer.classList.add('hidden');
};

const checkAndUpdateInspectionsData = async () => {
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
    
    if (result.timestamp > lastKnownTimestampInspections || lastKnownTimestampInspections === 0) {
        console.log(`[Inspections Fetch] ${lastKnownTimestampInspections === 0 ? 'Pierwsze ładowanie' : 'Nowe dane'}! Timestamp: ${result.timestamp}`);
        lastKnownTimestampInspections = result.timestamp;
        updateUIInspections(result.data);
    } else {
        statusContainer.classList.add('hidden');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setInterval(checkAndUpdateInspectionsData, REFRESH_INTERVAL_MS);
    checkAndUpdateInspectionsData();
});