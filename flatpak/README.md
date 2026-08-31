# Flathub — GestionFlow

Fichiers pour publier GestionFlow sur [Flathub](https://flathub.org), afin que **Discover** (Fedora/KDE) et GNOME Software puissent l’installer.

Identifiant : `ca.statis.GestionFlow`  
Licence : propriétaire (`LicenseRef-proprietary`)  
Architecture : `x86_64` seulement (le `.deb` Linux actuel).

## Contenu

| Fichier | Rôle |
|---|---|
| `ca.statis.GestionFlow.yaml` | Manifeste Flatpak |
| `ca.statis.GestionFlow.metainfo.xml` | Métadonnées AppStream (Discover) |
| `ca.statis.GestionFlow.desktop` | Raccourci menu |
| `flathub.json` | Limite le build à x86_64 |
| `icons/ca.statis.GestionFlow-512.png` | Icône 512×512 |

Le manifeste télécharge le `.deb` officiel GitHub (`v0.1.1`) et l’installe dans le sandbox Flatpak.

## Tester en local (Fedora)

```bash
sudo dnf install flatpak-builder
flatpak remote-add --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install -y flathub org.gnome.Platform//48 org.gnome.Sdk//48

cd flatpak
# Copier le metainfo depuis le projet
cp ../src-tauri/linux/ca.statis.GestionFlow.metainfo.xml .

flatpak-builder --force-clean --user --install-deps-from=flathub --repo=repo build-dir ca.statis.GestionFlow.yaml
flatpak --user remote-add --no-gpg-verify --if-not-exists gestionflow-local repo
flatpak --user install -y gestionflow-local ca.statis.GestionFlow
flatpak run ca.statis.GestionFlow
```

## Soumettre à Flathub

1. Fork [flathub/flathub](https://github.com/flathub/flathub/fork).
2. Cloner la branche `new-pr` :

   ```bash
   git clone --branch=new-pr git@github.com:VOTRE_USER/flathub.git
   cd flathub
   git checkout -b ca.statis.GestionFlow
   ```

3. Copier **tous** les fichiers de ce dossier `flatpak/` (sauf ce README) à la racine de la branche, plus le metainfo :

   ```bash
   cp /chemin/vers/gestionflow/flatpak/ca.statis.GestionFlow.yaml .
   cp /chemin/vers/gestionflow/flatpak/ca.statis.GestionFlow.desktop .
   cp /chemin/vers/gestionflow/flatpak/flathub.json .
   cp /chemin/vers/gestionflow/src-tauri/linux/ca.statis.GestionFlow.metainfo.xml .
   mkdir -p icons
   cp /chemin/vers/gestionflow/flatpak/icons/ca.statis.GestionFlow-512.png icons/
   ```

4. Commit, push, ouvrir une **pull request contre `new-pr`**.
5. La revue Flathub pose des questions (sandbox, licence, screenshots). Répondre sur le PR.
6. Une fois accepté, Flathub crée le dépôt `flathub/ca.statis.GestionFlow`. Les mises à jour se font en poussant un nouveau manifeste (nouveau `.deb` + sha256) sur ce dépôt.

Compte GitHub : utiliser celui qui a le droit de représenter Statis / GestionFlow (idéalement le même que `Katrina999991`).

## Après publication

Les utilisateurs Fedora installent depuis Discover, ou :

```bash
flatpak install flathub ca.statis.GestionFlow
```

## Mises à jour

À chaque nouveau tag GitHub (`v0.1.2`, etc.) :

1. Publier le `.deb` amd64 sur la release.
2. Mettre à jour `url` et `sha256` dans `ca.statis.GestionFlow.yaml` (ou laisser `x-checker-data` le proposer).
3. Ajouter un `<release>` dans le metainfo.
4. Pousser sur `flathub/ca.statis.GestionFlow`.
