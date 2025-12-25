// home-prefetch.js
import { loadAllData } from './airplanes-js/api.js';

/**
 * Ten skrypt uruchamia się na Stronie Głównej.
 * Jego celem jest "rozgrzanie" cache'u (pre-fetching) dla strony Floty via api.js.
 */
document.addEventListener("DOMContentLoaded", () => {
    // Sprawdź, czy dane są już w cache i czy są świeże (opcjonalne, ale oszczędza transfer)
    // Jeśli nie zależy Ci na limicie zapytań Google, możesz pominąć sprawdzanie czasu.
    
    console.log("🚀 Strona Główna: Rozpoczynam pobieranie danych Floty w tle...");

    // Wywołujemy funkcję, która normalnie zasila stronę Floty.
    // Dzięki modyfikacji w api.js, funkcja ta zapisze wynik w sessionStorage.
    loadAllData()
        .then(() => {
            console.log("✅ Strona Główna: Dane Floty pobrane i zapisane w pamięci.");
        })
        .catch(err => {
            console.warn("⚠️ Strona Główna: Nie udało się pobrać danych w tle (to nie krytyczne):", err);
        });
});