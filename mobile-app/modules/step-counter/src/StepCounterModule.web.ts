import { registerWebModule, NativeModule } from 'expo';

class StepCounterModule extends NativeModule<{}> {}

export default registerWebModule(StepCounterModule, 'StepCounterModule');
