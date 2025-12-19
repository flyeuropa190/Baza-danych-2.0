const loginButton = document.getElementById("loginButton");
const passwordInput = document.getElementById("passwordInput");
const errorMsg = document.getElementById("errorMsg");
const loginBox = document.querySelector(".login-box");
const themeToggle = document.getElementById("themeToggle"); // Nowy element

const TARGET_HASH = "1e2e27a7cf48e9fe1c7906f80e5f62949249f6d7e5cde37373c0b7e745ed262b";

// --- 1. FUNKCJA HASHUJĄCA ---
async function hashSHA256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}

// --- 2. LOGIKA ZABEZPIECZEŃ (Status Zalogowania) ---
function saveLoginStatus() {
    // Ustaw flagę w localStorage na 'true' i dodaj znacznik czasowy
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('loginTimestamp', Date.now()); 
}

// Funkcja usuwająca status logowania
function clearLoginStatus() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('loginTimestamp');
}


// --- INICJALIZACJA I LISTENERY ---
document.addEventListener('DOMContentLoaded', () => {
    // Ładuj zapisany motyw przy starcie
    loadTheme(); 
    
    // Listener dla przycisku zmiany motywu
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});


loginButton.addEventListener("click", async () => {
    const input = passwordInput.value;
    const hashedInput = await hashSHA256(input);

    if (hashedInput === TARGET_HASH) {
        // Zabezpieczenie: Zapisz status zalogowania przed przekierowaniem
        saveLoginStatus(); 
        window.location.href = "StronaGlowna.html";
    } else {
        errorMsg.textContent = "❌ Niepoprawne hasło";
        errorMsg.style.opacity = 1;
        
        passwordInput.classList.add("error");
        passwordInput.value = "";
        
        loginBox.classList.remove("shake");
        void loginBox.offsetWidth;
        loginBox.classList.add("shake");

        // Jeśli błędne hasło, upewnij się, że nie ma statusu zalogowania
        clearLoginStatus(); 
    }
});