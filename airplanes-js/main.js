import { REFRESH_INTERVAL } from './config.js';
import { state, resetFilters } from './state.js';
// --- ZMIANA: Dodano import getCachedData ---
import { loadAllData, getCachedData } from './api.js'; 
import { filterAndSortData } from './logic.js';
import { renderAirplanes, renderMaintenanceAlerts, populateFilterOptions, setView } from './ui.js';
import { refreshOpenModalIfNeeds } from './modal.js'; // Import z nowego pliku

// --- Funkcja do czytania URL ---
function checkUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const searchTerm = params.get('search');

    if (searchTerm) {
        const searchInput = document.getElementById("search-input");
        if (searchInput) {
            searchInput.value = searchTerm;
            state.activeFilters.term = searchTerm.toLowerCase();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Setup UI (Sortowanie)
    const sortSelect = document.getElementById("sort-by");
    if (sortSelect) {
        const defaultOption = document.createElement("option");
        defaultOption.value = "default";
        defaultOption.textContent = "Nie sortuj";
        sortSelect.insertBefore(defaultOption, sortSelect.firstChild);
        sortSelect.value = state.currentSortField; 
    }

    setupEventListeners();

    // --- ZMIANA: Strategia Cache-First (Wewnątrz DOMContentLoaded) ---
    const cachedData = getCachedData();
    const loader = document.getElementById("loader");

    if (cachedData && cachedData.length > 0) {
        console.log("Flota: Znaleziono dane w cache. Wyświetlam natychmiast.");
        
        // Ukryj loader natychmiast
        if (loader) loader.style.display = "none";
        
        // Załaduj dane do stanu i wyrenderuj (true = inicjalne ładowanie z cache)
        processNewData(cachedData, true); 
        
        // Oznaczamy, że pierwsze ładowanie mamy za sobą, 
        // żeby executeRefreshCycle nie pokazał loadera ponownie przy pobieraniu sieciowym
        state.isFirstLoad = false;
    }

    // 2. Uruchom cykl odświeżania (pobierze świeże dane z sieci w tle)
    await executeRefreshCycle();
    setInterval(executeRefreshCycle, REFRESH_INTERVAL);
});

// --- Funkcja pomocnicza: processNewData ---
function processNewData(data, isInitial = false) {
    const newDataHash = JSON.stringify(data);
    
    // Jeśli dane są identyczne jak ostatnio i to nie jest inicjalizacja, nic nie rób
    if (newDataHash === state.lastDataHash && !isInitial) return;

    console.log("Aktualizacja danych w UI...");
    state.lastDataHash = newDataHash;
    state.currentData = data;
    
    renderMaintenanceAlerts();
    populateFilterOptions();
    
    if (state.isFirstLoad || isInitial) {
        checkUrlParams();
        // Jeśli to było ładowanie z cache (isInitial=true), to nie resetujemy tutaj flagi globalnej,
        // robi to logika w DOMContentLoaded. Jeśli to load sieciowy, resetujemy.
        if (!isInitial) state.isFirstLoad = false; 
    }
            
    refreshOpenModalIfNeeds();
    runAppLogic();
}

async function executeRefreshCycle() {
    const loader = document.getElementById("loader");
    
    // Pokaż loader tylko jeśli to pierwsze ładowanie I NIE mieliśmy cache
    if (state.isFirstLoad && loader) loader.style.display = "block";

    try {
        // To pobierze z sieci I zapisze do cache (dzięki logice w api.js)
        const mergedData = await loadAllData();
        
        if (state.isFirstLoad && loader) {
            loader.style.display = "none";            
        }

        processNewData(mergedData);

    } catch (error) {
        console.error("Critical error in refresh cycle:", error);
        // Jeśli błąd sieci, a mamy stare dane w UI (z cache), to ukrywamy loader, by użytkownik widział dane
        if (state.isFirstLoad && loader) loader.style.display = "none"; 
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

    const showEmpty = document.getElementById("show-empty");
    if(showEmpty) showEmpty.addEventListener("change", runAppLogic);
    
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
        ['filter-type', 'filter-status', 'filter-origin', 'filter-dest', 'filter-year', 'filter-engine'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = "";
        });
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