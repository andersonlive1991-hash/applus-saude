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
import android.os.Vibrator;
import android.os.VibrationEffect;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "alarme_medicamento";

    @Override
    public void onReceive(Context context, Intent intent) {
        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        // WakeLock para manter CPU ativa
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wl = null;
        if (pm != null) {
            wl = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:receiver"
            );
            wl.acquire(20000);
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
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = !medDose.isEmpty() ? medNome + " — " + medDose : medNome;
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

        // TTS — falar o medicamento
        final String finalNome = medNome;
        final String finalDose = medDose;
        final PowerManager.WakeLock finalWl = wl;
        TextToSpeech tts = new TextToSpeech(context, status -> {
            if (status == TextToSpeech.SUCCESS) {
                String fala = "Atenção! Está na hora de tomar " + finalNome +
                    (!finalDose.isEmpty() ? ". A dose é " + finalDose : "") +
                    ". Por favor tome o seu medicamento agora.";
                try {
                    TextToSpeech ttsRef = (TextToSpeech) Thread.currentThread().getContextClassLoader();
                } catch (Exception ignored) {}
            }
            if (finalWl != null && finalWl.isHeld()) finalWl.release();
        });
        tts.setLanguage(new Locale("pt", "BR"));
        tts.setSpeechRate(0.9f);
        String fala = "Atenção! Está na hora de tomar " + finalNome +
            (!finalDose.isEmpty() ? ". A dose é " + finalDose : "") +
            ". Por favor tome o seu medicamento agora.";
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
        } else {
            tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null);
        }

        // Também inicia o Service como fallback
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", medNome);
        serviceIntent.putExtra("medDose", medDose);
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
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) nm.createNotificationChannel(channel);
        }
    }
}
