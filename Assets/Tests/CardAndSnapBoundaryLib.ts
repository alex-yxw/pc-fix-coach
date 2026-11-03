/**
 * Tests for two targeted fixes:
 *  - the instruction card repositions per step (~10 cm above + ~15 cm beside the component),
 *    switches sides with the viewing angle and faces the user;
 *  - the GPU snaps only within a straight 3D distance of ~5 cm (no extra depth tolerance).
 */
import {DefaultLeafInteractor} from "Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor"
import {findSceneObjectByName, sleep} from "Leaf.lspkg/Utils/common/Utils"
import {PCFixCoachCardFollower} from "../Scripts/PCFixCoachCardFollower"
import {
  advanceHooksTo,
  advanceRealTo,
  camera,
  cardScreenRect,
  check,
  dragCurrentPartToTarget,
  fmt,
  guides,
  log,
  lookAtRotation,
  main,
  obj,
  placeByPinch,
  takeOverCamera,
  waitFor,
  waitForLensReady,
  worldPos,
} from "./PCFixCoachLeafHelpers"

const CARD_HALF_H = 5

function follower(): PCFixCoachCardFollower {
  const so = findSceneObjectByName("InstructionCard")
  const c = so.getComponent(PCFixCoachCardFollower.getTypeName()) as any
  if (!c) throw new Error("PCFixCoachCardFollower not found on InstructionCard")
  return c as PCFixCoachCardFollower
}

function caseCentre(): vec3 {
  return worldPos("STANDIN_PCCase").add(new vec3(0, 22.5, 0))
}

/** Horizontal right vector of a viewer at camPos looking at the case centre. */
function viewerRight(camPos: vec3): vec3 {
  let toCam = camPos.sub(caseCentre())
  toCam = new vec3(toCam.x, 0, toCam.z).normalize()
  return toCam.uniformScale(-1).cross(vec3.up()).normalize()
}

type CardSample = {step: number; card: vec3; comp: vec3; gapAbove: number; lateral: number}

/** Wait for the card to settle, then check its placement against the current component. */
async function sampleCard(step: number): Promise<CardSample> {
  await sleep(1500)
  const m = main()
  check(m.currentStep === step, "expected step " + step)
  const compObj = guides().getStepTarget(step)
  check(compObj !== null, "no component for step " + step)
  const comp = compObj.getTransform().getWorldPosition()
  const cardTr = obj("InstructionCard").getTransform()
  const card = cardTr.getWorldPosition()
  const camPos = camera().getTransform().getWorldPosition()

  // Measure the card as the user sees it: project it along the sight line onto the
  // component's depth (the card sits nearer, in front of the case).
  const right = viewerRight(camPos)
  const fwd = vec3.up().cross(right).normalize() // horizontal viewer forward
  const s = comp.sub(camPos).dot(fwd) / card.sub(camPos).dot(fwd)
  const seen = camPos.add(card.sub(camPos).uniformScale(s))
  const seenHalfW = 12.5 * s
  const seenHalfH = CARD_HALF_H * s

  // ~10 cm gap between the component and the card's bottom edge (as seen).
  const gapAbove = seen.y - seenHalfH - comp.y
  check(
    gapAbove > 8 && gapAbove < 12,
    "step " + step + ": card bottom looks " + gapAbove.toFixed(1) + " cm above the component (want ~10)"
  )

  // Offset sideways from the component (as seen), ~15 cm card-centre offset for a 25 cm card,
  // i.e. the card's near edge clears the component by ~2.5 cm.
  const lateral = seen.sub(comp).dot(right)
  const edgeClear = Math.abs(lateral) - seenHalfW
  check(
    edgeClear > 1.5 && edgeClear < 4,
    "step " + step + ": card near edge looks " + edgeClear.toFixed(1) + " cm sideways from the component (want ~2.5, i.e. centre ~15 at 25 cm width)"
  )

  // Not over the component or its interaction area on screen (component point + 4 cm around it).
  const r = cardScreenRect()
  const cam = camera()
  const probes = [comp, comp.add(new vec3(4, 0, 0)), comp.add(new vec3(-4, 0, 0)), comp.add(new vec3(0, 4, 0))]
  for (const p of probes) {
    const s = cam.worldSpaceToScreenSpace(p)
    const inside = s.x > r.minX && s.x < r.maxX && s.y > r.minY && s.y < r.maxY
    check(
      !inside,
      "step " + step + ": card covers the component area at " + fmt(p) + " screen (" + s.x.toFixed(3) + "," + s.y.toFixed(3) +
        ") card rect x[" + r.minX.toFixed(3) + "," + r.maxX.toFixed(3) + "] y[" + r.minY.toFixed(3) + "," + r.maxY.toFixed(3) +
        "] card " + fmt(card) + " comp " + fmt(comp) + " cam " + fmt(camPos) + " gap " + gapAbove.toFixed(1) + " lateral " + lateral.toFixed(1)
    )
  }

  // Faces the user (yaw billboard): card +Z points at the camera horizontally.
  let toCam = camPos.sub(card)
  toCam = new vec3(toCam.x, 0, toCam.z).normalize()
  const f = cardTr.forward
  const facing = new vec3(f.x, 0, f.z).normalize().dot(toCam)
  check(facing > 0.97, "step " + step + ": card is not facing the user (dot " + facing.toFixed(3) + ")")

  log(
    "card step " + step + ": card " + fmt(card) + " comp " + fmt(comp) + " gap " + gapAbove.toFixed(1) +
      " lateral " + lateral.toFixed(1) + " facing " + facing.toFixed(3)
  )
  return {step, card, comp, gapAbove, lateral}
}

/** Card moves to a new spot at every step (real pinch/drag input for all steps). */
export async function runCardMovesBetweenStepsReal(): Promise<void> {
  await waitForLensReady()
  const interactor = new DefaultLeafInteractor()
  await placeByPinch(interactor)
  const samples: CardSample[] = []
  for (let step = 1; step <= 5; step++) {
    await advanceRealTo(interactor, step)
    samples.push(await sampleCard(step))
  }
  for (let i = 1; i < samples.length; i++) {
    const moved = samples[i].card.distance(samples[i - 1].card)
    log("card moved " + moved.toFixed(1) + " cm from step " + samples[i - 1].step + " to step " + samples[i].step)
    check(
      moved >= 3,
      "card barely moved between step " + samples[i - 1].step + " and " + samples[i].step + " (" + moved.toFixed(1) + " cm)"
    )
  }
}

/** Card switches to the side of the case the user is viewing from, at two different steps. */
export async function runCardSwitchesSideWithView(): Promise<void> {
  await waitForLensReady()
  await advanceHooksTo(3)
  const camTr = takeOverCamera()
  const caseTr = obj("STANDIN_PCCase").getTransform()
  const ax = caseTr.right
  const az = caseTr.forward
  const centre = caseCentre()

  for (const step of [3, 5]) {
    await advanceHooksTo(step)
    const comp = guides().getStepTarget(step).getTransform().getWorldPosition()
    const sides: number[] = []
    for (const angleDeg of [40, -40, 40]) {
      const a = (angleDeg * Math.PI) / 180
      const eye = centre
        .add(ax.uniformScale(Math.sin(a) * 85))
        .add(az.uniformScale(Math.cos(a) * 85))
        .add(new vec3(0, 25, 0))
      camTr.setWorldPosition(eye)
      camTr.setWorldRotation(lookAtRotation(eye, comp))
      const s = await sampleCard(step)
      const caseSideOffset = s.card.sub(s.comp).dot(ax)
      const zone = follower().getViewZone()
      log("step " + step + " view " + angleDeg + " deg: card offset along case X " + caseSideOffset.toFixed(1) + " cm, zone " + zone)
      check(zone === Math.sign(angleDeg), "view zone should be " + Math.sign(angleDeg) + " at " + angleDeg + " deg (is " + zone + ")")
      check(
        Math.sign(caseSideOffset) === Math.sign(angleDeg) && Math.abs(caseSideOffset) > 5,
        "step " + step + ": card not on the viewer's side of the case at " + angleDeg + " deg (offset " + caseSideOffset.toFixed(1) + ")"
      )
      sides.push(Math.sign(caseSideOffset))
    }
    check(sides[0] !== sides[1] && sides[1] !== sides[2], "card did not switch sides back and forth at step " + step)
  }
}

const AXES = [
  new vec3(1, 0, 0),
  new vec3(-1, 0, 0),
  new vec3(0, 1, 0),
  new vec3(0, -1, 0),
  new vec3(0, 0, 1),
  new vec3(0, 0, -1),
]

/** Hook drops at exact offsets: 9 and 12 cm on +/-X, +/-Y, +/-Z miss; 6 cm depth and 5.2 cm diagonal miss; 4.85 cm diagonal snaps. */
export async function runGpuSnap3DBoundaryHook(): Promise<void> {
  await waitForLensReady()
  await advanceHooksTo(3)
  const m = main()
  const pose = worldPos("Target_GPUInstalledPose")
  const home = worldPos("Part_GPU")
  const misses: {off: vec3; label: string}[] = []
  for (const d of AXES) for (const dist of [9, 12]) misses.push({off: d.uniformScale(dist), label: fmt(d) + " x " + dist + " cm"})
  misses.push({off: new vec3(0, 0, 6), label: "depth 6 cm (old rule snapped this)"})
  misses.push({off: new vec3(3, 3, 3), label: "diagonal 5.20 cm"})
  for (const t of misses) {
    const w0 = m.wrongReleaseCount
    m.testDropPart(pose.add(t.off))
    await sleep(900)
    check(m.wrongReleaseCount === w0 + 1, "drop at " + t.label + " should be a wrong release")
    check(m.currentStep === 3, "step must stay 3 after drop at " + t.label)
    const back = worldPos("Part_GPU").distance(home)
    check(back < 0.3, "GPU did not return home after drop at " + t.label + " (" + back.toFixed(2) + " cm off)")
    log("miss OK: " + t.label)
  }
  m.testDropPart(pose.add(new vec3(2.8, 2.8, 2.8)))
  await waitFor(() => m.currentStep === 4, 3000, "4.85 cm diagonal drop should snap and advance")
  check(worldPos("Part_GPU").distance(pose) < 0.3, "GPU not on installed pose after 4.85 cm drop")
  log("snap OK at 4.85 cm diagonal")
}

/** Real SIK drags released ~10.5 cm off the slot along +/-X, +/-Y, +/-Z all miss; a ~3 cm release snaps. */
export async function runGpuSnap3DBoundaryReal(): Promise<void> {
  await waitForLensReady()
  const interactor = new DefaultLeafInteractor()
  await advanceRealTo(interactor, 3)
  const m = main()
  const pose = worldPos("Target_GPUInstalledPose")
  for (const d of AXES) {
    const w0 = m.wrongReleaseCount
    const rel = await dragCurrentPartToTarget(interactor, d.uniformScale(10.5), 6000)
    const dist = rel.distance(pose)
    log("real release along " + fmt(d) + ": " + dist.toFixed(2) + " cm from slot")
    check(dist >= 9 && dist <= 12, "drag along " + fmt(d) + " did not end 9-12 cm away (" + dist.toFixed(2) + " cm)")
    await sleep(900)
    check(m.wrongReleaseCount === w0 + 1, "release " + dist.toFixed(1) + " cm away along " + fmt(d) + " should be a wrong release")
    check(m.currentStep === 3, "step must stay 3")
  }
  const rel = await dragCurrentPartToTarget(interactor, new vec3(2, 1.5, 1.5), 6000)
  log("real near release: " + rel.distance(pose).toFixed(2) + " cm")
  await waitFor(() => m.currentStep === 4, 3000, "snap + advance after ~3 cm release")
  check(worldPos("Part_GPU").distance(pose) < 0.3, "GPU not on installed pose")
}
