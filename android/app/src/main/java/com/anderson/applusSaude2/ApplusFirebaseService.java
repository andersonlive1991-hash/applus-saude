package com.anderson.applusSaude2;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ApplusFirebaseService extends FirebaseMessagingService {
    private static final String TAG = "ApplusFCM";
    private static final String CHANNEL_ID = "alarme_med_v4";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM recebido!");

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        String tipo = data.get("tipo");

        // SOS — abre SOSActivity com tela acesa
        if ("sos-chamada".equals(tipo)) {
            String nome = data.containsKey("nome") ? data.get("nome") : "Familiar";
            Intent sosIntent = new Intent(this, SOSActivity.class);
            sosIntent.putExtra("nome", nome);
            sosIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            startActivity(sosIntent);
            return;
        }

        if (!"alarme-medicamento".equals(tipo)) return;

        String medNome = data.containsKey("medNome") ? data.get("medNome") : "Medicamento";
        String medDose = data.containsKey("medDose") ? data.get("medDose") : "";

        // Cria canal com som de alarme ANTES de mostrar notificacao
        criarCanalComSom();

        // Notificacao
        Intent mainIntent = new Intent(this, MainActivity.class);
        mainIntent.putExtra("pagina", "remedios");
        mainIntent.putExtra("pararAlarme", true);
        mainIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(
            this, (int) System.currentTimeMillis(), mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String texto = !medDose.isEmpty() ? medNome + " — " + medDose : medNome;
        Uri somAlarme = android.net.Uri.parse("android.resource://" + getPackageName() + "/raw/alarme_med");

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("💊 Hora do medicamento!")
            .setContentText("Toque para confirmar: " + texto)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setSound(somAlarme)
            .setContentIntent(pi)
            .setOngoing(true)
            .setAutoCancel(false)
            .setVibrate(new long[]{0, 500, 200, 500})
            .build();

        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(1001, notification);

        // Toca som de alarme diretamente via MediaPlayer
        tocarSomAlarme();

        Log.d(TAG, "Notificacao com som exibida para: " + medNome);
    }

    private void tocarSomAlarme() {
        try {
            android.media.MediaPlayer mp = new android.media.MediaPlayer();
            android.net.Uri som = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_ALARM);
            if (som == null) som = android.media.RingtoneManager.getDefaultUri(android.media.RingtoneManager.TYPE_RINGTONE);
            android.media.AudioAttributes attrs = new android.media.AudioAttributes.Builder()
                .setUsage(android.media.AudioAttributes.USAGE_ALARM)
                .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            mp.setAudioAttributes(attrs);
            mp.setDataSource(getApplicationContext(), som);
            mp.setLooping(false);
            mp.prepare();
            mp.start();
            mp.setOnCompletionListener(mp2 -> mp2.release());
        } catch (Exception e) {
            Log.e(TAG, "Erro ao tocar som: " + e.getMessage());
        }
    }

    private void criarCanalComSom() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;

            // Sempre recria para garantir som
            nm.deleteNotificationChannel(CHANNEL_ID);

            Uri somAlarme = android.net.Uri.parse("android.resource://" + getPackageName() + "/raw/alarme_med");

            AudioAttributes audioAttrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID, "Alarme de Medicamento", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Alarmes de medicamentos AP+ Saude");
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setSound(somAlarme, audioAttrs);
            channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            nm.createNotificationChannel(channel);
            Log.d(TAG, "Canal criado com som de alarme");
        }
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Novo token FCM: " + token);
    }
}
