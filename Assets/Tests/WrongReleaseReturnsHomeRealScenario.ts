import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runWrongReleaseReturnsHomeRealScenario} from "./C3C4SnapLib"

@component
export class WrongReleaseReturnsHomeRealScenario extends Scenario {
  async run(): Promise<void> {
    await runWrongReleaseReturnsHomeRealScenario()
  }
}
