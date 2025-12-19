// utils.js

export function groupBy(array, key) {
    return array.reduce((result, currentValue) => {
        const groupKey = currentValue[key] || "Brak danych";
        (result[groupKey] = result[groupKey] || []).push(currentValue);
        return result;
    }, {});
}

export function getStatusClass(status) {
    if (!status) return "status-unknown";
    const s = status.toLowerCase();
    if (s.includes("dostępny")) return "status-dostepny";
    if (s.includes("uziemiony")) return "status-uziemiony";
    if (s.includes("zaparkowany")) return "status-zaparkowany";
    if (s.includes("zamówiony")) return "status-zamowiony";
    if (s.includes("awaria")) return "status-awaria";
    if (s.includes("nieczynny")) return "status-nieczynny";
    if (s.includes("zastępczy")) return "status-zastepczy";
    if (s.includes("przegląd")) return "status-przeglad";
    if (s.includes("naprawa")) return "status-naprawa";
    if (s.includes("odstawienia")) return "status-odstawienie";
    if (s.includes("delegacja")) return "status-delegacja";
    return "status-unknown";
}

export function getCheckStatusClass(isExpired, dateValue) {
    if (isExpired) return 'check-alert';
    if (!dateValue || dateValue === "") return 'check-warning';
    return 'check-ok';
}