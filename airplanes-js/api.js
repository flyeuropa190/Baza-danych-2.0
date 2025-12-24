// api.js
import { fetchAirplanesData } from './airplanes-fetcher.js';
import { API_URL_BASE } from './config.js';

const CACHE_KEY = 'FLEET_DATA_CACHE';
const CACHE_TIMESTAMP_KEY = 'FLEET_DATA_TIMESTAMP';

// --- Istniejące funkcje pomocnicze (bez zmian) ---
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

// --- NOWE: Funkcje obsługi Cache ---

export function getCachedData() {
    const cached = sessionStorage.getItem(CACHE_KEY);
    if (cached) {
        try {
            return JSON.parse(cached);
        } catch (e) {
            console.error("Błąd parsowania cache:", e);
            return null;
        }
    }
    return null;
}

export async function loadAllData() {
    // 1. Pobierz świeże dane
    const [planesResult, maintenanceList] = await Promise.all([
        fetchAirplanesData(),
        fetchMaintenanceData()
    ]);

    if (planesResult && !planesResult.error) {
        // 2. Scal dane
        const mergedData = mergeMaintenanceData(planesResult.data, maintenanceList);
        
        // 3. ZAPISZ DO CACHE (Session Storage)
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify(mergedData));
            sessionStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
            console.log("Dane zaktualizowane w cache.");
        } catch (e) {
            console.warn("Nie udało się zapisać do sessionStorage (może być pełny):", e);
        }

        return mergedData;
    }
    throw new Error("Błąd pobierania danych samolotów");
}