// airplanes-fetcher.js

/**
 * Moduł do pobierania danych o samolotach i znacznika czasowego z Google Apps Script API.
 */
const API_URL = 'https://script.google.com/macros/s/AKfycbzoZ32PygRR_DgiZYNF5JlFP9Z9TMINxXsdjwxspmvVICWjMCEDe39N3NFGBeNNpsbpMQ/exec';

/**
 * Pobiera dane samolotów i znacznik czasowy z Google Sheet używając routera.
 * @returns {Promise<Object>} Obiekt zawierający {data: Array, timestamp: Number}.
 */
export async function fetchAirplanesData() {
    // Dodanie parametru 'type=airplanes' do URL
    const ROUTED_URL = `${API_URL}?type=airplanes`;

    try {
        const response = await fetch(ROUTED_URL);

        if (!response.ok) {
            throw new Error(`Błąd HTTP! Status: ${response.status}. Sprawdź URL wdrożenia.`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(`Błąd serwera Apps Script: ${result.error}`);
        }

        // Zwracamy wynik w formacie { data: [...], timestamp: 12345... }
        return result;

    } catch (error) {
        console.error("Błąd pobierania danych samolotów:", error.message);
        // W razie błędu zwracamy puste dane i timestamp 0, aby nie "wywalić" aplikacji
        return { data: [], timestamp: 0 };
    }
}