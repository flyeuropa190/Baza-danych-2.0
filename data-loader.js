import { fetchCommunicationsData } from './dataFetcher.js'; 

const CACHE_KEY_COMM = 'communications_data_v2'; // Zmieniłem klucz cache, aby wymusić odświeżenie struktury danych
const listContainer = document.getElementById('communications-list');
const statusContainer = document.getElementById('communications-status');
let lastKnownTimestamp = 0; 
const REFRESH_INTERVAL_MS = 10000;

// --- CACHE UTILS ---
function saveToCache(data, timestamp) {
    try { sessionStorage.setItem(CACHE_KEY_COMM, JSON.stringify({data, timestamp})); } catch(e){}
}
function loadFromCache() {
    try { return JSON.parse(sessionStorage.getItem(CACHE_KEY_COMM)); } catch(e){ return null; }
}



function parseDate(dateString) {
    if (!dateString) return null;
    let date;
    const parts = dateString.split(/[\/\.]/);

    if (parts.length === 3) {
        // Format DD.MM.YYYY
        // Używamy Date.UTC, aby tworzyć daty niezależne od strefy czasowej przeglądarki.
        // Tworzymy datę w formacie YYYY, MM-1, DD (Miesiące w JS są od 0)
        date = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
    } else {
        // Domyślny format YYYY-MM-DD lub inne
        date = new Date(dateString);
    }
    
    // Zabezpieczenie na wypadek błędnego parsowania
    if (isNaN(date)) {
        console.error(`Błąd parsowania daty: ${dateString}`);
        return null;
    }
    
    // Zwracamy datę o północy lokalnie, tak samo jak today
    date.setHours(0, 0, 0, 0); 
    return date;
}

/**
 * Zwraca aktualną datę bez składowej czasu (do porównania).
 * (Bez zmian, ale ważne, by była spójna z parseDate)
 */
function getTodayDateOnly() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
}

/**
 * Sprawdza, czy komunikat powinien być WYŚWIETLONY (widoczny)
 * na podstawie kolumn "Okres Wyświetlania" (DisplayStart, DisplayEnd).
 */
function isCommunicationActive(item) {
    const today = getTodayDateOnly();
    
    // Używamy nowych pól logicznych (Kolumny B i C z arkusza)
    const displayStart = parseDate(item.DisplayStart);
    const displayEnd = parseDate(item.DisplayEnd);
    
    // 1. Jeśli zdefiniowano Początek Wyświetlania i dzisiaj jest przed tą datą -> UKRYJ
    if (displayStart && today < displayStart) {
        return false; 
    }
    
    // 2. Jeśli zdefiniowano Koniec Wyświetlania i dzisiaj jest po tej dacie -> UKRYJ
    if (displayEnd && today > displayEnd) {
        return false;
    }

    // W przeciwnym razie wyświetl (mieści się w okresie lub brak dat granicznych)
    return true; 
}


/**
 * Mapuje kategorię komunikatu na klasę CSS.
 */
function getCategoryClass(category) {
    const cleanCategory = category ? category.toLowerCase().trim().replace(/\s+/g, '_') : 'default'; 

    switch (cleanCategory) {
        case 'test': return 'comm-test'; 
        case 'aktualizacja': return 'comm-aktualizacja'; 
        case 'techniczne': return 'comm-techniczne'; 
        case 'flota': return 'comm-flota'; 
        case 'ruch_lotniczy': return 'comm-ruch_lotniczy';            
        case 'pilne': return 'comm-pilne';  
        default: return 'comm-default'; 
    }
}

/**
 * Formatuje pojedynczy komunikat do postaci HTML.
 * Używa pól "Okres Obowiązywania" (ValidStart, ValidEnd) do wyświetlania tekstu użytkownikowi.
 */
function renderCommunicationItem(item) {
    const categoryClass = getCategoryClass(item.Kategoria);
    
    // Formatowanie daty widocznej dla użytkownika (Kolumny D i E)
    let okres = '';
    if (item.ValidStart) {
        if (item.ValidEnd) {
            okres = `Okres obowiązywania: ${item.ValidStart} – ${item.ValidEnd}`;
        } else {
            okres = `Obowiązuje od: ${item.ValidStart}`;
        }
    }

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

// // --- UI UPDATE ---
function updateUI(allData) {
    if (!listContainer) return; 

    // POPRAWKA: Sprawdź, czy allData istnieje i jest tablicą
    if (!allData || !Array.isArray(allData)) {
        console.warn('Brak poprawnych danych do wyświetlenia:', allData);
        if(statusContainer) {
            statusContainer.textContent = 'Brak danych do wyświetlenia.';
            statusContainer.classList.remove('hidden');
        }
        return;
    }

    // Filtrujemy dane
    const activeData = allData.filter(isCommunicationActive);
    
    if (activeData.length > 0) {
        listContainer.innerHTML = activeData.map(renderCommunicationItem).join('');
        if(statusContainer) {
            statusContainer.textContent = `Pomyślnie załadowano ${activeData.length} wiadomości.`;
            statusContainer.classList.add('hidden');
        }
    } else {
        listContainer.innerHTML = '';
        if(statusContainer) {
            statusContainer.textContent = 'Brak aktywnych komunikatów.';
            statusContainer.classList.remove('hidden');
        }
    }
}

async function checkAndUpdateData() {
    // 1. Cache
    const cached = loadFromCache();
    if (cached && cached.data && lastKnownTimestamp === 0) {
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
    setInterval(checkAndUpdateData, REFRESH_INTERVAL_MS);
    checkAndUpdateData(); 
});