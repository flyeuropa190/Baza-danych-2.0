// airplanes-loader.js
import { fetchAirplanesData } from './airplanes-fetcher.js';

// --- KONFIGURACJA API ---
const API_URL_BASE = 'https://script.google.com/macros/s/AKfycbzyCWJ-v9XVXDZ2Tp3MrNPnz1lAjUgx8-O9mns2_1mTLYkAeT7n4dq8vPcafRGe2qrvSw/exec';

// --- STAN APLIKACJI ---
let currentData = [];
let lastDataHash = ""; 
let filteredData = [];
let expandedGroups = new Set();
let currentView = 'grid'; 
let isFirstLoad = true; 

// --- STAN SORTOWANIA ---
let currentSortField = 'rejestracja';
let currentSortOrder = 'asc'; 

// --- STAN FILTRÓW ---
let activeFilters = {
    term: '',
    type: '',
    status: '',
    origin: '',
    dest: '',
    year: '',
    engine: '',
    checksOnly: false,
    missingData: false // NOWE: Filtr brakujących danych
};

document.addEventListener("DOMContentLoaded", async () => {
    setupEventListeners();
    await refreshData();
    setInterval(refreshData, 15000);
});

function setupEventListeners() {
    // 1. Wyszukiwarka
    document.getElementById("search-input").addEventListener("input", (e) => {
        activeFilters.term = e.target.value.toLowerCase();
        applyLogic();
    });

    document.getElementById("show-empty").addEventListener("change", applyLogic);
    
    // 2. Grupowanie
    document.getElementById("group-by").addEventListener("change", () => {
        expandedGroups.clear();
        renderAirplanes(true);
    });

    // 3. Sortowanie
    document.getElementById("sort-by").addEventListener("change", (e) => {
        currentSortField = e.target.value;
        applyLogic();
    });

    document.getElementById("sort-order-btn").addEventListener("click", () => {
        const btn = document.getElementById("sort-order-btn");
        const icon = btn.querySelector("i");
        
        if (currentSortOrder === 'asc') {
            currentSortOrder = 'desc';
            icon.className = "fas fa-sort-alpha-up";
        } else {
            currentSortOrder = 'asc';
            icon.className = "fas fa-sort-alpha-down";
        }
        applyLogic();
    });

    // 4. Widok
    document.getElementById("view-grid").onclick = () => setView('grid');
    document.getElementById("view-list").onclick = () => setView('list');

    // 5. Obsługa Modali (Filtry)
    const filterModal = document.getElementById("filters-modal");
    document.getElementById("btn-open-filters").onclick = () => {
        populateFilterOptions();
        filterModal.style.display = "block";
    };
    document.querySelector(".close-filter-modal").onclick = () => filterModal.style.display = "none";
    
    document.getElementById("btn-apply-filters").onclick = () => {
        activeFilters.type = document.getElementById("filter-type").value;
        activeFilters.status = document.getElementById("filter-status").value;
        activeFilters.origin = document.getElementById("filter-origin").value;
        activeFilters.dest = document.getElementById("filter-dest").value;
        activeFilters.year = document.getElementById("filter-year").value;
        activeFilters.engine = document.getElementById("filter-engine").value;
        activeFilters.checksOnly = document.getElementById("filter-checks-only").checked;
        
        // NOWE: Obsługa filtra brakujących danych (jeśli checkbox istnieje w HTML)
        const missingDataCheckbox = document.getElementById("filter-missing-data");
        if (missingDataCheckbox) {
            activeFilters.missingData = missingDataCheckbox.checked;
        }

        filterModal.style.display = "none";
        applyLogic();
    };

    document.getElementById("btn-clear-filters").onclick = () => {
        ['filter-type', 'filter-status', 'filter-origin', 'filter-dest', 'filter-year', 'filter-engine'].forEach(id => document.getElementById(id).value = "");
        document.getElementById("filter-checks-only").checked = false;
        
        const missingDataCheckbox = document.getElementById("filter-missing-data");
        if (missingDataCheckbox) missingDataCheckbox.checked = false;
        
        activeFilters = { ...activeFilters, type: '', status: '', origin: '', dest: '', year: '', engine: '', checksOnly: false, missingData: false };
        filterModal.style.display = "none";
        applyLogic();
    };

    // 6. Obsługa Modali (Szczegóły samolotu)
    const planeModal = document.getElementById("plane-modal");
    document.querySelector(".close-modal").onclick = () => planeModal.style.display = "none";
    window.onclick = (e) => {
        if (e.target === filterModal) filterModal.style.display = "none";
        if (e.target === planeModal) planeModal.style.display = "none";
    };
}

function setView(view) {
    if (currentView === view) return;
    currentView = view;
    document.getElementById("view-grid").classList.toggle("active", view === 'grid');
    document.getElementById("view-list").classList.toggle("active", view === 'list');
    renderAirplanes(true);
}

// --- LOGIKA DANYCH ---
async function fetchMaintenanceData() {
    try {
        const response = await fetch(`${API_URL_BASE}?type=dashboard`);
        const json = await response.json();
        return json && json.kontrolka ? json.kontrolka : [];
    } catch (e) {
        console.error("Błąd pobierania danych przeglądowych:", e);
        return [];
    }
}

async function refreshData() {
    const loader = document.getElementById("loader");
    if (isFirstLoad) loader.style.display = "block";

    const [planesResult, maintenanceList] = await Promise.all([
        fetchAirplanesData(),
        fetchMaintenanceData()
    ]);
    
    if (isFirstLoad) {
        loader.style.display = "none";
        isFirstLoad = false;
    }
    
    if (planesResult && !planesResult.error) {
        const mergedData = mergeMaintenanceData(planesResult.data, maintenanceList);

        const newDataHash = JSON.stringify(mergedData);
        if (newDataHash === lastDataHash) return;

        lastDataHash = newDataHash;
        currentData = mergedData;
        
        renderMaintenanceAlerts(); // NOWE: Generowanie alertu na stronie
        populateFilterOptions();
        applyLogic();
    }
}

function mergeMaintenanceData(planes, maintenance) {
    const maintMap = new Map();
    maintenance.forEach(item => {
        if(item.rejestracja) maintMap.set(item.rejestracja, item);
    });

    return planes.map(plane => {
        const maintInfo = maintMap.get(plane.rejestracja);
        return {
            ...plane,
            dataB: maintInfo ? maintInfo.b_data : null,
            dataC: maintInfo ? maintInfo.c_data : null,
            dataD: maintInfo ? maintInfo.d_data : null,
            dniB: maintInfo ? maintInfo.b_dni : null,
            dniC: maintInfo ? maintInfo.c_dni : null,
            dniD: maintInfo ? maintInfo.d_dni : null
        };
    });
}

// NOWE: Funkcja wyświetlająca alert o przeterminowanych przeglądach
function renderMaintenanceAlerts() {
    const alertContainer = document.getElementById("maintenance-alerts-container");
    if (!alertContainer) {
        // Tworzymy kontener dynamicznie jeśli nie istnieje w HTML (najlepiej wstaw go w HTML nad gridem)
        const container = document.createElement("div");
        container.id = "maintenance-alerts-container";
        const grid = document.getElementById("airplanes-container");
        grid.parentNode.insertBefore(container, grid);
    }

    const expiredPlanes = currentData.filter(p => p.bCheck || p.cCheck || p.dCheck);
    
    const container = document.getElementById("maintenance-alerts-container");
    if (expiredPlanes.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    let alertHtml = `<div class="global-alert-box"><i class="fas fa-exclamation-circle"></i> <strong>UWAGA - Nieważne przeglądy (${expiredPlanes.length}):</strong> <ul>`;
    
    expiredPlanes.forEach(p => {
        let checks = [];
        if (p.bCheck) checks.push("B-Check");
        if (p.cCheck) checks.push("C-Check");
        if (p.dCheck) checks.push("D-Check");
        alertHtml += `<li><b>${p.rejestracja}</b>: ${checks.join(", ")}</li>`;
    });
    
    alertHtml += `</ul></div>`;
    container.innerHTML = alertHtml;
    container.style.display = 'block';
}

function populateFilterOptions() {
    const getUnique = (key) => [...new Set(currentData.map(item => item[key]).filter(val => val && val.trim() !== ""))].sort();
    const fillSelect = (id, options) => {
        const select = document.getElementById(id);
        if(!select) return; 
        const currentValue = select.value; 
        select.innerHTML = '<option value="">Wszystkie</option>';
        options.forEach(opt => {
            const optionEl = document.createElement("option");
            optionEl.value = opt;
            optionEl.textContent = opt;
            select.appendChild(optionEl);
        });
        if (options.includes(currentValue)) select.value = currentValue;
    };
    fillSelect("filter-type", getUnique("typ"));
    fillSelect("filter-status", getUnique("status"));
    fillSelect("filter-origin", getUnique("odlot"));
    fillSelect("filter-dest", getUnique("przylot"));
    fillSelect("filter-engine", getUnique("silniki"));
}

function applyLogic() {
    const showEmpty = document.getElementById("show-empty").checked;

    filteredData = currentData.filter(plane => {
        // Check "pustych" (istniejący)
        if (!showEmpty) {
            const hasData = plane.samolot || plane.status || plane.nrLotu || plane.odlot || plane.typ;
            if (!hasData) return false;
        }

        // Filtrowanie tekstowe
        if (activeFilters.term) {
            const combined = [plane.rejestracja, plane.samolot, plane.status, plane.typ].join(' ').toLowerCase();
            if (!combined.includes(activeFilters.term)) return false;
        }

        // Standardowe filtry
        if (activeFilters.type && plane.typ !== activeFilters.type) return false;
        if (activeFilters.status && plane.status !== activeFilters.status) return false;
        if (activeFilters.origin && plane.odlot !== activeFilters.origin) return false;
        if (activeFilters.dest && plane.przylot !== activeFilters.dest) return false;
        if (activeFilters.engine && plane.silniki !== activeFilters.engine) return false;
        if (activeFilters.year && plane.rokProdukcji != activeFilters.year) return false;
        if (activeFilters.checksOnly && !(plane.bCheck || plane.cCheck || plane.dCheck)) return false;

        // NOWE: Filtrowanie po brakujących danych
        if (activeFilters.missingData) {
            // Definicja "brakujących danych": brak typu, rejestracji, statusu lub modelu
            const isMissing = !plane.typ || !plane.rejestracja || !plane.status || !plane.samolot;
            if (!isMissing) return false;
        }

        return true;
    });

    // Sortowanie
    filteredData.sort((a, b) => {
        let valA = (a[currentSortField] || "").toString().toLowerCase();
        let valB = (b[currentSortField] || "").toString().toLowerCase();

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA == numA && valB == numB) {
            valA = numA;
            valB = numB;
        }

        if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    renderAirplanes(true);
}

function renderAirplanes(forceRender = false) {
    const container = document.getElementById("airplanes-container");
    const groupByValue = document.getElementById("group-by").value;
    
    container.innerHTML = "";
    
    if (groupByValue === 'none') {
        container.className = currentView === 'grid' ? "airplanes-grid" : "view-list-mode";
        
        const containerWidth = container.offsetWidth;
        const itemsPerRow = Math.floor(containerWidth / 315) || 1; 

        let lastSeries = "";
        
        filteredData.forEach((plane, index) => {
            if (currentSortField === 'rejestracja') {
                const currentSeries = plane.rejestracja ? plane.rejestracja.substring(0, 5) : "Inne";
                if (lastSeries !== "" && currentSeries !== lastSeries) {
                    const divider = document.createElement("div");
                    divider.className = "registration-series-divider";
                    divider.innerHTML = `<i class="fas fa-plane-arrival"></i> Seria ${currentSeries}...`;
                    container.appendChild(divider);
                }
                lastSeries = currentSeries;
            }

            const card = createCard(plane);
            
            if(forceRender || isFirstLoad) {
                const rowIndex = Math.floor(index / itemsPerRow);
                card.style.animationDelay = `${rowIndex * 0.15}s`; 
            } else {
                card.style.animation = 'none';
                card.style.opacity = '1';
            }
            
            container.appendChild(card);
        });
    } else {
        container.className = "";
        const groups = groupBy(filteredData, groupByValue);
        
        Object.keys(groups).sort().forEach((groupName) => {
            const wrapper = document.createElement("div");
            wrapper.className = "group-wrapper";

            const isExpanded = expandedGroups.has(groupName);
            const header = document.createElement("div");
            header.className = `group-header ${isExpanded ? '' : 'collapsed'}`;
            header.innerHTML = `<span>${groupName.toUpperCase()} (${groups[groupName].length})</span>`;
            
            header.onclick = () => {
                const content = header.nextElementSibling;
                if (expandedGroups.has(groupName)) {
                    expandedGroups.delete(groupName);
                    content.classList.remove("show");
                    header.classList.add("collapsed");
                } else {
                    expandedGroups.add(groupName);
                    content.classList.add("show");
                    header.classList.remove("collapsed");
                }
            };

            const content = document.createElement("div");
            content.className = `group-content ${isExpanded ? 'show' : ''} ${currentView === 'grid' ? 'grid-view' : 'list-view'}`;

            groups[groupName].forEach((plane) => {
                const card = createCard(plane);
                card.style.animation = 'none';
                card.style.opacity = '1';
                content.appendChild(card);
            });

            wrapper.appendChild(header);
            wrapper.appendChild(content);
            container.appendChild(wrapper);
        });
    }
}

// Helper do określania koloru statusu przeglądu w kafelku
function getCheckStatusClass(isExpired, dateValue) {
    if (isExpired) return 'check-alert'; // Czerwony
    if (!dateValue || dateValue === "") return 'check-warning'; // Żółty (NOWE)
    return 'check-ok'; // Zielony
}

function createCard(plane) {
    const card = document.createElement("div");
    card.classList.add("airplane-card");
    card.onclick = () => showPlaneModal(plane);

    const hasReplacement = !!(plane.nrLotuZast || plane.odlotZast || plane.zastepczyZa);
    const replacementIcon = hasReplacement ? `<div class="replacement-pulse-icon" title="Lot zastępczy w toku"><i class="fas fa-exchange-alt"></i></div>` : '';

    // NOWE: Ikona brakujących danych (pulsująca)
    const isMissingData = !plane.samolot || !plane.typ || !plane.status || !plane.rejestracja;
    const missingDataIcon = isMissingData ? `<div class="missing-data-pulse" title="Brak kluczowych danych"><i class="fas fa-exclamation-triangle"></i></div>` : '';

    const statusClass = getStatusClass(plane.status);
    
    // NOWE: Użycie helpera do klas kolorów przeglądów
    const bClass = getCheckStatusClass(plane.bCheck, plane.dataB);
    const cClass = getCheckStatusClass(plane.cCheck, plane.dataC);
    const dClass = getCheckStatusClass(plane.dCheck, plane.dataD);

    const regText = plane.rejestracja || "???";
    const tabText = plane.nrTab ? ` (${plane.nrTab})` : "";
    
    card.innerHTML = `
    ${replacementIcon}
    ${missingDataIcon}
        <div class="card-header">
            <div class="card-header-left">
                <div class="airplane-reg">${regText} ${tabText}</div>
                <div class="airplane-model">${plane.samolot || "Unknown"}</div>
            </div>
            <div class="status-badge ${statusClass}">${plane.status || "?"}</div>
        </div>
        <div class="card-body">
            <div class="info-line">
                <span class="info-label">Połączenie:</span>
                <span class="info-value">${plane.nrLotu || '?'} | ${plane.odlot || '?'} &rarr; ${plane.przylot || '?'}</span>
            </div>
        </div>
        <div class="check-grid">
            <div class="check-item ${bClass}">B</div>
            <div class="check-item ${cClass}">C</div>
            <div class="check-item ${dClass}">D</div>
        </div>
    `;
    return card;
}

function showPlaneModal(plane) {
    const modal = document.getElementById("plane-modal");
    const details = document.getElementById("modal-details");
    const statusClass = getStatusClass(plane.status);

    const renderModalRow = (label, value, extraClass = "") => {
        if (!value || value === "-" || value === "00:00") return "";
        return `
            <div class="modal-row ${extraClass}">
                <span class="modal-label">${label}:</span>
                <span class="modal-value">${value}</span>
            </div>
        `;
    };

    const createCheckObj = (type, isRequired, dateValue) => {
        if (isRequired) {
            return {
                type,
                status: "PO TERMINIE",
                cssClass: "maint-expired",
                date: dateValue ? `do: ${dateValue}` : "Wymagany natychmiast!"
            };
        }
        if (!dateValue) {
            return {
                type,
                status: "BRAK DANYCH",
                cssClass: "maint-missing",
                date: "Nieznana data"
            };
        }
        return {
            type,
            status: "WAŻNY",
            cssClass: "maint-valid",
            date: `do: ${dateValue}`
        };
    };

    const checks = [
        createCheckObj("B-Check", plane.bCheck, plane.dataB),
        createCheckObj("C-Check", plane.cCheck, plane.dataC),
        createCheckObj("D-Check", plane.dCheck, plane.dataD)
    ];

    details.innerHTML = `
        <div class="modal-header-wrapper">
            <div class="modal-header-left">
                <div class="modal-reg">
                    ${plane.rejestracja} 
                    ${plane.nrTab ? `<span class="modal-tab">(${plane.nrTab})</span>` : ''}
                </div>
                <div class="modal-model">${plane.samolot || 'Nieznany model'}</div>
            </div>
            <div class="status-badge ${statusClass}">${plane.status || 'Nieznany'}</div>
        </div>

        <div class="modal-body-grid">
            <div class="modal-section full-width">
                <h3><i class="fas fa-chair"></i> Układ Miejsc</h3>
                <div class="seats-container">
                    <div class="seat-badge seat-business"><span class="seat-label">Biznes</span><span class="seat-count">${plane.miejscaBiznes || '0'}</span></div>
                    <div class="seat-badge seat-premium"><span class="seat-label">Premium</span><span class="seat-count">${plane.miejscaPremium || '0'}</span></div>
                    <div class="seat-badge seat-eco"><span class="seat-label">Ekonomiczna</span><span class="seat-count">${plane.miejscaEkonomiczna || '0'}</span></div>
                </div>
            </div>

            <div class="modal-section">
                <h3><i class="fas fa-plane-departure"></i> Operacje</h3>
                <div class="sub-section main-flight-box">
                    <div class="section-title-small">Lot Główny</div>
                    ${renderModalRow("Nr lotu", plane.nrLotu)}
                    <div class="modal-row"><span class="modal-label">Trasa:</span><span class="modal-value">${plane.odlot || '-'} &rarr; ${plane.przylot || '-'}</span></div>
                </div>
                ${(plane.nrLotuZast || plane.odlotZast) ? `
                <div class="sub-section replacement-flight-box">
                    <div class="section-title-small"><i class="fas fa-exchange-alt"></i> Lot Zastępczy</div>
                    ${renderModalRow("Nr lotu", plane.nrLotuZast)}
                    <div class="modal-row"><span class="modal-label">Trasa:</span><span class="modal-value">${plane.odlotZast || '-'} &rarr; ${plane.przylotZast || '-'}</span></div>
                    ${renderModalRow("Zastępczy za", plane.zastepczyZa, "highlight-red")}
                </div>` : ''}
            </div>

            <div class="modal-section">
                <h3><i class="fas fa-cogs"></i> Dane Techniczne</h3>
                ${renderModalRow("Rok produkcji", plane.rokProdukcji)}
                ${renderModalRow("Typ", plane.typ)}
                ${renderModalRow("Silniki", plane.silniki)}
                ${renderModalRow("Ilość silników", plane.iloscSilnikow)}
                ${renderModalRow("Resurs (zakup)", plane.godzinyZakup ? plane.godzinyZakup + " h" : null)}
            </div>
        </div>

        <div class="maintenance-footer">
            <div class="maint-title"><i class="fas fa-wrench"></i> Status Przeglądów</div>
            <div class="maint-grid">
                ${checks.map(check => `
                    <div class="maint-card ${check.cssClass}">
                        <div class="maint-type">${check.type}</div>
                        <div class="maint-status">${check.status}</div>
                        <div class="maint-date">${check.date}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    modal.style.display = "block";
}

function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        const groupKey = currentValue[key] || "Brak danych";
        (result[groupKey] = result[groupKey] || []).push(currentValue);
        return result;
    }, {});
}

function getStatusClass(status) {
    if (!status) return "status-unknown";
    const s = status.toLowerCase();
    if (s.includes("dostępny")) return "status-dostepny";
    if (s.includes("uziemiony")) return "status-uziemiony";
    if (s.includes("zaparkowany")) return "status-zaparkowany";
    if (s.includes("zamówiony")) return "status-zamowiony";
    if (s.includes("awaria")) return "status-awaria";
    if (s.includes("nieczynny")) return "status-nieczynny";
    if (s.includes("zastępczy")) return "status-zastepczy";
    if (s.includes("przegląd")) return "status-przeglad";
    if (s.includes("naprawa")) return "status-naprawa";
    if (s.includes("odstawienia")) return "status-odstawienie";
    if (s.includes("delegacja")) return "status-delegacja";
    return "status-unknown";
}