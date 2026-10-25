package org.openchess.academy;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://asthmarun569-commits.github.io/OpenChess-Academy/";
    private WebView webView;
    private TextView status;
    private Button retry;

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 18, 32));
        getWindow().setNavigationBarColor(Color.rgb(11, 18, 32));
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(11, 18, 32));
        status = new TextView(this);
        status.setText("OpenChess Academy");
        status.setTextColor(Color.WHITE);
        status.setTextSize(14);
        status.setPadding(16, 8, 16, 8);
        root.addView(status, new LinearLayout.LayoutParams(-1, -2));
        webView = new WebView(this);
        root.addView(webView, new LinearLayout.LayoutParams(-1, 0, 1));
        retry = new Button(this);
        retry.setText("Reload OpenChess");
        retry.setVisibility(View.GONE);
        retry.setOnClickListener(v -> webView.loadUrl(HOME_URL));
        root.addView(retry, new LinearLayout.LayoutParams(-1, -2));
        setContentView(root);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setSupportZoom(true);
        settings.setBuiltInZoomControls(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                status.setText("OpenChess Academy • Loading");
                retry.setVisibility(View.GONE);
            }
            @Override public void onPageFinished(WebView view, String url) {
                status.setText("OpenChess Academy");
                retry.setVisibility(View.GONE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    status.setText("Unable to load OpenChess");
                    retry.setVisibility(View.VISIBLE);
                }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String host = request.getUrl().getHost();
                return host == null || !(host.equals("asthmarun569-commits.github.io") || host.equals("lichess.org"));
            }
        });
        if (savedInstanceState == null) webView.loadUrl(HOME_URL);
        else webView.restoreState(savedInstanceState);
    }

    @Override protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }
    @Override public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
    @Override protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }
}
