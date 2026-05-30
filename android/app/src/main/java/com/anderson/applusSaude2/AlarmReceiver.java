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
import android.util.Log;
import androidx.core.app.NotificationCompat;
import java.util.Locale;
import java.util.Timer;
import java.util.TimerTask;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "alarme_medicamento";
    private static final String TAG = "ApplusAlarme";
    public static TextToSpeech ttsStatic = null;
    public static Timer timerRepetir = null;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "AlarmReceiver disparado!");

        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        final String nome = medNome;
        final String dose = medDose;
        final String fala = "Atenção! Está na hora de tomar " + nome +
            (!dose.isEmpty() ? ". A dose é " + dose : "") +
            ". Por favor tome o seu medicamento agora.";

        // WakeLock forte
        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "applus:receiver"
            );
            wl.acquire(600000);
        }

        // Vibrar em loop
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 500, 200, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
            } else {
                vibrator.vibrate(pattern, 1);
            }
        }

        // Notificação persistente
        criarCanalNotificacao(context);
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.putExtra("pararAlarme", true);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            context, (int) System.currentTimeMillis(), mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = !dose.isEmpty() ? nome + " — " + dose : nome;
        Notification notification = new NotificationCompat.Builder(context, CHANNEL_ID)
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

        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(1001, notification);

        // TTS com repeticao - totalmente inline, sem depender do Service
        final Context appContext = context.getApplicationContext();
        new Handler(Looper.getMainLooper()).post(() -> {
            pararTudo();
            ttsStatic = new TextToSpeech(appContext, status -> {
                if (status == TextToSpeech.SUCCESS) {
                    ttsStatic.setLanguage(new Locale("pt", "BR"));
                    ttsStatic.setSpeechRate(0.9f);
                    falarTTS(fala);
                    timerRepetir = new Timer();
                    timerRepetir.scheduleAtFixedRate(new TimerTask() {
                        @Override
                        public void run() {
                            new Handler(Looper.getMainLooper()).post(() -> falarTTS(fala));
                        }
                    }, 30000, 30000);
                    Log.d(TAG, "TTS iniciado com repeticao a cada 30s");
                }
            });
        });
    }

    public static void falarTTS(String texto) {
        if (ttsStatic != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                ttsStatic.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "alarme");
            } else {
                ttsStatic.speak(texto, TextToSpeech.QUEUE_FLUSH, null);
            }
        }
    }

    public static void pararTudo() {
        if (timerRepetir != null) { timerRepetir.cancel(); timerRepetir = null; }
        if (ttsStatic != null) { ttsStatic.stop(); ttsStatic.shutdown(); ttsStatic = null; }
    }

    private void criarCanalNotificacao(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);
            NotificationManager nm2 = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm2 != null) nm2.createNotificationChannel(channel);
        }
    }
}
