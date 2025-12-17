import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.fe52a70f412542ddbd8d6befbc59cc36',
  appName: 'thrive-invoice-hub',
  webDir: 'dist',
  server: {
    url: 'https://fe52a70f-4125-42dd-bd8d-6befbc59cc36.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    // Barcode Scanner configuration
    BarcodeScanner: {
      // Enable torch/flashlight support
      enableTorchButton: true,
      // Android-specific settings
      android: {
        // Enable camera permission
        enableCameraPermission: true
      }
    }
  },
  // iOS specific configuration
  ios: {
    // Required for camera access
    contentInset: 'automatic'
  },
  // Android specific configuration  
  android: {
    // Allow cleartext traffic for development
    allowMixedContent: true
  }
};

export default config;
