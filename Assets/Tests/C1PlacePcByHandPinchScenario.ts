import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC1PlacePcByHandPinchScenario} from "./C1PlacementLib"

@component
export class C1PlacePcByHandPinchScenario extends Scenario {
  async run(): Promise<void> {
    await runC1PlacePcByHandPinchScenario()
  }
}
