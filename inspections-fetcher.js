
// inspectionsFetcher.js
const API_URL = 'https://script.google.com/macros/s/AKfycbzyCWJ-v9XVXDZ2Tp3MrNPnz1lAjUgx8-O9mns2_1mTLYkAeT7n4dq8vPcafRGe2qrvSw/exec';

export async function fetchInspectionsData() {
    // Dodanie parametru 'type=inspections'
    const ROUTED_URL = `${API_URL}?type=inspections`; 

    try {
        const response = await fetch(ROUTED_URL);
        // ... (reszta logiki jest taka sama jak w dataFetcher.js)
        // ...
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(`Błąd serwera Apps Script: ${result.error}`);
        }

        return result; 
        
    } catch (error) {
        console.error('Błąd w inspectionsFetcher:', error.message);
        return { data: [], timestamp: 0 }; 
    }
}