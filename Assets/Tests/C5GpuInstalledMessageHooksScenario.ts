import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC5GpuInstalledMessageHooksScenario} from "./C5ProgressLib"

@component
export class C5GpuInstalledMessageHooksScenario extends Scenario {
  async run(): Promise<void> {
    await runC5GpuInstalledMessageHooksScenario()
  }
}
