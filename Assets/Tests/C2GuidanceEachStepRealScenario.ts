import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC2GuidanceEachStepRealScenario} from "./C2GuidanceLib"

@component
export class C2GuidanceEachStepRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC2GuidanceEachStepRealScenario()
  }
}
