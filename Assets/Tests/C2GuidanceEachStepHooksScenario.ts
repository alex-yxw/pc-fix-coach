import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC2GuidanceEachStepHooksScenario} from "./C2GuidanceLib"

@component
export class C2GuidanceEachStepHooksScenario extends Scenario {
  async run(): Promise<void> {
    await runC2GuidanceEachStepHooksScenario()
  }
}
