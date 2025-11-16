/**
 * Moduł do pobierania danych i znacznika czasowego z Google Apps Script API.
 * * Zastąp AKfycb... swoim aktualnym URL wdrożenia.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbxLtv6MvaLRvB_C69KC5TtYpcsgJoWMldH7xQ92A_h57YWHdt4mG2q6ptDBT3ZPNqfo1g/exec';

/**
 * Pobiera dane komunikacyjne i znacznik czasowy z Google Sheet.
 * @returns {Promise<Object>} Obiekt zawierający {data: Array, timestamp: Number}.
 */
export async function fetchCommunicationsData() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error(`Błąd HTTP! Status: ${response.status}. Sprawdź, czy URL wdrożenia jest poprawny.`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Błąd serwera Apps Script: ${result.error}`);
        }

        return result; 
        
    } catch (error) {
        console.error('Błąd w dataFetcher:', error.message);
        // Zwróć pusty obiekt, aby aplikacja się nie zawiesiła
        return { data: [], timestamp: 0 }; 
    }
}