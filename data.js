const SHEET_ID = "1B-SvqbSzrhED-ZiNz8yC79RzGbPv-s7q4fyO1sgHpMU";
const API_URL = `https://opensheet.elk.sh/${SHEET_ID}/Strona główna`;

// lista statusów w kolejności, która ma się wyświetlać w lewej kolumnie
const statusyStale = [
  "Dostępne",
  "Uziemione",
  "Zaparkowane",
  "SZ",
  "Do przeglądu",
  "Przegląd",
  "Do odstawienia",
  "Naprawa",
  "Awaria",
  "Nieczynne",
  "Delegacja",
  "Zamówione",
  "POSIADANE",
  "ŁĄCZNIE"
];

fetch(API_URL)
  .then(res => res.json())
  .then(rows => {
    const tabelaFlota = document.querySelector("#tabela-flota tbody");
    tabelaFlota.innerHTML = "";

    // wyciągamy wszystkie wartości z kolumny B (ILOŚĆ)
    const values = rows.map(r => r["undefined"]).filter(v => v && v.trim() !== "");

    // Szukamy indeksu wiersza "ILOŚĆ"
    const iloscIndex = values.findIndex(v => v.toUpperCase() === "ILOŚĆ");
    if (iloscIndex === -1) {
      console.error("Nie znaleziono nagłówka ILOŚĆ w danych.");
      return;
    }

    // dane z komórek B10:B23 → kolejne 14 wartości po nagłówku "ILOŚĆ"
    const ilosci = values.slice(iloscIndex + 1, iloscIndex + 15);

    if (ilosci.length !== statusyStale.length) {
      console.warn("Liczba wartości ILOŚĆ nie zgadza się z liczbą statusów.", ilosci);
    }

    // Tworzymy wiersze tabeli
    for (let i = 0; i < statusyStale.length; i++) {
      const tr = document.createElement("tr");
      const tdStatus = document.createElement("td");
      const tdIlosc = document.createElement("td");

      tdStatus.textContent = statusyStale[i];
      tdIlosc.textContent = ilosci[i] || "";

      tr.appendChild(tdStatus);
      tr.appendChild(tdIlosc);
      tabelaFlota.appendChild(tr);
    }

    console.log("✅ Tabela FLOTA wczytana poprawnie.");
  })
  .catch(err => console.error("❌ Błąd pobierania danych FLOTA:", err));
