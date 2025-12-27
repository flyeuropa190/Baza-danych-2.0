import { state } from './state.js';
import { showPlaneModal } from './modal.js';

// URL Twojego skryptu
const API_URL = 'https://script.google.com/macros/s/AKfycby9T_MS-2_v4KM-zMzi-rS2uAfh_J2OnvWEdHwyFKY5JRQ_3uNleggG02BxmkswvqGiJw/exec'; 

const STATUS_OPTIONS = [
    "Dostępny", "Uziemiony", "Zaparkowany", "Zamówiony", "Awaria",
    "Nieczynny", "Samolot zastępczy", "Przegląd", "Naprawa", 
    "Do odstawienia", "Do przeglądu", "Delegacja"
];

export function enterEditMode(plane) {
    const details = document.getElementById("modal-details");
    
    // Ukrywamy zakładki
    const tabsContainer = document.querySelector('.modal-tabs');
    if(tabsContainer) tabsContainer.style.display = 'none';

    // --- PRZYGOTOWANIE DANYCH DO LIST (DATALISTS) ---
    
    // Funkcja pobierająca unikalne wartości z aktualnych danych floty
    const getUniqueValues = (key) => {
        if (!state.currentData || !Array.isArray(state.currentData)) return [];
        const values = state.currentData
            .map(item => item[key])
            .filter(val => val !== null && val !== undefined && val !== "") // Usuwamy puste
            .map(val => String(val).trim()); // Konwersja na string i trim
        return [...new Set(values)].sort(); // Unikalne i posortowane
    };

    const modelOptions = getUniqueValues('samolot');
    const engineOptions = getUniqueValues('silniki');
    const typeOptions = ['pax', 'cargo'];

    // --- POMOCNIKI RENDEROWANIA ---

    // Standardowe pole: Label na górze, Input na dole (z obsługą datalist)
    const renderField = (label, key, value, type = "text", widthClass = "", listOptions = null) => {
        const val = value === null || value === undefined ? "" : value;
        let listAttribute = "";
        let listHtml = "";

        // Jeśli przekazano opcje, tworzymy datalist
        if (listOptions && Array.isArray(listOptions) && listOptions.length > 0) {
            const listId = `list-${key}`; // Unikalne ID dla listy
            listAttribute = `list="${listId}"`;
            
            const optionsHtml = listOptions.map(opt => `<option value="${opt}">`).join('');
            listHtml = `<datalist id="${listId}">${optionsHtml}</datalist>`;
        }

        return `
            <div class="input-group ${widthClass}">
                <label class="input-label">${label}</label>
                <input type="${type}" name="${key}" value="${val}" class="form-control" autocomplete="off" ${listAttribute}>
                ${listHtml}
            </div>
        `;
    };

    // Select dla statusu
    const renderStatusSelect = (currentStatus) => {
        const options = STATUS_OPTIONS.map(opt => 
            `<option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt}</option>`
        ).join('');
        return `
            <div class="input-group" style="grid-column: 1 / -1;">
                <label class="input-label">Aktualny Status</label>
                <div class="select-wrapper">
                    <select name="status" class="form-control" style="font-weight:bold; color:var(--accent-color);">
                        ${options}
                    </select>
                </div>
            </div>
        `;
    };

    // Specjalny wiersz dla czasu: Odlot -> Przylot
    const renderTimeRow = (label, keyOdlot, valOdlot, keyPrzylot, valPrzylot) => {
        return `
            <div class="input-group" style="grid-column: 1 / -1;">
                <label class="input-label">${label} (HH:mm)</label>
                <div class="form-grid-time">
                    <input type="text" name="${keyOdlot}" value="${valOdlot || ''}" class="form-control" placeholder="Odlot">
                    <span class="time-separator"><i class="fas fa-arrow-right"></i></span>
                    <input type="text" name="${keyPrzylot}" value="${valPrzylot || ''}" class="form-control" placeholder="Przylot">
                </div>
            </div>
        `;
    };

    // --- RENDEROWANIE FORMULARZA ---

    details.innerHTML = `
        <div class="edit-mode-banner animate-fade-in">
            <span><i class="fas fa-edit"></i> Edytujesz: ${plane.rejestracja}</span>
            <span style="font-size:0.8em; opacity:0.8;">Tryb edycji</span>
        </div>

        <form id="edit-plane-form" class="edit-form-wrapper">
            <input type="hidden" name="rejestracja" value="${plane.rejestracja}">
            
            <div class="edit-card animate-delay-1">
                <div class="edit-card-title"><i class="fas fa-info-circle"></i> Informacje podstawowe</div>
                <div class="form-grid">
                    ${renderStatusSelect(plane.status)}
                    ${renderField("Numer Tab.", "nrTab", plane.nrTab)}
                    ${renderField("Model samolotu", "samolot", plane.samolot, "text", "", modelOptions)}
                </div>
            </div>

            <div class="form-grid" style="grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));">
                
                <div class="edit-card animate-delay-2">
                    <div class="edit-card-title"><i class="fas fa-plane-departure"></i> Lot Główny</div>
                    <div class="form-grid">
                        ${renderField("Numer Lotu", "nrLotu", plane.nrLotu, "text", "full-width")}
                        ${renderTimeRow("Trasa", "odlot", plane.odlot, "przylot", plane.przylot)}
                    </div>
                </div>

                <div class="edit-card replacement-flight animate-delay-2">
                    <div class="edit-card-title"><i class="fas fa-exchange-alt"></i> Lot Zastępczy / Irregular</div>
                    <div class="form-grid">
                        ${renderField("Zastępczy za (Numer, data)", "zastepczyZa", plane.zastepczyZa)}
                        ${renderField("Nr Lotu Zastępczego", "nrLotuZast", plane.nrLotuZast)}
                        ${renderTimeRow("Trasa Zastępcza", "odlotZast", plane.odlotZast, "przylotZast", plane.przylotZast)}
                    </div>
                </div>
            </div>

            <div class="edit-card animate-delay-3">
                <div class="edit-card-title"><i class="fas fa-cogs"></i> Konfiguracja i Dane Techniczne</div>
                
                <label class="input-label" style="margin-bottom:5px; display:block;">Liczba miejsc:</label>
                <div class="form-grid form-grid-3" style="margin-bottom: 20px;">
                    ${renderField("Biznes", "miejscaBiznes", plane.miejscaBiznes, "number")}
                    ${renderField("Premium", "miejscaPremium", plane.miejscaPremium, "number")}
                    ${renderField("Ekonomiczna", "miejscaEkonomiczna", plane.miejscaEkonomiczna, "number")}
                </div>

                <div class="form-grid">
                    ${renderField("Typ", "typ", plane.typ, "text", "", typeOptions)}
                    ${renderField("Rok produkcji", "rokProdukcji", plane.rokProdukcji, "number")}
                    ${renderField("Silniki", "silniki", plane.silniki, "text", "", engineOptions)}
                    ${renderField("Ilość silników", "iloscSilnikow", plane.iloscSilnikow, "number")}
                </div>
            </div>

        </form>

        <div class="edit-actions animate-fade-in">
            <button id="btn-cancel-edit" class="btn-secondary-cancel">Anuluj zmiany</button>
            <button id="btn-save-edit" class="btn-primary-save"><i class="fas fa-save"></i> Zapisz dane</button>
        </div>
    `;

    // --- LISTENERY (Bez zmian w logice, tylko podpięcie) ---
    document.getElementById("btn-cancel-edit").addEventListener("click", () => exitEditMode(plane));
    
    document.getElementById("btn-save-edit").addEventListener("click", async (e) => {
        e.preventDefault();
        await saveChanges(plane);
    });
}

function exitEditMode(plane) {
    const tabsContainer = document.querySelector('.modal-tabs');
    if(tabsContainer) tabsContainer.style.display = 'flex';
    showPlaneModal(plane);
}

async function saveChanges(originalPlane) {
    const saveBtn = document.getElementById("btn-save-edit");
    const cancelBtn = document.getElementById("btn-cancel-edit");
    
    saveBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Zapisywanie...';
    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    const form = document.getElementById("edit-plane-form");
    const formData = new FormData(form);
    const updates = Object.fromEntries(formData.entries());

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'update', data: updates })
        });

        const result = await response.json();

        if (result.success) {
            const updatedPlane = { ...originalPlane, ...updates };
            // Aktualizacja stanu globalnego
            const idx = state.currentData.findIndex(p => p.rejestracja === updatedPlane.rejestracja);
            if (idx !== -1) state.currentData[idx] = updatedPlane;

            exitEditMode(updatedPlane);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert("Błąd zapisu: " + error.message);
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Zapisz dane';
        saveBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}