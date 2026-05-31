package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
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
    // Canal novo (v2) para forçar recriação com IMPORTANCE_HIGH
    private static final String CHANNEL_ID = "alarme_med_v2";
    public static boolean ativo = false;

    private PowerManager.WakeLock wakeLock;
    private TextToSpeech tts;
    private Handler handler;
    private Runnable repetirVoz;
    private android.media.MediaPlayer mediaPlayer;
    private String medNome;
    private String medDose;
    private String medId;
    private boolean ttsReady = false;

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        medNome = intent != null ? intent.getStringExtra("medNome") : "Medicamento";
        medDose = intent != null ? intent.getStringExtra("medDose") : "";
        medId   = intent != null ? intent.getStringExtra("medId")   : "";
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";
        if (medId   == null) medId   = "";

        ativo = true;
        handler = new Handler(Looper.getMainLooper());

        // 1. Canal ANTES de tudo
        criarCanalNotificacao();

        // 2. startForeground IMEDIATAMENTE
        Notification notification = construirNotificacao();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(1, notification);
        }

        // 3. WakeLock
        adquirirWakeLock();

        // 4. Som nativo
        tocarSomNativo();

        // 5. Vibrar
        vibrar();

        // 6. TTS
        iniciarTTS();

        return START_STICKY;
    }

    private Notification construirNotificacao() {
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

        Intent tomeiIntent = new Intent(this, AlarmReceiver.class);
        tomeiIntent.setAction("PARAR_ALARME");
        tomeiIntent.putExtra("medId", medId);
        PendingIntent tomeiPi = PendingIntent.getBroadcast(
            this, 9999, tomeiIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText("Toque para confirmar: " + texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(pi, true)
            .setContentIntent(pi)
            .addAction(android.R.drawable.ic_media_play, "✅ Tomei agora", tomeiPi)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVibrate(new long[]{0, 500, 200, 500})
            .build();
    }

    private void tocarSomNativo() {
        try {
            Uri alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (alarmUri == null) {
                alarmUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            }
            mediaPlayer = new android.media.MediaPlayer();
            mediaPlayer.setDataSource(this, alarmUri);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                AudioAttributes aa = new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build();
                mediaPlayer.setAudioAttributes(aa);
            } else {
                mediaPlayer.setAudioStreamType(AudioManager.STREAM_ALARM);
            }
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void vibrar() {
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 600, 300, 600, 300, 600};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 0));
            } else {
                vibrator.vibrate(pattern, 0);
            }
        }
    }

    private void pararVibracao() {
        Vibrator vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null) vibrator.cancel();
    }

    private void iniciarTTS() {
        final String nome = medNome;
        final String dose = medDose;
        final String fala = "Atenção! Está na hora de tomar " + nome +
            (dose != null && !dose.isEmpty() ? ". A dose é " + dose : "") +
            ". Por favor tome o seu medicamento agora.";

        // Usar getApplicationContext() em vez de this — mais estável com app fechado
        tts = new TextToSpeech(getApplicationContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.9f);
                ttsReady = true;
                handler.postDelayed(() -> falar(fala), 2000);

                repetirVoz = new Runnable() {
                    @Override
                    public void run() {
                        if (ativo && ttsReady) {
                            falar(fala);
                            handler.postDelayed(this, 30000);
                        }
                    }
                };
                handler.postDelayed(repetirVoz, 32000);
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

    private void criarCanalNotificacao() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;
            // Só cria se não existir ainda
            if (manager.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
                );
                channel.enableVibration(true);
                channel.setVibrationPattern(new long[]{0, 500, 200, 500});
                channel.setBypassDnd(true);
                channel.setSound(
                    RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM),
                    new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                );
                manager.createNotificationChannel(channel);
            }
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
        if (mediaPlayer != null) {
            if (mediaPlayer.isPlaying()) mediaPlayer.stop();
            mediaPlayer.release();
            mediaPlayer = null;
        }
        pararVibracao();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(1);
        stopForeground(true);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
