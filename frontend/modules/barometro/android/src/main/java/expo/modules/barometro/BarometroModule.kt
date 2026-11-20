package expo.modules.barometro

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.SystemClock
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Barómetro que sigue leyendo con la pantalla apagada (spec 004, CA-12; spec 011, plan D16).
// expo-sensors deja de escuchar cuando la actividad de Android pasa a segundo plano; este módulo
// no se ata a ese ciclo: escucha de iniciar() a detener(). Durante una grabación el servicio en
// primer plano de la ubicación mantiene vivo el proceso, así que las lecturas siguen llegando.
class BarometroModule : Module() {
  private var listener: SensorEventListener? = null

  private val sensorManager: SensorManager?
    get() = appContext.reactContext?.getSystemService(Context.SENSOR_SERVICE) as? SensorManager

  override fun definition() = ModuleDefinition {
    Name("Barometro")

    Events(EVENTO_LECTURA)

    Function("disponible") {
      sensorManager?.getDefaultSensor(Sensor.TYPE_PRESSURE) != null
    }

    // Empieza a escuchar, como máximo una lectura cada `intervaloMs`. Devuelve false si el
    // teléfono no tiene barómetro.
    Function("iniciar") { intervaloMs: Int ->
      iniciar(intervaloMs)
    }

    Function("detener") {
      detener()
    }

    OnDestroy {
      detener()
    }
  }

  private fun iniciar(intervaloMs: Int): Boolean {
    detener()
    val manager = sensorManager ?: return false
    val sensor = manager.getDefaultSensor(Sensor.TYPE_PRESSURE) ?: return false
    // Con la pantalla apagada Android puede entregar varias lecturas juntas; la hora de cada una
    // sale de su propia marca de tiempo, no de cuándo llega (D16).
    val minimoNs = intervaloMs * 900_000L
    var ultimaNs = 0L
    val nuevo = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (ultimaNs != 0L && event.timestamp - ultimaNs < minimoNs) return
        ultimaNs = event.timestamp
        sendEvent(
          EVENTO_LECTURA,
          mapOf(
            "presionHpa" to event.values[0].toDouble(),
            "hora" to horaDe(event.timestamp)
          )
        )
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }
    listener = nuevo
    return manager.registerListener(nuevo, sensor, intervaloMs * 1000)
  }

  private fun detener() {
    listener?.let { sensorManager?.unregisterListener(it) }
    listener = null
  }

  companion object {
    const val EVENTO_LECTURA = "onLectura"

    // event.timestamp está en nanosegundos de elapsedRealtimeNanos; se pasa a milisegundos de
    // la hora del teléfono.
    fun horaDe(timestampNs: Long): Double {
      val edadNs = SystemClock.elapsedRealtimeNanos() - timestampNs
      return System.currentTimeMillis() - edadNs / 1_000_000.0
    }
  }
}
