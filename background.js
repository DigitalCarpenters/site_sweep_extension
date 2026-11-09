chrome.action.onClicked.addListener(async (tab) => {
    try {
        const url = new URL(tab.url);

        if (url.protocol !== "https:" && url.protocol !== "http:") {
            console.log("SiteSweep works on HTTP and HTTPS websites.");
            return;
        }

        await chrome.browsingData.remove(
            {
                origins: [url.origin],
                since: 0
            },
            {
                cache: true,
                cacheStorage: true,
                localStorage: true,
                serviceWorkers: true
            }
        );

        console.log("SiteSweep finished clearing:", url.origin);

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const message = document.createElement("div");
                message.textContent = "🧹 SiteSweep animation test";

                message.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 2147483647;
          padding: 24px;
          border-radius: 16px;
          background: #222;
          color: white;
          font: 20px sans-serif;
          pointer-events: none;
        `;

                document.documentElement.appendChild(message);

                setTimeout(() => {
                    message.remove();
                }, 3000);
            }
        });
    } catch (error) {
        console.error("SiteSweep could not display the message:", error);
    }
});