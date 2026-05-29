package com.anderson.applusSaude2;

import android.app.Activity;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.TextView;

public class AlarmActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Window window = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON  |
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON  |
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            );
        }
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        String medNome = getIntent().getStringExtra("medNome");
        String medDose = getIntent().getStringExtra("medDose");
        String medId   = getIntent().getStringExtra("medId");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        android.widget.LinearLayout layout = new android.widget.LinearLayout(this);
        layout.setOrientation(android.widget.LinearLayout.VERTICAL);
        layout.setGravity(android.view.Gravity.CENTER);
        layout.setBackgroundColor(0xFF0F6647);
        layout.setPadding(60, 60, 60, 60);

        TextView emoji = new TextView(this);
        emoji.setText("💊");
        emoji.setTextSize(72);
        emoji.setGravity(android.view.Gravity.CENTER);

        TextView titulo = new TextView(this);
        titulo.setText("Hora do medicamento!");
        titulo.setTextSize(24);
        titulo.setTextColor(0xFFFFFFFF);
        titulo.setTypeface(null, android.graphics.Typeface.BOLD);
        titulo.setGravity(android.view.Gravity.CENTER);
        titulo.setPadding(0, 24, 0, 8);

        TextView nome = new TextView(this);
        nome.setText(medNome);
        nome.setTextSize(28);
        nome.setTextColor(0xFFFFFFFF);
        nome.setTypeface(null, android.graphics.Typeface.BOLD);
        nome.setGravity(android.view.Gravity.CENTER);

        TextView dose = new TextView(this);
        dose.setText(medDose);
        dose.setTextSize(18);
        dose.setTextColor(0xCCFFFFFF);
        dose.setGravity(android.view.Gravity.CENTER);
        dose.setPadding(0, 8, 0, 48);

        android.widget.LinearLayout.LayoutParams params = new android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, 0, 0, 16);

        Button btnTomei = new Button(this);
        btnTomei.setText("✅ Tomei agora!");
        btnTomei.setTextSize(18);
        btnTomei.setTextColor(0xFF0F6647);
        btnTomei.setBackgroundColor(0xFFFFFFFF);
        btnTomei.setLayoutParams(params);
        btnTomei.setOnClickListener(v -> pararAlarmeEFechar());

        Button btnPular = new Button(this);
        btnPular.setText("⏭ Pular essa dose");
        btnPular.setTextSize(16);
        btnPular.setTextColor(0xFFFFFFFF);
        btnPular.setBackgroundColor(0x33FFFFFF);
        btnPular.setLayoutParams(params);
        btnPular.setOnClickListener(v -> pararAlarmeEFechar());

        layout.addView(emoji);
        layout.addView(titulo);
        layout.addView(nome);
        layout.addView(dose);
        layout.addView(btnTomei);
        layout.addView(btnPular);

        setContentView(layout);
    }

    private void pararAlarmeEFechar() {
        Intent stopIntent = new Intent(this, AlarmService.class);
        stopService(stopIntent);
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        startActivity(mainIntent);
        finish();
    }

    @Override
    public void onBackPressed() {}
}
