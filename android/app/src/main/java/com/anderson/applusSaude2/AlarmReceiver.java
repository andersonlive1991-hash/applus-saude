package com.anderson.applusSaude2;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String medNome = intent.getStringExtra("medNome");
        String medDose = intent.getStringExtra("medDose");
        String medId   = intent.getStringExtra("medId");

        Intent serviceIntent = new Intent(context, AlarmService.class);
        serviceIntent.putExtra("medNome", medNome);
        serviceIntent.putExtra("medDose", medDose);
        serviceIntent.putExtra("medId",   medId);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
