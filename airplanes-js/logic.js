import { state } from './state.js';

export function filterAndSortData() {
    const showEmpty = document.getElementById("show-empty").checked;

    let data = state.currentData.filter(plane => {
        // 1. Check "pustych"
        if (!showEmpty) {
            const hasData = plane.samolot || plane.status || plane.nrLotu || plane.odlot || plane.typ;
            if (!hasData) return false;
        }

        // 2. Multi-search (NOWE)
        if (state.activeFilters.term) {
            // Rozdzielamy po przecinku i usuwamy białe znaki
            const searchTerms = state.activeFilters.term.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
            const combinedString = [plane.rejestracja, plane.samolot, plane.status, plane.typ].join(' ').toLowerCase();
            
            // Jeśli żaden z wpisanych terminów nie pasuje -> odrzuć
            // Używamy .some() -> wystarczy, że jeden z terminów pasuje (logika LUB)
            const match = searchTerms.some(term => combinedString.includes(term));
            if (!match) return false;
        }

        // 3. Standardowe filtry
        const f = state.activeFilters;
        if (f.type && plane.typ !== f.type) return false;
        if (f.status && plane.status !== f.status) return false;
        if (f.origin && plane.odlot !== f.origin) return false;
        if (f.dest && plane.przylot !== f.dest) return false;
        if (f.engine && plane.silniki !== f.engine) return false;
        if (f.year && plane.rokProdukcji != f.year) return false;
        if (f.checksOnly && !(plane.bCheck || plane.cCheck || plane.dCheck)) return false;

        if (f.missingData) {
            const isMissing = !plane.typ || !plane.rejestracja || !plane.status || !plane.samolot;
            if (!isMissing) return false;
        }

        return true;
    });

    // 4. Sortowanie listy płaskiej
    // Jeśli wybrano "default" (brak sortowania), pomijamy ten krok
    if (state.currentSortField !== 'default') {
        data.sort((a, b) => {
            let valA = (a[state.currentSortField] || "").toString().toLowerCase();
            let valB = (b[state.currentSortField] || "").toString().toLowerCase();

            const numA = parseFloat(valA);
            const numB = parseFloat(valB);
            
            if (!isNaN(numA) && !isNaN(numB) && valA == numA && valB == numB) {
                valA = numA;
                valB = numB;
            }

            if (valA < valB) return state.currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return state.currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return data;
}