import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  STEP_TEXT,
  advanceHooksTo,
  advanceRealTo,
  allVisibleText,
  camera,
  cardScreenRect,
  cardUI,
  check,
  fmt,
  guides,
  log,
  main,
  obj,
  placeByPinch,
  visibleTextContains,
  waitForLensReady,
  worldPos,
} from "./PCFixCoachLeafHelpers"

const ACTIVE_OUTLINES: {[step: number]: string[]} = {
  1: ["SlotCover"],
  2: ["PCIeSlot"],
  3: ["GPU", "GPUSlotGhost"],
  4: ["Screw", "ScrewHole"],
  5: ["PowerPlug", "PowerConnector"],
}
const ALL_OUTLINES = ["SlotCover", "PCIeSlot", "GPU", "GPUSlotGhost", "Screw", "ScrewHole", "PowerPlug", "PowerConnector"]
const STEP_TARGET_NAME: {[step: number]: string} = {
  1: "Part_SlotCover",
  2: "Target_PCIeSlot",
  3: "Target_GPUInstalledPose",
  4: "Target_ScrewHole",
  5: "Target_PowerConnector",
}

/** All guidance assertions for the current step. */
export async function assertGuidanceForStep(step: number): Promise<void> {
  // Let the card follower / arrow settle (card lerps toward its spot).
  await sleep(1200)
  const m = main()
  check(m.currentStep === step, "expected step " + step)

  // Instruction text + progress indicator, actually rendered in the card.
  const header = "Step " + step + " of 5"
  const card = cardUI()
  check(card.currentHeader === header, "card header '" + card.currentHeader + "' != '" + header + "'")
  check(card.currentBody === STEP_TEXT[step], "card body mismatch for step " + step + ": '" + card.currentBody + "'")
  const cardRoot = obj("InstructionCard")
  check(cardRoot.isEnabledInHierarchy, "instruction card hidden at step " + step)
  check(
    visibleTextContains(cardRoot, header),
    "no visible Text shows '" + header + "' (visible text: " + allVisibleText(cardRoot) + ")"
  )

  // Highlights on the correct component.
  const g = guides()
  for (const name of ALL_OUTLINES) {
    const st = g.getOutlineState(name)
    const shouldBeActive = ACTIVE_OUTLINES[step].indexOf(name) >= 0
    if (shouldBeActive) {
      check(st === "active", "outline " + name + " should be active at step " + step + " (is " + st + ")")
      check(obj("Outline_" + name).isEnabledInHierarchy, "Outline_" + name + " not visible at step " + step)
    } else {
      check(st !== "active", "outline " + name + " should NOT be active at step " + step)
    }
  }

  // Guide arrow visible and pointing at the correct component.
  check(g.isArrowVisible(), "guide arrow hidden at step " + step)
  const targetObj = g.getStepTarget(step)
  check(targetObj !== null && targetObj.name === STEP_TARGET_NAME[step], "guide target for step " + step + " is " + (targetObj ? targetObj.name : "null"))
  const targetPos = targetObj.getTransform().getWorldPosition()
  const arrowPos = worldPos("GuideArrow")
  const horiz = new vec3(arrowPos.x - targetPos.x, 0, arrowPos.z - targetPos.z).length
  check(horiz < 6, "guide arrow " + fmt(arrowPos) + " is not over target " + fmt(targetPos) + " (horizontal " + horiz.toFixed(1) + " cm)")
  check(arrowPos.y > targetPos.y && arrowPos.y - targetPos.y < 25, "guide arrow height above target is " + (arrowPos.y - targetPos.y).toFixed(1) + " cm")

  // Card beside the PC: within ~45 cm of the case centre.
  const caseCentre = worldPos("STANDIN_PCCase").add(new vec3(0, 22.5, 0))
  const cardPos = cardRoot.getTransform().getWorldPosition()
  check(cardPos.distance(caseCentre) < 45, "card " + fmt(cardPos) + " is not beside the case " + fmt(caseCentre))

  // Card does not block the work area: its bottom edge is above the component and the
  // component's screen point is outside the card's screen rectangle.
  check(cardPos.y - 5 > targetPos.y + 3, "card bottom (" + (cardPos.y - 5).toFixed(1) + ") not above component (" + targetPos.y.toFixed(1) + ")")
  const s = camera().worldSpaceToScreenSpace(targetPos)
  const r = cardScreenRect()
  const inside = s.x > r.minX && s.x < r.maxX && s.y > r.minY && s.y < r.maxY
  check(!inside, "card covers the step " + step + " component on screen: target (" + s.x.toFixed(2) + "," + s.y.toFixed(2) + ") rect x[" + r.minX.toFixed(2) + "," + r.maxX.toFixed(2) + "] y[" + r.minY.toFixed(2) + "," + r.maxY.toFixed(2) + "]")
  log("step " + step + " guidance OK: card " + fmt(cardPos) + " target " + fmt(targetPos) + " arrow " + fmt(arrowPos))
}

/** Criterion 2 — every step's card / highlights / arrow, progressing with REAL SIK input only. */
export async function runC2GuidanceEachStepRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await placeByPinch(interactor)
    for (let step = 1; step <= 5; step++) {
      await advanceRealTo(interactor, step)
      await assertGuidanceForStep(step)
    }
  }
}

/** Criterion 2 — same assertions, progressing via the lens test hooks (fallback / isolation). */
export async function runC2GuidanceEachStepHooksScenario(): Promise<void> {
  {
    await waitForLensReady()
    for (let step = 1; step <= 5; step++) {
      await advanceHooksTo(step)
      await assertGuidanceForStep(step)
    }
  }
}
