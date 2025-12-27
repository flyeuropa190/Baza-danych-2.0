
// inspectionsFetcher.js
const API_URL = 'https://script.google.com/macros/s/AKfycbzLBUCIOdCG27tQgunmZ3jYv4G069P9Un3-d50EyHtNHBY3MPsqN7X2yGRwyTlF7-UGHg/exec';

export async function fetchInspectionsData() {
    // Dodanie parametru 'type=inspections'
    const ROUTED_URL = `${API_URL}?type=inspections`; 

    try {
        const response = await fetch(ROUTED_URL);

            if (!response.ok) {
        throw new Error(`Błąd HTTP! Status: ${response.status}. Sprawdź, czy URL wdrożenia jest poprawny.`);
        }
        
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