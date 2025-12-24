/**
 * print-utils.js
 * Generator raportów - TYLKO DRUK (Ctrl+P)
 * Wersja zaktualizowana: Stopka na każdej stronie (position: fixed)
 */

export function printReport(planeReg, data) {
    const printWin = window.open('', '_blank');
    
    if (!printWin) {
        alert("Zezwól na otwieranie okien pop-up, aby wydrukować raport.");
        return;
    }

    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Raport ${planeReg}</title>
            <style>
                ${getReportStyles()}
                @media print {
                    @page { 
                        margin: 10mm; 
                        margin-bottom: 15mm; /* Zwiększony margines dolny dla stopki */
                    }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            ${getReportHTMLContent(planeReg, data)}
            <script>
                window.onload = () => { 
                    setTimeout(() => { 
                        window.print(); 
                    }, 500); 
                };
            </script>
        </body>
        </html>
    `);
    printWin.document.close();
}

// --- STYLE CSS ---
function getReportStyles() {
    return `
        @import url('https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        body { 
            font-family: 'Lexend', sans-serif; 
            color: #1a1a1a; 
            margin: 0; padding: 0; 
            font-size: 10px; 
            background: #fff; line-height: 1.3;
            /* Ważne: padding dolny, aby ostatnia karta nie wjechała pod stopkę */
            padding-bottom: 30px; 
        }
        
        .page-container { width: 100%; max-width: 100%; padding: 0 15px; }

        /* HEADER */
        .report-header { 
            display: flex; justify-content: space-between; align-items: flex-end; 
            border-bottom: 3px solid #9900ff; padding-bottom: 15px; margin-bottom: 25px; 
        }
        .logo-area { display: flex; align-items: center; gap: 15px; }
        .logo-area img { height: 45px; width: auto; }
        .system-info h1 { margin: 0; font-size: 18px; color: #9900ff; text-transform: uppercase; }
        .system-info .sub { font-size: 10px; color: #666; font-weight: 500; }
        .meta-area { text-align: right; font-size: 9px; color: #444; }

        .inspections-list { display: flex; flex-direction: column; gap: 15px; }

        /* KARTA */
        .card {
            border: 1px solid #e5e7eb;
            background: #fff;
            position: relative;
            page-break-inside: avoid;
            break-inside: avoid;
        }

        .card::before {
            content: ''; position: absolute; top: 0; left: 0; bottom: 0; width: 4px; 
            background: #7f8c8d; /* Default */
        }

        /* KOLORY STATUSÓW (Pasek boczny) */
        .card.st-wtrakcie::before    { background: #3498db; }
        .card.st-planowany::before   { background: #bdc3c7; }
        .card.st-wykonany::before    { background: #2ecc71; }
        .card.st-przygotowany::before{ background: #9b59b6; }
        .card.st-problem::before     { background: #c0392b; }
        .card.st-przelozony::before  { background: #f39c12; }
        .card.st-default::before     { background: #7f8c8d; }

        .card-header {
            background: #f9fafb; padding: 8px 12px 8px 16px; border-bottom: 1px solid #e5e7eb;
            display: flex; justify-content: space-between; align-items: center;
        }
        
        /* TYTUŁ I JEGO KOLORY TYPÓW */
        .card-title { font-weight: 700; font-size: 11px; }
        
        .type-b { color: #2c3e50; }
        .type-c { color: #27ae60; }
        .type-d { color: #e74c3c; }
        .type-def { color: #95a5a6; }

        .card-status { 
            font-size: 9px; font-weight: 700; text-transform: uppercase; 
            padding: 2px 8px; border-radius: 4px; color: #fff;
        }
        
        /* BADGE KOLORY */
        .badge-wtrakcie    { background: #3498db; }
        .badge-planowany   { background: #bdc3c7; color: #444; }
        .badge-wykonany    { background: #2ecc71; }
        .badge-przygotowany{ background: #9b59b6; }
        .badge-problem     { background: #c0392b; }
        .badge-przelozony  { background: #f39c12; }
        .badge-default     { background: #7f8c8d; }

        .card-body { padding: 5px 16px; }

        /* GRID DANYCH */
        .data-grid-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            padding: 8px 0;
            border-bottom: 1px dashed #f3f4f6;
        }
        .data-grid-row:last-child { border-bottom: none; }

        .data-grid-full { display: block; padding: 8px 0; }

        .field-box label {
            display: block; font-size: 8px; color: #6b7280; text-transform: uppercase; margin-bottom: 2px;
        }
        .field-box span {
            display: block; font-size: 10px; font-weight: 500; color: #1f2937; word-wrap: break-word; 
        }

        .val-changed { color: #9900ff !important; font-weight: 700 !important; }
        .val-delay { color: #c0392b !important; font-weight: 700 !important; }

        /* STOPKA - FIXED NA KAŻDEJ STRONIE */
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            width: 100%;
            height: 30px; /* Wysokość zarezerwowana dla stopki */
            
            background: #fff; /* Tło żeby tekst nie przebijał pod spodem */
            border-top: 1px solid #e5e7eb;
            
            display: flex;
            align-items: center;
            justify-content: center;
            
            font-size: 8px; 
            color: #9ca3af;
            z-index: 1000;
        }
    `;
}

// --- GENERATOR HTML ---
function getReportHTMLContent(planeReg, filteredData) {
    const now = new Date();
    const fmtBool = (val) => (val === true || val === 'TRUE' || val === '1') ? '<b style="color:#2ecc71">TAK</b>' : '<span style="color:#d1d5db">NIE</span>';
    const safe = (val) => (val && val !== '0' && val !== 'undefined' && val != null) ? val : '-';

    const cardsHTML = filteredData.map(insp => {
        // --- LOGIKA STATUSÓW ---
        const rawStatus = (insp['Status'] || 'planowany').toLowerCase();
        let statusClass = 'st-default';
        let badgeClass = 'badge-default';

        if (rawStatus.includes('trakc')) { 
            statusClass = 'st-wtrakcie'; badgeClass = 'badge-wtrakcie'; 
        } else if (rawStatus.includes('plan')) { 
            statusClass = 'st-planowany'; badgeClass = 'badge-planowany'; 
        } else if (rawStatus.includes('wykon')) { 
            statusClass = 'st-wykonany'; badgeClass = 'badge-wykonany'; 
        } else if (rawStatus.includes('przygot')) { 
            statusClass = 'st-przygotowany'; badgeClass = 'badge-przygotowany'; 
        } else if (rawStatus.includes('problem') || rawStatus.includes('opóź')) { 
            statusClass = 'st-problem'; badgeClass = 'badge-problem'; 
        } else if (rawStatus.includes('przełoż') || rawStatus.includes('przeloz')) { 
            statusClass = 'st-przelozony'; badgeClass = 'badge-przelozony'; 
        }

        // --- LOGIKA TYPÓW ---
        const rawType = (insp['Typ'] || '').toUpperCase();
        let typeClass = 'type-def';
        
        if (rawType.includes('B')) typeClass = 'type-b';
        else if (rawType.includes('C')) typeClass = 'type-c';
        else if (rawType.includes('D')) typeClass = 'type-d';

        const delayVal = parseInt(insp['Opóźnienie'] || 0);

        return `
        <div class="card ${statusClass}">
            <div class="card-header">
                <div class="card-title ${typeClass}">${insp['Typ'] || 'PRZEGLĄD'}</div>
                <div class="card-status ${badgeClass}">${insp['Status']}</div>
            </div>
            <div class="card-body">
                <div class="data-grid-row">
                    <div class="field-box">
                        <label>Planowany Start</label>
                        <span>${safe(insp['Data początkowa'])}</span>
                    </div>
                    <div class="field-box">
                        <label>Planowany Koniec</label>
                        <span>${safe(insp['Data końcowa'])}</span>
                    </div>
                    <div class="field-box">
                        <label>Aktualny Start</label>
                        <span class="val-changed">${safe(insp['Data początkowa (po zmianie)'])}</span>
                    </div>
                    <div class="field-box">
                        <label>Aktualny Koniec</label>
                        <span class="val-changed">${safe(insp['Data końcowa (po zmianie)'])}</span>
                    </div>
                </div>
                <div class="data-grid-row">
                    <div class="field-box">
                        <label>Ilość godzin</label>
                        <span>${safe(insp['Ilość godzin'])}</span>
                    </div>
                    <div class="field-box">
                        <label>Opóźnienie</label>
                        <span class="${delayVal > 0 ? 'val-delay' : ''}">${delayVal} dni</span>
                    </div>
                     <div class="field-box">
                        <label>Samolot Zastępczy</label>
                        <span>${safe(insp['Samolot zastępczy'])}</span>
                    </div>
                    <div class="field-box">
                        <label>SZ Innego Przewoźnika</label>
                        <span>${fmtBool(insp['SZ innego przewoźnika'])}</span>
                    </div>
                </div>
                <div class="data-grid-row">
                    <div class="field-box">
                        <label>Konieczność sprowadzenia SZ</label>
                        <span>${fmtBool(insp['Konieczność sprowadzenia SZ'])}</span>
                    </div>
                    <div class="field-box">
                        <label>SZ Gotowy</label>
                        <span>${fmtBool(insp['SZ gotowy'])}</span>
                    </div>
                    <div class="field-box">
                        <label>Samolot Gotowy</label>
                        <span>${fmtBool(insp['Samolot gotowy'])}</span>
                    </div>
                    <div class="field-box"></div>
                </div>
                
                ${ (insp['Dodatkowe informacje'] || (delayVal > 0 && insp['Powód opóźnienia'])) ? `
                <div class="data-grid-full">
                    ${ delayVal > 0 ? `
                    <div class="field-box" style="margin-bottom:8px;">
                        <label style="color:#c0392b;">Powód Opóźnienia</label>
                        <span>${safe(insp['Powód opóźnienia'])}</span>
                    </div>` : '' }
                    
                    ${ insp['Dodatkowe informacje'] ? `
                    <div class="field-box">
                        <label>Dodatkowe Informacje</label>
                        <span style="font-style: italic; color: #555;">${safe(insp['Dodatkowe informacje'])}</span>
                    </div>` : '' }
                </div>
                ` : ''}
            </div>
        </div>
        `;
    }).join('');

    return `
        <div class="page-container">
            <div class="report-header">
                <div class="logo-area">
                    <img src="logo1.png" alt="Logo" onerror="this.style.display='none'">
                    <div class="system-info">
                        <h1>Raport</h1>
                        <div class="sub">Przeglądów Planowanych Samolotu</div>
                    </div>
                </div>
                <div class="meta-area">
                    <div>Rejestracja: <b>${planeReg}</b></div>
                    <div>Data wygenerowania: <b>${now.toLocaleDateString('pl-PL')} ${now.toLocaleTimeString('pl-PL', {hour:'2-digit', minute:'2-digit'})}</b></div>
                    <div style="margin-top: 3px;">Liczba wpisów: <b>${filteredData.length}</b></div>
                </div>
            </div>
            
            <div class="inspections-list">
                ${cardsHTML}
            </div>

            <div class="footer">
                Dokument wygenerowany z systemu Baza Danych 2.0 • Wersja systemu: ALPHA 2412.1032
            </div>
        </div>
    `;
}