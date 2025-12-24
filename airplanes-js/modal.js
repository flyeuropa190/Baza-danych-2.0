import { state } from './state.js';
import { getStatusClass } from './utils.js';
import { renderPlaneInspections } from './airplane-inspections-tab.js';

// --- OBSŁUGA ZAKŁADEK (Eksport do window wymagany dla inline onclick w HTML) ---

window.switchTab = function(tabName) {
    console.log(`[Modal] Przełączanie zakładki na: ${tabName}`);

    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) tabContent.classList.add('active');
    
    const btn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if (btn) btn.classList.add('active');

    // LOGIKA ŁADOWANIA DANYCH
    if (tabName === 'planned-maint') {
        const wrapper = document.getElementById('tab-inspections-wrapper');
        if (state.openPlaneReg) {
            // Dodanie loadera przed renderowaniem (dla lepszego UX)
            if(wrapper) wrapper.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fas fa-circle-notch fa-spin"></i> Ładowanie harmonogramu...</div>';
            
            console.log(`[Modal] Wywołanie renderPlaneInspections dla: ${state.openPlaneReg}`);
            // Krótkie opóźnienie symulujące lub pozwalające na repaint (opcjonalne)
            setTimeout(() => {
                renderPlaneInspections(state.openPlaneReg);
            }, 50);
        } else {
            console.error("[Modal] Błąd: Brak state.openPlaneReg!");
            if(wrapper) wrapper.innerHTML = '<div class="tab-placeholder error">Błąd: Brak wybranego samolotu.</div>';
        }
    }
};

// --- LOGIKA MODALA ---

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
                    ${renderModalRow("Silniki", plane.silniki + " (" + plane.iloscSilnikow + "x)")}
                    ${renderModalRow("Ilość godz. przy zakupie", plane.godzinyZakup ? plane.godzinyZakup + " godz." : null)}
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

        <div id="tab-planned-maint" class="tab-content">
            <div id="tab-inspections-wrapper" class="inspections-list-container"></div>
        </div>
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