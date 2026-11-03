import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runCardMovesBetweenStepsReal} from "./CardAndSnapBoundaryLib"

@component
export class C2CardMovesBetweenStepsRealScenario extends Scenario {
  async run(): Promise<void> {
    await runCardMovesBetweenStepsReal()
  }
}
