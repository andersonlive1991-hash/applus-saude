package com.anderson.applusSaude2;

import android.util.Log;
import androidx.work.Data;
import androidx.work.ExistingWorkPolicy;
import androidx.work.OneTimeWorkRequest;
import androidx.work.OutOfQuotaPolicy;
import androidx.work.WorkManager;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ApplusFirebaseService extends FirebaseMessagingService {
    private static final String TAG = "ApplusFCM";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);
        Log.d(TAG, "FCM recebido!");

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        String tipo = data.get("tipo");
        if (!"alarme-medicamento".equals(tipo)) return;

        String medNome = data.containsKey("medNome") ? data.get("medNome") : "Medicamento";
        String medDose = data.containsKey("medDose") ? data.get("medDose") : "";

        Log.d(TAG, "Agendando AlarmWorker para: " + medNome);

        Data inputData = new Data.Builder()
            .putString("medNome", medNome)
            .putString("medDose", medDose)
            .build();

        OneTimeWorkRequest workRequest = new OneTimeWorkRequest.Builder(AlarmWorker.class)
            .setInputData(inputData)
            .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
            .build();

        WorkManager.getInstance(getApplicationContext())
            .enqueueUniqueWork("alarme_medicamento", ExistingWorkPolicy.REPLACE, workRequest);

        Log.d(TAG, "AlarmWorker agendado!");
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        Log.d(TAG, "Novo token FCM: " + token);
    }
}
