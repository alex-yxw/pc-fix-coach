import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC5CompletedOutlinesDimRealScenario} from "./C5ProgressLib"

@component
export class C5CompletedOutlinesDimRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC5CompletedOutlinesDimRealScenario()
  }
}
