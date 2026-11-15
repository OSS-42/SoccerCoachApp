package com.actionpitch.app;

import android.content.pm.ActivityInfo;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    // The manifest already asks for portrait. Asking again at runtime re-applies the
    // lock if a plugin, a system override or a WebView fullscreen video reset it.
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        lockPortrait();
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onResume() {
        super.onResume();
        lockPortrait();
    }

    private void lockPortrait() {
        if (getRequestedOrientation() != ActivityInfo.SCREEN_ORIENTATION_PORTRAIT) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_PORTRAIT);
        }
    }
}
