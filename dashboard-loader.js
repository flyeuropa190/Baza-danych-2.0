const API_URL_BASE = 'https://script.google.com/macros/s/AKfycbzyCWJ-v9XVXDZ2Tp3MrNPnz1lAjUgx8-O9mns2_1mTLYkAeT7n4dq8vPcafRGe2qrvSw/exec';
const CACHE_KEY_DASHBOARD = 'dashboard_data_v1';

// DOM Elements - pobieramy dynamicznie lub sprawdzamy istnienie
const containerStany = document.getElementById('dashboard-stany-list');
const containerKontrolka = document.getElementById('dashboard-kontrolka-list');
const sectionKontrolka = document.getElementById('section-kontrolka');
const containerGrafik = document.getElementById('dashboard-grafik-content');
const btnPrevDay = document.getElementById('grafik-prev');
const btnNextDay = document.getElementById('grafik-next');
const displayDate = document.getElementById('grafik-date-display');

let dashboardData = null;
let currentScheduleDate = new Date(); 
let lastTimestamp = 0;

// --- 1. CACHE & DATA FETCHING ---

function saveToCache(data) {
    try {
        sessionStorage.setItem(CACHE_KEY_DASHBOARD, JSON.stringify(data));
    } catch (e) {
        console.warn("[dashboard] Nie udało się zapisać do cache:", e);
    }
}

function loadFromCache() {
    try {
        const cached = sessionStorage.getItem(CACHE_KEY_DASHBOARD);
        return cached ? JSON.parse(cached) : null;
    } catch (e) {
        return null;
    }
}

async function fetchDashboardData() {
    // --- KLUCZOWA ZMIANA: Dodajemy parametr 'type=dashboard' ---
    const ROUTED_URL = `${API_URL_BASE}?type=dashboard`; 
    console.log("[dashboard] 🌐 Rozpoczynam pobieranie danych z API:", ROUTED_URL);
    
    try {
        const response = await fetch(ROUTED_URL); // Użycie URL z parametrem
        const json = await response.json();
        if (json.error) throw new Error(json.error);
        
        // Zabezpieczenie przed brakiem tablicy danych
        if (!json.stany || !Array.isArray(json.stany)) {
             console.warn("[dashboard] API zwróciło nieprawidłową strukturę danych.");
             return null;
        }

        return json;
    } catch (e) {
        console.error("[dashboard] ❌ Błąd pobierania danych (fetch):", e);
        return null;
    }
}

// --- 2. RENDEROWANIE (Bezpieczne - sprawdza czy elementy istnieją) ---

function renderStany(stany) {
    if (!containerStany) return; 

    if (!stany || stany.length === 0) {
        containerStany.innerHTML = '<p class="no-data">Brak danych o stanach.</p>';
        return;
    }
    
    const html = stany.map(item => `
        <div class="dash-item status-row" data-status="${item.status}" style="cursor: pointer;"> 
            <span class="dash-label">${item.status}</span>
            <span class="dash-value">${item.ilosc}</span>
        </div>
    `).join('');
    containerStany.innerHTML = html;
}

function getCheckColorClass(days) {
    const d = parseInt(days);
    if (isNaN(d)) return '';
    if (d < 0) return 'check-critical';
    if (d <= 10) return 'check-red';
    if (d <= 31) return 'check-yellow';
    if (d <= 62) return 'check-green';
    return '';
}

function renderKontrolka(planes) {
    if (!containerKontrolka || !sectionKontrolka) return; 
    
    // Zabezpieczenie: Sprawdzenie, czy planes jest tablicą
    if (!planes || !Array.isArray(planes)) {
        sectionKontrolka.style.display = 'none';
        return;
    }

    let alerts = [];
    planes.forEach(plane => {
        const checks = [
            { type: 'B', date: plane.b_data, days: plane.b_dni },
            { type: 'C', date: plane.c_data, days: plane.c_dni },
            { type: 'D', date: plane.d_data, days: plane.d_dni }
        ];

        checks.forEach(check => {
            if (check.days !== "" && parseInt(check.days) <= 62) {
                alerts.push({
                    reg: plane.rejestracja,
                    num: plane.numer,
                    type: check.type,
                    date: check.date,
                    days: parseInt(check.days)
                });
            }
        });
    });

    alerts.sort((a, b) => a.days - b.days);

    if (alerts.length === 0) {
        sectionKontrolka.style.display = 'none';
        return;
    } 
    
    sectionKontrolka.style.display = 'block';
    
    const html = alerts.map(item => {
        const colorClass = getCheckColorClass(item.days);
        return `
            <div class="dash-item check-row ${colorClass}" data-reg="${item.reg}" style="cursor: pointer;">
                <div class="check-info">
                    <strong>${item.reg} (${item.num}) [${item.type}]</strong>
                </div>
                <div class="check-days">
                    ${item.days} dni <span class="check-date">(${item.date})</span>
                </div>
            </div>
        `;
    }).join('');
    
    containerKontrolka.innerHTML = html;
}

// --- GRAFIK ---

const shiftCodes = {
    '1': '6:00-15:00',
    '2': '15:00-00:00',
    '3': '6:00-00:00',
    'DW': 'Dzień Wolny',
    'DN': 'Dyżur Nocny (18:00-6:00)',
    'DD': 'Dyżur Dzienny (6:00-18:00)',
    'U': 'Urlop',
    'UŻ': 'Urlop na żądanie',
    'p': 'Przeglądy',
    'o': 'Operacje'
};

function resolveShift(code, isNightShift) {
    if (!code) return 'Brak danych';
    let desc = shiftCodes[code];
    if (!desc) {
        const base = code.charAt(0);
        const suffix = code.slice(1);
        if (shiftCodes[base]) desc = shiftCodes[base] + (suffix ? ` (${suffix})` : '');
        else desc = code;
    }
    if (String(isNightShift).toUpperCase() === 'TRUE' || String(isNightShift).toUpperCase() === 'PRAWDA') {
        desc += ' <span class="night-shift-badge">🌙 DN</span>';
    }
    return desc;
}

function formatDateToSheet(dateObj) {
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}.${m}.${y}`;
}

function renderGrafik() {
    if (!containerGrafik || !displayDate) return; 

    if (!dashboardData || !dashboardData.grafik) {
        // console.warn("⚠️ Brak danych grafiku do wyświetlenia.");
        return;
    }

    const dateStr = formatDateToSheet(currentScheduleDate);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    displayDate.textContent = currentScheduleDate.toLocaleDateString('pl-PL', options);

    const entry = dashboardData.grafik.find(row => row.data === dateStr);

    if (!entry) {
        containerGrafik.innerHTML = `<p class="no-data">Brak grafiku na dzień ${dateStr}</p>`;
        return;
    }

    const html = `
        <div class="dash-item shift-row">
            <div class="shift-name">Szymon Kalus</div>
            <div class="shift-val">${entry.kalus} <br><span class="shift-desc">${resolveShift(entry.kalus, entry.dn_kalus)}</span></div>
        </div>
        <div class="dash-item shift-row">
            <div class="shift-name">Szymon Kowalczyk</div>
            <div class="shift-val">${entry.kowalczyk} <br><span class="shift-desc">${resolveShift(entry.kowalczyk, entry.dn_kowalczyk)}</span></div>
        </div>
    `;
    containerGrafik.innerHTML = html;
}

if (btnPrevDay) btnPrevDay.addEventListener('click', () => {
    currentScheduleDate.setDate(currentScheduleDate.getDate() - 1);
    renderGrafik();
});

if (btnNextDay) btnNextDay.addEventListener('click', () => {
    currentScheduleDate.setDate(currentScheduleDate.getDate() + 1);
    renderGrafik();
});


// --- GŁÓWNA PĘTLA ---

async function initDashboard() {
    // 1. Najpierw załaduj z Cache (jeśli istnieje)
    const cachedData = loadFromCache();
    if (cachedData) {
        dashboardData = cachedData;
        lastTimestamp = cachedData.timestamp || 0;
        
        renderStany(cachedData.stany);
        renderKontrolka(cachedData.kontrolka);
        renderGrafik();
    }

    // 2. Pobierz świeże dane
    const data = await fetchDashboardData();
    
    if (data) {
        const isNewData = data.timestamp > lastTimestamp;

        if (isNewData || !cachedData) {
            console.log("[dashboard] ✅ Nowe dane. Aktualizuję UI i Cache.");
            dashboardData = data;
            lastTimestamp = data.timestamp;
            
            saveToCache(data); // Zapis do sessionStorage

            // Zabezpieczenia: upewnienie się, że pola istnieją
            renderStany(data.stany || []);
            renderKontrolka(data.kontrolka || []);
            renderGrafik();
        } else {
            console.log("[dashboard] 💤 Dane aktualne.");
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    // Odświeżanie co 15 sekund
    setInterval(initDashboard, 15000); 
});