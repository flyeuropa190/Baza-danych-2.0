/**
 * Moduł do pobierania danych i znacznika czasowego z Google Apps Script API.
 * UWAGA: Ten sam API_URL będzie używany dla wszystkich typów danych, ale z różnymi parametrami.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbzyCWJ-v9XVXDZ2Tp3MrNPnz1lAjUgx8-O9mns2_1mTLYkAeT7n4dq8vPcafRGe2qrvSw/exec';

/**
 * Pobiera dane komunikacyjne i znacznik czasowy z Google Sheet używając routera.
 * @returns {Promise<Object>} Obiekt zawierający {data: Array, timestamp: Number}.
 */
export async function fetchCommunicationsData() {
    // Dodanie parametru 'type=communications' do URL, aby router GAS wiedział, którą funkcję wywołać
    const ROUTED_URL = `${API_URL}?type=communications`; 

    try {
        const response = await fetch(ROUTED_URL); // Użycie ROUTED_URL

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
        return { data: [], timestamp: 0 }; 
    }
}