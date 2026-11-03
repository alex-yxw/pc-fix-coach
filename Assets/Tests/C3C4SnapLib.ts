import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {BaseLeafInteractor} from "Leaf.lspkg/Interactors/interactor/BaseLeafInteractor"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  advanceHooksTo,
  advanceRealTo,
  check,
  dragCurrentPartToTarget,
  fmt,
  guides,
  log,
  main,
  obj,
  part,
  steerDrag,
  waitFor,
  waitForLensReady,
  worldPos,
} from "./PCFixCoachLeafHelpers"

/**
 * Real drag of the current step's part into its highlighted target; asserts the part snaps
 * onto the installed pose (visible animation) and the step auto-advances.
 */
async function realSnapAndAdvance(
  interactor: BaseLeafInteractor,
  step: number,
  partName: string,
  poseName: string,
  highlightedTargets: string[],
  nextStep: number
): Promise<void> {
  const m = main()
  check(m.currentStep === step, "expected step " + step)
  for (const h of highlightedTargets) {
    check(guides().getOutlineState(h) === "active", "target outline " + h + " not highlighted before the drag")
  }
  check(part(partName).isInteractive(), partName + " not grabbable at step " + step)
  const wrongBefore = m.wrongReleaseCount
  const pose = worldPos(poseName)

  // Sample the part every frame from the moment of release, concurrently with the drag call
  // (hand interactors return a few hundred ms after the release).
  let released = false
  let sawIntermediate = false
  let releaseDistAtEvent = -1
  const offRel = part(partName).onRelease.add((p: vec3) => {
    released = true
    releaseDistAtEvent = p.distance(pose)
  })
  let sampling = true
  const sampler = (async () => {
    while (sampling) {
      if (released) {
        const d = worldPos(partName).distance(pose)
        if (d > 0.05 && d < releaseDistAtEvent - 0.05) sawIntermediate = true
      }
      await nextFrame()
    }
  })()

  // Approach from ~2 cm off the pose (inside the ~5 cm snap radius), so the snap itself moves it.
  const releasePos = await dragCurrentPartToTarget(interactor, new vec3(2, 1, 0))
  const releaseDist = releasePos.distance(pose)
  log(partName + " released " + releaseDist.toFixed(2) + " cm from " + poseName)
  check(releaseDist <= 5 * 2.5, "drag did not bring " + partName + " near the target (" + releaseDist.toFixed(1) + " cm)")
  check(m.wrongReleaseCount === wrongBefore, "release within snap range counted as wrong release")

  // Snap animation: the part travels onto the pose over several frames (not instant, not stuck).
  await sleep(600)
  sampling = false
  await sampler
  offRel()
  const finalDist = worldPos(partName).distance(pose)
  check(finalDist < 0.3, partName + " did not snap onto " + poseName + " (still " + finalDist.toFixed(2) + " cm away)")
  log(partName + " snap animation intermediate frame seen: " + sawIntermediate)
  check(sawIntermediate || releaseDist < 0.3, "no snap animation frames observed for " + partName)
  check(!part(partName).isInteractive(), partName + " still grabbable after snapping")

  // Auto-advance (no extra confirmation).
  await waitFor(() => m.currentStep === nextStep, 3000, "auto-advance to step " + nextStep)
  check(m.completedSteps[step] === true, "completedSteps[" + step + "] not set")
}

/** Criterion 3 — real SIK drag of the GPU into the highlighted PCIe slot; snap + auto-advance. */
export async function runC3GpuDragSnapsAndAdvancesRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceRealTo(interactor, 3)
    await realSnapAndAdvance(interactor, 3, "Part_GPU", "Target_GPUInstalledPose", ["GPU", "GPUSlotGhost"], 4)
    log("C3 OK: card now '" + JSON.parse(main().getStateJson()).cardHeader + "'")
  }
}

/** Criterion 3 — same, with the simulated right HAND doing the grab/drag. */
export async function runC3GpuHandDragSnapsScenario(): Promise<void> {
  {
    await waitForLensReady()
    await advanceHooksTo(3) // prerequisites via hooks; the GPU drag itself is a real hand drag
    const hand = LeafHandInteractor.get("right")
    await realSnapAndAdvance(hand, 3, "Part_GPU", "Target_GPUInstalledPose", ["GPU", "GPUSlotGhost"], 4)
  }
}

/**
 * Criterion 3 — snap distance "~5 cm": a real drag released ~9 cm sideways from the slot does
 * NOT snap (part returns home, step stays 3); a release ~3.5 cm sideways DOES snap.
 */
export async function runC3GpuSnapDistanceRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceHooksTo(3)
    const m = main()
    const pose = worldPos("Target_GPUInstalledPose")
    const wrong0 = m.wrongReleaseCount

    const far = await dragCurrentPartToTarget(interactor, new vec3(9, 0, 0))
    log("far release lateral " + far.sub(pose).length.toFixed(2) + " cm")
    await sleep(900)
    check(m.wrongReleaseCount === wrong0 + 1, "release ~9 cm away should be a wrong release")
    check(m.currentStep === 3, "step must stay 3 after a far release")

    const near = await dragCurrentPartToTarget(interactor, new vec3(3.5, 0, 0))
    log("near release dist " + near.sub(pose).length.toFixed(2) + " cm")
    await waitFor(() => m.currentStep === 4, 3000, "snap + advance after ~3.5 cm release")
    check(worldPos("Part_GPU").distance(pose) < 0.3, "GPU not on installed pose after near release")
  }
}

/** Criterion 3 — hook-only: same release code path, exact distances (no SIK input). */
export async function runC3GpuSnapHookScenario(): Promise<void> {
  {
    await waitForLensReady()
    await advanceHooksTo(3)
    const m = main()
    const pose = worldPos("Target_GPUInstalledPose")
    const w0 = m.wrongReleaseCount
    m.testDropPart(pose.add(new vec3(6, 0, 0)))
    await sleep(800)
    check(m.wrongReleaseCount === w0 + 1 && m.currentStep === 3, "6 cm lateral drop should not snap")
    m.testDropPart(pose.add(new vec3(4.5, 0, 0)))
    await waitFor(() => m.currentStep === 4, 3000, "4.5 cm lateral drop should snap and advance")
    check(worldPos("Part_GPU").distance(pose) < 0.3, "GPU not on pose")
  }
}

/** Criterion 4 — real SIK drag of the power plug into the highlighted connector; snap + auto-advance to done. */
export async function runC4PowerPlugDragSnapsAndAdvancesRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceRealTo(interactor, 5)
    await realSnapAndAdvance(interactor, 5, "Part_PowerPlug", "Target_PlugInstalledPose", ["PowerPlug", "PowerConnector"], 6)
    check(main().isComplete, "isComplete false after the power plug snapped")
  }
}

/** Criterion 4 — hook-only variant of the power-plug snap. */
export async function runC4PowerPlugSnapHookScenario(): Promise<void> {
  {
    await waitForLensReady()
    await advanceHooksTo(5)
    const m = main()
    m.testDropPart(m.getCurrentDropTarget())
    await waitFor(() => m.currentStep === 6 && m.isComplete, 3000, "plug snap -> complete")
    check(worldPos("Part_PowerPlug").distance(worldPos("Target_PlugInstalledPose")) < 0.3, "plug not on pose")
  }
}

/** Wrong release (real SIK drags): part glides home with a warning flash; step stays active. */
export async function runWrongReleaseReturnsHomeRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceRealTo(interactor, 1)
    const m = main()

    // Step 1: pull the cover only ~5 cm (needs >= 12 cm) -> wrong release.
    const cover = obj("Part_SlotCover")
    const coverHome = cover.getTransform().getWorldPosition()
    const w0 = m.wrongReleaseCount
    await steerDrag(interactor, "Part_SlotCover", () => coverHome.add(new vec3(0, 0, 5)))
    await nextFrame()
    check(m.wrongReleaseCount === w0 + 1, "short cover pull should count as wrong release")
    check(part("Part_SlotCover").isFlashing(), "cover should flash the warning after wrong release")
    await sleep(900)
    check(cover.getTransform().getWorldPosition().distance(coverHome) < 0.3, "cover did not return home")
    check(m.currentStep === 1 && !m.completedSteps[1], "step 1 should stay active")
    check(part("Part_SlotCover").isInteractive(), "cover should still be grabbable after wrong release")

    // Step 3: drop the GPU 20 cm away from the slot -> wrong release.
    await advanceRealTo(interactor, 3)
    const gpu = obj("Part_GPU")
    const gpuHome = gpu.getTransform().getWorldPosition()
    const w1 = m.wrongReleaseCount
    const rel = await steerDrag(interactor, "Part_GPU", () => worldPos("Target_GPUInstalledPose").add(new vec3(-20, 5, 0)))
    check(rel.distance(gpuHome) > 5, "drag did not move the GPU away from home (" + fmt(rel) + ")")
    await nextFrame()
    check(m.wrongReleaseCount === w1 + 1, "GPU released far away should count as wrong release")
    check(part("Part_GPU").isFlashing(), "GPU should flash the warning")
    await sleep(900)
    check(gpu.getTransform().getWorldPosition().distance(gpuHome) < 0.3, "GPU did not return home")
    check(m.currentStep === 3 && !m.completedSteps[3], "step 3 should stay active")
    check(part("Part_GPU").isInteractive(), "GPU should still be grabbable")
    check(guides().getOutlineState("GPUSlotGhost") === "active", "slot highlight should stay active")
  }
}
