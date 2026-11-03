import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC3GpuDragSnapsAndAdvancesRealScenario} from "./C3C4SnapLib"

@component
export class C3GpuDragSnapsAndAdvancesRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC3GpuDragSnapsAndAdvancesRealScenario()
  }
}
