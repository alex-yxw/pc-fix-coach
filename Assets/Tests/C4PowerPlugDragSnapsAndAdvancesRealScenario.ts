import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {runC4PowerPlugDragSnapsAndAdvancesRealScenario} from "./C3C4SnapLib"

@component
export class C4PowerPlugDragSnapsAndAdvancesRealScenario extends Scenario {
  async run(): Promise<void> {
    await runC4PowerPlugDragSnapsAndAdvancesRealScenario()
  }
}
