const loginButton = document.getElementById("loginButton");
const passwordInput = document.getElementById("passwordInput");
const errorMsg = document.getElementById("errorMsg");
const container = document.querySelector(".container");
const mainContent = document.getElementById("mainContent");
const loginBox = document.querySelector(".login-box");

const TARGET_HASH = "57d9b16ef323e6c5cbfc6404abf5ed2bce0d84418c68447a73f476df7dff6635";
async function hashSHA256(message) {    
    const msgBuffer = new TextEncoder().encode(message);         
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);        
    const hashArray = Array.from(new Uint8Array(hashBuffer));         
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');        
    return hashHex;
}

loginButton.addEventListener("click", async () => {
    const input = passwordInput.value;        
    const hashedInput = await hashSHA256(input);        
    if (hashedInput === TARGET_HASH) {
        window.location.href = "StronaGlowna.html";
    } else {
        errorMsg.textContent = "❌ Niepoprawne hasło";
        errorMsg.style.opacity = 1;
        
        passwordInput.classList.add("error"); // podświetlenie na czerwono
        passwordInput.value = "";
        
        // Efekt potrząsania
        loginBox.classList.remove("shake");
        void loginBox.offsetWidth;
        loginBox.classList.add("shake");
    }
});



function toggleMenu() {
  document.getElementById('mobile-nav').classList.toggle('open');
}