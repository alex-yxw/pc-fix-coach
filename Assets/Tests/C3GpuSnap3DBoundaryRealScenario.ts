import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runGpuSnap3DBoundaryReal} from "./CardAndSnapBoundaryLib"

@component
export class C3GpuSnap3DBoundaryRealScenario extends Scenario {
  async run(): Promise<void> {
    await runGpuSnap3DBoundaryReal()
  }
}
