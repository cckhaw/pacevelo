import CoreMotion
import ExpoModulesCore

/**
 * NOTE: written for interchangeability with the Android side (see
 * StepCounterModule.kt) but not built or run anywhere in this repo's dev
 * environment - there's no Mac/Xcode available to compile or test it.
 * Treat it as a documented starting point, not a verified implementation,
 * until someone builds it on an actual Mac.
 *
 * Unlike Android, CMPedometer already handles reboot continuity and
 * calendar-day boundaries internally, so there's no equivalent of the
 * Android side's boot-count/step-banking dance needed here - this exposes
 * "steps since midnight" directly, which is all src/steps.ios.ts needs.
 */
private let noPedometerError = "ERR_NO_PEDOMETER"
private let queryFailedError = "ERR_PEDOMETER_QUERY_FAILED"

public class StepCounterModule: Module {
  private let pedometer = CMPedometer()

  public func definition() -> ModuleDefinition {
    Name("StepCounter")

    Function("hasStepCounterSensor") {
      CMPedometer.isStepCountingAvailable()
    }

    AsyncFunction("getTodayStepCount") { () -> Int in
      guard CMPedometer.isStepCountingAvailable() else {
        throw Exception(name: noPedometerError, description: "Step counting isn't available on this device.")
      }

      let startOfToday = Calendar.current.startOfDay(for: Date())

      return try await withCheckedThrowingContinuation { continuation in
        self.pedometer.queryPedometerData(from: startOfToday, to: Date()) { data, error in
          if let error = error {
            continuation.resume(throwing: Exception(name: queryFailedError, description: error.localizedDescription))
            return
          }
          continuation.resume(returning: data?.numberOfSteps.intValue ?? 0)
        }
      }
    }
  }
}
