package com.anderson.applusSaude2;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) return;
        SharedPreferences prefs = context.getSharedPreferences("applus_alarmes", Context.MODE_PRIVATE);
        String json = prefs.getString("alarmes", "[]");
        try {
            JSONArray alarmes = new JSONArray(json);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            long agora = System.currentTimeMillis();
            for (int i = 0; i < alarmes.length(); i++) {
                JSONObject a = alarmes.getJSONObject(i);
                String medNome = a.getString("medNome");
                String medDose = a.getString("medDose");
                String medId   = a.getString("medId");
                long timestamp = a.getLong("timestamp");
                if (timestamp <= agora) {
                    long diasPassados = ((agora - timestamp) / (24*60*60*1000)) + 1;
                    timestamp += diasPassados * 24*60*60*1000;
                }
                Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                alarmIntent.putExtra("medNome", medNome);
                alarmIntent.putExtra("medDose", medDose);
                alarmIntent.putExtra("medId",   medId);
                int reqCode = Math.abs(medId.hashCode());
                PendingIntent pi = PendingIntent.getBroadcast(context, reqCode, alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                if (am != null) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                    } else {
                        am.setExact(AlarmManager.RTC_WAKEUP, timestamp, pi);
                    }
                }
            }
        } catch (Exception e) { e.printStackTrace(); }
    }
}
