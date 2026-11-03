import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runCardSwitchesSideWithView} from "./CardAndSnapBoundaryLib"

@component
export class C2CardSwitchesSideWithViewScenario extends Scenario {
  async run(): Promise<void> {
    await runCardSwitchesSideWithView()
  }
}
