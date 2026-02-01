# Solana Vibes – Android TWA (Solana dApp Store)

This folder is used to build the **Trusted Web Activity (TWA)** Android app for the Solana dApp Store. The app is a thin shell that opens your deployed PWA; the real app runs at your production URL.

## Prerequisites

- **Node.js** v18+
- **Bubblewrap CLI**: `npm install -g @bubblewrap/cli`
- **Solana dApp Store CLI** (for submission): `npm install -g @solana-mobile/dapp-store-cli`
- **JDK 17** and **Android build tools** (Bubblewrap can install these when you run `init`)

## Before you start

1. **Deploy the web app** to HTTPS (e.g. Vercel, your domain). Note the URL (e.g. `solanavibes.vercel.app` or `app.yourdomain.com`).
2. **Replace placeholders** in this repo:
   - In **`android/twa-manifest.json`**: set `host` to your domain (no `https://`, no path), and replace every `your-production-domain.com` with that same host (icon URLs, `webManifestUrl`).
   - After you create the keystore (step below), get your **SHA-256 fingerprint** and update:
     - **`android/twa-manifest.json`** → `fingerprints[0].sha256Fingerprint`
     - **`public/.well-known/assetlinks.json`** → `sha256_cert_fingerprints[0]`
   - Fingerprint format: **uppercase hex with colons** (e.g. `EA:78:51:A3:...`). From keystore:  
     `keytool -list -v -keystore android/android.keystore -alias android` → copy the SHA256 line and convert to that format.

## One-time setup

### 1. Create Android keystore (do this once; keep it safe)

```bash
# From repo root
keytool -genkeypair -v -keystore android/android.keystore -alias android -keyalg RSA -keysize 2048 -validity 10000
```

Store the passwords somewhere secure. Create **`android/keystore.properties`** (already gitignored):

```properties
storePassword=YOUR_KEYSTORE_PASSWORD
keyPassword=YOUR_KEY_PASSWORD
keyAlias=android
storeFile=android.keystore
```

### 2. Get SHA-256 fingerprint and update configs

```bash
keytool -list -v -keystore android/android.keystore -alias android
```

Copy the SHA-256 fingerprint, convert to uppercase-with-colons, then update:

- `android/twa-manifest.json` → `fingerprints[0].sha256Fingerprint`
- `public/.well-known/assetlinks.json` → `sha256_cert_fingerprints[0]`

### 3. Generate Android project with Bubblewrap

```bash
cd android
npx @bubblewrap/cli init --manifest twa-manifest.json
```

Follow prompts (Bubblewrap may install JDK/Android SDK). This creates the Gradle project, `app/`, etc.

### 4. Deploy `assetlinks.json`

Ensure `https://YOUR_DOMAIN/.well-known/assetlinks.json` is served (Next.js `public/.well-known/` is enough). No redirects; response must be JSON. After deploy, wait ~10–15 minutes for caches; then the TWA URL bar can verify and hide.

## Building a release APK

1. **Bump version** in:
   - `android/app/build.gradle` → `versionCode`, `versionName`
   - `android/twa-manifest.json` → `appVersionCode`, `appVersionName`
   - If using dApp Store CLI config: `android/config.yaml` (when you add it)

2. **Regenerate if manifest changed**:
   ```bash
   cd android
   npx @bubblewrap/cli update --manifest twa-manifest.json
   ```

3. **Build**:
   ```bash
   cd android
   ./gradlew clean assembleRelease
   ```

4. **Sign** the APK (unsigned output is in `app/build/outputs/apk/release/`). Use your keystore and `apksigner` (from Android build tools, or Bubblewrap’s SDK path). Example (paths may differ):
   ```bash
   zipalign -v 4 app/build/outputs/apk/release/app-release-unsigned.apk releases/app-release-aligned.apk
   apksigner sign --ks android.keystore --ks-key-alias android --out releases/app-release-signed.apk releases/app-release-aligned.apk
   ```

5. **Verify** fingerprint of the signed APK matches `assetlinks.json`:
   ```bash
   apksigner verify --print-certs releases/app-release-signed.apk
   ```

## Submitting to Solana dApp Store

Use the [Solana dApp Store publishing docs](https://docs.solanamobile.com/dapp-publishing/overview): mint App NFT, create Release NFT, submit the signed APK via the publisher portal / CLI.

## Reference

- Full TWA + assetlinks steps: **`cursor-rules/twa-deployment-rules.md`**
- Seeker / Seed Vault: **`cursor-rules/seeker-integration-rules.md`**
