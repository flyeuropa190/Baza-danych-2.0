import { REFRESH_INTERVAL } from './config.js';
import { state, resetFilters } from './state.js';
import { loadAllData } from './api.js';
import { filterAndSortData } from './logic.js';
import { renderAirplanes, renderMaintenanceAlerts, populateFilterOptions, setView, refreshOpenModalIfNeeds } from './ui.js';

// --- ZMIANA 1: Nowa funkcja do czytania URL ---
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('search');

    if (searchTerm) {
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
            // Wpisz wartość do inputa i zaktualizuj stan filtrów
            searchInput.value = searchTerm;
            state.activeFilters.term = searchTerm.toLowerCase();
            
            // Opcjonalnie: wyczyść URL żeby nie "wisiał" przy odświeżaniu (jeśli chcesz)
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // Dodanie opcji "Nie sortuj" i ustawienie jej jako aktywnej
    const sortSelect = document.getElementById("sort-by");
    if (sortSelect) {
        const defaultOption = document.createElement("option");
        defaultOption.value = "default";
        defaultOption.textContent = "Nie sortuj";
        sortSelect.insertBefore(defaultOption, sortSelect.firstChild);
        
        // ZMIANA TUTAJ: Wymuszenie wyboru opcji domyślnej w UI zgodnie ze stanem
        sortSelect.value = state.currentSortField; 
    }

    setupEventListeners();
    await executeRefreshCycle();
    setInterval(executeRefreshCycle, REFRESH_INTERVAL);
});

async function executeRefreshCycle() {
    const loader = document.getElementById("loader");
    if (state.isFirstLoad) loader.style.display = "block";

    try {
        const mergedData = await loadAllData();
        
        if (state.isFirstLoad) {
            loader.style.display = "none";            
        }

        const newDataHash = JSON.stringify(mergedData);
        if (newDataHash === state.lastDataHash) return;

        state.lastDataHash = newDataHash;
        state.currentData = mergedData;
        
        renderMaintenanceAlerts();
        populateFilterOptions();
        
        // --- DODANO: Sprawdzenie URL tylko przy pierwszym ładowaniu danych ---
        if (state.isFirstLoad) {
            checkUrlParams();
            state.isFirstLoad = false; // Ustawiamy na false dopiero po sprawdzeniu URL
        }
                
        refreshOpenModalIfNeeds();
        runAppLogic();

    } catch (error) {
        console.error("Critical error:", error);
    }
}

function runAppLogic() {
    state.filteredData = filterAndSortData();
    renderAirplanes(false); // false = nie wymuszaj animacji ponownej
}

function setupEventListeners() {
    // 1. Wyszukiwarka
    document.getElementById("search-input").addEventListener("input", (e) => {
        state.activeFilters.term = e.target.value.toLowerCase();
        runAppLogic();
    });

    document.getElementById("show-empty").addEventListener("change", runAppLogic);
    
    // 2. Grupowanie
    document.getElementById("group-by").addEventListener("change", () => {
        state.expandedGroups.clear();
        renderAirplanes(true);
    });

    // 3. Sortowanie
    document.getElementById("sort-by").addEventListener("change", (e) => {
        state.currentSortField = e.target.value;
        runAppLogic();
    });

    document.getElementById("sort-order-btn").addEventListener("click", () => {
        const btn = document.getElementById("sort-order-btn");
        const icon = btn.querySelector("i");
        
        if (state.currentSortOrder === 'asc') {
            state.currentSortOrder = 'desc';
            icon.className = "fas fa-sort-alpha-up";
        } else {
            state.currentSortOrder = 'asc';
            icon.className = "fas fa-sort-alpha-down";
        }
        runAppLogic();
    });

    // 4. Widok
    document.getElementById("view-grid").onclick = () => setView('grid');
    document.getElementById("view-list").onclick = () => setView('list');

    // 5. Obsługa Modali (Filtry)
    setupFilterModalListeners();
    
    // 6. Zamykanie modali
    setupGlobalModalClosers();
}

function setupFilterModalListeners() {
    const filterModal = document.getElementById("filters-modal");
    
    document.getElementById("btn-open-filters").onclick = () => {
        populateFilterOptions();
        filterModal.style.display = "block";
    };
    
    document.querySelector(".close-filter-modal").onclick = () => filterModal.style.display = "none";
    
    document.getElementById("btn-apply-filters").onclick = () => {
        const f = state.activeFilters;
        f.type = document.getElementById("filter-type").value;
        f.status = document.getElementById("filter-status").value;
        f.origin = document.getElementById("filter-origin").value;
        f.dest = document.getElementById("filter-dest").value;
        f.year = document.getElementById("filter-year").value;
        f.engine = document.getElementById("filter-engine").value;
        f.checksOnly = document.getElementById("filter-checks-only").checked;
        
        const missingDataCheckbox = document.getElementById("filter-missing-data");
        if (missingDataCheckbox) {
            f.missingData = missingDataCheckbox.checked;
        }

        filterModal.style.display = "none";
        runAppLogic();
    };

    document.getElementById("btn-clear-filters").onclick = () => {
        ['filter-type', 'filter-status', 'filter-origin', 'filter-dest', 'filter-year', 'filter-engine'].forEach(id => document.getElementById(id).value = "");
        document.getElementById("filter-checks-only").checked = false;
        const missing = document.getElementById("filter-missing-data");
        if (missing) missing.checked = false;
        
        resetFilters();
        filterModal.style.display = "none";
        runAppLogic();
    };
}

function setupGlobalModalClosers() {
    const planeModal = document.getElementById("plane-modal");
    const filterModal = document.getElementById("filters-modal");

    document.querySelector(".close-modal").onclick = () => planeModal.style.display = "none";
    window.onclick = (e) => {
        if (e.target === filterModal) filterModal.style.display = "none";
        if (e.target === planeModal) planeModal.style.display = "none";
    };
}