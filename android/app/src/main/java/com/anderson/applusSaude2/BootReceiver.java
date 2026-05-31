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

/**
 * BootReceiver — reagenda todos os alarmes após reinício do celular.
 * Os alarmes são salvos pelo AlarmPlugin em SharedPreferences com key "alarmes_agendados".
 * Formato JSON: [{"medId":"...","medNome":"...","medDose":"...","timestamp":123456789}, ...]
 */
public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (!Intent.ACTION_BOOT_COMPLETED.equals(action) &&
            !"android.intent.action.QUICKBOOT_POWERON".equals(action) &&
            !"com.htc.intent.action.QUICKBOOT_POWERON".equals(action)) {
            return;
        }

        SharedPreferences prefs = context.getSharedPreferences("AlarmPrefs", Context.MODE_PRIVATE);
        String alarmesJson = prefs.getString("alarmes_agendados", "[]");

        try {
            JSONArray alarmes = new JSONArray(alarmesJson);
            AlarmManager am = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (am == null) return;

            long agora = System.currentTimeMillis();

            for (int i = 0; i < alarmes.length(); i++) {
                JSONObject a = alarmes.getJSONObject(i);
                long timestamp = a.getLong("timestamp");
                String medId   = a.getString("medId");
                String medNome = a.optString("medNome", "Medicamento");
                String medDose = a.optString("medDose", "");

                // Pular alarmes já vencidos (reagendar apenas futuros)
                if (timestamp <= agora) continue;

                Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                alarmIntent.putExtra("medNome", medNome);
                alarmIntent.putExtra("medDose", medDose);
                alarmIntent.putExtra("medId",   medId);

                int reqCode = Math.abs(medId.hashCode());
                PendingIntent pi = PendingIntent.getBroadcast(
                    context, reqCode, alarmIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    if (am.canScheduleExactAlarms()) {
                        am.setAlarmClock(new AlarmManager.AlarmClockInfo(timestamp, pi), pi);
                    } else {
                        am.set(AlarmManager.RTC_WAKEUP, timestamp, pi);
                    }
                } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, timestamp, pi);
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, timestamp, pi);
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
