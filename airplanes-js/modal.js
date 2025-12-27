import { state } from './state.js';
import { getStatusClass } from './utils.js';
import { renderPlaneInspections } from './airplane-inspections-tab.js';
import { enterEditMode } from './edit-mode.js';
// Nowe importy potrzebne do pełnego odświeżenia danych po usunięciu
import { loadAllData } from './api.js';
import { renderAirplanes, populateFilterOptions, renderMaintenanceAlerts } from './ui.js';

const API_URL = 'https://script.google.com/macros/s/AKfycbzoZ32PygRR_DgiZYNF5JlFP9Z9TMINxXsdjwxspmvVICWjMCEDe39N3NFGBeNNpsbpMQ/exec'; 

// --- POMOCNICZE: STYLOWY MODAL POTWIERDZENIA ---

/**
 * Wyświetla customowe okienko potwierdzenia usunięcia danych
 */
function showConfirmationModal(plane, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay confirmation-overlay';
    overlay.style.zIndex = '3000'; // Wyżej niż główny modal

    overlay.innerHTML = `
        <div class="confirm-box animate-fade-in">
            <div class="confirm-icon">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <h3>Potwierdź usunięcie</h3>
            <p>Czy na pewno chcesz wyczyścić wszystkie dane dla samolotu <strong>${plane.rejestracja}</strong>?</p>
            <p class="confirm-subtext">Samolot pozostanie na liście floty, ale jego parametry techniczne i operacyjne zostaną zresetowane.</p>
            
            <div class="confirm-actions">
                <button id="btn-confirm-cancel" class="modal-tool-btn">Anuluj</button>
                <button id="btn-confirm-delete" class="modal-tool-btn btn-delete">
                    <i class="fas fa-trash"></i> Usuń dane
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const close = () => {
        overlay.classList.add('animate-fade-out');
        setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btn-confirm-cancel').onclick = close;
    
    document.getElementById('btn-confirm-delete').onclick = async () => {
        const deleteBtn = document.getElementById('btn-confirm-delete');
        const cancelBtn = document.getElementById('btn-confirm-cancel');
        
        // Stan ładowania wewnątrz potwierdzenia
        deleteBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Usuwanie...';
        deleteBtn.disabled = true;
        cancelBtn.disabled = true;
        
        await onConfirm();
        close();
    };
}

// --- LOGIKA USUWANIA DANYCH ---

async function handleDeletePlane(plane) {
    // Wywołanie stylowego okna zamiast window.confirm
    showConfirmationModal(plane, async () => {
        
        // Przygotowanie obiektu czyszczącego
        const emptyData = {
            rejestracja: plane.rejestracja,
            nrTab: "", samolot: "", miejscaBiznes: "", miejscaPremium: "", miejscaEkonomiczna: "",
            nrLotu: "", odlot: "", przylot: "", nrLotuZast: "", odlotZast: "", przylotZast: "",
            status: "", zastepczyZa: "", bCheck: "", cCheck: "", dCheck: "",
            rokProdukcji: "", typ: "", silniki: "", iloscSilnikow: "", godzinyZakup: ""
        };

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'update', data: emptyData })
            });

            const result = await response.json();

            if (result.success) {
                // 1. Zamknij główny modal szczegółów
                document.getElementById("plane-modal").style.display = "none";
                state.openPlaneReg = null;

                // 2. Pobierz świeże dane z serwera (odświeżenie cache)
                console.log("[Modal] Pobieranie świeżych danych po usunięciu...");
                const freshData = await loadAllData();
                
                // 3. Aktualizacja globalnego stanu
                state.currentData = freshData;
                state.filteredData = freshData; 

                // 4. Pełne przerysowanie UI
                renderAirplanes(true);
                populateFilterOptions();
                renderMaintenanceAlerts();

                console.log("[Modal] Dane usunięte i zsynchronizowane.");
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            alert("Błąd podczas komunikacji z serwerem: " + error.message);
        }
    });
}

// --- OBSŁUGA ZAKŁADEK ---

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) tabContent.classList.add('active');
    
    const btn = document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`);
    if (btn) btn.classList.add('active');

    if (tabName === 'planned-maint') {
        const wrapper = document.getElementById('tab-inspections-wrapper');
        if (state.openPlaneReg) {
            if(wrapper) wrapper.innerHTML = '<div style="text-align:center; padding:20px; opacity:0.6;"><i class="fas fa-circle-notch fa-spin"></i> Ładowanie harmonogramu...</div>';
            setTimeout(() => {
                renderPlaneInspections(state.openPlaneReg);
            }, 50);
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
            <button id="btn-edit-start" class="modal-tool-btn"><i class="fas fa-edit"></i> Edytuj</button>
            <button class="modal-tool-btn" onclick="window.print()"><i class="fas fa-print"></i> Drukuj</button>
            <button id="btn-delete-plane" class="modal-tool-btn btn-delete"><i class="fas fa-trash"></i> Usuń</button>
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
                    ${renderModalRow("Silniki", plane.silniki + (plane.iloscSilnikow ? " (" + plane.iloscSilnikow + "x)" : ""))}
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

    const editBtn = document.getElementById("btn-edit-start");
    if (editBtn) editBtn.onclick = () => enterEditMode(plane);

    const deleteBtn = document.getElementById("btn-delete-plane");
    if (deleteBtn) deleteBtn.onclick = () => handleDeletePlane(plane);

    modal.style.display = "block";
}

export function refreshOpenModalIfNeeds() {
    const modal = document.getElementById("plane-modal");
    if (modal.style.display === "block" && state.openPlaneReg) {
        const currentPlaneData = state.currentData.find(p => p.rejestracja === state.openPlaneReg);
        if (currentPlaneData) showPlaneModal(currentPlaneData);
    }
}