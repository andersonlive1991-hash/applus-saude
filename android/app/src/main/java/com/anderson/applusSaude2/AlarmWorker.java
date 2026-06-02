package com.anderson.applusSaude2;

import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

public class AlarmWorker extends Worker {

    public AlarmWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        String medNome = getInputData().getString("medNome");
        String medDose = getInputData().getString("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        // Abre AlarmActivity — permitido a partir de expedited job
        Intent alarmIntent = new Intent(getApplicationContext(), AlarmActivity.class);
        alarmIntent.putExtra("medNome", medNome);
        alarmIntent.putExtra("medDose", medDose);
        alarmIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_NO_USER_ACTION |
            Intent.FLAG_ACTIVITY_NO_HISTORY
        );
        getApplicationContext().startActivity(alarmIntent);

        return Result.success();
    }
}
