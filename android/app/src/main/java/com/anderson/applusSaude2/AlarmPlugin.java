package com.anderson.applusSaude2;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AlarmPlugin")
public class AlarmPlugin extends Plugin {

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
}
