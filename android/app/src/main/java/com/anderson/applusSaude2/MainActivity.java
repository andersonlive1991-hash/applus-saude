package com.anderson.applusSaude2;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmPlugin.class);
        super.onCreate(savedInstanceState);
        criarCanalAlarme();
        verificarPararAlarme(getIntent());
        configurarAberturaPDFExterna();
    }

    private void configurarAberturaPDFExterna() {
        WebView webView = getBridge().getWebView();
        WebViewClient clienteOriginal = webView.getWebViewClient();
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.contains("/api/pdf/")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        return false;
                    }
                }
                if (clienteOriginal != null) {
                    return clienteOriginal.shouldOverrideUrlLoading(view, request);
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    private void criarCanalAlarme() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
            if (nm == null) return;
            nm.deleteNotificationChannel("alarme_med_v4");
            android.app.NotificationChannel channel = new android.app.NotificationChannel(
                "alarme_med_v4",
                "Alarme de Medicamento",
                android.app.NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            android.net.Uri som = android.media.RingtoneManager.getDefaultUri(
                android.media.RingtoneManager.TYPE_NOTIFICATION
            );
            channel.setSound(som, null);
            channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        verificarPararAlarme(intent);
    }

    private void verificarPararAlarme(Intent intent) {
        if (intent != null && intent.getBooleanExtra("pararAlarme", false)) {
            stopService(new Intent(this, AlarmService.class));
        }
    }

    public static void wakeScreen(android.app.Activity activity) {
        activity.runOnUiThread(() -> {
            activity.getWindow().addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD |
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
            );
        });
    }
}
