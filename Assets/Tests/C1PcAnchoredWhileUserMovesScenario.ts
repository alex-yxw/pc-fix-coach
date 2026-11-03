import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC1PcAnchoredWhileUserMovesScenario} from "./C1PlacementLib"

@component
export class C1PcAnchoredWhileUserMovesScenario extends Scenario {
  async run(): Promise<void> {
    await runC1PcAnchoredWhileUserMovesScenario()
  }
}
