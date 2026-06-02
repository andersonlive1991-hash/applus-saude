package com.anderson.applusSaude2;

import android.content.Intent;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

public class ApplusFirebaseService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) return;

        String tipo = data.get("tipo");
        if (!"alarme-medicamento".equals(tipo)) return;

        String medNome = data.get("medNome");
        String medDose = data.get("medDose");
        if (medNome == null) medNome = "Medicamento";
        if (medDose == null) medDose = "";

        // Dispara o AlarmReceiver diretamente
        Intent intent = new Intent(this, AlarmReceiver.class);
        intent.putExtra("medNome", medNome);
        intent.putExtra("medDose", medDose);
        sendBroadcast(intent);
    }

    @Override
    public void onNewToken(String token) {
        super.onNewToken(token);
        // Token renovado — o app vai registrar na próxima abertura
    }
}
