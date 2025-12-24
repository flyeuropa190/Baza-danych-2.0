import { getAllInspections } from '../inspections-loader.js';
import { printReport } from './print-utils.js';

// --- STAN LOKALNY ---
let currentInspectionsData = []; // Przechowuje dane dla danego samolotu
let activeFilters = {
    search: '',
    status: '',
    type: '',
    dateFrom: '',
    dateTo: '',
    onlyDelayed: false,
    onlySZ: false,
    sortDir: 'desc' // 'desc' (malejąco) lub 'asc' (rosnąco)
};

/**
 * Pomocnicza funkcja parsująca daty do północy (dla poprawnego porównywania)
 * Obsługuje formaty ISO (YYYY-MM-DD) oraz PL (DD.MM.YYYY)
 */
const parseDateToMidnight = (dateString) => {
    if (!dateString) return null;
    
    // Usuwamy ewentualne białe znaki
    const cleanStr = dateString.trim();
    if (!cleanStr) return null;

    // Rozdzielamy po '-' lub '.' lub '/'
    const parts = cleanStr.includes('-') ? cleanStr.split('-') : cleanStr.split(/[\/\.]/);
    
    if (parts.length === 3) {
        // Jeśli ISO (YYYY-MM-DD) - rok jest pierwszy (4 cyfry)
        if (parts[0].length === 4) {
            return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0);
        }
        // Jeśli PL (DD.MM.YYYY) - rok jest ostatni
        return new Date(parts[2], parts[1] - 1, parts[0], 0, 0, 0, 0);
    }
    return null;
};

/**
 * Renderuje zakładkę przeglądów: Pasek narzędzi + Kontener Listy
 * @param {string} planeReg
 */
export function renderPlaneInspections(planeReg) {
    console.group(`[PlaneInspections] Renderowanie dla: ${planeReg}`);
    
    const container = document.getElementById('tab-inspections-wrapper');
    if (!container) return;

    // 1. Pobierz dane
    const allInspections = getAllInspections() || [];
    const targetReg = planeReg.trim().toUpperCase();
    
    // Pobieramy surowe dane dla tego samolotu
    currentInspectionsData = allInspections.filter(item => {
        return item['Rejestracja'] && item['Rejestracja'].trim().toUpperCase() === targetReg;
    });

    if (currentInspectionsData.length === 0) {
        container.innerHTML = `
            <div class="tab-placeholder">
                <i class="fas fa-info-circle"></i> Brak zaplanowanych przeglądów dla ${planeReg}.
            </div>`;
        console.groupEnd();
        return;
    }

    // 2. Generowanie Struktury (Toolbar + Grid Header + Grid Body)
    const uniqueTypes = [...new Set(currentInspectionsData.map(i => i['Typ']))].filter(Boolean).sort();
    const uniqueStatuses = [...new Set(currentInspectionsData.map(i => i['Status']))].filter(Boolean).sort();

    const typeOptions = uniqueTypes.map(t => `<option value="${t}">${t}</option>`).join('');
    const statusOptions = uniqueStatuses.map(s => `<option value="${s}">${s}</option>`).join('');

    container.innerHTML = `
    <div class="inspections-layout">
        
        <div class="insp-toolbar">
            
            <div class="insp-toolbar-row main">
                <div class="insp-search-box">
                    <input type="text" id="insp-filter-search" placeholder="Szukaj (Info, Powód)...">
                    <i class="fas fa-search"></i>
                </div>
                
                <div class="insp-filter-group">
                    <select id="insp-filter-status" class="insp-select">
                        <option value="">Status: Wszystkie</option>
                        ${statusOptions}
                    </select>
                    <select id="insp-filter-type" class="insp-select">
                        <option value="">Typ: Wszystkie</option>
                        ${typeOptions}
                    </select>
                </div>

                 <div class="insp-sort-group">
                    <span class="sort-label">Sortuj datą:</span>
                    <button id="insp-sort-dir-btn" class="btn-insp-tool" title="Zmień kierunek sortowania">
                        <i class="fas fa-sort-numeric-down"></i>
                    </button>
                </div>
            </div>

            <div class="insp-toolbar-row secondary">
                <div class="insp-date-group">
                    <span class="date-label-sm">Od:</span>
                    <input type="date" id="insp-filter-date-from" class="insp-date-input" title="Data początkowa zakresu">
                    <span class="date-sep">-</span>
                    <span class="date-label-sm">Do:</span>
                    <input type="date" id="insp-filter-date-to" class="insp-date-input" title="Data końcowa zakresu">
                </div>

                <div class="insp-checkbox-group">
                    <label class="insp-checkbox">
                        <input type="checkbox" id="insp-check-delayed">
                        <span class="cb-label">Opóźnione</span>
                    </label>
                    <label class="insp-checkbox">
                        <input type="checkbox" id="insp-check-sz">
                        <span class="cb-label">Z samolotem zast.</span>
                    </label>
                </div>
                
                <div class="insp-actions">
                    <button id="insp-btn-report" class="btn-insp-report" title="Drukuj lub Zapisz jako PDF">
                        <i class="fas fa-file-pdf"></i> Raport
                    </button>
                    <button id="insp-btn-clear" class="btn-insp-clear">Wyczyść</button>
                </div>
            </div>
        </div>

        <div class="inspections-list-container">
            <div class="insp-grid-header">
                <div>Typ</div>
                <div>Harmonogram (Start / Koniec)</div>
                <div>Szczegóły</div>
                <div style="text-align: right">Status</div>
            </div>
            <div id="insp-grid-body" class="insp-grid-body">
                </div>
        </div>
    </div>
    `;

    // 3. Podpięcie zdarzeń
    attachToolbarEvents(planeReg);

    // 4. Pierwsze renderowanie listy (reset sortowania na start)
    activeFilters.sortDir = 'desc'; 
    updateSortIcon();
    applyFiltersAndRender();

    console.log("✅ Wyrenderowano interfejs przeglądów.");
    console.groupEnd();
}

/**
 * Podpina listenery pod inputy w toolbarze
 */
function attachToolbarEvents(planeReg) {
    const ids = [
        'insp-filter-search', 'insp-filter-status', 'insp-filter-type', 
        'insp-filter-date-from', 'insp-filter-date-to', 
        'insp-check-delayed', 'insp-check-sz'
    ];

    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener(el.type === 'checkbox' ? 'change' : 'input', () => {
                updateFiltersState();
                applyFiltersAndRender();
            });
        }
    });

    // Sortowanie button
    const sortBtn = document.getElementById('insp-sort-dir-btn');
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            activeFilters.sortDir = activeFilters.sortDir === 'desc' ? 'asc' : 'desc';
            updateSortIcon();
            applyFiltersAndRender();
        });
    }

    // Raport button - NOWA OBSŁUGA przez print-utils.js
    const reportBtn = document.getElementById('insp-btn-report');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            // Pobieramy aktualnie przefiltrowane dane
            const dataToExport = getFilteredData();
            printReport(planeReg, dataToExport);
        });
    }

    // Czyść filtry
    const clearBtn = document.getElementById('insp-btn-clear');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            document.getElementById('insp-filter-search').value = '';
            document.getElementById('insp-filter-status').value = '';
            document.getElementById('insp-filter-type').value = '';
            document.getElementById('insp-filter-date-from').value = '';
            document.getElementById('insp-filter-date-to').value = '';
            document.getElementById('insp-check-delayed').checked = false;
            document.getElementById('insp-check-sz').checked = false;
            
            updateFiltersState();
            applyFiltersAndRender();
        });
    }
}

function updateSortIcon() {
    const sortBtn = document.getElementById('insp-sort-dir-btn');
    if(!sortBtn) return;
    const icon = sortBtn.querySelector('i');
    if (activeFilters.sortDir === 'asc') {
        icon.className = 'fas fa-sort-numeric-up'; // Strzałka w górę (rosnąco 1->10)
    } else {
        icon.className = 'fas fa-sort-numeric-down'; // Strzałka w dół (malejąco 10->1)
    }
}

/**
 * Aktualizuje obiekt activeFilters na podstawie DOM
 */
function updateFiltersState() {
    activeFilters.search = document.getElementById('insp-filter-search').value.toLowerCase();
    activeFilters.status = document.getElementById('insp-filter-status').value;
    activeFilters.type = document.getElementById('insp-filter-type').value;
    activeFilters.dateFrom = document.getElementById('insp-filter-date-from').value;
    activeFilters.dateTo = document.getElementById('insp-filter-date-to').value;
    activeFilters.onlyDelayed = document.getElementById('insp-check-delayed').checked;
    activeFilters.onlySZ = document.getElementById('insp-check-sz').checked;
}

/**
 * Główna funkcja filtrowania i SORTOWANIA.
 * Zwraca przefiltrowaną tablicę (używana przez Render i Raport).
 */
function getFilteredData() {
    // 1. Filtrowanie
    let filtered = currentInspectionsData.filter(item => {
        // Search (Typ, Info, Powód, Samolot Zastępczy)
        if (activeFilters.search) {
            const term = activeFilters.search;
            const text = [
                item['Typ'], 
                item['Dodatkowe informacje'], 
                item['Powód opóźnienia'], 
                item['Samolot zastępczy']
            ].join(' ').toLowerCase();
            if (!text.includes(term)) return false;
        }

        // Status
        if (activeFilters.status && item['Status'] !== activeFilters.status) return false;

        // Typ
        if (activeFilters.type && item['Typ'] !== activeFilters.type) return false;

        // --- FILTROWANIE DAT (Logika A, B, C) ---
        const inspStart = parseDateToMidnight(item['Data początkowa (po zmianie)'] || item['Data początkowa']);
        const inspEnd = parseDateToMidnight(item['Data końcowa (po zmianie)'] || item['Data końcowa']);
        
        const filterFrom = activeFilters.dateFrom ? parseDateToMidnight(activeFilters.dateFrom) : null;
        const filterTo = activeFilters.dateTo ? parseDateToMidnight(activeFilters.dateTo) : null;

        // A) Tylko data początkowa -> Pokaż przeglądy zaczynające się w tę datę lub później
        if (filterFrom && !filterTo) {
            if (!inspStart || inspStart < filterFrom) return false;
        }

        // B) Tylko data końcowa -> Pokaż przeglądy kończące się w tę datę lub wcześniej
        if (!filterFrom && filterTo) {
             if (!inspEnd || inspEnd > filterTo) return false;
        }

        // C) Data początkowa i końcowa -> Przegląd musi się w całości zawierać
        if (filterFrom && filterTo) {
            if (!inspStart || !inspEnd || inspStart < filterFrom || inspEnd > filterTo) return false;
        }

        // Checkboxy
        if (activeFilters.onlyDelayed) {
            const delay = parseInt(item['Opóźnienie'] || '0');
            if (delay <= 0) return false;
        }
        if (activeFilters.onlySZ) {
            if (!item['Samolot zastępczy']) return false;
        }

        return true;
    });

    // 2. Sortowanie
    filtered.sort((a, b) => {
        const dateA = parseDateToMidnight(a['Data początkowa (po zmianie)'] || a['Data początkowa']);
        const dateB = parseDateToMidnight(b['Data początkowa (po zmianie)'] || b['Data początkowa']);
        
        const timeA = dateA ? dateA.getTime() : 0;
        const timeB = dateB ? dateB.getTime() : 0;

        return activeFilters.sortDir === 'desc' 
            ? timeB - timeA 
            : timeA - timeB;
    });

    return filtered;
}

/**
 * Pobiera przefiltrowane dane i generuje HTML wierszy
 */
function applyFiltersAndRender() {
    const gridBody = document.getElementById('insp-grid-body');
    if (!gridBody) return;

    // Używamy nowej, wspólnej funkcji logicznej
    const filtered = getFilteredData();

    // Renderowanie HTML
    if (filtered.length === 0) {
        gridBody.innerHTML = `<div class="insp-empty-state">Brak wyników spełniających kryteria.</div>`;
        return;
    }

    let html = '';
    filtered.forEach((insp, index) => {
        const statusRaw = insp['Status'] || 'PLAN';
        const statusClass = getStatusColorClass(statusRaw);
        const statusColorVar = getStatusColorVar(statusRaw);
        
        const typeRaw = insp['Typ'] || '?';
        const typeClass = getTypeColorClass(typeRaw);
        
        const startHTML = formatDateBlock(insp['Data początkowa'], insp['Data początkowa (po zmianie)']);
        const endHTML = formatDateBlock(insp['Data końcowa'], insp['Data końcowa (po zmianie)']);

        const delay = insp['Opóźnienie'];
        const delayHtml = (delay && delay !== '0') 
            ? `<div class="badge-delay"><i class="fas fa-exclamation-triangle"></i> +${delay}</div>` 
            : '';
        
        const infoRaw = insp['Dodatkowe informacje'] || 'Brak dodatkowych uwag.';
        const szRaw = insp['Samolot zastępczy'] ? `<div class="sz-badge">SZ: ${insp['Samolot zastępczy']}</div>` : '';

        const borderStyle = `border-left-color: var(${statusColorVar}) !important;`;
        
        html += `
        <div class="insp-row animate-fade-in" style="${borderStyle}">
            <div class="col-type">
                <div class="insp-type-badge ${typeClass}">${typeRaw}</div>
            </div>
            <div class="col-dates">
                <div class="date-row">
                    <span class="date-label">Start</span> ${startHTML}
                </div>
                <div class="date-row">
                    <span class="date-label">Koniec</span> ${endHTML}
                </div>
            </div>
            <div class="col-details">
                ${delayHtml}
                <div class="info-snippet">${infoRaw}</div>
            </div>
            <div class="col-status">
                <div class="status-pill ${statusClass}">${statusRaw}</div>
                ${szRaw}
            </div>
        </div>
        `;
    });

    gridBody.innerHTML = html;

    // 4. Ponowne podpięcie kliknięć (używając przefiltrowanej tablicy)
    const rows = gridBody.querySelectorAll('.insp-row');
    rows.forEach((row, i) => {
        row.addEventListener('click', () => {
            showFullDetailsModal(filtered[i]);
        });
    });
}

/**
 * Wyświetla modal ze szczegółami
 */
function showFullDetailsModal(insp) {
    const existing = document.querySelector('.details-overlay');
    if (existing) existing.remove();

    const typeClass = getTypeColorClass(insp['Typ']);
    const statusClass = getStatusColorClass(insp['Status']);

    const formatBool = (val) => {
        if (val === true || val === 'TRUE' || val === 'True' || val === '1') return '<span class="bool-true">Prawda</span>';
        if (val === false || val === 'FALSE' || val === 'False' || val === '0') return '<span class="bool-false">Fałsz</span>';
        return '<span class="bool-false">Fałsz</span>';
    };

    const modalHTML = `
    <div class="details-overlay" id="details-overlay">
        <div class="details-popup">
            <div class="details-header">
                <h3>Szczegóły Przeglądu: ${insp['Rejestracja']}</h3>
                <div class="close-popup" id="close-details-btn">&times;</div>
            </div>
            <div class="details-body-scroll">
                
                <div class="details-top-bar">
                    <div class="insp-type-badge ${typeClass}" style="width:50px; height:50px; font-size:1.5rem;">${insp['Typ']}</div>
                    <div class="status-pill ${statusClass}" style="width:auto; padding:8px 20px; font-size:0.9rem;">${insp['Status']}</div>
                </div>

                <div class="details-grid-container">
                    
                    <div class="detail-group">
                        <h4>Harmonogram</h4>
                        ${renderDetailRow('Data początkowa', insp['Data początkowa'])}
                        ${renderDetailRow('Data końcowa', insp['Data końcowa'])}
                        ${renderDetailRow('Data początkowa (zmiana)', insp['Data początkowa (po zmianie)'], true)}
                        ${renderDetailRow('Data końcowa (zmiana)', insp['Data końcowa (po zmianie)'], true)}
                        ${renderDetailRow('Ilość godzin', insp['Ilość godzin'])}
                    </div>

                    <div class="detail-group">
                        <h4>Status i Problemy</h4>
                        ${renderDetailRow('Opóźnienie', insp['Opóźnienie'] ? `${insp['Opóźnienie']}` : '0 dni')}
                        ${renderDetailRow('Powód opóźnienia', insp['Powód opóźnienia'])}
                    </div>

                    <div class="detail-group">
                        <h4>Samolot Zastępczy (SZ)</h4>
                        ${renderDetailRow('Samolot zastępczy', insp['Samolot zastępczy'] || '-')}
                        ${renderDetailRow('Konieczność sprow. SZ', formatBool(insp['Konieczność sprowadzenia SZ']))}
                        ${renderDetailRow('SZ innego przewoźnika', formatBool(insp['SZ innego przewoźnika']))}
                    </div>

                    <div class="detail-group">
                        <h4>Gotowość Operacyjna</h4>
                        ${renderDetailRow('Samolot gotowy', formatBool(insp['Samolot gotowy']))}
                        ${renderDetailRow('SZ gotowy', formatBool(insp['SZ gotowy']))}
                    </div>
                </div>

                <div class="detail-desc-box">
                    <strong>Dodatkowe informacje:</strong><br>
                    ${insp['Dodatkowe informacje'] || 'Brak dodatkowych uwag.'}
                </div>

            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('details-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'details-overlay' || e.target.id === 'close-details-btn') {
            document.getElementById('details-overlay').remove();
        }
    });
}

// --- HELPERS (Kolorowanie i formatowanie) ---

function renderDetailRow(label, value, isChanged = false) {
    if (!value && !isChanged) return '';
    const valClass = isChanged ? 'val-changed' : '';
    return `
    <div class="d-row">
        <span class="d-label">${label}</span>
        <span class="d-value ${valClass}">${value || '-'}</span>
    </div>`;
}

function getTypeColorClass(type) {
    if (!type) return '';
    const t = type.trim().toUpperCase();
    if (t === 'B') return 'type-b';
    if (t === 'C') return 'type-c';
    if (t === 'D') return 'type-d';
    return '';
}

function getStatusColorClass(status) {
    if (!status) return 's-default';
    const s = status.toLowerCase();
    
    if (s.includes('w trakcie')) return 's-w-trakcie';
    if (s.includes('zaplanowany')) return 's-zaplanowany';
    if (s.includes('wykonany') || s.includes('zakończony')) return 's-wykonany';
    if (s.includes('przygotowany')) return 's-przygotowany';
    if (s.includes('problem')) return 's-problem';
    if (s.includes('przełożony') || s.includes('odwołany')) return 's-przelozony';
    
    return 's-default';
}

function getStatusColorVar(status) {
    if (!status) return '--status-default';
    const s = status.toLowerCase();
    if (s.includes('w trakcie')) return '--status-w-trakcie';
    if (s.includes('zaplanowany')) return '--status-zaplanowany';
    if (s.includes('wykonany') || s.includes('zakończony')) return '--status-wykonany';
    if (s.includes('przygotowany')) return '--status-przygotowany';
    if (s.includes('problem')) return '--status-problem';
    if (s.includes('przełożony') || s.includes('odwołany')) return '--status-przelozony';
    return '--status-default';
}

function formatDateBlock(orig, changed) {
    if (changed && changed.trim() !== '' && changed !== orig) {
        return `<span class="date-val date-changed">${changed}</span>
                <span class="date-original">${orig}</span>`;
    }
    return `<span class="date-val">${orig}</span>`;
}