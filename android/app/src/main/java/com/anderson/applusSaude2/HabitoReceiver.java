package com.anderson.applusSaude2;

import android.app.NotificationManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class HabitoReceiver extends BroadcastReceiver {
    private static final String TAG = "HabitoReceiver";
    private static final String BASE_URL = "https://applus-saude-production.up.railway.app";

    @Override
    public void onReceive(Context context, Intent intent) {
        String acao = intent.getStringExtra("acao");
        String categoria = intent.getStringExtra("categoria");
        String membroId = intent.getStringExtra("membro_id");
        String familiaId = intent.getStringExtra("familia_id");
        int notifId = intent.getIntExtra("notif_id", 0);

        boolean cumprido = "sim".equals(acao);

        Log.d(TAG, "Habito: " + categoria + " cumprido: " + cumprido + " membro: " + membroId);

        // Cancela a notificação
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.cancel(notifId);

        // Registra no servidor em background
        new Thread(() -> {
            try {
                URL url = new URL(BASE_URL + "/api/habitos/registrar");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(5000);
                conn.setReadTimeout(5000);

                String json = "{\"membro_id\":" + membroId +
                    ",\"familia_id\":" + (familiaId != null ? familiaId : "null") +
                    ",\"categoria\":\"" + categoria + "\"" +
                    ",\"cumprido\":" + cumprido + "}";

                OutputStream os = conn.getOutputStream();
                os.write(json.getBytes(StandardCharsets.UTF_8));
                os.close();

                int code = conn.getResponseCode();
                Log.d(TAG, "Registro habito: " + code);
                conn.disconnect();
            } catch (Exception e) {
                Log.e(TAG, "Erro registrar habito: " + e.getMessage());
            }
        }).start();
    }
}
