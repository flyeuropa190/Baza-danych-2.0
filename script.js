// --- KONFIGURACJA ---
const API_URL = "https://script.google.com/macros/s/AKfycbzyCWJ-v9XVXDZ2Tp3MrNPnz1lAjUgx8-O9mns2_1mTLYkAeT7n4dq8vPcafRGe2qrvSw/exec"; 

const loginButton = document.getElementById("loginButton");
const passwordInput = document.getElementById("passwordInput");
const errorMsg = document.getElementById("errorMsg");
const loginBox = document.querySelector(".login-box");
const themeToggle = document.getElementById("themeToggle");
const capsLockWarning = document.getElementById("capsLockWarning");
const systemStatusDot = document.querySelector(".status-dot");
const commArea = document.getElementById("communications-area");
const commText = document.getElementById("comm-text");

// --- 1. FUNKCJA HASHUJĄCA (Client-side) ---
async function hashSHA256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// --- 2. LOGIKA LOGOWANIA (BACKEND) ---
async function handleLogin() {
    // Reset UI
    errorMsg.style.opacity = '0';
    passwordInput.classList.remove("error");
    loginButton.disabled = true;
    loginButton.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Weryfikacja...';

    const input = passwordInput.value;
    
    try {
        // Hashujemy hasło przed wysłaniem (dla podstawowego bezpieczeństwa w URL)
        const hashedInput = await hashSHA256(input);

        // Zapytanie do Apps Script
        const response = await fetch(`${API_URL}?type=login&hash=${hashedInput}`);
        
        if (!response.ok) throw new Error("Błąd sieci");
        
        const data = await response.json();

        if (data.auth === true) {
            // SUKCES
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('loginTimestamp', Date.now());
            
            // Animacja wyjścia
            loginBox.style.transform = "scale(0.9)";
            loginBox.style.opacity = "0";
            
            setTimeout(() => {
                window.location.href = "StronaGlowna.html";
            }, 200);
        } else {
            throw new Error("Wrong password");
        }

    } catch (e) {
        // BŁĄD LOGOWANIA
        console.error(e);
        errorMsg.textContent = "❌ Niepoprawne hasło lub brak połączenia";
        errorMsg.style.opacity = '1';
        passwordInput.classList.add("error");
        passwordInput.value = "";
        
        loginBox.classList.remove("shake");
        void loginBox.offsetWidth; // Trigger reflow
        loginBox.classList.add("shake");
        
        localStorage.removeItem('isLoggedIn');
        
        loginButton.innerHTML = 'Zaloguj';
        loginButton.disabled = false;
        passwordInput.focus();
    }
}


// --- 3. KOMUNIKATY (Wersja Multi-Card) ---
async function fetchCommunications() {
    try {
        const response = await fetch(`${API_URL}?type=communications`);
        const messages = await response.json();
        const listContainer = document.getElementById("comm-list");
        
        if (!Array.isArray(messages) || messages.length === 0) {
            commArea.style.display = "none";
            return;
        }

        const now = new Date();
        now.setHours(0,0,0,0);

        const parseDate = (dateStr) => {
             if (dateStr.includes('.')) {
                 const parts = dateStr.split('.');
                 return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
             }
             return new Date(dateStr);
        };

        // Filtrowanie aktywnych
        const activeMessages = messages.filter(msg => {
            const start = parseDate(msg.dateStart);
            const end = parseDate(msg.dateEnd);
            return now >= start && now <= end;
        });

        if (activeMessages.length > 0) {
            listContainer.innerHTML = activeMessages.map(msg => `
                <div class="comm-card">
                    <div class="comm-card-text">${msg.content}</div>
                </div>
            `).join('');
            commArea.style.display = "block";
        } else {
            commArea.style.display = "none";
        }
    } catch (e) {
        console.error("Błąd komunikatów:", e);
    }
}



// --- 5. ZIMOWY AKCENT (ŚNIEG) ---
function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    const snowflakeCount = 30; // Ilość płatków

    for (let i = 0; i < snowflakeCount; i++) {
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        flake.innerHTML = '❄'; // Można użyć kropki '.' dla subtelniejszego efektu
        
        // Losowa pozycja startowa X
        flake.style.left = Math.random() * 100 + 'vw';
        // Losowy czas animacji (szybkość)
        flake.style.animationDuration = Math.random() * 3 + 4 + 's'; // 4-7s
        // Losowe opóźnienie
        flake.style.animationDelay = Math.random() * 5 + 's';
        // Losowa wielkość
        flake.style.fontSize = Math.random() * 10 + 10 + 'px';
        
        snowContainer.appendChild(flake);
    }
}

// --- 6. CAPS LOCK DETECTION ---
function detectCapsLock(event) {
    // Sprawdzamy, czy zdarzenie posiada metodę getModifierState
    if (typeof event.getModifierState === "function") {
        if (event.getModifierState("CapsLock")) {
            capsLockWarning.style.display = "block";
        } else {
            capsLockWarning.style.display = "none";
        }
    } else {
        // Jeśli zdarzenie (np. focus) nie obsługuje wykrywania CapsLock, 
        // bezpieczniej jest ukryć ostrzeżenie lub nie robić nic.
        // Opcjonalnie: nie ukrywamy, jeśli wcześniej wykryliśmy włączenie.
    }
}

// --- 7. LISTENERY ---
document.addEventListener('DOMContentLoaded', () => {
    if (typeof loadTheme === 'function') loadTheme();
    
    passwordInput.focus();
    createSnow(); // Uruchomienie śniegu    
    fetchCommunications(); // Pobranie wiadomości
});

// Nasłuchiwanie CapsLocka
passwordInput.addEventListener("keyup", detectCapsLock);
passwordInput.addEventListener("keydown", detectCapsLock);
passwordInput.addEventListener("click", detectCapsLock);
passwordInput.addEventListener("focus", detectCapsLock);

loginButton.addEventListener("click", handleLogin);

passwordInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        handleLogin();
    }
});

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        if (typeof toggleTheme === 'function') toggleTheme();
    });
}

const togglePassword = document.getElementById('togglePassword');
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('fa-eye-slash');
});