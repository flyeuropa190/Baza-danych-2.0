import { fetchInspectionsData } from './inspections-fetcher.js';

/* KONFIGURACJA */
const CACHE_KEY_FULL_VIEW = 'inspections_full_view_data';
const REFRESH_INTERVAL_MS = 15000; // Odświeżanie co 15 sekund

/* ELEMENTY DOM (Specyficzne dla PrzegladyPlanowane.html) */
const statusContainer = document.getElementById('inspections-status');
const viewListContainer = document.getElementById('view-list-container');
const viewCalendarContainer = document.getElementById('view-calendar-container');

/* ELEMENTY DOM (Filtry) */
const btnOpenFilters = document.getElementById('btn-open-filters'); // Przyciski otwierające modal (z nagłówka)
const filterModal = document.getElementById('filter-modal'); // Nowy modal filtrów
const closeFilterModalBtn = document.getElementById('close-filter-modal-btn'); // Przycisk X
const filterForm = document.getElementById('inspection-filters-form');
const btnClearFilters = document.getElementById('btn-clear-filters');
const filterTyp = document.getElementById('filter-typ');
const filterStatus = document.getElementById('filter-status');

/* NOWA ZMIENNA STANU */
let currentFilters = {};

// Przełączniki widoku
const btnList = document.getElementById('btn-view-list');
const btnCalendar = document.getElementById('btn-view-calendar');

// Kalendarz
const calendarGrid = document.getElementById('calendar-grid');
const calMonthYear = document.getElementById('calendar-month-year');
const btnPrev = document.getElementById('cal-prev-btn');
const btnNext = document.getElementById('cal-next-btn');

// Modal
const modal = document.getElementById('inspection-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalDetailsContent = document.getElementById('modal-details-content');
const modalTitle = document.getElementById('modal-title');

/* ZMIENNE STANU */
let allInspectionsData = [];
let currentView = 'list'; // 'list' lub 'calendar'
let currentCalendarDate = new Date(); // Aktualnie wyświetlany miesiąc w kalendarzu
let lastKnownTimestamp = 0;

/* --- NARZĘDZIA POMOCNICZE (DATY) --- */

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

// Pobiera aktywne daty (uwzględniając zmiany/opóźnienia)
const getActiveDates = (item) => {
    const startDateStr = (item['Data początkowa (po zmianie)'] && item['Data początkowa (po zmianie)'].trim() !== '') 
                         ? item['Data początkowa (po zmianie)'] 
                         : item['Data początkowa'];

    const endDateStr = (item['Data końcowa (po zmianie)'] && item['Data końcowa (po zmianie)'].trim() !== '') 
                       ? item['Data końcowa (po zmianie)'] 
                       : item['Data końcowa'];
    
    return {
        start: parseDateToMidnight(startDateStr),
        end: parseDateToMidnight(endDateStr),
        isRescheduled: !!item['Data początkowa (po zmianie)'] || !!item['Data końcowa (po zmianie)']
    };
};

/* --- STYLE STATUSÓW --- */

const getStatusClass = (status) => {
    if (!status) return 'status-default';
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

const getStatusPriority = (status) => {
    const s = status ? status.toLowerCase().trim() : '';
    if (s === 'problem') return 1;
    if (s === 'w trakcie') return 2;
    if (s === 'przygotowany') return 3;
    if (s === 'zaplanowany') return 4;    
    if (s === 'przełożony') return 5;    
    if (s === 'anulowany') return 6;
    if (s === 'wykonany') return 99;
    return 10;
};


/* --- WIDOK 1: LISTA GRUPOWANA (Ze zwijaniem i domyślnie zwiniętym "Wykonany") --- */

const renderListView = (dataToRender = allInspectionsData) => {
    if (!viewListContainer) return;
    viewListContainer.innerHTML = '';

    // Sprawdzenie, czy przefiltrowane dane istnieją
    if (dataToRender.length === 0) {
        viewListContainer.innerHTML = '<p class="no-data" style="text-align:center; padding:20px;">Brak danych do wyświetlenia, spróbuj zmienić filtry.</p>';
        return;
    }

    const groups = {};
    // Użycie przefiltrowanych danych do grupowania
    dataToRender.forEach(item => {
        const rawStatus = item.Status ? item.Status.trim() : 'Inne';
        const statusKey = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
        if (!groups[statusKey]) groups[statusKey] = [];
        groups[statusKey].push(item);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        return getStatusPriority(a) - getStatusPriority(b);
    });

    sortedKeys.forEach(status => {
        const items = groups[status];
        
        items.sort((a, b) => {
            const dateA = getActiveDates(a).start || new Date(2099,0,1);
            const dateB = getActiveDates(b).start || new Date(2099,0,1);
            return dateA - dateB;
        });

        const isCompleted = status.toLowerCase() === 'wykonany';
        const initialClass = isCompleted ? 'status-section collapsed' : 'status-section';
        
        const section = document.createElement('div');
        section.className = initialClass;
        
        section.innerHTML = `
            <h3 class="status-group-header" onclick="toggleSection(this)">
                <span>${status} <span class="group-count">${items.length}</span></span>
                <i class="fas fa-chevron-down"></i>
            </h3>
            <div class="status-group-list">
                ${items.map(item => renderListCard(item)).join('')}
            </div>
        `;
        viewListContainer.appendChild(section);
    });
};

// Funkcje pomocnicze: toggleSection i renderListCard pozostają bez zmian.
window.toggleSection = (headerElement) => {
    const section = headerElement.parentElement;
    section.classList.toggle('collapsed');
};

// Funkcja pomocnicza do renderListCard, aby używała nowej funkcji szczegółów
const renderListCard = (item) => {
    const { start, end, isRescheduled } = getActiveDates(item);
    const statusClass = getStatusClass(item.Status);
    const typeClass = 'type-' + (item.Typ || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    
    const dateText = (start && end && start.getTime() === end.getTime()) 
                     ? dateDisplayStart 
                     : `${dateDisplayStart} – ${dateDisplayEnd}`;

    const rescheduledClass = isRescheduled ? 'is-rescheduled' : '';
    const delayInfo = (item.Opóźnienie && item.Opóźnienie !== '0') 
                      ? `<div style="font-size:0.75rem; color:#e74c3c; margin-top:5px;"><strong>Opóźnienie: ${item.Opóźnienie}</strong></div>` 
                      : '';

    return `
        <div class="inspection-item ${statusClass} ${rescheduledClass}" data-id="${item.uniqueId}" onclick="showInspectionDetails(${item.uniqueId})">
            <div class="inspection-header">
                <p class="registration-info">
                    ${item.Rejestracja} <span style="font-weight:400; opacity:0.8;">(${item['Numer tab']})</span>
                </p>
                <span class="status-tag">${item.Status || 'Brak'}</span>
            </div>
            <div class="inspection-meta">
                <span class="type-tag ${typeClass}">${item.Typ || 'Inny'}</span>
                <span class="inspection-dates"><i class="far fa-calendar-alt"></i> ${dateText}</span>
            </div>
            ${delayInfo}
        </div>
    `;
};

/* --- WIDOK 2: KALENDARZ --- */

/* --- WIDOK 2: KALENDARZ (Limit elementów + przycisk Więcej) --- */

const MAX_CALENDAR_ITEMS = 4;

const renderCalendarView = (dataToRender = allInspectionsData) => {
    if (!calendarGrid) return;
    calendarGrid.innerHTML = '';

    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    const monthName = currentCalendarDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' });
    calMonthYear.textContent = monthName.charAt(0).toUpperCase() + monthName.slice(1);

    const firstDayOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let startDayIndex = firstDayOfMonth.getDay() - 1; 
    if (startDayIndex === -1) startDayIndex = 6;

    for (let i = 0; i < startDayIndex; i++) {
        const emptyCell = document.createElement('div');
        emptyCell.className = 'calendar-day empty';
        calendarGrid.appendChild(emptyCell);
    }

    const today = new Date();
    today.setHours(0,0,0,0);

    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        
        if (currentDate.getTime() === today.getTime()) {
            cell.classList.add('today');
        }

        cell.innerHTML = `<span class="day-number">${day}</span>`;

        // Użycie przefiltrowanych danych do tworzenia wydarzeń dnia
        const eventsToday = dataToRender.filter(item => {
            const { start, end } = getActiveDates(item);
            if (!start) return false;
            const cTime = currentDate.getTime();
            const sTime = start.getTime();
            const eTime = end ? end.getTime() : sTime;
            return cTime >= sTime && cTime <= eTime;
        });

        eventsToday.sort((a, b) => getStatusPriority(a.Status) - getStatusPriority(b.Status));

        // LOGIKA LIMITU WYŚWIETLANIA
        const totalEvents = eventsToday.length;
        let visibleEvents = eventsToday;
        let showMoreBtn = false;

        if (totalEvents > (MAX_CALENDAR_ITEMS + 1)) {
            visibleEvents = eventsToday.slice(0, MAX_CALENDAR_ITEMS);
            showMoreBtn = true;
        }

        // Renderowanie widocznych
        visibleEvents.forEach(ev => {
            const { isRescheduled } = getActiveDates(ev);
            const statusSlug = (ev.Status || '').toLowerCase().trim().replace(/\s+/g, '-');
            const resClass = isRescheduled ? 'rescheduled' : '';
            
            const eventEl = document.createElement('div');
            eventEl.className = `cal-event status-${statusSlug} ${resClass}`;
            eventEl.textContent = `${ev.Rejestracja} (${ev.Typ})`;
            eventEl.onclick = (e) => { e.stopPropagation(); openDetailsModal(ev.uniqueId); };
            cell.appendChild(eventEl);
        });

        // Renderowanie przycisku "Więcej"
        if (showMoreBtn) {
            const remainingCount = totalEvents - MAX_CALENDAR_ITEMS;
            const moreBtn = document.createElement('button');
            moreBtn.className = 'cal-more-btn';
            moreBtn.innerHTML = `+ ${remainingCount} więcej...`;
            moreBtn.onclick = (e) => {
                e.stopPropagation();
                openDayDetailsModal(currentDate, eventsToday); 
            };
            cell.appendChild(moreBtn);
        }

        calendarGrid.appendChild(cell);
    }
};

/* --- LOGIKA PRZEŁĄCZANIA WIDOKÓW --- */

window.switchView = (viewName) => {
    currentView = viewName;
    
    // Aktualizacja guzików
    if(btnList) btnList.classList.toggle('active', viewName === 'list');
    if(btnCalendar) btnCalendar.classList.toggle('active', viewName === 'calendar');

    // Aktualizacja kontenerów
    if (viewName === 'list') {
        if(viewListContainer) {
            viewListContainer.classList.remove('hidden');
            viewListContainer.classList.add('active');
        }
        if(viewCalendarContainer) {
            viewCalendarContainer.classList.add('hidden');
            viewCalendarContainer.classList.remove('active');
        }
        renderListView();
    } else {
        if(viewCalendarContainer) {
            viewCalendarContainer.classList.remove('hidden');
            viewCalendarContainer.classList.add('active');
        }
        if(viewListContainer) {
            viewListContainer.classList.add('hidden');
            viewListContainer.classList.remove('active');
        }
        renderCalendarView();
    }
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

// Zmieniamy nazwę na showInspectionDetails, tak jak w kodzie użytkownika
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

// Zapewnienie, że funkcje zamknięcia modala są używane
if(closeModalBtn) closeModalBtn.onclick = closeModal;
window.onclick = function(event) {
    if (event.target == modal) closeModal();
}

// Musimy zaktualizować też openDetailsModal, która jest używana przez kalendarz, aby używała nowego showInspectionDetails
window.openDetailsModal = (uniqueId) => {
    window.showInspectionDetails(uniqueId);
};

/* Otwiera modal z listą przeglądów dla konkretnego dnia */
const openDayDetailsModal = (dateObj, eventsList) => {
    const dateStr = dateObj.toLocaleDateString('pl-PL');
    modalTitle.textContent = `Przeglądy w dniu: ${dateStr}`;
    
    let html = `<div class="modal-day-list">`;
    
    eventsList.forEach(item => {
        const statusClass = getStatusClass(item.Status); // Używa istniejącej funkcji
        const { start, end } = getActiveDates(item);
        const dateRange = (start && end && start.getTime() !== end.getTime()) 
            ? `${start.toLocaleDateString()} - ${end.toLocaleDateString()}` 
            : 'Cały dzień';

        // Kliknięcie w element listy otwiera jego szczegóły (nadpisuje ten modal)
        html += `
            <div class="modal-day-item ${statusClass}" onclick="openDetailsModal(${item.uniqueId})">
                <div style="font-weight:bold; display:flex; justify-content:space-between;">
                    <span>${item.Rejestracja} (${item['Numer tab']})</span>
                    <span>${item.Typ}</span>
                </div>
                <div style="font-size:0.85rem; opacity:0.8;">Status: ${item.Status} | ${dateRange}</div>
            </div>
        `;
    });
    
    html += `</div>`;
    modalDetailsContent.innerHTML = html;
    modal.style.display = "block";
};

// Zamykanie modala
if(closeModalBtn) closeModalBtn.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; };


// --- OBSŁUGA MODALA FILTROWANIA ---

const openFilterModal = () => {
    if (filterModal) {
        // Upewnij się, że opcje select są aktualne przed otwarciem
        populateFilterOptions(allInspectionsData); 
        filterModal.style.display = "block";
    }
};

const closeFilterModal = () => {
    if (filterModal) {
        filterModal.style.display = "none";
    }
};

// --- NARZĘDZIA POMOCNICZE (FILTROWANIE) ---

const populateFilterOptions = (data) => {
    if (!filterTyp || !filterStatus) return;

    // 1. Zbieranie unikalnych wartości
    const uniqueTypes = new Set(['']); 
    // Używamy Set, ale upewniamy się, że pusta opcja zostanie posortowana jako pierwsza później.
    const uniqueStatuses = new Set(['']); 

    data.forEach(item => {
        if (item.Typ) uniqueTypes.add(item.Typ.trim());
        if (item.Status) uniqueStatuses.add(item.Status.trim());
    });

    // 2. Wypełnianie <select> Typ
    const sortedTypes = Array.from(uniqueTypes).sort((a, b) => a.localeCompare(b));
    filterTyp.innerHTML = sortedTypes.map(typ => 
        `<option value="${typ}" ${currentFilters.typ === typ ? 'selected' : ''}>${typ || 'Wszystkie typy'}</option>`
    ).join('');

    // 3. Wypełnianie <select> Status
    const rawStatuses = Array.from(uniqueStatuses).filter(s => s !== ''); // Usuń pusty string dla sortowania
    
    // Sortowanie według priorytetu
    rawStatuses.sort((a, b) => getStatusPriority(a) - getStatusPriority(b));

    // Dodaj opcję "Wszystkie statusy" na początku.
    const finalStatuses = [''].concat(rawStatuses); 

    filterStatus.innerHTML = finalStatuses.map(status => {
        // Domyślne ustawienie: 'Wszystkie statusy' (value="")
        if (status === '') {
            return `<option value="" ${currentFilters.status === '' ? 'selected' : ''}>Wszystkie statusy</option>`;
        }
        return `<option value="${status}" ${currentFilters.status === status ? 'selected' : ''}>${status}</option>`;
    }).join('');
};

// --- LOGIKA FILTROWANIA ---

const applyFilters = (data) => {
    let filteredData = [...data]; // Kopia danych
    const filters = currentFilters;

    if (Object.keys(filters).length === 0) {
        return data;
    }

    filteredData = filteredData.filter(item => {
        let match = true;

        // 1. Rejestracja
        if (filters.rejestracja && item.Rejestracja && 
            !item.Rejestracja.toLowerCase().includes(filters.rejestracja.toLowerCase())) {
            match = false;
        }

        // 2. Numer Tab
        if (match && filters.numerTab && item['Numer tab'] && 
            !item['Numer tab'].includes(filters.numerTab)) {
            match = false;
        }

        // 3. Typ
        if (match && filters.typ && filters.typ !== '' && item.Typ !== filters.typ) {
            match = false;
        }

        // 4. Status
        if (match && filters.status && filters.status !== '' && item.Status !== filters.status) {
            match = false;
        }

        // 5. Samolot Zastępczy (SZ)
        if (match && filters.sz) {
            const maSZ = (item['Samolot zastępczy'] && item['Samolot zastępczy'].trim() !== 'Brak');
            if (filters.sz === 'Tylko z SZ' && !maSZ) {
                match = false;
            } else if (filters.sz === 'Tylko bez SZ' && maSZ) {
                match = false;
            }
        }
        
        // 6. Daty (Start/End - filtrowanie po aktywnych datach)
        if (match && (filters.startDate || filters.endDate)) {
            const { start, end } = getActiveDates(item);
            const itemStartTime = start ? start.getTime() : null;
            const itemEndTime = end ? end.getTime() : null;

            if (filters.startDate && itemStartTime) {
                const filterStart = parseDateToMidnight(filters.startDate); // To już jest w formacie Date
                if (itemEndTime && itemEndTime < filterStart.getTime()) {
                    match = false;
                }
            }

            if (match && filters.endDate && itemEndTime) {
                const filterEnd = parseDateToMidnight(filters.endDate); // To już jest w formacie Date
                // Upewnij się, że data końcowa filtru jest ustawiona na koniec dnia
                filterEnd.setHours(23, 59, 59, 999); 
                if (itemStartTime && itemStartTime > filterEnd.getTime()) {
                    match = false;
                }
            }
        }

        return match;
    });

    return filteredData;
};


const updateUI = (newData) => {
    // 1. Zapisz/Zaktualizuj pełną listę danych, jeśli przekazano nowe dane z sieci.
    if (newData) {
        // Dodaj unikalne ID tylko raz i zaktualizuj całą listę
        // UWAGA: Lepszą praktyką jest dodawanie uniqueId zaraz po pobraniu, a nie w updateUI.
        // Zakładam, że allInspectionsData jest już globalnie zdefiniowane.
        allInspectionsData = newData.map((item, index) => ({ ...item, uniqueId: index }));
        // Wypełnij opcje filtrów (teraz lub jeśli dane się zmieniły)
        populateFilterOptions(allInspectionsData); 
    }

    // Jeśli nie ma DANYCH DO PRACY (całej listy), zakończ.
    if (allInspectionsData.length === 0) {
        if (viewListContainer) {
            viewListContainer.innerHTML = '<p class="no-data" style="text-align:center; padding:20px;">Brak danych do wyświetlenia.</p>';
        }
        return;
    }

    // 2. Zastosuj filtry do pełnej listy danych.
    const dataToRender = applyFilters(allInspectionsData); 
    
    // 3. Odśwież aktualny widok
    if (currentView === 'list') {
        renderListView(dataToRender); 
    } else {
        renderCalendarView(dataToRender); 
    }
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
        statusContainer.textContent = 'Pobieranie pełnej bazy przeglądów...';
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
        
        // Zapisz do cache
        sessionStorage.setItem(CACHE_KEY_FULL_VIEW, JSON.stringify({
            data: result.data,
            timestamp: result.timestamp
        }));

        updateUI(result.data);
    }
};

/* --- INICJALIZACJA --- */

document.addEventListener('DOMContentLoaded', () => {
    // ... Stare inicjalizacje kalendarza ...
    
    // Upewnij się, że MODAL SZCZEGÓŁÓW ZAMYKA SIĘ POPRAWNIE
    if(closeModalBtn) closeModalBtn.onclick = closeModal;

    // 1. Obsługa otwierania Modala Filtrów
    if (btnOpenFilters) {
        btnOpenFilters.onclick = openFilterModal;
    }

    // 2. Obsługa zamykania Modala Filtrów
    if (closeFilterModalBtn) {
        closeFilterModalBtn.onclick = closeFilterModal;
    }

    // 3. Obsługa Modala Filtrów po kliknięciu poza oknem
    window.onclick = function(event) {
        // Modal szczegółów
        if (event.target == modal) closeModal(); 
        // Modal filtrowania
        if (event.target == filterModal) closeFilterModal(); 
    }

    // 4. Obsługa Formularza (Zastosuj filtry)
    if (filterForm) {
        filterForm.onsubmit = (e) => {
            e.preventDefault();
            
            // Pobierz wartości (pozostaje bez zmian, używamy nowego layoutu)
            const newFilters = {
                rejestracja: document.getElementById('filter-rejestracja').value.trim(),
                numerTab: document.getElementById('filter-numer-tab').value.trim(),
                startDate: document.getElementById('filter-start-date').value,
                endDate: document.getElementById('filter-end-date').value,
                typ: document.getElementById('filter-typ').value.trim(),
                status: document.getElementById('filter-status').value.trim(),
                sz: document.getElementById('filter-sz').value,
            };

            // Ustaw aktualne filtry, odśwież UI i ZAMKNIJ MODAL
            currentFilters = newFilters;
            updateUI(allInspectionsData); // Użyj pełnej listy do przefiltrowania
            closeFilterModal();
        };
    }

    // 5. Obsługa przycisku Wyczyść
    if (btnClearFilters) {
        btnClearFilters.onclick = () => {
            filterForm.reset();
            currentFilters = {};
            // Wypełnij listy ponownie, aby przywrócić zaznaczone opcje do 'Wszystkie'
            populateFilterOptions(allInspectionsData); 
            updateUI(allInspectionsData); // Odśwież widok z pustymi filtrami
            // Modal pozostawiamy otwarty.
        };
    }
    
    // Uruchomienie
    checkAndUpdateData();
    setInterval(checkAndUpdateData, REFRESH_INTERVAL_MS);
});