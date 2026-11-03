import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC5EdgeArrowPointsToOffscreenTargetScenario} from "./C5ProgressLib"

@component
export class C5EdgeArrowPointsToOffscreenTargetScenario extends Scenario {
  async run(): Promise<void> {
    await runC5EdgeArrowPointsToOffscreenTargetScenario()
  }
}
