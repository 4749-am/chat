// --- CONFIGURATION ABLY (Temps réel éphémère & ultra-stable) ---
const ABLY_API_KEY = 'i7v9DA.gUNH6g:jOzlzqHsnS_vi4mgykAtJrE0QrwHz2wKObz1LFTsAYo';

const realtime = new Ably.Realtime(ABLY_API_KEY);
const channel = realtime.channels.get('neonchat-room');

const messagesContainer = document.getElementById("messagesContainer");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const settingsBtn = document.getElementById("settingsBtn");
const usernameDisplay = document.getElementById("usernameDisplay");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const langToggleBtn = document.getElementById("langToggleBtn");

const translations = {
    fr: {
        title: "NeonChat",
        welcome: "Bienvenue sur NeonChat (Mode Éphémère) ! ",
        placeholder: "Écris ton message...",
        promptUser: "Entre ton nouveau pseudo :"
    },
    en: {
        title: "NeonChat",
        welcome: "Welcome to NeonChat (Ephemeral Mode)! ",
        placeholder: "Type your message...",
        promptUser: "Enter your new username:"
    }
};

let currentLang = localStorage.getItem("neonchat_lang") || "fr";
let currentTheme = localStorage.getItem("neonchat_theme") || "dark";

document.documentElement.setAttribute("data-theme", currentTheme);
updateThemeIcon(currentTheme);
langToggleBtn.textContent = currentLang === "fr" ? "EN" : "FR";
applyTranslations();

let username = localStorage.getItem("neonchat_user") || "User_" + Math.floor(Math.random() * 1000);
usernameDisplay.textContent = username;

lucide.createIcons();

// --- ECOUTE DES MESSAGES EN DIRECT (Éphémère) ---
channel.subscribe('chat-message', (msg) => {
    const data = msg.data;
    const isOutgoing = (data.sender === username);
    appendMessageToDOM(data.sender, data.text, data.time, isOutgoing);
});

// --- ÉVÉNEMENTS UI ---
sendBtn.addEventListener("click", handleSendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSendMessage();
});

settingsBtn.addEventListener("click", () => {
    const t = translations[currentLang];
    const newName = prompt(t.promptUser, username);
    if (newName && newName.trim() !== "") {
        username = newName.trim();
        usernameDisplay.textContent = username;
        localStorage.setItem("neonchat_user", username);
    }
});

themeToggleBtn.addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", currentTheme);
    localStorage.setItem("neonchat_theme", currentTheme);
    updateThemeIcon(currentTheme);
});

function updateThemeIcon(theme) {
    themeToggleBtn.innerHTML = theme === "dark" 
        ? '<i data-lucide="moon" style="width: 16px; height: 16px;"></i>' 
        : '<i data-lucide="sun" style="width: 16px; height: 16px;"></i>';
    lucide.createIcons();
}

langToggleBtn.addEventListener("click", () => {
    currentLang = currentLang === "fr" ? "en" : "fr";
    localStorage.setItem("neonchat_lang", currentLang);
    langToggleBtn.textContent = currentLang === "fr" ? "EN" : "FR";
    applyTranslations();
});

function applyTranslations() {
    const t = translations[currentLang];
    document.querySelectorAll("[data-i18n-title]").forEach(el => el.textContent = t.title);
    document.querySelectorAll("[data-i18n-welcome]").forEach(el => el.textContent = t.welcome);
    const inputEl = document.getElementById("messageInput");
    if (inputEl) inputEl.placeholder = t.placeholder;
}

// --- ENVOI D'UN MESSAGE (Sans stockage, diffusé en direct) ---
function handleSendMessage() {
    const text = messageInput.value.trim();
    if (text === "") return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Publication sur le canal Ably (rien n'est enregistré sur aucun disque)
    channel.publish('chat-message', {
        sender: username,
        text: text,
        time: timeStr
    }, (err) => {
        if (err) {
            console.error("Erreur d'envoi :", err);
            alert("Erreur de transmission du message.");
        }
    });

    messageInput.value = "";
    messageInput.focus();
}

// --- AFFICHAGE DANS LE DOM ---
function appendMessageToDOM(sender, text, timeStr, isOutgoing) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", isOutgoing ? "outgoing" : "incoming");

    messageDiv.innerHTML = `
        <div class="message-info">
            ${isOutgoing ? `<span class="msg-time">${timeStr}</span><span class="msg-user">${sender}</span>` : `<span class="msg-user">${sender}</span><span class="msg-time">${timeStr}</span>`}
        </div>
        <div class="message-bubble">
            ${escapeHtml(text)}
        </div>
    `;

    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Enregistrement du Service Worker pour la PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .catch((err) => console.log('Échec Service Worker :', err));
    });
}