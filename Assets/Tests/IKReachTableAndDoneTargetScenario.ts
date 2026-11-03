import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runIKReachTableAndDoneTargetScenario} from "./IKReachLib"

@component
export class IKReachTableAndDoneTargetScenario extends Scenario {
  async run(): Promise<void> {
    await runIKReachTableAndDoneTargetScenario()
  }
}
