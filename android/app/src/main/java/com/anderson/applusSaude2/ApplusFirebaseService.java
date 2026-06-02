package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ApplusFirebaseService extends FirebaseMessagingService {
    private static final String CHANNEL_ID = "alarme_medicamento";
    private static final String TAG = "ApplusFCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM recebido!");

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        String tipo = data.get("tipo");
        if (!"alarme-medicamento".equals(tipo)) return;

        String medNome = data.getOrDefault("medNome", "Medicamento");
        String medDose = data.getOrDefault("medDose", "");

        // WakeLock
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:fcm"
            );
            wl.acquire(60000);
        }

        // Vibrar
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 500, 200, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
            } else {
                vibrator.vibrate(pattern, 1);
            }
        }

        // Notificação
        criarCanalNotificacao();
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.putExtra("pararAlarme", true);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, (int) System.currentTimeMillis(), mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        String texto = !medDose.isEmpty() ? medNome + " — " + medDose : medNome;
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText("Toque para confirmar: " + texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pi, true)
            .setContentIntent(pi)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVibrate(new long[]{0, 500, 200, 500})
            .build();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(1001, notification);

        // Abre AlarmActivity diretamente — como despertador nativo
        Intent alarmIntent = new Intent(this, AlarmActivity.class);
        alarmIntent.putExtra("medNome", medNome);
        alarmIntent.putExtra("medDose", medDose);
        alarmIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION |
            Intent.FLAG_ACTIVITY_NO_HISTORY
        );
        startActivity(alarmIntent);
        Log.d(TAG, "AlarmActivity aberta via FCM");
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            // Som de alarme nativo
            android.net.Uri somAlarme = android.media.RingtoneManager.getDefaultUri(
                android.media.RingtoneManager.TYPE_ALARM
            );
            android.media.AudioAttributes audioAttrs = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(somAlarme, audioAttrs);
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                // Deleta canal antigo para recriar com som
                nm.deleteNotificationChannel(CHANNEL_ID);
                nm.createNotificationChannel(channel);
            }
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Novo token FCM: " + token);
    }
}
