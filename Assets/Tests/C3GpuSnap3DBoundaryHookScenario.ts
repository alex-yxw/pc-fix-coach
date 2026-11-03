import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runGpuSnap3DBoundaryHook} from "./CardAndSnapBoundaryLib"

@component
export class C3GpuSnap3DBoundaryHookScenario extends Scenario {
  async run(): Promise<void> {
    await runGpuSnap3DBoundaryHook()
  }
}
