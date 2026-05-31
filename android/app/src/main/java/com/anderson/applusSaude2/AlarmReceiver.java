package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "alarme_medicamento";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();

        // Ação de parar vinda do botão da notificação
        if ("PARAR_ALARME".equals(action)) {
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

        // WakeLock imediato para garantir que o processo não morra antes de iniciar o Service
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:receiver"
            );
            wl.acquire(15000); // 15s para dar tempo do Service subir
        }

        // Iniciar AlarmService como ForegroundService
        // No Android 12+: isso FUNCIONA quando disparado por AlarmManager.setAlarmClock()
        // pois setAlarmClock() concede permissão temporária para iniciar ForegroundService
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", medNome);
        serviceIntent.putExtra("medDose", medDose);
        serviceIntent.putExtra("medId",   medId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }

        // Liberar WakeLock (o Service agora tem o próprio)
        if (wl != null && wl.isHeld()) wl.release();
    }
}
