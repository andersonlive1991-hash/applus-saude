package com.anderson.applusSaude2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.PowerManager;
import android.util.Log;

public class AlarmReceiver extends BroadcastReceiver {
    private static final String TAG = "ApplusAlarme";

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.d(TAG, "AlarmReceiver disparado!");

        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            PowerManager.WakeLock wl = pm.newWakeLock(
                PowerManager.FULL_WAKE_LOCK |
                PowerManager.ACQUIRE_CAUSES_WAKEUP |
                PowerManager.ON_AFTER_RELEASE,
                "applus:receiver"
            );
            wl.acquire(10000);
        }

        Intent alarmIntent = new Intent(context, AlarmActivity.class);
        alarmIntent.putExtra("medNome", medNome);
        alarmIntent.putExtra("medDose", medDose);
        alarmIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION |
            Intent.FLAG_ACTIVITY_NO_HISTORY
        );
        context.startActivity(alarmIntent);
        Log.d(TAG, "AlarmActivity iniciada");
    }

    public static void pararTudo() {}
}
