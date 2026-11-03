import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC4PowerPlugSnapHookScenario} from "./C3C4SnapLib"

@component
export class C4PowerPlugSnapHookScenario extends Scenario {
  async run(): Promise<void> {
    await runC4PowerPlugSnapHookScenario()
  }
}
