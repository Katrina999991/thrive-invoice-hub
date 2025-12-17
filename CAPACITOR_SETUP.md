# Configuration Capacitor - Scanner de Code-barres

## Installation

Après avoir cloné le projet depuis GitHub :

```bash
npm install
npx cap add android
npx cap add ios
```

## Permissions Android

Ajoutez ces permissions dans `android/app/src/main/AndroidManifest.xml` avant la balise `<application>` :

```xml
<!-- Camera permission for barcode scanner -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

## Permissions iOS

Ajoutez cette entrée dans `ios/App/App/Info.plist` avant la balise `</dict>` finale :

```xml
<key>NSCameraUsageDescription</key>
<string>Cette application utilise la caméra pour scanner les codes-barres des produits.</string>
```

## Build et exécution

```bash
# Build l'application web
npm run build

# Sync avec les projets natifs
npx cap sync

# Lancer sur Android
npx cap run android

# Lancer sur iOS (Mac uniquement avec Xcode)
npx cap run ios
```

## Notes importantes

- Le scanner de code-barres ne fonctionne que sur l'application native (Android/iOS)
- Dans le navigateur web, un message d'erreur s'affichera
- Assurez-vous d'avoir Android Studio (pour Android) ou Xcode (pour iOS) installé

## Formats de code-barres supportés

- EAN-13, EAN-8
- UPC-A, UPC-E
- Code 39, Code 93, Code 128
- QR Code
