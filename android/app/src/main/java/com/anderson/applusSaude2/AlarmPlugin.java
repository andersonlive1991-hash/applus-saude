package com.anderson.applusSaude2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.tts.TextToSpeech;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {
    private TextToSpeech tts;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.9f);
            }
        });
        solicitarIsencaoBateria();
    }

    private void solicitarIsencaoBateria() {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
        } catch (Exception e) { e.printStackTrace(); }
    }

    @PluginMethod
    public void agendarAlarme(PluginCall call) {
        String medNome = call.getString("medNome", "Medicamento");
        String medDose = call.getString("medDose", "");
        String medId   = call.getString("medId", "");
        Double timestampD = call.getDouble("timestamp", 0.0);
        long timestamp = timestampD.longValue();

        if (timestamp <= 0) { call.reject("timestamp invalido"); return; }

        Context context = getContext();

        // Salva no SharedPreferences para reagendar após reboot
        salvarAlarme(context, medNome, medDose, medId, timestamp);

        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("medNome", medNome);
        intent.putExtra("medDose", medDose);
        intent.putExtra("medId",   medId);

        int reqCode = Math.abs(medId.hashCode());
        PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                if (am.canScheduleExactAlarms()) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, timestamp, pi);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
            } else {
                am.setExact(AlarmManager.RTC_WAKEUP, timestamp, pi);
            }
        }
        call.resolve();
    }

    private void salvarAlarme(Context context, String medNome, String medDose, String medId, long timestamp) {
        try {
            SharedPreferences prefs = context.getSharedPreferences("applus_alarmes", Context.MODE_PRIVATE);
            JSONArray alarmes = new JSONArray(prefs.getString("alarmes", "[]"));
            // Remove se já existe com mesmo medId
            JSONArray novos = new JSONArray();
            for (int i = 0; i < alarmes.length(); i++) {
                if (!alarmes.getJSONObject(i).getString("medId").equals(medId)) {
                    novos.put(alarmes.getJSONObject(i));
                }
            }
            JSONObject novo = new JSONObject();
            novo.put("medNome", medNome);
            novo.put("medDose", medDose);
            novo.put("medId",   medId);
            novo.put("timestamp", timestamp);
            novos.put(novo);
            prefs.edit().putString("alarmes", novos.toString()).apply();
        } catch (Exception e) { e.printStackTrace(); }
    }

    @PluginMethod
    public void cancelarAlarme(PluginCall call) {
        String medId = call.getString("medId", "");
        Context context = getContext();
        // Remove do SharedPreferences
        try {
            SharedPreferences prefs = context.getSharedPreferences("applus_alarmes", Context.MODE_PRIVATE);
            JSONArray alarmes = new JSONArray(prefs.getString("alarmes", "[]"));
            JSONArray novos = new JSONArray();
            for (int i = 0; i < alarmes.length(); i++) {
                if (!alarmes.getJSONObject(i).getString("medId").equals(medId)) {
                    novos.put(alarmes.getJSONObject(i));
                }
            }
            prefs.edit().putString("alarmes", novos.toString()).apply();
        } catch (Exception e) { e.printStackTrace(); }

        Intent intent = new Intent(context, AlarmReceiver.class);
        int reqCode = Math.abs(medId.hashCode());
        PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pi);
        call.resolve();
    }

    @PluginMethod
    public void falar(PluginCall call) {
        String texto = call.getString("texto", "");
        if (tts != null && !texto.isEmpty()) {
            tts.stop();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null, "alarme");
            } else {
                tts.speak(texto, TextToSpeech.QUEUE_FLUSH, null);
            }
        }
        call.resolve();
    }

    @PluginMethod
    public void pararVoz(PluginCall call) {
        if (tts != null) tts.stop();
        call.resolve();
    }

    @PluginMethod
    public void dispararAlarme(PluginCall call) {
        String medNome = call.getString("medNome", "Medicamento");
        String medDose = call.getString("medDose", "");
        String medId   = call.getString("medId", "");
        Context context = getContext();
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("medNome", medNome);
        intent.putExtra("medDose", medDose);
        intent.putExtra("medId",   medId);
        context.sendBroadcast(intent);
        call.resolve();
    }

    @PluginMethod
    public void pararAlarme(PluginCall call) {
        Context context = getContext();
        Intent stopIntent = new Intent(context, AlarmService.class);
        context.stopService(stopIntent);
        call.resolve();
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
    }
}
