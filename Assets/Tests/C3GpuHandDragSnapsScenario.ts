import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC3GpuHandDragSnapsScenario} from "./C3C4SnapLib"

@component
export class C3GpuHandDragSnapsScenario extends Scenario {
  async run(): Promise<void> {
    await runC3GpuHandDragSnapsScenario()
  }
}
