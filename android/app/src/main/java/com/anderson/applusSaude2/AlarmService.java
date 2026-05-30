package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.speech.tts.TextToSpeech;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AlarmService extends Service {
    private static final String CHANNEL_ID = "alarme_medicamento";
    private PowerManager.WakeLock wakeLock;
    private TextToSpeech tts;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String medNome = intent != null ? intent.getStringExtra("medNome") : "Medicamento";
        String medDose = intent != null ? intent.getStringExtra("medDose") : "";

        criarCanalNotificacao();
        adquirirWakeLock();

        // Intent para abrir app na tela de medicamentos
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = medDose != null && !medDose.isEmpty()
            ? medNome + " — " + medDose
            : medNome;

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText(texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pendingIntent, true)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build();

        startForeground(1, notification);

        // Fala o nome do medicamento via TTS
        String fala = "Atenção! Está na hora de tomar " + medNome +
            (medDose != null && !medDose.isEmpty() ? ". A dose é " + medDose : "") +
            ". Por favor tome o seu medicamento agora.";

        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.9f);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
                } else {
                    tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null);
                }
            }
        });

        // Para o serviço após 30 segundos
        new android.os.Handler().postDelayed(() -> stopSelf(), 30000);

        return START_NOT_STICKY;
    }

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Alarme de Medicamento",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alarmes de medicamentos AP+ Saúde");
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
                PowerManager.PARTIAL_WAKE_LOCK,
                "applus:alarme"
            );
            wakeLock.acquire(35000);
        }
    }

    @Override
    public void onDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
