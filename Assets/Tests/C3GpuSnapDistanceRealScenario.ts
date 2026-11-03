import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC3GpuSnapDistanceRealScenario} from "./C3C4SnapLib"

@component
export class C3GpuSnapDistanceRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC3GpuSnapDistanceRealScenario()
  }
}
