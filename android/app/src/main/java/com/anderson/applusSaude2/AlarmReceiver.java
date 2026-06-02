package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "alarme_med_v2";

    @Override
    public void onReceive(Context context, Intent intent) {
        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        final String nome = medNome;
        final String dose = medDose;

        // WakeLock
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:receiver"
            );
            wl.acquire(30000);
        }

        // Vibrar
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 500, 200, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, -1));
            } else {
                vibrator.vibrate(pattern, -1);
            }
        }

        // Notificação
        criarCanalNotificacao(context);
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, (int) System.currentTimeMillis(), mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = !dose.isEmpty() ? nome + " — " + dose : nome;
        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText(texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pi, true)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .setVibrate(new long[]{0, 500, 200, 500})
            .build();

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(1001, notification);

        // TTS na thread principal
        new Handler(Looper.getMainLooper()).post(() -> {
            String fala = "Atenção! Está na hora de tomar " + nome +
                (!dose.isEmpty() ? ". A dose é " + dose : "") +
                ". Por favor tome o seu medicamento agora.";

            TextToSpeech[] ttsHolder = new TextToSpeech[1];
            ttsHolder[0] = new TextToSpeech(context, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    ttsHolder[0].setLanguage(new Locale("pt", "BR"));
                    ttsHolder[0].setSpeechRate(0.9f);
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                        ttsHolder[0].speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
                    } else {
                        ttsHolder[0].speak(fala, TextToSpeech.QUEUE_FLUSH, null);
                    }
                }
            });
        });

        // Service como fallback para manter processo vivo
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", nome);
        serviceIntent.putExtra("medDose", dose);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }

    private void criarCanalNotificacao(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }
}
