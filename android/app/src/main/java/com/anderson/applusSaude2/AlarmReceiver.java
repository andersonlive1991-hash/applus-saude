package com.anderson.applusSaude2;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "AP_AlarmReceiver";
    private static final String CHANNEL_ID = "alarme_med_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        Log.d(TAG, "onReceive() action=" + action);

        if ("PARAR_ALARME".equals(action)) {
            Log.d(TAG, "Parando alarme via botão notificação");
            context.stopService(new Intent(context, AlarmService.class));
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.cancel(1);
            return;
        }

        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        String medId   = intent.getStringExtra("medId");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";
        if (medId   == null) medId   = "";

        Log.d(TAG, "Alarme recebido: nome=" + medNome + " id=" + medId);

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:receiver"
            );
            wl.acquire(15000);
            Log.d(TAG, "WakeLock adquirido");
        }

        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", medNome);
        serviceIntent.putExtra("medDose", medDose);
        serviceIntent.putExtra("medId",   medId);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
                Log.d(TAG, "startForegroundService() chamado");
            } else {
                context.startService(serviceIntent);
                Log.d(TAG, "startService() chamado");
            }
        } catch (Exception e) {
            Log.e(TAG, "ERRO ao iniciar AlarmService: " + e.getMessage());
        }

        if (wl != null && wl.isHeld()) wl.release();
    }
}
