package com.swiftshare

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.WindowManager
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  private val splashHoldMillis = 800L

  override fun onCreate(savedInstanceState: Bundle?) {
    val splashScreen = installSplashScreen()

    var keepOnScreen = true
    splashScreen.setKeepOnScreenCondition { keepOnScreen }

    Handler(Looper.getMainLooper()).postDelayed({ keepOnScreen = false }, splashHoldMillis)

    // Switch to the main app theme after the splash is displayed.
    setTheme(R.style.AppTheme)
    super.onCreate(null)
    
    // Force navigation bar to white with dark icons
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      window.navigationBarColor = Color.WHITE
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
        window.decorView.systemUiVisibility = 
          window.decorView.systemUiVisibility or 
          android.view.View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
      }
    }
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "SwiftShareX"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
