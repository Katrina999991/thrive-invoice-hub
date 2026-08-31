#!/usr/bin/env bash
# Build a signed dnf/yum repo from Tauri RPM packages.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RPM_SRC="${1:-$ROOT/src-tauri/target/release/bundle/rpm}"
OUT="${2:-$ROOT/rpm-repo}"
KEY_ID="${RPM_GPG_KEY_ID:-03254637513192D7BEC72B11986D135755DA5E60}"

if ! compgen -G "$RPM_SRC"/*.rpm >/dev/null; then
  echo "No RPM files in $RPM_SRC" >&2
  exit 1
fi

rm -rf "$OUT"
mkdir -p "$OUT/x86_64"
cp "$RPM_SRC"/*.rpm "$OUT/x86_64/"
cp "$ROOT/public/rpm/RPM-GPG-KEY-gestionflow" "$OUT/"
cp "$ROOT/public/rpm/gestionflow.repo" "$OUT/"

if [[ -n "${RPM_GPG_PRIVATE_KEY:-}" ]]; then
  export GNUPGHOME
  GNUPGHOME="$(mktemp -d)"
  chmod 700 "$GNUPGHOME"
  printf '%s\n' "$RPM_GPG_PRIVATE_KEY" | gpg --batch --import
  PASS_FILE="$(mktemp)"
  printf '%s' "${RPM_GPG_PASSPHRASE:-}" > "$PASS_FILE"
  chmod 600 "$PASS_FILE"

  cat > "$HOME/.rpmmacros" <<EOF
%_signature gpg
%_gpg_path $GNUPGHOME
%_gpg_name $KEY_ID
%_gpgbin /usr/bin/gpg
%__gpg /usr/bin/gpg
%__gpg_sign_cmd %{__gpg} \\
  gpg --batch --yes --pinentry-mode loopback --passphrase-file $PASS_FILE \\
  --local-user %{_gpg_name} --detach-sign --no-armor \\
  --output %{__signature_filename} %{__plaintext_filename}
EOF

  for rpm in "$OUT/x86_64"/*.rpm; do
    echo "Signing $rpm"
    rpm --delsign "$rpm" >/dev/null 2>&1 || true
    rpm --addsign "$rpm"
    rpm --checksig "$rpm"
  done
else
  echo "RPM_GPG_PRIVATE_KEY is not set; publishing unsigned packages" >&2
fi

createrepo_c "$OUT/x86_64"

# AppStream collection so Discover can list the app from the repo.
python3 - "$ROOT/src-tauri/linux/ca.statis.GestionFlow.metainfo.xml" "$OUT/x86_64/appstream.xml" <<'PY'
import sys
from pathlib import Path
src = Path(sys.argv[1]).read_text()
body = src.replace('<?xml version="1.0" encoding="UTF-8"?>', '', 1).strip()
Path(sys.argv[2]).write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<components version="0.16" origin="gestionflow">\n'
    f'{body}\n'
    '</components>\n'
)
PY
gzip -n -f "$OUT/x86_64/appstream.xml"
if command -v modifyrepo_c >/dev/null; then
  modifyrepo_c --mdtype=appstream "$OUT/x86_64/appstream.xml.gz" "$OUT/x86_64/repodata"
else
  echo "modifyrepo_c not found; AppStream extra metadata skipped" >&2
fi

if [[ -n "${RPM_GPG_PRIVATE_KEY:-}" ]]; then
  gpg --batch --yes --pinentry-mode loopback --passphrase-file "$PASS_FILE" \
    --local-user "$KEY_ID" --detach-sign --armor \
    "$OUT/x86_64/repodata/repomd.xml"
fi

echo "RPM repo written to $OUT"
find "$OUT" -type f | sort
