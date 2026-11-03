import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC1PlacePcByPinchScenario} from "./C1PlacementLib"

@component
export class C1PlacePcByPinchScenario extends Scenario {
  async run(): Promise<void> {
    await runC1PlacePcByPinchScenario()
  }
}
