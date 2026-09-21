#!/bin/zsh
cd "${0:A:h}" || exit 1
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
python3 tools/connect.py
printf '\nPress Enter to close this window.\n'
read -r
