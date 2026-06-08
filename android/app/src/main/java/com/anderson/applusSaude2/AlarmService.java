package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AlarmService extends Service {
    private static final String CHANNEL_ID = "alarme_medicamento";
    public static boolean ativo = false;

    private PowerManager.WakeLock wakeLock;
    private TextToSpeech tts;
    private Handler handler;
    private Runnable repetirVoz;
    private String medNome;
    private String medDose;
    private boolean ttsReady = false;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        medNome = intent != null ? intent.getStringExtra("medNome") : "Medicamento";
        medDose = intent != null ? intent.getStringExtra("medDose") : "";
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        ativo = true;
        handler = new Handler(Looper.getMainLooper());

        criarCanalNotificacao();
        adquirirWakeLock();
        mostrarNotificacao();
        iniciarTTS();

        return START_STICKY;
    }

    private void iniciarTTS() {
        final String nome = medNome;
        final String dose = medDose;
        final String fala = "Atenção! Está na hora de tomar " + nome +
            (dose != null && !dose.isEmpty() ? ". A dose é " + dose : "") +
            ". Por favor tome o seu medicamento agora.";

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.9f);
                ttsReady = true;
                falar(fala);

                repetirVoz = new Runnable() {
                    @Override
                    public void run() {
                        if (ativo && ttsReady) {
                            falar(fala);
                            handler.postDelayed(this, 30000);
                        }
                    }
                };
                handler.postDelayed(repetirVoz, 30000);
            }
        });
    }

    private void falar(String texto) {
        if (tts != null && ttsReady) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "alarme");
            } else {
                tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null);
            }
        }
    }

    private void mostrarNotificacao() {
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.putExtra("pararAlarme", true);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = (medDose != null && !medDose.isEmpty())
            ? medNome + " — " + medDose
            : medNome;

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

        startForeground(1, notification);
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    private void adquirirWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(
                PowerManager.PARTIAL_WAKE_LOCK | PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "applus:alarme"
            );
            wakeLock.acquire(600000);
        }
    }

    @Override
    public void onDestroy() {
        ativo = false;
        ttsReady = false;
        if (handler != null && repetirVoz != null) handler.removeCallbacks(repetirVoz);
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
