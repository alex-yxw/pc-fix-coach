import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {
  advanceHooksTo,
  advanceRealTo,
  allVisibleText,
  camera,
  cardUI,
  check,
  edgeArrow,
  fmt,
  guides,
  interactable,
  log,
  lookAtRotation,
  main,
  obj,
  takeOverCamera,
  visibleTextContains,
  waitFor,
  waitForLensReady,
} from "./PCFixCoachLeafHelpers"

const KEPT: {[step: number]: string} = {1: "SlotCover", 2: "PCIeSlot", 3: "GPU", 4: "Screw", 5: "PowerPlug"}

/** "subtle, low-brightness, light-coloured (not grey/black)" outline colour check. */
function assertDimLightColour(name: string, c: vec4): void {
  const maxC = Math.max(c.x, c.y, c.z)
  const minC = Math.min(c.x, c.y, c.z)
  const s = name + " colour (" + c.x.toFixed(2) + "," + c.y.toFixed(2) + "," + c.z.toFixed(2) + "," + c.w.toFixed(2) + ")"
  check(c.w > 0.05, s + " is invisible (alpha ~0) — completed outline should remain visible")
  check(c.w <= 0.5, s + " is not low-brightness (alpha > 0.5)")
  check(maxC >= 0.5, s + " is not a light colour (dark/black)")
  check(maxC - minC >= 0.15, s + " is grey (no hue)")
}

async function assertCompletedOutlines(upToStep: number, activeAlpha: number): Promise<void> {
  const g = guides()
  for (let s = 1; s <= upToStep; s++) {
    const name = KEPT[s]
    check(g.getOutlineState(name) === "completed", "outline " + name + " should be 'completed' (is " + g.getOutlineState(name) + ")")
    check(obj("Outline_" + name).isEnabledInHierarchy, "completed outline Outline_" + name + " is not visible")
    const c = g.getOutlineColor(name)
    check(c !== null, "no colour for " + name)
    assertDimLightColour(name, c)
    check(c.w < activeAlpha * 0.6, name + " completed alpha " + c.w.toFixed(2) + " not clearly dimmer than active " + activeAlpha.toFixed(2))
  }
}

/** Criterion 5a — completed parts stay as subtle, dim, light-coloured outlines (real SIK input flow). */
export async function runC5CompletedOutlinesDimRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceRealTo(interactor, 1)
    await sleep(500)
    const activeAlpha = guides().getOutlineColor("SlotCover").w
    log("active SlotCover alpha " + activeAlpha.toFixed(2))
    for (let step = 2; step <= 5; step++) {
      await advanceRealTo(interactor, step)
      await sleep(1500) // confirm flash (0.45 s) + fade (0.7 s)
      await assertCompletedOutlines(step - 1, activeAlpha)
      log("after step " + (step - 1) + " completed outlines dim OK")
    }
  }
}

/**
 * Criterion 5b — edge arrow: at start the table is out of view, so the edge arrow shows and points
 * toward it; when the user turns to face the target the arrow disappears; after placement the arrow
 * re-targets the current step's component and shows exactly when it is out of view.
 */
export async function runC5EdgeArrowPointsToOffscreenTargetScenario(): Promise<void> {
  {
    await waitForLensReady()
    const ea = edgeArrow()
    const cam = camera()
    const camTr = takeOverCamera()

    // 1) Default start view: table out of view → arrow showing, pointing at it.
    await sleep(300)
    check(ea.getTarget() !== null && ea.getTarget().name === "STANDIN_TableSurface", "edge arrow target at step 0 should be the table")
    // Start pose depends on the interactive preview camera; just require consistency here.
    log("start pose: table in view = " + ea.isTargetInView() + ", arrow showing = " + ea.isShowing())
    check(ea.isShowing() === !ea.isTargetInView(), "edge arrow visibility inconsistent with target-in-view at start")
    check(obj("EdgeArrow").isEnabledInHierarchy, "EdgeArrow object disabled")
    const assertPointsAtTarget = (label: string) => {
      const inv = camTr.getInvertedWorldTransform()
      const t = inv.multiplyPoint(ea.getTarget().getTransform().getWorldPosition())
      const want = new vec2(t.x, t.y).normalize()
      const up = inv.multiplyDirection(obj("EdgeArrow").getTransform().up)
      const got = new vec2(up.x, up.y).normalize()
      const dot = want.dot(got)
      log(label + ": arrow dir (" + got.x.toFixed(2) + "," + got.y.toFixed(2) + ") target dir (" + want.x.toFixed(2) + "," + want.y.toFixed(2) + ") dot " + dot.toFixed(3))
      check(dot > 0.95, label + ": edge arrow does not point toward the target (dot " + dot.toFixed(2) + ")")
      // Arrow sits toward the edge of the view, on the target's side.
      const a = inv.multiplyPoint(obj("EdgeArrow").getTransform().getWorldPosition())
      const off = new vec2(a.x, a.y)
      check(off.length > 5 && off.normalize().dot(want) > 0.9, label + ": edge arrow is not at the view edge on the target side")
    }
    const eye = camTr.getWorldPosition()
    const tablePos = ea.getTarget().getTransform().getWorldPosition()
    // 1b) Look up and to the left, away from the table → arrow shows and points at it.
    for (let i = 0; i < 15; i++) {
      camTr.setWorldRotation(lookAtRotation(eye, eye.add(new vec3(-80, 60, -60))))
      await nextFrame()
    }
    check(!ea.isTargetInView(), "table still in view after looking away (up-left)")
    check(ea.isShowing(), "edge arrow not showing while the table is out of view")
    assertPointsAtTarget("looking up-left")

    // 2) Turn the head to a different off-target direction → arrow re-orients.
    const side = eye.add(new vec3(100, 30, -40))
    for (let i = 0; i < 15; i++) {
      camTr.setWorldRotation(lookAtRotation(eye, side))
      await nextFrame()
    }
    check(!ea.isTargetInView() && ea.isShowing(), "arrow should still show when looking away to the right")
    assertPointsAtTarget("looking right")

    // 3) Look at the table → arrow disappears.
    for (let i = 0; i < 15; i++) {
      camTr.setWorldRotation(lookAtRotation(eye, tablePos))
      await nextFrame()
    }
    check(ea.isTargetInView(), "table should be in view after turning toward it")
    check(!ea.isShowing(), "edge arrow still showing although the target is in view")

    // 4) After placement (real pinch) the arrow follows the current step target.
    const interactor = new DefaultLeafInteractor()
    await interactor.trigger(interactable("STANDIN_TableSurface"))
    await waitFor(() => main().currentStep === 1, 3000, "placement")
    await sleep(200)
    check(ea.getTarget() !== null && ea.getTarget().name === "Part_SlotCover", "edge arrow should target the slot cover at step 1")
    check(ea.isShowing() === !ea.isTargetInView(), "edge arrow visibility inconsistent with target-in-view")
    const coverPos = ea.getTarget().getTransform().getWorldPosition()
    for (let i = 0; i < 15; i++) {
      camTr.setWorldRotation(lookAtRotation(eye, eye.add(new vec3(-100, 40, 30))))
      await nextFrame()
    }
    check(ea.isShowing(), "edge arrow should show when the step-1 component is out of view")
    assertPointsAtTarget("step 1 component out of view")
    for (let i = 0; i < 15; i++) {
      camTr.setWorldRotation(lookAtRotation(eye, coverPos))
      await nextFrame()
    }
    check(!ea.isShowing(), "edge arrow should hide when the step-1 component is in view")
  }
}

async function assertGpuInstalled(): Promise<void> {
  const m = main()
  await sleep(800)
  check(m.isComplete && m.currentStep === 6, "flow not complete")
  const card = cardUI()
  check(card.currentHeader === "GPU Installed", "card header '" + card.currentHeader + "' != 'GPU Installed'")
  check(card.isCompleteStyle, "card not in completion style")
  const cardRoot = obj("InstructionCard")
  check(cardRoot.isEnabledInHierarchy, "card hidden at completion")
  check(
    visibleTextContains(cardRoot, "GPU Installed"),
    "no visible Text shows 'GPU Installed' (visible: " + allVisibleText(cardRoot) + ")"
  )
  const g = guides()
  check(g.isGlowPulsing(), "completion glow not pulsing")
  check(!g.isArrowVisible(), "guide arrow still visible after completion")
  for (const n of ["SlotCover", "PCIeSlot", "GPU", "GPUSlotGhost", "Screw", "ScrewHole", "PowerPlug", "PowerConnector"]) {
    check(g.getOutlineState(n) !== "active", "outline " + n + " still active (bright) after completion")
  }
  check(!edgeArrow().isShowing(), "edge arrow showing after completion")
  check(m.completedSteps.slice(1, 6).every((x) => x), "not all steps marked complete: " + JSON.stringify(m.completedSteps))
}

/** Criterion 5c — after the last step a clear "GPU Installed" message shows (full REAL SIK input flow). */
export async function runC5GpuInstalledMessageRealScenario(): Promise<void> {
  {
    await waitForLensReady()
    const interactor = new DefaultLeafInteractor()
    await advanceRealTo(interactor, 6)
    await assertGpuInstalled()
    log("C5 GPU Installed OK: " + fmt(obj("InstructionCard").getTransform().getWorldPosition()))
  }
}

/** Criterion 5c — hook-only variant. */
export async function runC5GpuInstalledMessageHooksScenario(): Promise<void> {
  {
    await waitForLensReady()
    await advanceHooksTo(6)
    await assertGpuInstalled()
  }
}
