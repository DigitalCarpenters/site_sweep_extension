chrome.action.onClicked.addListener((tab) => {
  console.log("SiteSweep clicked!", tab.url);
});