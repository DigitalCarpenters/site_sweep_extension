// Cooldown is per website, shared by tabs on the same origin.
const cleaningOrigins = new Set();
const lastCleanedAt = new Map();
const CLEANUP_COOLDOWN_MS = 10000;

chrome.action.onClicked.addListener(async (tab) => {
    if (!tab.id) return;
    let url;
    try { url = new URL(tab.url); } catch { return; }
    if (!["http:", "https:"].includes(url.protocol)) return;

    if (cleaningOrigins.has(url.origin)) {
        await displayFeedback(tab.id, "busy");
        return;
    }
    const previousCleanup = lastCleanedAt.get(url.origin);
    if (previousCleanup !== undefined && Date.now() - previousCleanup < CLEANUP_COOLDOWN_MS) {
        await displayFeedback(tab.id, "recent");
        return;
    }

    cleaningOrigins.add(url.origin);
    let documentId;
    let finalTitle = "Clean this website";
    try {
        await resetToolbar(tab.id, "Clearing this website's browser data…");
        documentId = await displayFeedback(tab.id, "cleaning");
        await waitForCleanup(chrome.browsingData.remove(
            { origins: [url.origin], since: 0 },
            {
                cache: true,
                cacheStorage: true,
                serviceWorkers: true
            }
        ));

        // Start the ten seconds only after Chrome confirms successful cleanup.
        lastCleanedAt.set(url.origin, Date.now());
        console.info("SiteSweep: browser data cleared", url.origin);
        await displayFeedback(tab.id, "success", documentId);
    } catch (error) {
        console.error("SiteSweep could not confirm cleanup:", error);
        finalTitle = "Cleanup could not be confirmed. Check SiteSweep's service worker console.";
        await displayFeedback(tab.id, "error", documentId);
    } finally {
        cleaningOrigins.delete(url.origin);
        await resetToolbar(tab.id, finalTitle);
    }
});

// Chrome can leave removal pending longer than the worker's 30-second idle window.
// Keep it awake only for this operation, with a two-minute upper bound.
async function waitForCleanup(operation) {
    const keepAlive = setInterval(() => {
        void chrome.runtime.getPlatformInfo().catch(error => console.warn("SiteSweep keepalive:", error));
    }, 20000);
    let timeout;
    try {
        await Promise.race([
            operation,
            new Promise((_, reject) => {
                timeout = setTimeout(() => reject(new Error("Chrome did not confirm cleanup within two minutes")), 120000);
            })
        ]);
    } finally {
        clearInterval(keepAlive);
        clearTimeout(timeout);
    }
}

async function resetToolbar(tabId, title = "Clean this website") {
    // A tab may close during cleanup; that must not create another error.
    await Promise.allSettled([
        chrome.action.setBadgeText({ tabId, text: "" }),
        chrome.action.setTitle({ tabId, title })
    ]);
}

async function clearOldBadges() {
    await chrome.action.setBadgeText({ text: "" });
    const tabs = await chrome.tabs.query({});
    await Promise.allSettled(tabs.filter(tab => tab.id).map(tab => resetToolbar(tab.id)));
}

chrome.runtime.onInstalled.addListener(() => { void clearOldBadges(); });
chrome.runtime.onStartup.addListener(() => { void clearOldBadges(); });
// Also reset per-tab badges left by the previous version on an unpacked reload.
void clearOldBadges().catch(error => console.warn("SiteSweep toolbar reset:", error));

async function displayFeedback(tabId, phase, documentId) {
    try {
        const target = { tabId };
        if (documentId) target.documentIds = [documentId];
        const results = await chrome.scripting.executeScript({
            target,
            args: [chrome.runtime.getURL("assets/Confetti.gif"), phase],
            func: showFeedback
        });
        return results[0]?.documentId;
    } catch (error) {
        // A restricted page, navigation, or blocked image must never stop cleanup.
        console.warn("SiteSweep feedback unavailable:", error);
    }
}

// Chrome copies this function into the webpage: keep it self-contained.
async function showFeedback(gifUrl, phase) {
    document.getElementById("sitesweep-confetti")?.remove();
    const host = document.createElement("div");
    host.id = "sitesweep-confetti";
    host.dataset.phase = phase;
    host.style.cssText = `
    all: initial !important;
    display: block !important;
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    width: min(680px, calc(100vw - 32px)) !important;
    z-index: 2147483647 !important;
    pointer-events: none !important;
    visibility: visible !important;
    opacity: 1 !important;
  `;
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
    * { box-sizing: border-box; }
    .card {
      display: flex; align-items: center; justify-content: center;
      gap: clamp(14px, 3vw, 32px); padding: clamp(18px, 3vw, 30px);
      border-radius: 32px; border: 1px solid rgba(255,255,255,.2);
      background: linear-gradient(135deg, rgba(20,16,39,.96), rgba(36,25,60,.94));
      box-shadow: 0 30px 85px rgba(0,0,0,.38), 0 8px 24px rgba(0,0,0,.24),
                  inset 0 1px 0 rgba(255,255,255,.12);
      opacity: 0; transform: scale(.45);
    }
    img {
      display: block; flex: 0 0 auto;
      width: clamp(100px, 32vw, 260px); height: clamp(100px, 32vw, 260px);
      object-fit: contain; image-rendering: pixelated;
      filter: drop-shadow(0 18px 12px rgba(0,0,0,.4));
    }
    .copy { display: grid; gap: 5px; min-width: 0; }
    .text-only { width: max-content; max-width: 100%; margin: 0 auto; }
    .text-only .copy { text-align: center; justify-items: center; }
    .text-only .line { font-size: clamp(20px, 5vw, 40px); }
    .line {
      display: block; width: max-content; max-width: 100%;
      font: 900 clamp(20px, 5.4vw, 48px)/1.1 system-ui, sans-serif;
      letter-spacing: -.035em; white-space: nowrap;
      color: #f9cf6a;
      background: linear-gradient(105deg, #ff839c 0%, #ffc56e 20%, #f8f58a 36%,
                  #7ee8b2 52%, #83caff 70%, #c9a5ff 88%, #ff9cde 100%);
      background-size: 180% 100%; background-clip: text; -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      filter: drop-shadow(0 3px 7px rgba(0,0,0,.3));
      opacity: 0; transform: translateX(22px) translateY(8px) scale(.94);
    }
    .ready { animation: pop-in 680ms cubic-bezier(.2,.8,.2,1) both; }
    .ready .line {
      animation: line-in 450ms cubic-bezier(.2,.8,.2,1) both, rainbow 2200ms linear infinite;
      animation-delay: var(--delay), 0ms;
    }
    .leaving { animation: fade-out 250ms ease-in both; }
    @keyframes pop-in {
      0% { opacity: 0; transform: scale(.45); }
      58% { opacity: 1; transform: scale(1.12); }
      80% { opacity: 1; transform: scale(.96); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes line-in {
      to { opacity: 1; transform: translateX(0) translateY(0) scale(1); }
    }
    @keyframes rainbow { to { background-position: 180% 50%; } }
    @keyframes fade-out { to { opacity: 0; transform: scale(.94); } }
    @media (prefers-reduced-motion: reduce) {
      .ready, .ready .line { animation: none; opacity: 1; transform: none; }
      .leaving { animation: none; opacity: 0; }
    }
  `;

    const card = document.createElement("div");
    card.className = "card";
    const hasConfetti = phase === "success" || phase === "cleaning";
    if (!hasConfetti) card.classList.add("text-only");
    card.setAttribute("role", "status");
    card.setAttribute("aria-live", "polite");
    const words = phase === "success" ? ["CACHE", "HAS BEEN", "DELETED"]
        : phase === "recent" ? ["ALREADY", "CLEANED"]
            : phase === "busy" ? ["NOTHING", "TO", "CLEANUP"]
                : phase === "error" ? ["CLEANUP", "NOT", "CONFIRMED"]
                    : ["CLEARING", "SITE", "DATA"];
    card.setAttribute("aria-label", words.join(" "));
    const image = document.createElement("img");
    image.alt = "";
    image.setAttribute("aria-hidden", "true");
    const copy = document.createElement("div");
    copy.className = "copy";
    words.forEach((word, index) => {
        const line = document.createElement("span");
        line.className = "line";
        line.textContent = word;
        line.style.setProperty("--delay", `${140 + index * 150}ms`);
        copy.appendChild(line);
    });
    card.append(image, copy);
    shadow.append(style, card);
    document.documentElement.appendChild(host);

    if (!hasConfetti) {
        image.remove();
    } else {
        try {
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("GIF loading timed out")), 5000);
                image.onload = () => { clearTimeout(timeout); resolve(); };
                image.onerror = () => { clearTimeout(timeout); reject(new Error("GIF could not load")); };
                image.src = gifUrl;
            });
        } catch (error) {
            console.warn("SiteSweep: showing text feedback without GIF", error);
            image.remove();
        }
    }
    // Animate the card, not the positioned host, so it stays centered throughout.
    card.classList.add("ready");
    setTimeout(() => card.classList.add("leaving"), 2750);
    setTimeout(() => host.remove(), 3000);
    return { phase, duration: 3000, imageLoaded: image.isConnected };
}
