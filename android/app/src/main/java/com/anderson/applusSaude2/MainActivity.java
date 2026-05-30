package com.anderson.applusSaude2;

import android.content.Intent;
import android.os.Bundle;
import android.view.WindowManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AlarmPlugin.class);
        super.onCreate(savedInstanceState);
        verificarPararAlarme(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        verificarPararAlarme(intent);
    }

    private void verificarPararAlarme(Intent intent) {
        if (intent != null && intent.getBooleanExtra("pararAlarme", false)) {
            stopService(new Intent(this, AlarmService.class));
            AlarmReceiver.pararTudo();
            android.app.NotificationManager nm =
                (android.app.NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(1001);
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
