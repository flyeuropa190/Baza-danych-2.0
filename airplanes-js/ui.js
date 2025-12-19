import { state } from './state.js';
import { getStatusClass, getCheckStatusClass, groupBy } from './utils.js';

// --- ELEMENTY UI ---

function createCard(plane, showPlaneModalCallback) {
    const card = document.createElement("div");
    card.classList.add("airplane-card");
    card.onclick = () => showPlaneModalCallback(plane);

    const isMissingData = !plane.samolot || !plane.typ || !plane.status || !plane.rejestracja;
    const missingDataIcon = isMissingData ? `<div class="missing-data-pulse" title="Brak kluczowych danych"><i class="fas fa-exclamation-triangle"></i></div>` : '';

    const statusClass = getStatusClass(plane.status);
    const bClass = getCheckStatusClass(plane.bCheck, plane.dataB);
    const cClass = getCheckStatusClass(plane.cCheck, plane.dataC);
    const dClass = getCheckStatusClass(plane.dCheck, plane.dataD);

    const regText = plane.rejestracja || "???";
    const tabText = plane.nrTab ? ` (${plane.nrTab})` : "";
    
    // Logika wyświetlania lotu zastępczego pod głównym
    const hasReplacement = (plane.nrLotuZast || plane.odlotZast);
    const replacementHtml = hasReplacement ? `
        <div class="zastepczy-info">
            <i class="fas fa-exchange-alt"></i> 
            <span>${plane.nrLotuZast || '?'} | ${plane.odlotZast || '?'} &rarr; ${plane.przylotZast || '?'} (${plane.zastepczyZa || "N/A"})</span>
        </div>
    ` : '';

    card.innerHTML = `
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
            ${replacementHtml}
        </div>
        <div class="check-grid">
            <div class="check-item ${bClass}">B</div>
            <div class="check-item ${cClass}">C</div>
            <div class="check-item ${dClass}">D</div>
        </div>
    `;
    return card;
}

// --- RENDEROWANIE ---

export function renderAirplanes(forceRender = false) {
    const container = document.getElementById("airplanes-container");
    const groupByValue = document.getElementById("group-by").value;
    
    // ZAPAMIĘTANIE SCROLLA
    const scrollPos = window.scrollY;

    container.innerHTML = "";
    
    if (groupByValue === 'none') {
        renderFlatList(container, forceRender);
    } else {
        renderGroupedList(container, groupByValue);
    }

    // PRZYWRÓCENIE SCROLLA
    if (!state.isFirstLoad) {
        window.scrollTo(0, scrollPos);
    }
}

function renderFlatList(container, forceRender) {
    container.className = state.currentView === 'grid' ? "airplanes-grid" : "view-list-mode";
    const containerWidth = container.offsetWidth;
    const itemsPerRow = Math.floor(containerWidth / 315) || 1; 
    let lastSeries = "";

    state.filteredData.forEach((plane, index) => {
        if (state.currentSortField === 'rejestracja') {
            const currentSeries = plane.rejestracja ? plane.rejestracja.substring(0, 5) : "Inne";
            if (lastSeries !== "" && currentSeries !== lastSeries) {
                const divider = document.createElement("div");
                divider.className = "registration-series-divider";
                divider.innerHTML = `<i class="fas fa-plane-arrival"></i> Seria ${currentSeries}...`;
                container.appendChild(divider);
            }
            lastSeries = currentSeries;
        }

        const card = createCard(plane, showPlaneModal);
        
        if(forceRender || state.isFirstLoad) {
            const rowIndex = Math.floor(index / itemsPerRow);
            card.style.animationDelay = `${rowIndex * 0.15}s`; 
        } else {
            card.style.animation = 'none';
            card.style.opacity = '1';
        }
        
        container.appendChild(card);
    });
}

function renderGroupedList(container, groupByValue) {
    container.className = "";
    const groups = groupBy(state.filteredData, groupByValue);
    
    let sortedGroupKeys = Object.keys(groups);

    if (state.currentSortField !== 'default') {
        sortedGroupKeys.sort((keyA, keyB) => {
            const itemA = groups[keyA][0]; 
            const itemB = groups[keyB][0]; 
            
            let valA = (itemA[state.currentSortField] || "").toString().toLowerCase();
            let valB = (itemB[state.currentSortField] || "").toString().toLowerCase();
            const numA = parseFloat(valA);
            const numB = parseFloat(valB);

            if (!isNaN(numA) && !isNaN(numB) && valA == numA && valB == numB) {
                valA = numA; valB = numB;
            }

            if (valA < valB) return state.currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return state.currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        sortedGroupKeys.sort();
    }

    sortedGroupKeys.forEach((groupName) => {
        const wrapper = document.createElement("div");
        wrapper.className = "group-wrapper";

        const isExpanded = state.expandedGroups.has(groupName);
        const header = document.createElement("div");
        header.className = `group-header ${isExpanded ? '' : 'collapsed'}`;
        header.innerHTML = `<span>${groupName.toUpperCase()} (${groups[groupName].length})</span>`;
        
        header.onclick = () => {
            const content = header.nextElementSibling;
            if (state.expandedGroups.has(groupName)) {
                state.expandedGroups.delete(groupName);
                content.classList.remove("show");
                header.classList.add("collapsed");
            } else {
                state.expandedGroups.add(groupName);
                content.classList.add("show");
                header.classList.remove("collapsed");
            }
        };

        const content = document.createElement("div");
        content.className = `group-content ${isExpanded ? 'show' : ''} ${state.currentView === 'grid' ? 'grid-view' : 'list-view'}`;

        groups[groupName].forEach((plane) => {
            const card = createCard(plane, showPlaneModal);
            card.style.animation = 'none';
            card.style.opacity = '1';
            content.appendChild(card);
        });

        wrapper.appendChild(header);
        wrapper.appendChild(content);
        container.appendChild(wrapper);
    });
}

export function renderMaintenanceAlerts() {
    const alertContainerId = "maintenance-alerts-container";
    let container = document.getElementById(alertContainerId);
    if (!container) {
        container = document.createElement("div");
        container.id = alertContainerId;
        const grid = document.getElementById("airplanes-container");
        grid.parentNode.insertBefore(container, grid);
    }
    const expiredPlanes = state.currentData.filter(p => p.bCheck || p.cCheck || p.dCheck);
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


export function populateFilterOptions() {
    const getUnique = (key) => [...new Set(state.currentData.map(item => item[key]).filter(val => val && val.trim() !== ""))].sort();
    
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

    const labelType = document.querySelector("label[for='filter-type']");
    if(labelType) labelType.textContent = "Model samolotu:";
}

export function setView(view) {
    if (state.currentView === view) return;
    state.currentView = view;
    document.getElementById("view-grid").classList.toggle("active", view === 'grid');
    document.getElementById("view-list").classList.toggle("active", view === 'list');
    renderAirplanes(true);
}

// --- ZMODYFIKOWANY MODAL SZCZEGÓŁÓW ---

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    document.querySelector(`button[onclick="switchTab('${tabName}')"]`).classList.add('active');
};

export function showPlaneModal(plane) {
    state.openPlaneReg = plane.rejestracja; 

    const modal = document.getElementById("plane-modal");
    const details = document.getElementById("modal-details");
    const statusClass = getStatusClass(plane.status);

    const renderModalRow = (label, value, extraClass = "") => {
        if (!value || value === "-" || value === "00:00") return "";
        return `<div class="modal-row ${extraClass}"><span class="modal-label">${label}:</span><span class="modal-value">${value}</span></div>`;
    };

    const createCheckObj = (type, isRequired, dateValue) => {
        if (isRequired) return { type, status: "PO TERMINIE", cssClass: "maint-expired", date: dateValue ? `do: ${dateValue}` : "Wymagany!" };
        if (!dateValue) return { type, status: "BRAK DANYCH", cssClass: "maint-missing", date: "Nieznana data" };
        return { type, status: "WAŻNY", cssClass: "maint-valid", date: `do: ${dateValue}` };
    };
    const checks = [
        createCheckObj("B-Check", plane.bCheck, plane.dataB),
        createCheckObj("C-Check", plane.cCheck, plane.dataC),
        createCheckObj("D-Check", plane.dCheck, plane.dataD)
    ];

    details.innerHTML = `
        <div class="modal-toolbar animate-delay-1">
            <button class="modal-tool-btn" onclick="alert('Edycja: ${plane.rejestracja}')"><i class="fas fa-edit"></i> Edytuj</button>
            <button class="modal-tool-btn" onclick="window.print()"><i class="fas fa-print"></i> Drukuj</button>
            <button class="modal-tool-btn btn-delete" onclick="alert('Usuwanie: ${plane.rejestracja}')"><i class="fas fa-trash"></i> Usuń</button>
        </div>

        <div class="modal-header-wrapper animate-delay-1">
            <div class="modal-header-left">
                <div class="modal-reg">${plane.rejestracja} ${plane.nrTab ? `<span class="modal-tab">(${plane.nrTab})</span>` : ''}</div>
                <div class="modal-model">${plane.samolot || 'Nieznany model'}</div>
            </div>
            <div class="status-badge ${statusClass}">${plane.status || 'Nieznany'}</div>
        </div>

        <div class="modal-tabs animate-delay-2">
            <button class="tab-btn active" onclick="switchTab('general')">Ogólne</button>
            <button class="tab-btn" onclick="switchTab('planned-maint')">Przeglądy planowane</button>
            <button class="tab-btn" onclick="switchTab('planned-repair')">Naprawy planowane</button>
            <button class="tab-btn" onclick="switchTab('irregular')">Loty nieregularne</button>
            <button class="tab-btn" onclick="switchTab('current-maint')">Przeglądy bieżące</button>
            <button class="tab-btn" onclick="switchTab('events')">Wydarzenia</button>
            <button class="tab-btn" onclick="switchTab('assign')">Przypisania</button>
        </div>

        <div id="tab-general" class="tab-content active">
            
            <div class="modal-body-grid">
                
                <div class="modal-section section-tech animate-delay-3">
                    <h3><i class="fas fa-cogs"></i> Dane Techniczne</h3>
                    ${renderModalRow("Rok produkcji", plane.rokProdukcji)}
                    ${renderModalRow("Typ", plane.typ)}
                    ${renderModalRow("Silniki", plane.silniki)}
                    ${renderModalRow("Resurs", plane.godzinyZakup ? plane.godzinyZakup + " godz." : null)}
                </div>

                <div class="modal-section section-seats animate-delay-3">
                    <h3><i class="fas fa-chair"></i> Układ Miejsc</h3>
                    <div class="seats-container">
                        <div class="seat-badge seat-business"><span class="seat-label">Biznes</span><span class="seat-count">${plane.miejscaBiznes || '0'}</span></div>
                        <div class="seat-badge seat-premium"><span class="seat-label">Premium</span><span class="seat-count">${plane.miejscaPremium || '0'}</span></div>
                        <div class="seat-badge seat-eco"><span class="seat-label">Ekonomiczna</span><span class="seat-count">${plane.miejscaEkonomiczna || '0'}</span></div>
                    </div>
                </div>

                <div class="modal-section section-ops animate-delay-3">
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

            </div>

            <div class="maintenance-footer animate-delay-4">
                <div class="maint-title"><i class="fas fa-wrench"></i> Status Przeglądów</div>
                <div class="maint-grid">
                    ${checks.map(c => `<div class="maint-card ${c.cssClass}"><div class="maint-type">${c.type}</div><div class="maint-status">${c.status}</div><div class="maint-date">${c.date}</div></div>`).join('')}
                </div>
            </div>
        </div>

        <div id="tab-planned-maint" class="tab-content"><div class="tab-placeholder">Brak danych o przeglądach planowanych.</div></div>
        <div id="tab-planned-repair" class="tab-content"><div class="tab-placeholder">Brak danych o naprawach planowanych.</div></div>
        <div id="tab-irregular" class="tab-content"><div class="tab-placeholder">Brak lotów nieregularnych.</div></div>
        <div id="tab-current-maint" class="tab-content"><div class="tab-placeholder">Brak przeglądów bieżących.</div></div>
        <div id="tab-events" class="tab-content"><div class="tab-placeholder">Brak zarejestrowanych wydarzeń.</div></div>
        <div id="tab-assign" class="tab-content"><div class="tab-placeholder">Brak aktywnych przypisań załogi.</div></div>
    `;

    modal.style.display = "block";
}

export function refreshOpenModalIfNeeds() {
    const modal = document.getElementById("plane-modal");
    if (modal.style.display === "block" && state.openPlaneReg) {
        const currentPlaneData = state.currentData.find(p => p.rejestracja === state.openPlaneReg);
        if (currentPlaneData) {
            showPlaneModal(currentPlaneData);
        }
    }
}