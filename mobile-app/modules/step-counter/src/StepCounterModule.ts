import { NativeModule, requireNativeModule } from "expo";

declare class StepCounterModule extends NativeModule<{}> {
  hasStepCounterSensor(): boolean;

  // Android only - see android/.../StepCounterModule.kt and src/steps.android.ts.
  getBootCount(): number;
  getRawStepsSinceBoot(): Promise<number>;

  // iOS only - see ios/StepCounterModule.swift and src/steps.ios.ts.
  getTodayStepCount(): Promise<number>;
}

export default requireNativeModule<StepCounterModule>("StepCounter");
