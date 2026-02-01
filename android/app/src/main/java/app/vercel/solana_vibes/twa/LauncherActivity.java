/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package app.vercel.solana_vibes.twa;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
    }

    @Override
    protected Uri getLaunchingUrl() {
        // If we were launched via wallet callback (e.g. Phantom redirect to solanavibes://callback?...),
        // forward the query params to our origin so the web app can complete the connection.
        Uri intentData = getIntent() != null ? getIntent().getData() : null;
        if (intentData != null && "solanavibes".equals(intentData.getScheme())
                && "callback".equals(intentData.getHost())) {
            String query = intentData.getQuery();
            if (query != null && !query.isEmpty()) {
                String baseUrl = getString(R.string.launchUrl);
                String sep = baseUrl.contains("?") ? "&" : "?";
                return Uri.parse(baseUrl + sep + "wallet_callback=1&" + query);
            }
        }
        return super.getLaunchingUrl();
    }
}
