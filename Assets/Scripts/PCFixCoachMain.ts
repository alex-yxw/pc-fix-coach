import {PCFixCoachAudio} from "./PCFixCoachAudio"
import {PCFixCoachCardFollower} from "./PCFixCoachCardFollower"
import {PCFixCoachDoneTargetUI} from "./PCFixCoachDoneTargetUI"
import {PCFixCoachDraggablePart} from "./PCFixCoachDraggablePart"
import {PCFixCoachEdgeArrow} from "./PCFixCoachEdgeArrow"
import {PCFixCoachGuideController} from "./PCFixCoachGuideController"
import {PCFixCoachInstructionCardUI} from "./PCFixCoachInstructionCardUI"
import {PCFixCoachPlacementSurface} from "./PCFixCoachPlacementSurface"
import {
  DEFAULT_STEP_TEXT,
  STEP_AWAIT_PLACEMENT,
  STEP_COMPLETE,
  STEP_CONNECT_POWER,
  STEP_INSERT_GPU,
  STEP_LOCATE_SLOT,
  STEP_REMOVE_COVER,
  STEP_SECURE_SCREW,
  stepHeader,
} from "./PCFixCoachSceneContracts"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * PCFixCoachMain — orchestrator + single source of truth for the GPU-install flow.
 *
 * Steps: 0 = waiting for the user to pinch the table, 1 = remove slot cover,
 * 2 = locate PCIe x16 slot (Done target), 3 = insert GPU, 4 = screw, 5 = power plug,
 * 6 = complete ("GPU Installed").
 *
 * Owns: currentStep / placed / complete state, release validation (snap or return home),
 *       step advancement, and pushing state into the views (card, guides, edge arrow,
 *       Done target, audio).
 * Expects: every @input in "References" wired by the scene bootstrap.
 * Must not: build UI or highlight visuals itself (those live in the UI / guide modules).
 *
 * Test surface (LEAF): currentStep, isPlaced, isComplete, completedSteps, getStateJson(),
 * placePC(), pressDone(), onStepChanged. Also exposed as global.pcFixCoach.
 */
@component
export class PCFixCoachMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachMain – GPU install coach (state + flow)</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Pinchable top of the STANDIN virtual table.")
  placementSurface: PCFixCoachPlacementSurface
  @input
  @hint("STANDIN_PCCase root (hidden until placed; parts and targets live under it).")
  pcCase: SceneObject
  @input
  @hint("Step 1 part: PCIe slot cover.")
  slotCover: PCFixCoachDraggablePart
  @input
  @hint("Step 3 part: GPU.")
  gpu: PCFixCoachDraggablePart
  @input
  @hint("Step 4 part: screw.")
  screw: PCFixCoachDraggablePart
  @input
  @hint("Step 5 part: power plug.")
  powerPlug: PCFixCoachDraggablePart
  @input
  @hint("Where the GPU snaps (child of the case).")
  gpuInstalledPose: SceneObject
  @input
  @hint("Where the screw snaps (child of the case).")
  screwInstalledPose: SceneObject
  @input
  @hint("Where the power plug snaps (child of the case).")
  plugInstalledPose: SceneObject
  @input
  @hint("Where the removed slot cover is set down on the table (child of the case).")
  coverDiscardSpot: SceneObject
  @input
  @hint("Step 2 Done target UI.")
  doneTarget: PCFixCoachDoneTargetUI
  @input
  @hint("Instruction card UI.")
  card: PCFixCoachInstructionCardUI
  @input
  @hint("Moves the card beside the case.")
  cardFollower: PCFixCoachCardFollower
  @input
  @hint("Highlights, guide arrow and completion glow.")
  guides: PCFixCoachGuideController
  @input
  @hint("Off-screen edge arrow.")
  edgeArrow: PCFixCoachEdgeArrow
  @input
  @hint("Sound effects.")
  audio: PCFixCoachAudio
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(2, 12, 0.5))
  @hint("A dragged part snaps in when released within this 3D distance (cm) of its spot.")
  snapDistanceCm: number = 5

  @input
  @widget(new SliderWidget(5, 30, 1))
  @hint("Step 1 completes when the slot cover is released at least this far (cm) from where it started.")
  pullClearDistanceCm: number = 12

  @input
  @widget(new SliderWidget(0.1, 1.5, 0.05))
  @hint("Seconds for a wrongly released part to glide back home.")
  returnDurationSec: number = 0.45

  @input
  @widget(new SliderWidget(0, 2, 0.1))
  @hint("Pause (s) after a step completes before the next step lights up (the confirmation beat).")
  advanceDelaySec: number = 0.6

  @input
  @hint("Instruction text per step: [0] placement prompt, [1..5] steps, [6] completion message.")
  stepText: string[] = DEFAULT_STEP_TEXT.slice()
  @ui.group_end

  // ── State (single source of truth) ─────────────────────────
  private _step = STEP_AWAIT_PLACEMENT
  private _placed = false
  private _complete = false
  private _completed: boolean[] = [false, false, false, false, false, false]
  private _wrongReleases = 0
  private started = false
  private advanceTimer = -1
  private pendingStep = -1

  private _onStepChanged = new Event<number>()
  get onStepChanged(): PublicApi<number> {
    return this._onStepChanged.publicApi()
  }

  // ── Public, test-friendly read API ─────────────────────────
  get currentStep(): number {
    return this._step
  }
  get isPlaced(): boolean {
    return this._placed
  }
  get isComplete(): boolean {
    return this._complete
  }
  /** completedSteps[n] for n = 1..5 */
  get completedSteps(): boolean[] {
    return this._completed.slice()
  }
  get wrongReleaseCount(): number {
    return this._wrongReleases
  }

  getStateJson(): string {
    return JSON.stringify({
      step: this._step,
      placed: this._placed,
      complete: this._complete,
      completed: this._completed,
      wrongReleases: this._wrongReleases,
      cardHeader: this.card ? this.card.currentHeader : "",
      cardBody: this.card ? this.card.currentBody : "",
      doneTargetShown: this.doneTarget ? this.doneTarget.isShown : false,
      edgeArrowShowing: this.edgeArrow ? this.edgeArrow.isShowing() : false,
      guideArrowVisible: this.guides ? this.guides.isArrowVisible() : false,
      glowPulsing: this.guides ? this.guides.isGlowPulsing() : false,
    })
  }

  onAwake(): void {
    ;(global as any).pcFixCoach = this
    const missing = this.missingRefs()
    if (missing.length > 0) {
      print("[PCFixCoach] ERROR: unwired @inputs: " + missing.join(", "))
      return
    }
    // Wire on the first frame: by then every component in the scene is awake and started,
    // regardless of hierarchy order (cross-script refs are not usable before their onAwake).
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private missingRefs(): string[] {
    const refs: {[k: string]: any} = {
      placementSurface: this.placementSurface,
      pcCase: this.pcCase,
      slotCover: this.slotCover,
      gpu: this.gpu,
      screw: this.screw,
      powerPlug: this.powerPlug,
      gpuInstalledPose: this.gpuInstalledPose,
      screwInstalledPose: this.screwInstalledPose,
      plugInstalledPose: this.plugInstalledPose,
      coverDiscardSpot: this.coverDiscardSpot,
      doneTarget: this.doneTarget,
      card: this.card,
      cardFollower: this.cardFollower,
      guides: this.guides,
      edgeArrow: this.edgeArrow,
      audio: this.audio,
    }
    const out: string[] = []
    for (const k in refs) if (!refs[k]) out.push(k)
    return out
  }

  private onStart(): void {
    this.placementSurface.onPlaceRequested.add(() => this.placePC())
    this.doneTarget.onDone.add(() => this.pressDone())

    this.slotCover.onGrab.add(() => this.audio.play("grab"))
    this.gpu.onGrab.add(() => this.audio.play("grab"))
    this.screw.onGrab.add(() => this.audio.play("grab"))
    this.powerPlug.onGrab.add(() => this.audio.play("grab"))

    this.slotCover.onRelease.add(() => this.onCoverReleased())
    this.gpu.onRelease.add(() => this.onSnapPartReleased(STEP_INSERT_GPU, this.gpu, this.gpuInstalledPose))
    this.screw.onRelease.add(() => this.onSnapPartReleased(STEP_SECURE_SCREW, this.screw, this.screwInstalledPose))
    this.powerPlug.onRelease.add(() =>
      this.onSnapPartReleased(STEP_CONNECT_POWER, this.powerPlug, this.plugInstalledPose)
    )

    this.setAllPartsInteractive(-1)
    this.doneTarget.hide()
    this.enterStep(STEP_AWAIT_PLACEMENT)
  }

  // ── Actions (also callable from tests) ─────────────────────

  /** Pinch on the table → place the PC case (anchored to the table). */
  placePC(): void {
    if (this._placed) return
    this._placed = true
    this.pcCase.enabled = true
    this.placementSurface.setActive(false)
    this.audio.play("place")
    print("[PCFixCoach] PC placed")
    this.enterStep(STEP_REMOVE_COVER)
  }

  /** Step 2's Done target. */
  pressDone(): void {
    if (this._step !== STEP_LOCATE_SLOT) return
    this.doneTarget.hide()
    this.completeStep(STEP_LOCATE_SLOT)
  }

  /**
   * Test hook: move the current step's part to `worldPos` and run the normal release path
   * (snap / pull-clear / return-home). Same logic a real drag-and-release uses.
   */
  testDropPart(worldPos: vec3): void {
    const part = this.partForStep(this._step)
    if (!part) return
    part.getTransform().setWorldPosition(worldPos)
    if (this._step === STEP_REMOVE_COVER) this.onCoverReleased()
    else if (this._step === STEP_INSERT_GPU) this.onSnapPartReleased(STEP_INSERT_GPU, this.gpu, this.gpuInstalledPose)
    else if (this._step === STEP_SECURE_SCREW)
      this.onSnapPartReleased(STEP_SECURE_SCREW, this.screw, this.screwInstalledPose)
    else if (this._step === STEP_CONNECT_POWER)
      this.onSnapPartReleased(STEP_CONNECT_POWER, this.powerPlug, this.plugInstalledPose)
  }

  /** World position where the current step's part should be released to succeed (null for steps 0/2/6). */
  getCurrentDropTarget(): vec3 | null {
    switch (this._step) {
      case STEP_REMOVE_COVER: {
        const home = this.toWorld(this.slotCover.getHomeLocalPosition())
        return home.add(new vec3(0, 0, this.pullClearDistanceCm + 8))
      }
      case STEP_INSERT_GPU:
        return this.gpuInstalledPose.getTransform().getWorldPosition()
      case STEP_SECURE_SCREW:
        return this.screwInstalledPose.getTransform().getWorldPosition()
      case STEP_CONNECT_POWER:
        return this.plugInstalledPose.getTransform().getWorldPosition()
    }
    return null
  }

  partForStep(step: number): PCFixCoachDraggablePart | null {
    switch (step) {
      case STEP_REMOVE_COVER:
        return this.slotCover
      case STEP_INSERT_GPU:
        return this.gpu
      case STEP_SECURE_SCREW:
        return this.screw
      case STEP_CONNECT_POWER:
        return this.powerPlug
    }
    return null
  }

  // ── Step machine ───────────────────────────────────────────

  private enterStep(step: number): void {
    this._step = step
    const text = this.textFor(step)
    this.card.showStep(stepHeader(step), text, step === STEP_COMPLETE)
    if (step >= STEP_REMOVE_COVER && step <= STEP_CONNECT_POWER) {
      this.guides.setActiveStep(step)
      this.setAllPartsInteractive(step)
      this.edgeArrow.setTarget(this.guides.getStepTarget(step))
    } else if (step === STEP_AWAIT_PLACEMENT) {
      this.edgeArrow.setTarget(this.placementSurface.getSceneObject())
    }
    if (step === STEP_LOCATE_SLOT) this.doneTarget.show()
    print("[PCFixCoach] step -> " + step + " (" + stepHeader(step) + ")")
    this._onStepChanged.invoke(step)
  }

  private completeStep(step: number): void {
    if (this._step !== step || this._completed[step]) return
    this._completed[step] = true
    this.guides.completeStep(step)
    this.setAllPartsInteractive(-1)
    print("[PCFixCoach] step " + step + " complete")
    if (step === STEP_CONNECT_POWER) {
      this.finish()
      return
    }
    this.audio.play("step")
    this.pendingStep = step + 1
    this.advanceTimer = this.advanceDelaySec
    if (this.advanceTimer <= 0) this.flushAdvance()
  }

  private flushAdvance(): void {
    const next = this.pendingStep
    this.pendingStep = -1
    this.advanceTimer = -1
    if (next > 0) this.enterStep(next)
  }

  private finish(): void {
    this._complete = true
    this.guides.showCompletion()
    this.edgeArrow.setTarget(null)
    this.doneTarget.hide()
    this.audio.play("complete")
    this.enterStep(STEP_COMPLETE)
  }

  // ── Release handling ───────────────────────────────────────

  private onCoverReleased(): void {
    if (this._step !== STEP_REMOVE_COVER) return
    const p = this.slotCover.getTransform().getWorldPosition()
    const home = this.toWorld(this.slotCover.getHomeLocalPosition())
    if (p.distance(home) >= this.pullClearDistanceCm) {
      this.slotCover.setInteractive(false)
      const spot = this.coverDiscardSpot.getTransform().getLocalPosition()
      this.slotCover.moveToLocal(spot, 0.5)
      this.completeStep(STEP_REMOVE_COVER)
    } else {
      this.wrongRelease(this.slotCover)
    }
  }

  private onSnapPartReleased(step: number, part: PCFixCoachDraggablePart, pose: SceneObject): void {
    if (this._step !== step) return
    if (this.isWithinSnap(part.getTransform().getWorldPosition(), pose.getTransform().getWorldPosition())) {
      part.setInteractive(false)
      this.audio.play("snap")
      part.moveToLocal(pose.getTransform().getLocalPosition(), 0.2, () => this.completeStep(step))
    } else {
      this.wrongRelease(part)
    }
  }

  private wrongRelease(part: PCFixCoachDraggablePart): void {
    this._wrongReleases++
    part.returnHome(this.returnDurationSec, 0.7)
    this.guides.warn()
    this.audio.play("wrong")
    print("[PCFixCoach] wrong release on step " + this._step + " — part returned home")
  }

  /** True when p is within snapDistanceCm of target (straight 3D distance, same in every direction). */
  isWithinSnap(p: vec3, target: vec3): boolean {
    return p.distance(target) <= this.snapDistanceCm
  }

  // ── Helpers ────────────────────────────────────────────────

  private setAllPartsInteractive(step: number): void {
    this.slotCover.setInteractive(step === STEP_REMOVE_COVER)
    this.gpu.setInteractive(step === STEP_INSERT_GPU)
    this.screw.setInteractive(step === STEP_SECURE_SCREW)
    this.powerPlug.setInteractive(step === STEP_CONNECT_POWER)
  }

  private textFor(step: number): string {
    const arr = this.stepText && this.stepText.length > step ? this.stepText : DEFAULT_STEP_TEXT
    return arr[step]
  }

  private toWorld(localInCase: vec3): vec3 {
    return this.pcCase.getTransform().getWorldTransform().multiplyPoint(localInCase)
  }

  private onUpdate(): void {
    if (!this.started) {
      this.started = true
      this.onStart()
      // Hide the case after every component has had OnStart (UIKit/SIK init needs it enabled).
      if (!this._placed) this.pcCase.enabled = false
    }
    if (this.advanceTimer >= 0) {
      this.advanceTimer -= getDeltaTime()
      if (this.advanceTimer < 0) this.flushAdvance()
    }
    // Card follows the current component's side of the case.
    const target = this.guides.getStepTarget(this._step)
    this.cardFollower.setFocusPoint(target ? target.getTransform().getWorldPosition() : null)
  }
}
