export const state = {
    currentData: [],
    lastDataHash: "",
    filteredData: [],
    expandedGroups: new Set(),
    currentView: 'grid',
    isFirstLoad: true,
    
    // Nowe: śledzenie otwartego modala
    openPlaneReg: null,

    // Sortowanie
    currentSortField: 'rejestracja',
    currentSortOrder: 'asc',

    // Filtry
    activeFilters: {
        term: '',
        type: '',
        status: '',
        origin: '',
        dest: '',
        year: '',
        engine: '',
        checksOnly: false,
        missingData: false
    }
};

export function resetFilters() {
    state.activeFilters = {
        term: '',
        type: '',
        status: '',
        origin: '',
        dest: '',
        year: '',
        engine: '',
        checksOnly: false,
        missingData: false
    };
}