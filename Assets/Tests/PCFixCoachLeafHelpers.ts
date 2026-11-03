/**
 * PCFixCoachLeafHelpers — shared helpers for the PC Fix Coach LEAF scenarios.
 * Test-only code: reads the lens through its public test surface and drives it through
 * real SIK interactions (LEAF interactors) where possible.
 */
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {BaseLeafInteractor} from "Leaf.lspkg/Interactors/interactor/BaseLeafInteractor"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {findSceneObjectByName, nextFrame, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {PCFixCoachMain} from "../Scripts/PCFixCoachMain"
import {PCFixCoachGuideController} from "../Scripts/PCFixCoachGuideController"
import {PCFixCoachEdgeArrow} from "../Scripts/PCFixCoachEdgeArrow"
import {PCFixCoachInstructionCardUI} from "../Scripts/PCFixCoachInstructionCardUI"
import {PCFixCoachDraggablePart} from "../Scripts/PCFixCoachDraggablePart"
import {PCFixCoachPlacementSurface} from "../Scripts/PCFixCoachPlacementSurface"
import {DEFAULT_STEP_TEXT} from "../Scripts/PCFixCoachSceneContracts"

export const STEP_TEXT = DEFAULT_STEP_TEXT

export function log(msg: string): void {
  print("[PCFixCoachTest] " + msg)
}

export function fail(msg: string): never {
  throw new Error(msg + " | state=" + stateJson())
}

export function check(cond: boolean, msg: string): void {
  if (!cond) fail(msg)
}

export function main(): PCFixCoachMain {
  const m = (global as any).pcFixCoach as PCFixCoachMain
  if (!m) throw new Error("global.pcFixCoach not found")
  return m
}

export function stateJson(): string {
  const m = (global as any).pcFixCoach as PCFixCoachMain
  return m ? m.getStateJson() : "<no main>"
}

export function state(): any {
  return JSON.parse(main().getStateJson())
}

function scriptOn<T>(objName: string, typeName: any): T {
  const so = findSceneObjectByName(objName)
  if (!so) throw new Error("scene object not found: " + objName)
  const c = so.getComponent(typeName) as any
  if (!c) throw new Error("component not found on " + objName)
  return c as T
}

export function guides(): PCFixCoachGuideController {
  return scriptOn<PCFixCoachGuideController>("Guides", PCFixCoachGuideController.getTypeName())
}
export function edgeArrow(): PCFixCoachEdgeArrow {
  return scriptOn<PCFixCoachEdgeArrow>("EdgeArrow", PCFixCoachEdgeArrow.getTypeName())
}
export function cardUI(): PCFixCoachInstructionCardUI {
  return scriptOn<PCFixCoachInstructionCardUI>("InstructionCardPanel", PCFixCoachInstructionCardUI.getTypeName())
}
export function part(name: string): PCFixCoachDraggablePart {
  return scriptOn<PCFixCoachDraggablePart>(name, PCFixCoachDraggablePart.getTypeName())
}
export function surface(): PCFixCoachPlacementSurface {
  return scriptOn<PCFixCoachPlacementSurface>("STANDIN_TableSurface", PCFixCoachPlacementSurface.getTypeName())
}

export function obj(name: string): SceneObject {
  const so = findSceneObjectByName(name)
  if (!so) throw new Error("scene object not found: " + name)
  return so
}

export function worldPos(name: string): vec3 {
  return obj(name).getTransform().getWorldPosition()
}

export function camera(): Camera {
  return WorldCameraFinderProvider.getInstance().getComponent()
}

export function fmt(v: vec3 | null): string {
  if (!v) return "null"
  return "(" + v.x.toFixed(1) + "," + v.y.toFixed(1) + "," + v.z.toFixed(1) + ")"
}

export async function waitFor(pred: () => boolean, timeoutMs: number, what: string): Promise<void> {
  const start = getTime()
  while (!pred()) {
    if ((getTime() - start) * 1000 > timeoutMs) fail("timeout (" + timeoutMs + "ms) waiting for: " + what)
    await nextFrame()
  }
}

/** Wait until the lens's first-frame wiring ran (card shows the placement prompt). */
export async function waitForLensReady(): Promise<void> {
  await sleep(1000)
  await waitFor(
    () => {
      const m = (global as any).pcFixCoach as PCFixCoachMain
      return !!m && m.getStateJson().indexOf('"cardHeader":"Get started"') >= 0
    },
    5000,
    "lens ready (card header 'Get started')"
  )
  await sleep(300)
}

export function interactable(name: string): Interactable {
  const i = findInteractableByName(name, undefined, true)
  if (!i) fail("enabled Interactable not found on '" + name + "'")
  return i
}

// ── Real SIK input ───────────────────────────────────────────

/** Real SIK pinch (trigger) on the table surface Interactable. */
export async function placeByPinch(interactor: BaseLeafInteractor): Promise<void> {
  await interactor.trigger(interactable("STANDIN_TableSurface"))
  await waitFor(() => main().isPlaced, 3000, "PC placed after pinch on table")
  await waitFor(() => main().currentStep === 1, 2000, "step 1 after placement")
}

/** Real SIK pinch on the UIKit Done button (step 2). */
export async function pressDoneByPinch(interactor: BaseLeafInteractor): Promise<void> {
  await interactor.trigger(interactable("DoneButton"))
}

/**
 * Real SIK grab-drag-release of `partName`, steered closed-loop so the part ends near `goal()`.
 * The LEAF drag vector is applied per drag-update frame; we mutate it each frame toward the goal.
 * Returns the part's world position at the moment of release.
 */
export async function steerDrag(
  interactor: BaseLeafInteractor,
  partName: string,
  goal: () => vec3,
  durationMs: number = 6000
): Promise<vec3> {
  const target = interactable(partName)
  const so = target.getSceneObject()
  const v = new vec3(0, 0, 0)
  let active = true
  let releasePos: vec3 = so.getTransform().getWorldPosition()
  const p = part(partName)
  const offRelease = p.onRelease.add((pos: vec3) => {
    releasePos = pos
  })
  const steer = async () => {
    while (active) {
      const err = goal().sub(so.getTransform().getWorldPosition())
      let step = err.length < 0.2 ? vec3.zero() : err.uniformScale(0.3)
      if (step.length > 2.5) step = step.normalize().uniformScale(2.5)
      v.x = step.x
      v.y = step.y
      v.z = step.z
      await nextFrame()
    }
  }
  const steering = steer()
  await interactor.drag(target, v, durationMs)
  active = false
  await steering
  offRelease()
  log("drag " + partName + " released at " + fmt(releasePos) + " goal " + fmt(goal()))
  return releasePos
}

/** Drag the current step's part (real SIK drag) to the lens-reported drop target, optionally offset. */
export async function dragCurrentPartToTarget(
  interactor: BaseLeafInteractor,
  offset: vec3 = vec3.zero(),
  durationMs: number = 6000
): Promise<vec3> {
  const m = main()
  const step = m.currentStep
  const p = m.partForStep(step)
  if (!p) fail("no draggable part for step " + step)
  const goalBase = m.getCurrentDropTarget()
  if (!goalBase) fail("no drop target for step " + step)
  const g = goalBase.add(offset)
  return await steerDrag(interactor, p.getSceneObject().name, () => g, durationMs)
}

/** Advance from the current step to `targetStep` using only real SIK input (pinch / drag). */
export async function advanceRealTo(interactor: BaseLeafInteractor, targetStep: number): Promise<void> {
  const m = main()
  if (!m.isPlaced) await placeByPinch(interactor)
  while (m.currentStep < targetStep) {
    const s = m.currentStep
    if (s === 2) {
      await pressDoneByPinch(interactor)
    } else {
      await dragCurrentPartToTarget(interactor)
    }
    await waitFor(() => m.currentStep === s + 1, 4000, "auto-advance from step " + s + " to " + (s + 1))
    await sleep(200)
  }
}

/** Advance using the lens test hooks only (placePC / testDropPart / pressDone). */
export async function advanceHooksTo(targetStep: number): Promise<void> {
  const m = main()
  if (!m.isPlaced) m.placePC()
  while (m.currentStep < targetStep) {
    const s = m.currentStep
    if (s === 2) m.pressDone()
    else m.testDropPart(m.getCurrentDropTarget())
    await waitFor(() => m.currentStep === s + 1, 4000, "hook auto-advance from step " + s)
    await sleep(100)
  }
}

// ── Visual / layout helpers ──────────────────────────────────

/** Text components (enabled in hierarchy) under `root` whose text contains `needle`. */
export function visibleTextContains(root: SceneObject, needle: string): boolean {
  let found = false
  const visit = (so: SceneObject) => {
    if (found || !so.isEnabledInHierarchy) return
    const texts = so.getComponents("Component.Text") as Text[]
    for (const t of texts) if (t.enabled && t.text && t.text.indexOf(needle) >= 0) found = true
    for (let i = 0; i < so.getChildrenCount(); i++) visit(so.getChild(i))
  }
  visit(root)
  return found
}

export function allVisibleText(root: SceneObject): string {
  const out: string[] = []
  const visit = (so: SceneObject) => {
    if (!so.isEnabledInHierarchy) return
    const texts = so.getComponents("Component.Text") as Text[]
    for (const t of texts) if (t.enabled && t.text) out.push(t.text)
    for (let i = 0; i < so.getChildrenCount(); i++) visit(so.getChild(i))
  }
  visit(root)
  return out.join(" | ")
}

/** Screen-space bbox of the 25x10 cm instruction card (InstructionCard root = card centre). */
export function cardScreenRect(): {minX: number; maxX: number; minY: number; maxY: number} {
  const tr = obj("InstructionCard").getTransform()
  const c = tr.getWorldPosition()
  const r = tr.right.normalize().uniformScale(12.5)
  const u = tr.up.normalize().uniformScale(5)
  const cam = camera()
  const pts = [c.add(r).add(u), c.add(r).sub(u), c.sub(r).add(u), c.sub(r).sub(u)].map((p) =>
    cam.worldSpaceToScreenSpace(p)
  )
  return {
    minX: Math.min(...pts.map((p) => p.x)),
    maxX: Math.max(...pts.map((p) => p.x)),
    minY: Math.min(...pts.map((p) => p.y)),
    maxY: Math.max(...pts.map((p) => p.y)),
  }
}

/**
 * Test-only: stop device tracking from overwriting the camera transform so the scenario can
 * simulate the user's head moving (runtime change only; the preview resets between scenarios).
 */
export function takeOverCamera(): Transform {
  let so: SceneObject | null = camera().getSceneObject()
  const camTr = so.getTransform()
  let n = 0
  while (so) {
    const dts = so.getComponents("Component.DeviceTracking") as any[]
    for (const d of dts) {
      d.enabled = false
      n++
    }
    so = so.getParent()
  }
  log("disabled " + n + " DeviceTracking component(s) on camera hierarchy")
  return camTr
}

/** Point a camera-like transform at `target` from `eye`. */
export function lookAtRotation(eye: vec3, target: vec3): quat {
  // Camera looks along its local -Z, so the transform's +Z must point away from the target.
  const back = eye.sub(target).normalize()
  return quat.lookAt(back, vec3.up())
}
