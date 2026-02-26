package iq.ebay3.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannels();
    }

    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);

            NotificationChannel defaultChannel = new NotificationChannel(
                "ebey3_default",
                "اي بيع",
                NotificationManager.IMPORTANCE_HIGH
            );
            defaultChannel.setDescription("إشعارات المزادات والرسائل والطلبات");
            defaultChannel.enableVibration(true);
            manager.createNotificationChannel(defaultChannel);
        }
    }
}
