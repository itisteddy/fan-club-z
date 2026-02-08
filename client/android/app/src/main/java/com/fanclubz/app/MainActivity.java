package com.fanclubz.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.content.pm.ApplicationInfo;

import com.getcapacitor.BridgeActivity;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    
    // Allow http/ws connections from the embedded https WebView in debug builds.
    try {
      boolean isDebug = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
      if (isDebug) {
        getBridge().getWebView().getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
      }
    } catch (Exception ignored) {
      // If the WebView isn't ready yet, the default will apply.
    }

    // Deterministic safe-area top inset for Android:
    // Compute window insets (status bar + cutout) and inject as CSS variable:
    //   --app-safe-top: <N>px
    final View root = getWindow().getDecorView();
    ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
      Insets bars = insets.getInsets(WindowInsetsCompat.Type.statusBars() | WindowInsetsCompat.Type.displayCutout());
      final int topPx = Math.max(0, bars.top);
      try {
        getBridge()
          .getWebView()
          .evaluateJavascript("document.documentElement.style.setProperty('--app-safe-top','" + topPx + "px');", null);
      } catch (Exception ignored) {
        // If the WebView isn't ready yet, next inset pass will set it.
      }
      return insets;
    });
    ViewCompat.requestApplyInsets(root);
  }
}
