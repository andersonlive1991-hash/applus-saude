package com.anderson.applusSaude2;

import android.app.Activity;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.speech.tts.TextToSpeech;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.app.NotificationCompat;
import java.util.Locale;

public class AlarmActivity extends Activity {
    private static final String CHANNEL_ID = "alarme_medicamento";
    private MediaPlayer mediaPlayer;
    private TextToSpeech tts;
    private Vibrator vibrator;
    private Handler handler;
    private Runnable repetirVoz;
    private String fala;
    private boolean ttsReady = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
            WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        );
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
            KeyguardManager km = (KeyguardManager) getSystemService(KEYGUARD_SERVICE);
            if (km != null) km.requestDismissKeyguard(this, null);
        }

        String medNome = getIntent().getStringExtra("medNome");
        String medDose = getIntent().getStringExtra("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        fala = "Atenção! Está na hora de tomar " + medNome +
            (!medDose.isEmpty() ? ". A dose é " + medDose : "") +
            ". Por favor tome o seu medicamento agora.";

        tocarSom();
        vibrar();
        iniciarTTS();
        mostrarNotificacao(medNome, medDose);
        setContentView(criarLayout(medNome, medDose));
    }

    private void tocarSom() {
        try {
            Uri somUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (somUri == null) somUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            mediaPlayer = new MediaPlayer();
            AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            mediaPlayer.setAudioAttributes(attrs);
            mediaPlayer.setDataSource(this, somUri);
            mediaPlayer.setLooping(true);
            mediaPlayer.prepare();
            mediaPlayer.start();
        } catch (Exception e) { e.printStackTrace(); }
    }

    private void vibrar() {
        vibrator = (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrator != null) {
            long[] pattern = {0, 500, 200, 500};
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(pattern, 1));
            } else {
                vibrator.vibrate(pattern, 1);
            }
        }
    }

    private void iniciarTTS() {
        handler = new Handler(Looper.getMainLooper());
        tts = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.85f);
                ttsReady = true;
                handler.postDelayed(() -> falarTTS(), 2000);
                repetirVoz = new Runnable() {
                    @Override
                    public void run() {
                        falarTTS();
                        handler.postDelayed(this, 30000);
                    }
                };
                handler.postDelayed(repetirVoz, 32000);
            }
        });
    }

    private void falarTTS() {
        if (tts != null && ttsReady) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null, "alarme");
            } else {
                tts.speak(fala, TextToSpeech.QUEUE_FLUSH, null);
            }
        }
    }

    private void mostrarNotificacao(String medNome, String medDose) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(channel);
        }
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.putExtra("pararAlarme", true);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pi = PendingIntent.getActivity(this, 0, mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        String texto = !medDose.isEmpty() ? medNome + " — " + medDose : medNome;
        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText("Toque para confirmar: " + texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pi)
            .setOngoing(true)
            .setAutoCancel(false)
            .build();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(1001, notification);
    }

    private LinearLayout criarLayout(String medNome, String medDose) {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFF0F6647);
        layout.setPadding(60, 80, 60, 80);

        TextView emoji = new TextView(this);
        emoji.setText("💊");
        emoji.setTextSize(80);
        emoji.setGravity(Gravity.CENTER);

        TextView titulo = new TextView(this);
        titulo.setText("Hora do medicamento!");
        titulo.setTextSize(22);
        titulo.setTextColor(0xFFFFFFFF);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD);
        titulo.setGravity(Gravity.CENTER);
        titulo.setPadding(0, 20, 0, 8);

        TextView nome = new TextView(this);
        nome.setText(medNome);
        nome.setTextSize(30);
        nome.setTextColor(0xFFFFFFFF);
        nome.setTypeface(null, android.graphics.Typeface.BOLD);
        nome.setGravity(Gravity.CENTER);

        TextView dose = new TextView(this);
        dose.setText(medDose);
        dose.setTextSize(18);
        dose.setTextColor(0xCCFFFFFF);
        dose.setGravity(Gravity.CENTER);
        dose.setPadding(0, 8, 0, 60);

        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT,
            LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, 20);

        Button btnTomei = new Button(this);
        btnTomei.setText("✅ Tomei agora!");
        btnTomei.setTextSize(18);
        btnTomei.setTextColor(0xFF0F6647);
        btnTomei.setBackgroundColor(0xFFFFFFFF);
        btnTomei.setLayoutParams(params);
        btnTomei.setOnClickListener(v -> confirmarEFechar());

        Button btnPular = new Button(this);
        btnPular.setText("⏭ Pular essa dose");
        btnPular.setTextSize(16);
        btnPular.setTextColor(0xFFFFFFFF);
        btnPular.setBackgroundColor(0x44FFFFFF);
        btnPular.setLayoutParams(params);
        btnPular.setOnClickListener(v -> confirmarEFechar());

        layout.addView(emoji);
        layout.addView(titulo);
        layout.addView(nome);
        layout.addView(dose);
        layout.addView(btnTomei);
        layout.addView(btnPular);

        return layout;
    }

    private void confirmarEFechar() {
        pararTudo();
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(1001);
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(mainIntent);
        finish();
    }

    private void pararTudo() {
        if (handler != null && repetirVoz != null) handler.removeCallbacks(repetirVoz);
        if (tts != null) { tts.stop(); tts.shutdown(); tts = null; }
        if (mediaPlayer != null) { mediaPlayer.stop(); mediaPlayer.release(); mediaPlayer = null; }
        if (vibrator != null) vibrator.cancel();
    }

    @Override
    public void onBackPressed() {}

    @Override
    protected void onDestroy() {
        pararTudo();
        super.onDestroy();
    }
}
