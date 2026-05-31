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
import android.util.Log;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {
    private static final String TAG = "AP_AlarmPlugin";
    private TextToSpeech tts;
    private static final String PREFS_NAME = "AlarmPrefs";
    private static final String KEY_ALARMES = "alarmes_agendados";

    @Override
    public void load() {
        Log.d(TAG, "AlarmPlugin.load() iniciado");
        tts = new TextToSpeech(getContext(), status -> {
            if (status == TextToSpeech.SUCCESS) {
                tts.setLanguage(new Locale("pt", "BR"));
                tts.setSpeechRate(0.9f);
                Log.d(TAG, "TTS inicializado com sucesso");
            } else {
                Log.e(TAG, "TTS falhou ao inicializar, status=" + status);
            }
        });
        solicitarIsencaoBateria();
    }

    private void solicitarIsencaoBateria() {
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            if (pm != null && !pm.isIgnoringBatteryOptimizations(context.getPackageName())) {
                Log.d(TAG, "Solicitando isenção de bateria");
                Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            } else {
                Log.d(TAG, "Já isento de otimização de bateria");
            }
        } catch (Exception e) {
            Log.e(TAG, "Erro isenção bateria: " + e.getMessage());
        }
    }

    @PluginMethod
    public void agendarAlarme(PluginCall call) {
        String medNome = call.getString("medNome", "Medicamento");
        String medDose = call.getString("medDose", "");
        String medId   = call.getString("medId", "");
        Double timestampD = call.getDouble("timestamp", 0.0);
        long timestamp = timestampD.longValue();

        Log.d(TAG, "agendarAlarme() chamado: nome=" + medNome + " id=" + medId + " timestamp=" + timestamp);

        if (timestamp <= 0) {
            Log.e(TAG, "agendarAlarme() rejeitado: timestamp inválido");
            call.reject("timestamp invalido");
            return;
        }

        Context context = getContext();
        Intent intent = new Intent(context, AlarmReceiver.class);
        intent.putExtra("medNome", medNome);
        intent.putExtra("medDose", medDose);
        intent.putExtra("medId",   medId);

        int reqCode = Math.abs(medId.hashCode());
        PendingIntent pi = PendingIntent.getBroadcast(
            context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                boolean podeExato = am.canScheduleExactAlarms();
                Log.d(TAG, "Android 12+: canScheduleExactAlarms=" + podeExato);
                if (podeExato) {
                    AlarmManager.AlarmClockInfo alarmInfo = new AlarmManager.AlarmClockInfo(timestamp, pi);
                    am.setAlarmClock(alarmInfo, pi);
                    Log.d(TAG, "Alarme agendado com setAlarmClock para " + new java.util.Date(timestamp));
                } else {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                    Log.w(TAG, "Alarme agendado com setAndAllowWhileIdle (sem permissão exata) para " + new java.util.Date(timestamp));
                }
            } else {
                AlarmManager.AlarmClockInfo alarmInfo = new AlarmManager.AlarmClockInfo(timestamp, pi);
                am.setAlarmClock(alarmInfo, pi);
                Log.d(TAG, "Alarme agendado com setAlarmClock (pre-S) para " + new java.util.Date(timestamp));
            }
        } else {
            Log.e(TAG, "AlarmManager é null!");
        }

        salvarAlarme(context, medId, medNome, medDose, timestamp);
        call.resolve();
    }

    @PluginMethod
    public void cancelarAlarme(PluginCall call) {
        String medId = call.getString("medId", "");
        Log.d(TAG, "cancelarAlarme() id=" + medId);
        Context context = getContext();
        Intent intent = new Intent(context, AlarmReceiver.class);
        int reqCode = Math.abs(medId.hashCode());
        PendingIntent pi = PendingIntent.getBroadcast(
            context, reqCode, intent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(pi);
        removerAlarme(context, medId);
        call.resolve();
    }

    @PluginMethod
    public void falar(PluginCall call) {
        String texto = call.getString("texto", "");
        Log.d(TAG, "falar() texto=" + texto.substring(0, Math.min(30, texto.length())));
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
        Log.d(TAG, "dispararAlarme() nome=" + medNome);
        Context context = getContext();
        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", medNome);
        serviceIntent.putExtra("medDose", medDose);
        serviceIntent.putExtra("medId",   medId);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
        call.resolve();
    }

    @PluginMethod
    public void pararAlarme(PluginCall call) {
        Log.d(TAG, "pararAlarme() chamado");
        Context context = getContext();
        Intent stopIntent = new Intent(context, AlarmService.class);
        context.stopService(stopIntent);
        call.resolve();
    }

    private void salvarAlarme(Context ctx, String medId, String medNome, String medDose, long timestamp) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(KEY_ALARMES, "[]"));
            JSONArray novo = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                if (!medId.equals(o.optString("medId"))) novo.put(o);
            }
            JSONObject alarme = new JSONObject();
            alarme.put("medId", medId);
            alarme.put("medNome", medNome);
            alarme.put("medDose", medDose);
            alarme.put("timestamp", timestamp);
            novo.put(alarme);
            prefs.edit().putString(KEY_ALARMES, novo.toString()).apply();
            Log.d(TAG, "Alarme salvo no SharedPreferences: " + medId);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao salvar alarme: " + e.getMessage());
        }
    }

    private void removerAlarme(Context ctx, String medId) {
        try {
            SharedPreferences prefs = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            JSONArray arr = new JSONArray(prefs.getString(KEY_ALARMES, "[]"));
            JSONArray novo = new JSONArray();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                if (!medId.equals(o.optString("medId"))) novo.put(o);
            }
            prefs.edit().putString(KEY_ALARMES, novo.toString()).apply();
        } catch (Exception e) {
            Log.e(TAG, "Erro ao remover alarme: " + e.getMessage());
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) { tts.stop(); tts.shutdown(); }
    }
}
