/**
 * Moduł do pobierania danych o przeglądach.
 * * Zastąp AKfycb... NOWYM adresem URL wdrożenia dla przeglądów.
 */
// PRZYKŁADOWY URL - ZMIEŃ NA NOWY URL DLA PRZEGLĄDÓW PLANOWANYCH
const API_URL_INSPECTIONS = 'https://script.google.com/macros/s/AKfycbxJ5kq9FatOB08f_saEUWLV2_wmZOi-Hrprmh8ARS5-qGwP5z05Pu1q5zEXPtXuxJU1Tw/exec'; 

/**
 * Pobiera dane o przeglądach i znacznik czasowy.
 * @returns {Promise<Object>} Obiekt zawierający {data: Array, timestamp: Number}.
 */
export async function fetchInspectionsData() {
    try {
        const response = await fetch(API_URL_INSPECTIONS);

        if (!response.ok) {
            throw new Error(`Błąd HTTP! Status: ${response.status}. Sprawdź URL wdrożenia przeglądów.`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Błąd serwera Apps Script (Przeglądy): ${result.error}`);
        }

        return result; 
        
    } catch (error) {
        console.error('Błąd w inspections-fetcher:', error.message);
        return { data: [], timestamp: 0 }; 
    }
}