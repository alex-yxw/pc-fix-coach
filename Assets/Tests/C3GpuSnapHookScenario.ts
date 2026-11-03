import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC3GpuSnapHookScenario} from "./C3C4SnapLib"

@component
export class C3GpuSnapHookScenario extends Scenario {
  async run(): Promise<void> {
    await runC3GpuSnapHookScenario()
  }
}
