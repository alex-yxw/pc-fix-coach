import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  camera,
  check,
  fmt,
  interactable,
  log,
  lookAtRotation,
  main,
  obj,
  placeByPinch,
  surface,
  takeOverCamera,
  waitFor,
  waitForLensReady,
  worldPos,
} from "./PCFixCoachLeafHelpers"

function assertNotPlaced(): void {
  const m = main()
  check(!m.isPlaced, "PC should not be placed before the pinch")
  check(m.currentStep === 0, "step should be 0 before placement")
  check(!obj("STANDIN_PCCase").enabled, "PC case should be hidden before placement")
  check(surface().isActive(), "table surface should be pinchable before placement")
}

function assertPlacedOnTable(): void {
  const m = main()
  check(m.isPlaced, "isPlaced should be true")
  check(m.currentStep === 1, "step should auto-advance to 1 after placement")
  const pcCase = obj("STANDIN_PCCase")
  check(pcCase.isEnabledInHierarchy, "PC case should be visible after placement")
  check(!surface().isActive(), "table should no longer be pinchable after placement")
  // Case sits on the table top (case root origin = bottom centre, table top y = -50).
  const casePos = pcCase.getTransform().getWorldPosition()
  const tableTop = worldPos("STANDIN_TableSurface")
  check(Math.abs(casePos.y - tableTop.y) < 3, "case bottom " + fmt(casePos) + " should sit on table top " + fmt(tableTop))
  // Case footprint is inside the 120 x 60 cm table top.
  check(
    Math.abs(casePos.x - tableTop.x) < 60 && Math.abs(casePos.z - tableTop.z) < 30,
    "case " + fmt(casePos) + " should be on the table " + fmt(tableTop)
  )
}

/** Criterion 1 — real SIK pinch (LEAF DefaultLeafInteractor trigger) on the table places the PC. */
export async function runC1PlacePcByPinchScenario(): Promise<void> {
  {
    await waitForLensReady()
    assertNotPlaced()
    const interactor = new DefaultLeafInteractor()
    await placeByPinch(interactor)
    await sleep(300)
    assertPlacedOnTable()
    // Second pinch must not re-place / move the case.
    const before = worldPos("STANDIN_PCCase")
    check(interactable("Part_SlotCover") !== undefined, "slot cover should be grabbable at step 1")
    await sleep(200)
    check(worldPos("STANDIN_PCCase").distance(before) < 0.01, "case moved after placement")
    log("C1 pinch placement OK, case at " + fmt(before))
  }
}

/** Criterion 1 — simulated right HAND pinch (LeafHandInteractor) on the table places the PC. */
export async function runC1PlacePcByHandPinchScenario(): Promise<void> {
  {
    await waitForLensReady()
    assertNotPlaced()
    const hand = LeafHandInteractor.get("right")
    await hand.trigger(interactable("STANDIN_TableSurface"))
    await waitFor(() => main().isPlaced, 3000, "PC placed after hand pinch")
    await sleep(300)
    assertPlacedOnTable()
    log("C1 hand-pinch placement OK")
  }
}

/**
 * Criterion 1 — the PC stays anchored to the table while the user moves around it.
 * Moves the preview camera (the user's head) to 4 viewpoints around the case and checks the
 * case's world transform never changes and the case is not parented to the camera.
 */
export async function runC1PcAnchoredWhileUserMovesScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await placeByPinch(interactor)
    await sleep(500)

    const pcCase = obj("STANDIN_PCCase")
    const caseTr = pcCase.getTransform()
    const pos0 = caseTr.getWorldPosition()
    const rot0 = caseTr.getWorldRotation()

    const camSo = camera().getSceneObject()
    const camTr = takeOverCamera()
    // Case must not be in the camera's hierarchy (head-locked content would follow the user).
    let p: SceneObject | null = pcCase.getParent()
    while (p) {
      check(p !== camSo, "PC case is parented under the camera (head-locked)")
      p = p.getParent()
    }

    const centre = pos0.add(new vec3(0, 22, 0))
    const viewpoints = [
      centre.add(new vec3(-80, 40, 40)), // front-left
      centre.add(new vec3(90, 40, 10)), // right side
      centre.add(new vec3(0, 50, -90)), // behind
      centre.add(new vec3(-60, 30, -40)), // back-left
    ]
    let moved = 0
    for (const eye of viewpoints) {
      const rot = lookAtRotation(eye, centre)
      // Hold the pose for ~20 frames (device tracking may also write the camera each frame).
      for (let i = 0; i < 20; i++) {
        camTr.setWorldPosition(eye)
        camTr.setWorldRotation(rot)
        await nextFrame()
      }
      const camNow = camTr.getWorldPosition()
      if (camNow.distance(eye) < 1) moved++
      const pos = caseTr.getWorldPosition()
      const rotNow = caseTr.getWorldRotation()
      log("viewpoint " + fmt(eye) + " camera " + fmt(camNow) + " case " + fmt(pos))
      check(pos.distance(pos0) < 0.05, "case moved from " + fmt(pos0) + " to " + fmt(pos) + " when user moved to " + fmt(eye))
      check(Math.abs(rotNow.dot(rot0)) > 0.9999, "case rotated when user moved to " + fmt(eye))
    }
    check(moved === viewpoints.length, "could only move the preview camera to " + moved + "/" + viewpoints.length + " viewpoints (test could not simulate walking)")
    log("C1 anchoring OK over " + moved + " viewpoints")
  }
}
