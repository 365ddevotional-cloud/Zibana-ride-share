package com.zibana.app;

import android.app.PictureInPictureParams;
import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.Rational;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static boolean driverOnline = false;
    private static boolean tripActive = false;

    public static void setDriverOnline(boolean online) {
        driverOnline = online;
    }

    public static void setTripActive(boolean active) {
        tripActive = active;
    }

    public static boolean isDriverOnline() {
        return driverOnline;
    }

    public static boolean isTripActive() {
        return tripActive;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(DriverServicePlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onUserLeaveHint() {
        super.onUserLeaveHint();
        if (driverOnline || tripActive) {
            enterPipModeIfSupported();
        }
    }

    private void enterPipModeIfSupported() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        try {
            PictureInPictureParams.Builder builder = new PictureInPictureParams.Builder();
            builder.setAspectRatio(new Rational(9, 16));
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true);
                builder.setSeamlessResizeEnabled(true);
            }
            enterPictureInPictureMode(builder.build());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig);
        if (getBridge() != null && getBridge().getWebView() != null) {
            String jsEvent = String.format(
                "window.dispatchEvent(new CustomEvent('pipModeChanged', { detail: { isInPipMode: %s } }));",
                isInPictureInPictureMode
            );
            getBridge().getWebView().evaluateJavascript(jsEvent, null);
        }
    }
}
