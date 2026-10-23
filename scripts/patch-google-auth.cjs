const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // Guard signOut against NullPointerException when googleSignInClient is null
  const originalSignOut = `  @PluginMethod()
  public void signOut(final PluginCall call) {
    googleSignInClient.signOut()`;

  const patchedSignOut = `  @PluginMethod()
  public void signOut(final PluginCall call) {
    if (googleSignInClient == null) {
      call.resolve();
      return;
    }
    googleSignInClient.signOut()`;

  if (content.includes(originalSignOut)) {
    content = content.replace(originalSignOut, patchedSignOut);
    fs.writeFileSync(targetFile, content, 'utf8');
    console.log('[Athar Patch] Successfully patched GoogleAuth.java signOut null-pointer guard.');
  } else if (content.includes('if (googleSignInClient == null) {')) {
    console.log('[Athar Patch] GoogleAuth.java is already patched.');
  } else {
    console.warn('[Athar Patch] Could not locate exact pattern in GoogleAuth.java');
  }
} else {
  console.log('[Athar Patch] GoogleAuth.java not found in node_modules, skipping patch.');
}
