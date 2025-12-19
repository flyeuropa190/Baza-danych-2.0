// api.js
import { fetchAirplanesData } from './airplanes-fetcher.js'; // Zakładam, że ten plik istnieje
import { API_URL_BASE } from './config.js';

async function fetchMaintenanceData() {
    try {
        const response = await fetch(`${API_URL_BASE}?type=dashboard`);
        const json = await response.json();
        return json && json.kontrolka ? json.kontrolka : [];
    } catch (e) {
        console.error("Błąd pobierania danych przeglądowych:", e);
        return [];
    }
}

function mergeMaintenanceData(planes, maintenance) {
    const maintMap = new Map();
    maintenance.forEach(item => {
        if(item.rejestracja) maintMap.set(item.rejestracja, item);
    });

    return planes.map(plane => {
        const maintInfo = maintMap.get(plane.rejestracja);
        return {
            ...plane,
            dataB: maintInfo ? maintInfo.b_data : null,
            dataC: maintInfo ? maintInfo.c_data : null,
            dataD: maintInfo ? maintInfo.d_data : null,
            dniB: maintInfo ? maintInfo.b_dni : null,
            dniC: maintInfo ? maintInfo.c_dni : null,
            dniD: maintInfo ? maintInfo.d_dni : null
        };
    });
}

export async function loadAllData() {
    const [planesResult, maintenanceList] = await Promise.all([
        fetchAirplanesData(),
        fetchMaintenanceData()
    ]);

    if (planesResult && !planesResult.error) {
        return mergeMaintenanceData(planesResult.data, maintenanceList);
    }
    throw new Error("Błąd pobierania danych samolotów");
}