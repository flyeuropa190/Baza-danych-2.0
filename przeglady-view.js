/* przeglady-view.js */
import { fetchInspectionsData } from './inspections-fetcher.js';
import { renderListView, getActiveDates, parseDateToMidnight, getStatusPriority } from './przeglady-list.js';

/* KONFIGURACJA */
const CACHE_KEY_FULL_VIEW = 'inspections_full_view_data';
const REFRESH_INTERVAL_MS = 15000;

/* ELEMENTY DOM */
const statusContainer = document.getElementById('inspections-status');
const viewListContainer = document.getElementById('view-list-container');

/* ELEMENTY DOM (Filtry) */
const btnOpenFilters = document.getElementById('btn-open-filters');
const filterModal = document.getElementById('filter-modal');
const closeFilterModalBtn = document.getElementById('close-filter-modal-btn');
const filterForm = document.getElementById('inspection-filters-form');
const btnClearFilters = document.getElementById('btn-clear-filters');
const filterTyp = document.getElementById('filter-typ');
const filterStatus = document.getElementById('filter-status');

/* MODAL SZCZEGÓŁÓW */
const modal = document.getElementById('inspection-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalTitle = document.getElementById('modal-title');

/* ZMIENNE STANU */
let allInspectionsData = [];
let currentFilters = {};
let lastKnownTimestamp = 0;

/* --- OBSŁUGA MODALA SZCZEGÓŁÓW --- */

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
    const isPlanChanged = (startDateChanged && startDateChanged.trim() !== '') || (endDateChanged && endDateChanged.trim() !== '');

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
        html += `<h4 style="grid-column: 1 / -1; margin-top: 15px;">AKTUALNY HARMONOGRAM</h4>`;
        html += `<div class="modal-delay-section" style="grid-column: 1 / -1;">`;        

        if (hasDelay) {
            html += `<p style="margin-bottom: 5px; color: #e74c3c; font-weight: 800;"><i class="fas fa-exclamation-triangle"></i> PRZEŁOŻONY/OPÓŹNIONY O: <b>${item.Opóźnienie}</b></p>`;
        } else {
            html += `<p class="modal-highlight" style="margin-bottom: 5px;"><i class="fas fa-calendar-check"></i> Daty zostały zmienione.</p>`;
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

// Funkcja globalna, aby działała z onclick w HTML wygenerowanym przez przeglady-list.js
window.showInspectionDetails = (uniqueId) => {
    const item = allInspectionsData.find(d => d.uniqueId === parseInt(uniqueId));
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

/* --- FILTROWANIE --- */

const populateFilterOptions = (data) => {
    if (!filterTyp || !filterStatus) return;

    const uniqueTypes = new Set(['']); 
    const uniqueStatuses = new Set(['']); 

    data.forEach(item => {
        if (item.Typ) uniqueTypes.add(item.Typ.trim());
        if (item.Status) uniqueStatuses.add(item.Status.trim());
    });

    // Wypełnianie <select> Typ
    const sortedTypes = Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b));
    filterTyp.innerHTML = sortedTypes.map(typ => 
        `<option value="${typ}" ${currentFilters.typ === typ ? 'selected' : ''}>${typ || 'Wszystkie typy'}</option>`
    ).join('');

    // Wypełnianie <select> Status
    const rawStatuses = Array.from(uniqueStatuses).filter(s => s !== '');
    rawStatuses.sort((a, b) => getStatusPriority(a) - getStatusPriority(b));
    const finalStatuses = [''].concat(rawStatuses); 

    filterStatus.innerHTML = finalStatuses.map(status => {
        if (status === '') {
            return `<option value="" ${currentFilters.status === '' ? 'selected' : ''}>Wszystkie statusy</option>`;
        }
        return `<option value="${status}" ${currentFilters.status === status ? 'selected' : ''}>${status}</option>`;
    }).join('');
};

const applyFilters = (data) => {
    let filteredData = [...data];
    const filters = currentFilters;

    if (Object.keys(filters).length === 0) return data;

    filteredData = filteredData.filter(item => {
        let match = true;

        if (filters.rejestracja && item.Rejestracja && 
            !item.Rejestracja.toLowerCase().includes(filters.rejestracja.toLowerCase())) match = false;

        if (match && filters.numerTab && item['Numer tab'] && 
            !item['Numer tab'].includes(filters.numerTab)) match = false;

        if (match && filters.typ && filters.typ !== '' && item.Typ !== filters.typ) match = false;

        if (match && filters.status && filters.status !== '' && item.Status !== filters.status) match = false;

        if (match && filters.sz) {
            const maSZ = (item['Samolot zastępczy'] && item['Samolot zastępczy'].trim() !== 'Brak');
            if (filters.sz === 'Tylko z SZ' && !maSZ) match = false;
            else if (filters.sz === 'Tylko bez SZ' && maSZ) match = false;
        }
        
        if (match && (filters.startDate || filters.endDate)) {
            const { start, end } = getActiveDates(item);
            const itemStartTime = start ? start.getTime() : null;
            const itemEndTime = end ? end.getTime() : null;

            if (filters.startDate && itemStartTime) {
                const filterStart = parseDateToMidnight(filters.startDate);
                if (itemEndTime && itemEndTime < filterStart.getTime()) match = false;
            }

            if (match && filters.endDate && itemEndTime) {
                const filterEnd = parseDateToMidnight(filters.endDate);
                filterEnd.setHours(23, 59, 59, 999); 
                if (itemStartTime && itemStartTime > filterEnd.getTime()) match = false;
            }
        }

        return match;
    });

    return filteredData;
};

const openFilterModal = () => {
    if (filterModal) {
        populateFilterOptions(allInspectionsData); 
        filterModal.style.display = "block";
    }
};

const closeFilterModal = () => {
    if (filterModal) filterModal.style.display = "none";
};

/* --- LOGIKA DANYCH I ODŚWIEŻANIA --- */

const updateUI = (newData) => {
    if (newData) {
        allInspectionsData = newData.map((item, index) => ({ ...item, uniqueId: index }));
        populateFilterOptions(allInspectionsData); 
    }

    if (allInspectionsData.length === 0) {
        if (viewListContainer) {
            viewListContainer.innerHTML = '<p class="no-data" style="text-align:center; padding:20px;">Brak danych do wyświetlenia.</p>';
        }
        return;
    }

    const dataToRender = applyFilters(allInspectionsData); 
    renderListView(viewListContainer, dataToRender);
};

const checkAndUpdateData = async () => {
    // 1. Najpierw cache
    const cached = sessionStorage.getItem(CACHE_KEY_FULL_VIEW);
    if (cached && lastKnownTimestamp === 0) {
        try {
            const parsed = JSON.parse(cached);
            lastKnownTimestamp = parsed.timestamp;
            updateUI(parsed.data);
        } catch(e) { console.error("Błąd cache", e); }
    } else if (lastKnownTimestamp === 0 && statusContainer) {
        statusContainer.classList.remove('hidden');
        statusContainer.textContent = 'Pobieranie bazy przeglądów...';
    }

    // 2. Pobieranie z sieci
    const result = await fetchInspectionsData();

    if (result.error) {
        if (statusContainer) {
            statusContainer.textContent = `Błąd: ${result.error}`;
            statusContainer.classList.remove('hidden');
        }
        return;
    }

    // 3. Aktualizacja jeśli są nowsze dane
    if (result.timestamp > lastKnownTimestamp || lastKnownTimestamp === 0) {
        console.log(`[View] Nowe dane pobrane. Timestamp: ${result.timestamp}`);
        lastKnownTimestamp = result.timestamp;
        
        sessionStorage.setItem(CACHE_KEY_FULL_VIEW, JSON.stringify({
            data: result.data,
            timestamp: result.timestamp
        }));

        updateUI(result.data);
        if (statusContainer) statusContainer.classList.add('hidden');
    }
};

/* --- INICJALIZACJA --- */

document.addEventListener('DOMContentLoaded', () => {
    if(closeModalBtn) closeModalBtn.onclick = closeModal;

    // Filtry - Otwieranie
    if (btnOpenFilters) btnOpenFilters.onclick = openFilterModal;

    // Filtry - Zamykanie
    if (closeFilterModalBtn) closeFilterModalBtn.onclick = closeFilterModal;

    // Kliknięcie poza modalami
    window.onclick = function(event) {
        if (event.target == modal) closeModal(); 
        if (event.target == filterModal) closeFilterModal(); 
    }

    // Filtry - Zatwierdzanie
    if (filterForm) {
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            const newFilters = {
                rejestracja: document.getElementById('filter-rejestracja').value.trim(),
                numerTab: document.getElementById('filter-numer-tab').value.trim(),
                startDate: document.getElementById('filter-start-date').value,
                endDate: document.getElementById('filter-end-date').value,
                typ: document.getElementById('filter-typ').value.trim(),
                status: document.getElementById('filter-status').value.trim(),
                sz: document.getElementById('filter-sz').value,
            };
            currentFilters = newFilters;
            updateUI(allInspectionsData);
            closeFilterModal();
        };
    }

    // Filtry - Czyszczenie
    if (btnClearFilters) {
        btnClearFilters.onclick = () => {
            filterForm.reset();
            currentFilters = {};
            populateFilterOptions(allInspectionsData); 
            updateUI(allInspectionsData); 
        };
    }
    
    // Uruchomienie
    checkAndUpdateData();
    setInterval(checkAndUpdateData, REFRESH_INTERVAL_MS);
});