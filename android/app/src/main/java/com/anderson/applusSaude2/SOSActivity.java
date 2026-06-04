package com.anderson.applusSaude2;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.Gravity;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class SOSActivity extends Activity {
    private android.media.MediaPlayer mp;
    private Handler handler = new Handler();
    private int segundos = 0;
    private TextView tvTimer;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            window.addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String nome = getIntent().getStringExtra("nome");
        if (nome == null) nome = "Familiar";

        ScrollView scroll = new ScrollView(this);
        scroll.setBackgroundColor(0xFFB91C1C);
        scroll.setFillViewport(true);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setGravity(Gravity.CENTER);
        layout.setBackgroundColor(0xFFB91C1C);
        layout.setPadding(48, 96, 48, 96);

        TextView titulo = new TextView(this);
        titulo.setText("🚨 EMERGENCIA SOS!");
        titulo.setTextSize(24);
        titulo.setTextColor(0xFFFFFFFF);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD);
        titulo.setGravity(Gravity.CENTER);
        titulo.setPadding(0, 0, 0, 24);
        layout.addView(titulo);

        TextView tvNome = new TextView(this);
        tvNome.setText(nome + " precisa de ajuda!");
        tvNome.setTextSize(20);
        tvNome.setTextColor(0xFFFFFFFF);
        tvNome.setGravity(Gravity.CENTER);
        tvNome.setPadding(0, 0, 0, 16);
        layout.addView(tvNome);

        tvTimer = new TextView(this);
        tvTimer.setText("00:00");
        tvTimer.setTextSize(18);
        tvTimer.setTextColor(0xCCFFFFFF);
        tvTimer.setGravity(Gravity.CENTER);
        tvTimer.setPadding(0, 0, 0, 48);
        layout.addView(tvTimer);

        Button btnAtender = new Button(this);
        btnAtender.setText("ATENDER");
        btnAtender.setTextSize(20);
        btnAtender.setTextColor(0xFFB91C1C);
        btnAtender.setBackgroundColor(0xFFFFFFFF);
        btnAtender.setTypeface(null, android.graphics.Typeface.BOLD);
        LinearLayout.LayoutParams p1 = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 160);
        p1.setMargins(0, 0, 0, 24);
        btnAtender.setLayoutParams(p1);
        btnAtender.setOnClickListener(v -> atender());
        layout.addView(btnAtender);

        Button btnRecusar = new Button(this);
        btnRecusar.setText("Ignorar");
        btnRecusar.setTextSize(16);
        btnRecusar.setTextColor(0xFFFFFFFF);
        btnRecusar.setBackgroundColor(0x44FFFFFF);
        LinearLayout.LayoutParams p2 = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 120);
        btnRecusar.setLayoutParams(p2);
        btnRecusar.setOnClickListener(v -> fechar());
        layout.addView(btnRecusar);

        scroll.addView(layout);
        setContentView(scroll);

        tocarSom();
        iniciarTimer();
    }

    private void iniciarTimer() {
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                segundos++;
                int min = segundos / 60;
                int sec = segundos % 60;
                if (tvTimer != null) tvTimer.setText(String.format("%02d:%02d", min, sec));
                handler.postDelayed(this, 1000);
            }
        }, 1000);
    }

    private void atender() {
        pararSom();
        handler.removeCallbacksAndMessages(null);
        Intent intent = new Intent(this, MainActivity.class);
        intent.putExtra("atenderSOS", true);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
        finish();
    }

    private void fechar() {
        pararSom();
        handler.removeCallbacksAndMessages(null);
        finish();
    }

    private void tocarSom() {
        try {
            mp = new android.media.MediaPlayer();
            android.net.Uri som = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE);
            android.media.AudioAttributes attrs = new android.media.AudioAttributes.Builder().setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION).build();
            mp.setAudioAttributes(attrs);
            mp.setDataSource(getApplicationContext(), som);
            mp.setLooping(true);
            mp.prepare();
            mp.start();
        } catch (Exception e) {
            android.util.Log.e("SOSActivity", "Erro som: " + e.getMessage());
        }
    }

    private void pararSom() {
        if (mp != null) {
            try { mp.stop(); mp.release(); } catch (Exception ignored) {}
            mp = null;
        }
    }

    @Override
    public void onBackPressed() { fechar(); }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        pararSom();
        handler.removeCallbacksAndMessages(null);
    }
}
