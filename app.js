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

const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

const translations = {
    fr: {
        title: "NeonChat",
        welcome: "Bienvenue sur NeonChat (Mode Éphémère) ! ",
        placeholder: "Écris ton message ou ajoute des emojis...",
        promptUser: "Entre ton nouveau pseudo :"
    },
    en: {
        title: "NeonChat",
        welcome: "Welcome to NeonChat (Ephemeral Mode)! ",
        placeholder: "Type your message or add emojis...",
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
    appendMessageToDOM(data.sender, data.text, data.image, data.time, isOutgoing);
});

// --- ÉVÉNEMENTS UI ---
sendBtn.addEventListener("click", handleSendMessage);
messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSendMessage();
});

// Gestion du bouton trombone pour joindre une photo
attachBtn.addEventListener("click", () => {
    fileInput.click();
});

// Compression automatique renforcée de l'image (pour respecter la limite Ably < 16Ko)
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert("Veuillez sélectionner une image valide.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (event) {
        const img = new Image();
        img.src = event.target.result;

        img.onload = function () {
            // Réduction drastique de la taille max pour tenir sous les 16 Ko d'Ably
            const MAX_WIDTH = 300;
            const MAX_HEIGHT = 300;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round((height * MAX_WIDTH) / width);
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round((width * MAX_HEIGHT) / height);
                    height = MAX_HEIGHT;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // Qualité à 0.5 pour garantir un poids plume
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            channel.publish('chat-message', {
                sender: username,
                text: '',
                image: compressedDataUrl,
                time: timeStr
            }, (err) => {
                if (err) {
                    console.error("Erreur d'envoi image (Ably limit ?) :", err);
                    alert("Erreur : L'image est trop lourde pour le canal gratuit d'Ably (Max 16Ko). Essaie une image plus petite.");
                }
            });

            fileInput.value = '';
        };
    };
    reader.readAsDataURL(file);
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

// --- ENVOI D'UN MESSAGE (Texte / Emojis) ---
function handleSendMessage() {
    const text = messageInput.value.trim();
    if (text === "") return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    channel.publish('chat-message', {
        sender: username,
        text: text,
        image: null,
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
function appendMessageToDOM(sender, text, image, timeStr, isOutgoing) {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message", isOutgoing ? "outgoing" : "incoming");

    let bubbleContent = '';
    if (image) {
        bubbleContent = `<img src="${image}" alt="Photo partagée" onclick="window.open(this.src)" />`;
    } else {
        bubbleContent = escapeHtml(text);
    }

    messageDiv.innerHTML = `
        <div class="message-info">
            ${isOutgoing ? `<span class="msg-time">${timeStr}</span><span class="msg-user">${sender}</span>` : `<span class="msg-user">${sender}</span><span class="msg-time">${timeStr}</span>`}
        </div>
        <div class="message-bubble">
            ${bubbleContent}
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