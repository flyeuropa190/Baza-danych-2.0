import { fetchCommunicationsData } from './dataFetcher.js'; 

const CACHE_KEY_COMM = 'communications_data_v1';
const listContainer = document.getElementById('communications-list');
const statusContainer = document.getElementById('communications-status');
let lastKnownTimestamp = 0; 
const REFRESH_INTERVAL_MS = 15000;

// --- CACHE UTILS ---
function saveToCache(data, timestamp) {
    try { sessionStorage.setItem(CACHE_KEY_COMM, JSON.stringify({data, timestamp})); } catch(e){}
}
function loadFromCache() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY_COMM)); } catch(e){ return null; }
}

/**
 * Zwraca aktualną datę bez składowej czasu (do porównania).
 * @returns {Date} Data ustawiona na północ.
 */
function getTodayDateOnly() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Sprawdza, czy komunikat jest aktywny na podstawie dat Poczatek i Koniec.
 * @param {Object} item - Obiekt komunikatu.
 * @returns {boolean} True, jeśli komunikat jest aktywny.
 */
function isCommunicationActive(item) {
    const today = getTodayDateOnly();
    
    // Używamy Date.parse, aby upewnić się, że daty są w formacie YYYY-MM-DD
    // Jeśli daty są w formacie DD/MM/YYYY, należy zamienić je na MM/DD/YYYY lub użyć biblioteki.
    // Zakładamy, że format z GAS jest parsowalny (np. YYYY-MM-DD lub DD.MM.YYYY).
    // Jeśli daty mają postać DD/MM/YYYY, musimy je najpierw przetworzyć:
    const parseDate = (dateString) => {
        if (!dateString) return null;
        // Założenie, że daty z GAS są w formacie polskim DD/MM/YYYY lub DD.MM.YYYY
        const parts = dateString.split(/[\/\.]/);
        if (parts.length === 3) {
            // Zamiana na format YYYY-MM-DD dla poprawnego parsowania w JS
            return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(dateString); // W przypadku innych formatów
    };

    const startDate = parseDate(item.Poczatek);
    const endDate = parseDate(item.Koniec);
    
    // 1. Sprawdzenie daty POczątku
    if (startDate && startDate > today) {
        // Jeśli aktualna data jest WCZEŚNIEJSZA niż POCZĄTEK, komunikat jest wyświetlany.
        // Zgodnie z żądaniem: "jeżeli aktualna data jest wcześniejsza niż Poczatek to wyśweitlaj komunikat"
        // Zazwyczaj oznacza to, że chcemy go wyświetlić PRZED startem. Zostawiam tę logikę zgodnie z poleceniem.
        return true; 
    }
    
    // 2. Sprawdzenie daty KOŃCA
    if (endDate && endDate < today) {
        // Jeżeli aktualna data jest PÓŹNIEJSZA niż KONIEC, nie wyświetlaj komunikatu
        return false;
    }

    // Domyślna logika: wyświetlaj, jeśli data Koniec nie minęła LUB nie jest zdefiniowana.
    // Jeśli nie ma daty Poczatek, i data Koniec nie minęła - wyświetlaj.
    return true; 
}


/**
 * Mapuje kategorię komunikatu na klasę CSS dla kolorowania.
 * @param {string} category 
 * @returns {string} Klasa CSS
 */
function getCategoryClass(category) {
    // Wyczyść i zamień spacje na podkreślniki dla bezpiecznej nazwy klasy CSS
    const cleanCategory = category.toLowerCase().trim().replace(/\s+/g, '_'); 

    switch (cleanCategory) {
        case 'test':
            return 'comm-test'; 
        case 'aktualizacja':
            return 'comm-aktualizacja'; 
        case 'techniczne':
            return 'comm-techniczne'; 
        case 'flota':
            return 'comm-flota'; 
        case 'ruch_lotniczy':
            return 'comm-ruch_lotniczy';            
        case 'pilne':
            return 'comm-pilne';  
        default:
            return 'comm-default'; 
    }
}

/**
 * Formatuje pojedynczy komunikat do postaci HTML.
 * @param {Object} item - Obiekt komunikatu z serwera.
 */
function renderCommunicationItem(item) {
    const categoryClass = getCategoryClass(item.Kategoria);
    
    // 1. Formatowanie daty Poczatek i Koniec
    let okres = '';
    if (item.Poczatek) {
        if (item.Koniec) {
            // Poczatek - Koniec
            okres = `Okres obowiązywania: ${item.Poczatek} – ${item.Koniec}`;
        } else {
            // Tylko Poczatek (bez myślnika)
            okres = `Obowiązuje od: ${item.Poczatek}`;
        }
    }

    // 2. Formatowanie DataKomunikatu jako mały tekst
    const dataKomunikatuHTML = item.DataKomunikatu 
        ? `<span class="comm-data-komunikatu">(${item.DataKomunikatu})</span>` 
        : '';


    return `
        <div class="communication-item ${categoryClass}">
            <div class="comm-header">
                <i class="fas fa-bell comm-icon"></i>
                <h3 class="comm-title">${item.Naglowek} ${dataKomunikatuHTML}</h3>
            </div>
            <p class="comm-meta">
                <span class="comm-category">${item.Kategoria}</span> 
                <span class="comm-dates">${okres}</span>
            </p>
            <p class="comm-content">${item.Tresc}</p>
        </div>
    `;
}

/**
 * Główna funkcja aktualizująca UI.
 * @param {Array} allData - Tablica wszystkich komunikatów.
 */
// --- UI UPDATE ---
function updateUI(allData) {
    if (!listContainer) return; // Zabezpieczenie dla strony logowania

    const activeData = allData.filter(isCommunicationActive);
    
    if (activeData.length > 0) {
        listContainer.innerHTML = activeData.map(renderCommunicationItem).join('');
        if(statusContainer) {
            statusContainer.textContent = `Pomyślnie załadowano ${activeData.length} aktywnych komunikatów.`;
            statusContainer.classList.add('hidden');
        }
    } else {
        listContainer.innerHTML = '';
        if(statusContainer) {
            statusContainer.textContent = 'Brak aktywnych komunikatów do wyświetlenia.';
            statusContainer.classList.remove('hidden');
        }
    }
}

async function checkAndUpdateData() {
    // 1. Cache
    const cached = loadFromCache();
    if (cached && lastKnownTimestamp === 0) {
        // console.log("[Data Fetch] 📂 Cache loaded");
        lastKnownTimestamp = cached.timestamp;
        updateUI(cached.data);
    }

    // 2. Network
    const result = await fetchCommunicationsData();
    
    if (result.error) {
        if(statusContainer) {
            statusContainer.textContent = `Błąd: ${result.error}`;
            statusContainer.classList.remove('hidden');
        }
        return;
    }

    if (result.timestamp > lastKnownTimestamp || lastKnownTimestamp === 0) {
        console.log(`[Data Fetch] New Data: ${result.timestamp}`);
        lastKnownTimestamp = result.timestamp;
        saveToCache(result.data, result.timestamp);
        updateUI(result.data);
    } 
}

document.addEventListener('DOMContentLoaded', () => {
    // Uruchomienie pętli Pollingu
    setInterval(checkAndUpdateData, REFRESH_INTERVAL_MS);
    
    // Pierwsze pobranie danych przy ładowaniu strony
    checkAndUpdateData(); 
});