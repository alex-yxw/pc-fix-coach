import {createIKInteractor} from "Leaf.lspkg/Interactors/interactor/ik/visualizer/BitmojiAvatar"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {advanceHooksTo, check, interactable, log, main, waitFor, waitForLensReady} from "./PCFixCoachLeafHelpers"

/**
 * Reachability (criteria 1 + 2 input): an IK avatar arm physically reaches and pinches the table
 * (placement) and the step-2 Done target. A non-converging reach is a real placement finding.
 */
export async function runIKReachTableAndDoneTargetScenario(): Promise<void> {
  {
    await waitForLensReady()
    const ik = createIKInteractor()
    await sleep(500)
    await ik.trigger(interactable("STANDIN_TableSurface"))
    await waitFor(() => main().isPlaced, 4000, "PC placed by IK pinch on table")
    await advanceHooksTo(2)
    await sleep(500)
    await ik.trigger(interactable("DoneButton"))
    await waitFor(() => main().currentStep === 3, 4000, "IK pinch on Done target advances to step 3")
    check(main().completedSteps[2], "step 2 not completed")
    log("IK reach OK")
  }
}
