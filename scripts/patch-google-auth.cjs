const fs = require('fs');
const path = require('path');

const WEB_CLIENT_ID = '135467811448-gjhns9dorgp398v16pvrumseoa3nadgr.apps.googleusercontent.com';

const targetJavaFile = path.resolve(
  __dirname,
  '../node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/java/com/codetrixstudio/capacitor/GoogleAuth/GoogleAuth.java'
);

const targetStringsFile = path.resolve(
  __dirname,
  '../node_modules/@codetrix-studio/capacitor-google-auth/android/src/main/res/values/strings.xml'
);

const patchedGoogleAuthJava = `package com.codetrixstudio.capacitor.GoogleAuth;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.accounts.AccountManagerFuture;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.codetrixstudio.capacitor.GoogleAuth.capacitorgoogleauth.R;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.common.api.Scope;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@CapacitorPlugin()
public class GoogleAuth extends Plugin {
  private static final String TAG = "CapacitorGoogleAuth";
  private static final String FALLBACK_WEB_CLIENT_ID = "${WEB_CLIENT_ID}";
  private static final String VERIFY_TOKEN_URL = "https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=";
  private static final String FIELD_TOKEN_EXPIRES_IN = "expires_in";
  private static final String FIELD_ACCESS_TOKEN = "accessToken";
  private static final String FIELD_TOKEN_EXPIRES = "expires";
  private static final int SIGN_IN_CANCELLED = 12501;
  private static final int SIGN_IN_CURRENTLY_IN_PROGRESS = 12502;
  public static final int KAssumeStaleTokenSec = 60;

  private GoogleSignInClient googleSignInClient;

  private String sanitizeClientId(String raw) {
    if (raw == null) return FALLBACK_WEB_CLIENT_ID;
    String cleaned = raw.trim()
      .replaceFirst("^https?://", "")
      .replaceAll("/+$", "")
      .trim();
    if (cleaned.isEmpty() || "Your Web Client Key".equalsIgnoreCase(cleaned) || "null".equalsIgnoreCase(cleaned)) {
      return FALLBACK_WEB_CLIENT_ID;
    }
    return cleaned;
  }

  private String getAppSignatureSha1() {
    try {
      PackageManager pm = getContext().getPackageManager();
      String pkgName = getContext().getPackageName();
      Signature[] signatures = null;
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        PackageInfo info = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNING_CERTIFICATES);
        if (info.signingInfo != null) {
          signatures = info.signingInfo.hasMultipleSigners()
            ? info.signingInfo.getApkContentsSigners()
            : info.signingInfo.getSigningCertificateHistory();
        }
      } else {
        PackageInfo info = pm.getPackageInfo(pkgName, PackageManager.GET_SIGNATURES);
        signatures = info.signatures;
      }
      if (signatures != null && signatures.length > 0 && signatures[0] != null) {
        MessageDigest md = MessageDigest.getInstance("SHA-1");
        byte[] digest = md.digest(signatures[0].toByteArray());
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < digest.length; i++) {
          if (i > 0) sb.append(":");
          sb.append(String.format("%02X", digest[i]));
        }
        return sb.toString();
      }
    } catch (Exception ignored) {}
    return "UNKNOWN";
  }

  private String resolveConfiguredClientId(PluginCall call) {
    String candidate = null;
    if (call != null && call.getData() != null) {
      candidate = call.getData().getString("serverClientId", null);
      if (candidate == null || candidate.trim().isEmpty()) {
        candidate = call.getData().getString("clientId", null);
      }
      if (candidate == null || candidate.trim().isEmpty()) {
        candidate = call.getData().getString("androidClientId", null);
      }
    }
    if (candidate == null || candidate.trim().isEmpty()) {
      candidate = getConfig().getString("serverClientId", null);
    }
    if (candidate == null || candidate.trim().isEmpty()) {
      candidate = getConfig().getString("androidClientId", null);
    }
    if (candidate == null || candidate.trim().isEmpty()) {
      candidate = getConfig().getString("clientId", null);
    }
    if (candidate == null || candidate.trim().isEmpty()) {
      try {
        candidate = this.getContext().getString(R.string.server_client_id);
      } catch (Exception ignored) {}
    }
    return sanitizeClientId(candidate);
  }

  private String[] resolveScopes(PluginCall call) {
    List<String> parsed = new ArrayList<>();
    try {
      if (call != null && call.getData() != null && call.getData().has("scopes")) {
        Object rawScopes = call.getData().opt("scopes");
        if (rawScopes instanceof JSONArray) {
          JSONArray arr = (JSONArray) rawScopes;
          for (int i = 0; i < arr.length(); i++) {
            String s = arr.optString(i, "").trim();
            if (!s.isEmpty()) parsed.add(s);
          }
        } else if (rawScopes instanceof String) {
          String cleaned = ((String) rawScopes).replaceAll("[\\"\\\\[\\\\] ]", "").replace("\\\\", "");
          for (String part : cleaned.split(",")) {
            if (!part.trim().isEmpty()) parsed.add(part.trim());
          }
        }
      }
    } catch (Exception ignored) {}

    if (parsed.isEmpty()) {
      try {
        String[] cfgArr = getConfig().getArray("scopes", null);
        if (cfgArr != null) {
          for (String s : cfgArr) {
            if (s != null && !s.trim().isEmpty()) parsed.add(s.trim());
          }
        }
      } catch (Exception ignored) {}
    }

    return parsed.toArray(new String[0]);
  }

  public void loadSignInClient(String rawClientId, boolean forceCodeForRefreshToken, String[] scopeArray) {
    String clientId = sanitizeClientId(rawClientId);

    GoogleSignInOptions.Builder googleSignInBuilder = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
      .requestIdToken(clientId)
      .requestEmail()
      .requestProfile();

    if (forceCodeForRefreshToken) {
      googleSignInBuilder.requestServerAuthCode(clientId, false);
    }

    if (scopeArray != null && scopeArray.length > 0) {
      List<Scope> customScopes = new ArrayList<>();
      for (String rawScope : scopeArray) {
        if (rawScope == null) continue;
        String s = rawScope.trim();
        if (s.isEmpty() || "profile".equalsIgnoreCase(s) || "email".equalsIgnoreCase(s) || "openid".equalsIgnoreCase(s)) {
          continue;
        }
        customScopes.add(new Scope(s));
      }
      if (!customScopes.isEmpty()) {
        Scope firstScope = customScopes.get(0);
        Scope[] rest = new Scope[customScopes.size() - 1];
        for (int i = 1; i < customScopes.size(); i++) {
          rest[i - 1] = customScopes.get(i);
        }
        googleSignInBuilder.requestScopes(firstScope, rest);
      }
    }

    GoogleSignInOptions googleSignInOptions = googleSignInBuilder.build();
    googleSignInClient = GoogleSignIn.getClient(this.getContext(), googleSignInOptions);
  }

  @Override
  public void load() {
    try {
      String clientId = resolveConfiguredClientId(null);
      boolean forceCode = getConfig().getBoolean("forceCodeForRefreshToken", false);
      String[] scopes = resolveScopes(null);
      loadSignInClient(clientId, forceCode, scopes);
    } catch (Exception e) {
      Log.w(TAG, "Auto-init in load() deferred: " + e.getMessage());
    }
  }

  @PluginMethod()
  public void initialize(final PluginCall call) {
    try {
      String clientId = resolveConfiguredClientId(call);
      boolean configForceCode = getConfig().getBoolean("forceCodeForRefreshToken", false);
      boolean forceCode = call.getData() != null
        ? Boolean.TRUE.equals(call.getData().getBoolean("grantOfflineAccess", configForceCode))
        : configForceCode;
      String[] scopeArray = resolveScopes(call);

      loadSignInClient(clientId, forceCode, scopeArray);
      call.resolve();
    } catch (Exception e) {
      Log.e(TAG, "initialize error", e);
      call.reject("Failed to initialize GoogleAuth: " + e.getMessage(), e);
    }
  }

  @PluginMethod()
  public void signIn(final PluginCall call) {
    try {
      final String clientId = resolveConfiguredClientId(call);
      final boolean forceCode = getConfig().getBoolean("forceCodeForRefreshToken", false);
      final String[] scopes = resolveScopes(call);

      Activity activity = getActivity();
      if (activity != null) {
        activity.runOnUiThread(new Runnable() {
          @Override
          public void run() {
            try {
              loadSignInClient(clientId, forceCode, scopes);
              Intent signInIntent = googleSignInClient.getSignInIntent();
              startActivityForResult(call, signInIntent, "signInResult");
            } catch (Exception ex) {
              call.reject("Failed to launch Google Sign-In screen: " + ex.getMessage(), ex);
            }
          }
        });
      } else {
        loadSignInClient(clientId, forceCode, scopes);
        Intent signInIntent = googleSignInClient.getSignInIntent();
        startActivityForResult(call, signInIntent, "signInResult");
      }
    } catch (Exception e) {
      call.reject("Google Sign-In launch error: " + e.getMessage(), e);
    }
  }

  @ActivityCallback
  protected void signInResult(final PluginCall call, ActivityResult result) {
    if (call == null) return;
    if (result == null) {
      call.reject("The user canceled the sign-in flow.", "" + SIGN_IN_CANCELLED);
      return;
    }
    if (result.getData() == null && result.getResultCode() == Activity.RESULT_CANCELED) {
      call.reject("The user canceled the sign-in flow.", "" + SIGN_IN_CANCELLED);
      return;
    }

    Task<GoogleSignInAccount> completedTask = GoogleSignIn.getSignedInAccountFromIntent(result.getData());

    try {
      final GoogleSignInAccount account = completedTask.getResult(ApiException.class);

      ExecutorService executor = Executors.newSingleThreadExecutor();
      executor.execute(() -> {
        try {
          JSObject authentication = new JSObject();
          authentication.put("idToken", account.getIdToken());

          // Best-effort legacy accessToken retrieval; never fail login if idToken is already issued!
          if (account.getAccount() != null) {
            try {
              JSONObject accessTokenObject = getAuthToken(account.getAccount(), true);
              authentication.put(FIELD_ACCESS_TOKEN, accessTokenObject.optString(FIELD_ACCESS_TOKEN, ""));
              authentication.put(FIELD_TOKEN_EXPIRES, accessTokenObject.optLong(FIELD_TOKEN_EXPIRES, 0));
              authentication.put(FIELD_TOKEN_EXPIRES_IN, accessTokenObject.optInt(FIELD_TOKEN_EXPIRES_IN, 0));
            } catch (Exception tokenEx) {
              Log.w(TAG, "Optional accessToken lookup skipped (idToken already present): " + tokenEx.getMessage());
              authentication.put(FIELD_ACCESS_TOKEN, "");
            }
          } else {
            authentication.put(FIELD_ACCESS_TOKEN, "");
          }

          JSObject user = new JSObject();
          user.put("serverAuthCode", account.getServerAuthCode());
          user.put("idToken", account.getIdToken());
          user.put("authentication", authentication);
          user.put("name", account.getDisplayName());
          user.put("displayName", account.getDisplayName());
          user.put("email", account.getEmail());
          user.put("familyName", account.getFamilyName());
          user.put("givenName", account.getGivenName());
          user.put("id", account.getId());
          user.put("imageUrl", account.getPhotoUrl() != null ? account.getPhotoUrl().toString() : null);

          call.resolve(user);
        } catch (Exception e) {
          Log.e(TAG, "Unexpected error packaging Google account result", e);
          call.reject("Something went wrong while packaging Google account: " + e.getMessage(), e);
        }
      });
    } catch (ApiException e) {
      int code = e.getStatusCode();
      String runtimeSha1 = getAppSignatureSha1();
      Log.e(TAG, "GoogleSignIn ApiException statusCode=" + code + " pkg=" + getContext().getPackageName() + " sha1=" + runtimeSha1, e);
      if (SIGN_IN_CANCELLED == code || SIGN_IN_CURRENTLY_IN_PROGRESS == code) {
        call.reject("The user canceled the sign-in flow.", "" + code);
      } else if (code == 10) {
        call.reject("Google DEVELOPER_ERROR (code 10) [SHA-1: " + runtimeSha1 + "]", "10");
      } else if (code == 12500) {
        call.reject("Google SIGN_IN_FAILED (code 12500) [SHA-1: " + runtimeSha1 + "]", "12500");
      } else if (code == 7) {
        call.reject("Google NETWORK_ERROR (code 7): تعذر الاتصال بخدمات Google، تحقق من الإنترنت.", "7");
      } else {
        call.reject("Google Sign-In error (code " + code + ") [SHA-1: " + runtimeSha1 + "]: " + e.getMessage(), "" + code);
      }
    }
  }

  @PluginMethod()
  public void refresh(final PluginCall call) {
    GoogleSignInAccount account = GoogleSignIn.getLastSignedInAccount(getContext());
    if (account == null) {
      call.reject("User not logged in.");
    } else {
      ExecutorService executor = Executors.newSingleThreadExecutor();
      executor.execute(() -> {
        try {
          JSObject authentication = new JSObject();
          authentication.put("idToken", account.getIdToken());
          try {
            if (account.getAccount() != null) {
              JSONObject accessTokenObject = getAuthToken(account.getAccount(), true);
              authentication.put(FIELD_ACCESS_TOKEN, accessTokenObject.optString(FIELD_ACCESS_TOKEN, ""));
            } else {
              authentication.put(FIELD_ACCESS_TOKEN, "");
            }
          } catch (Exception tokenEx) {
            authentication.put(FIELD_ACCESS_TOKEN, "");
          }
          authentication.put("refreshToken", "");
          call.resolve(authentication);
        } catch (Exception e) {
          call.reject("Something went wrong while refreshing token: " + e.getMessage(), e);
        }
      });
    }
  }

  @PluginMethod()
  public void signOut(final PluginCall call) {
    if (googleSignInClient == null) {
      call.resolve();
      return;
    }
    googleSignInClient.signOut()
      .addOnSuccessListener(getActivity(), new OnSuccessListener<Void>() {
        @Override
        public void onSuccess(Void aVoid) {
          call.resolve();
        }
      })
      .addOnFailureListener(getActivity(), new OnFailureListener() {
        @Override
        public void onFailure(Exception e) {
          call.resolve();
        }
      });
  }

  private JSONObject getAuthToken(Account account, boolean retry) throws Exception {
    AccountManager manager = AccountManager.get(getContext());
    AccountManagerFuture<Bundle> future = manager.getAuthToken(account, "oauth2:profile email", null, false, null, null);
    Bundle bundle = future.getResult();
    String authToken = bundle != null ? bundle.getString(AccountManager.KEY_AUTHTOKEN) : null;
    if (authToken == null || authToken.isEmpty()) {
      throw new IOException("No AccountManager auth token returned");
    }
    try {
      return verifyToken(authToken);
    } catch (IOException e) {
      if (retry) {
        manager.invalidateAuthToken("com.google", authToken);
        return getAuthToken(account, false);
      } else {
        throw e;
      }
    }
  }

  private JSONObject verifyToken(String authToken) throws IOException, JSONException {
    URL url = new URL(VERIFY_TOKEN_URL + authToken);
    HttpURLConnection urlConnection = (HttpURLConnection) url.openConnection();
    urlConnection.setInstanceFollowRedirects(true);
    String stringResponse = fromStream(new BufferedInputStream(urlConnection.getInputStream()));
    JSONObject jsonResponse = new JSONObject(stringResponse);
    int expires_in = jsonResponse.getInt(FIELD_TOKEN_EXPIRES_IN);
    if (expires_in < KAssumeStaleTokenSec) {
      throw new IOException("Auth token soon expiring.");
    }
    jsonResponse.put(FIELD_ACCESS_TOKEN, authToken);
    jsonResponse.put(FIELD_TOKEN_EXPIRES, expires_in + (System.currentTimeMillis() / 1000));
    return jsonResponse;
  }

  private static String fromStream(InputStream is) throws IOException {
    BufferedReader reader = new BufferedReader(new InputStreamReader(is));
    StringBuilder sb = new StringBuilder();
    String line;
    while ((line = reader.readLine()) != null) {
      sb.append(line).append("\\n");
    }
    reader.close();
    return sb.toString();
  }
}
`;

if (fs.existsSync(targetJavaFile)) {
  fs.writeFileSync(targetJavaFile, patchedGoogleAuthJava, 'utf8');
  console.log('[Athar Patch] Successfully patched GoogleAuth.java with resilient ID-token & client-ID handling.');
} else {
  console.log('[Athar Patch] GoogleAuth.java not found in node_modules, skipping Java patch.');
}

if (fs.existsSync(targetStringsFile)) {
  const xmlContent = `<resources>\n    <string name="server_client_id" translatable="false">${WEB_CLIENT_ID}</string>\n</resources>\n`;
  fs.writeFileSync(targetStringsFile, xmlContent, 'utf8');
  console.log('[Athar Patch] Successfully synced plugin strings.xml server_client_id.');
}
