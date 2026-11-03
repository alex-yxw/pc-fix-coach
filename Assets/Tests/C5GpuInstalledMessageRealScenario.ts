import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC5GpuInstalledMessageRealScenario} from "./C5ProgressLib"

@component
export class C5GpuInstalledMessageRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC5GpuInstalledMessageRealScenario()
  }
}
