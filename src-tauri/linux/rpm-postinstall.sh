#!/bin/bash
# $1 is 1 on install, 2 on upgrade (RPM scriptlet convention).
if [ -f /etc/pki/rpm-gpg/RPM-GPG-KEY-gestionflow ]; then
  rpm --import /etc/pki/rpm-gpg/RPM-GPG-KEY-gestionflow >/dev/null 2>&1 || true
fi
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications >/dev/null 2>&1 || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q /usr/share/icons/hicolor >/dev/null 2>&1 || true
fi
exit 0
