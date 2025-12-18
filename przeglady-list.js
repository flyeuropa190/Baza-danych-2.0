/* przeglady-list.js */

/* --- STYLE STATUSÓW --- */
export const getStatusClass = (status) => {
    if (!status) return 'status-default';
    switch (status.toLowerCase().trim()) {
        case 'w trakcie': return 'status-in-progress';
        case 'zaplanowany': return 'status-planned';
        case 'wykonany': return 'status-completed';
        case 'przygotowany': return 'status-prepared';
        case 'anulowany': return 'status-cancelled';
        case 'przełożony': return 'status-postponed';
        case 'niewykonany': return 'status-unperformed';
        case 'problem': return 'status-problem';
        default: return 'status-default';
    }
};

export const getStatusPriority = (status) => {
    const s = status ? status.toLowerCase().trim() : '';
    if (s === 'problem') return 1;
    if (s === 'w trakcie') return 2;
    if (s === 'przygotowany') return 3;
    if (s === 'zaplanowany') return 4;
    if (s === 'przełożony') return 5;
    if (s === 'anulowany') return 6;
    if (s === 'wykonany') return 99;
    return 10;
};

/* --- NARZĘDZIA POMOCNICZE (DATY) --- */
export const parseDateToMidnight = (dateString) => {
    if (!dateString) return null;
    const parts = dateString.split(/[\/\.]/);
    if (parts.length === 3) {
        // Format DD.MM.YYYY
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    return null;
};

// Pobiera aktywne daty (uwzględniając zmiany/opóźnienia)
export const getActiveDates = (item) => {
    const startDateStr = (item['Data początkowa (po zmianie)'] && item['Data początkowa (po zmianie)'].trim() !== '') 
                         ? item['Data początkowa (po zmianie)'] 
                         : item['Data początkowa'];

    const endDateStr = (item['Data końcowa (po zmianie)'] && item['Data końcowa (po zmianie)'].trim() !== '') 
                       ? item['Data końcowa (po zmianie)'] 
                       : item['Data końcowa'];
    
    return {
        start: parseDateToMidnight(startDateStr),
        end: parseDateToMidnight(endDateStr),
        isRescheduled: !!item['Data początkowa (po zmianie)'] || !!item['Data końcowa (po zmianie)']
    };
};

/* --- RENDEROWANIE KARTY POJEDYNCZEGO PRZEGLĄDU --- */
const renderListCard = (item) => {
    const { start, end, isRescheduled } = getActiveDates(item);
    const statusClass = getStatusClass(item.Status);
    const typeClass = 'type-' + (item.Typ || '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    const dateDisplayStart = start ? start.toLocaleDateString('pl-PL') : '?';
    const dateDisplayEnd = end ? end.toLocaleDateString('pl-PL') : '?';
    
    const dateText = (start && end && start.getTime() === end.getTime()) 
                     ? dateDisplayStart 
                     : `${dateDisplayStart} – ${dateDisplayEnd}`;

    const rescheduledClass = isRescheduled ? 'is-rescheduled' : '';
    const delayInfo = (item.Opóźnienie && item.Opóźnienie !== '0') 
                      ? `<div style="font-size:0.75rem; color:#e74c3c; margin-top:5px;"><strong>Opóźnienie: ${item.Opóźnienie}</strong></div>` 
                      : '';

    // UWAGA: showInspectionDetails musi być dostępne globalnie (w window) w pliku głównym
    return `
        <div class="inspection-item ${statusClass} ${rescheduledClass}" data-id="${item.uniqueId}" onclick="showInspectionDetails(${item.uniqueId})">
            <div class="inspection-header">
                <p class="registration-info">
                    ${item.Rejestracja} <span style="font-weight:400; opacity:0.8;">(${item['Numer tab']})</span>
                </p>
                <span class="status-tag">${item.Status || 'Brak'}</span>
            </div>
            <div class="inspection-meta">
                <span class="type-tag ${typeClass}">${item.Typ || 'Inny'}</span>
                <span class="inspection-dates"><i class="far fa-calendar-alt"></i> ${dateText}</span>
            </div>
            ${delayInfo}
        </div>
    `;
};

/* --- LOGIKA ZWIJANIA SEKCJI (Musi być globalna dla onclick w HTML) --- */
window.toggleSection = (headerElement) => {
    const section = headerElement.parentElement;
    section.classList.toggle('collapsed');
};

/* --- GŁÓWNA FUNKCJA RENDERUJĄCA LISTĘ --- */
export const renderListView = (container, dataToRender) => {
    if (!container) return;
    container.innerHTML = '';

    // Sprawdzenie, czy przefiltrowane dane istnieją
    if (dataToRender.length === 0) {
        container.innerHTML = '<p class="no-data" style="text-align:center; padding:20px;">Brak danych do wyświetlenia, spróbuj zmienić filtry.</p>';
        return;
    }

    const groups = {};
    // Grupowanie po statusie
    dataToRender.forEach(item => {
        const rawStatus = item.Status ? item.Status.trim() : 'Inne';
        const statusKey = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();
        if (!groups[statusKey]) groups[statusKey] = [];
        groups[statusKey].push(item);
    });

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        return getStatusPriority(a) - getStatusPriority(b);
    });

    sortedKeys.forEach(status => {
        const items = groups[status];
        
        // Sortowanie wewnątrz grupy po dacie
        items.sort((a, b) => {
            const dateA = getActiveDates(a).start || new Date(2099,0,1);
            const dateB = getActiveDates(b).start || new Date(2099,0,1);
            return dateB - dateA;
        });

        const isCompleted = status.toLowerCase() === 'wykonany';
        const initialClass = isCompleted ? 'status-section collapsed' : 'status-section';
        
        const section = document.createElement('div');
        section.className = initialClass;
        
        section.innerHTML = `
            <h3 class="status-group-header" onclick="toggleSection(this)">
                <span>${status} <span class="group-count">${items.length}</span></span>
                <i class="fas fa-chevron-down"></i>
            </h3>
            <div class="status-group-list">
                ${items.map(item => renderListCard(item)).join('')}
            </div>
        `;
        container.appendChild(section);
    });
};