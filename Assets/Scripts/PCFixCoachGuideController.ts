import {PCFixCoachDraggablePart} from "./PCFixCoachDraggablePart"
import {PCFixCoachOutline} from "./PCFixCoachOutline"
import {
  STEP_COMPLETE,
  STEP_CONNECT_POWER,
  STEP_INSERT_GPU,
  STEP_LOCATE_SLOT,
  STEP_REMOVE_COVER,
  STEP_SECURE_SCREW,
} from "./PCFixCoachSceneContracts"

const BOX_MESH = requireAsset("../PCFixCoach/Meshes/StandIn_Box.mesh") as RenderMesh
const GLOW_MAT = requireAsset("../PCFixCoach/Materials/GlowUnlit.mat") as Material

type OutlineState = "hidden" | "active" | "completed"

interface OutlineEntry {
  outline: PCFixCoachOutline
  state: OutlineState
  confirmT: number // seconds since completion (confirmation flash then fade)
  warnT: number // seconds since warning flash started (-1 = none)
}

/**
 * PCFixCoachGuideController — highlights, the in-world guide arrow and the completion glow.
 *
 * Lives on the "Guides" child of the PCFixCoach root. Builds wireframe outlines around the
 * parts / targets at runtime and drives them from the step Main reports:
 *  - current step: brightest, pulsing outline(s) + bobbing arrow pointing at the target
 *  - completed step: short bright confirmation, then a dim light-blue outline that stays
 *  - wrong release: brief soft-amber flash on the step's outlines
 *  - finish: all outlines dim, arrow hidden, soft glow pulse around the PC
 *
 * Owns: outline/arrow/glow visuals. Must not: own step state (Main does).
 */
@component
export class PCFixCoachGuideController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachGuideController – highlights, arrow, glow</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
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
  @hint("Step 2 target: PCIe x16 slot.")
  pcieSlot: SceneObject
  @input
  @hint("Step 3 target: where the GPU snaps (ghost outline).")
  gpuInstalledPose: SceneObject
  @input
  @hint("Step 4 target: screw hole.")
  screwHole: SceneObject
  @input
  @hint("Step 5 target: GPU power connector.")
  powerConnector: SceneObject
  @input
  @hint("Arrow that points down at the current target (visual points -Y).")
  guideArrow: SceneObject
  @input
  @hint("Translucent shell around the PC used for the completion glow pulse.")
  completionGlow: RenderMeshVisual
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input("vec4", "{0.35, 0.95, 1.0, 1.0}")
  @widget(new ColorWidget())
  @hint("Current step highlight color (brightest).")
  activeColor: vec4

  @input("vec4", "{0.55, 0.75, 1.0, 0.35}")
  @widget(new ColorWidget())
  @hint("Completed parts: dim, light-colored outline (alpha = brightness).")
  completedColor: vec4

  @input("vec4", "{0.75, 1.0, 0.8, 1.0}")
  @widget(new ColorWidget())
  @hint("Short confirmation flash when a step completes.")
  confirmColor: vec4

  @input("vec4", "{1.0, 0.72, 0.25, 1.0}")
  @widget(new ColorWidget())
  @hint("Soft amber warning flash on a wrong release.")
  warningColor: vec4

  @input
  @widget(new SliderWidget(0.1, 1, 0.05))
  @hint("Outline bar thickness in cm.")
  outlineThicknessCm: number = 0.35

  @input
  @widget(new SliderWidget(3, 20, 0.5))
  @hint("Height (cm) of the guide arrow tip above the current target.")
  arrowHeightCm: number = 4
  @ui.group_end

  private outlines: {[name: string]: OutlineEntry} = {}
  private step = 0
  private time = 0
  private glowT = -1
  private glowMat: Material
  private glowBase: vec4
  private built = false

  onAwake(): void {
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
    if (this.completionGlow && this.completionGlow.mainMaterial) {
      this.glowMat = this.completionGlow.mainMaterial.clone()
      this.completionGlow.mainMaterial = this.glowMat
      this.glowBase = this.glowMat.mainPass.baseColor
      this.completionGlow.getSceneObject().enabled = false
    }
    if (this.guideArrow) this.guideArrow.enabled = false
    // Outlines read the parts' inputs, so build them only once every component is awake.
    this.createEvent("OnStartEvent").bind(() => this.buildOutlines())
  }

  private buildOutlines(): void {
    if (this.built) return
    const parts = [this.slotCover, this.gpu, this.screw, this.powerPlug]
    for (const p of parts) if (!p || !p.outlineSizeCm) return // part not awake yet — retry later
    this.built = true
    const t = this.outlineThicknessCm
    const add = (name: string, parent: SceneObject, size: vec3) => {
      if (!parent) return
      const o = new PCFixCoachOutline(parent, "Outline_" + name, vec3.zero(), size, t, BOX_MESH, GLOW_MAT)
      o.setVisible(false)
      this.outlines[name] = {outline: o, state: "hidden", confirmT: -1, warnT: -1}
    }
    add("SlotCover", this.slotCover.getSceneObject(), this.slotCover.outlineSizeCm)
    add("PCIeSlot", this.pcieSlot, new vec3(10, 1.8, 1.8))
    add("GPU", this.gpu.getSceneObject(), this.gpu.outlineSizeCm)
    add("GPUSlotGhost", this.gpuInstalledPose, new vec3(26.6, 4.6, 11.6))
    add("Screw", this.screw.getSceneObject(), this.screw.outlineSizeCm)
    add("ScrewHole", this.screwHole, new vec3(2.6, 1.0, 2.6))
    add("PowerPlug", this.powerPlug.getSceneObject(), this.powerPlug.outlineSizeCm)
    add("PowerConnector", this.powerConnector, new vec3(4, 2.8, 1.6))
  }

  // ── Step → outlines ────────────────────────────────────────

  /** Outlines lit while `step` is current. */
  private activeFor(step: number): string[] {
    switch (step) {
      case STEP_REMOVE_COVER:
        return ["SlotCover"]
      case STEP_LOCATE_SLOT:
        return ["PCIeSlot"]
      case STEP_INSERT_GPU:
        return ["GPU", "GPUSlotGhost"]
      case STEP_SECURE_SCREW:
        return ["Screw", "ScrewHole"]
      case STEP_CONNECT_POWER:
        return ["PowerPlug", "PowerConnector"]
    }
    return []
  }

  /** Outline that stays (dimmed) once `step` is done. */
  private keptFor(step: number): string {
    switch (step) {
      case STEP_REMOVE_COVER:
        return "SlotCover"
      case STEP_LOCATE_SLOT:
        return "PCIeSlot"
      case STEP_INSERT_GPU:
        return "GPU"
      case STEP_SECURE_SCREW:
        return "Screw"
      case STEP_CONNECT_POWER:
        return "PowerPlug"
    }
    return ""
  }

  /** World object the arrow (and edge arrow / card) should point at for a step. */
  getStepTarget(step: number): SceneObject | null {
    switch (step) {
      case STEP_REMOVE_COVER:
        return this.slotCover.getSceneObject()
      case STEP_LOCATE_SLOT:
        return this.pcieSlot
      case STEP_INSERT_GPU:
        return this.gpuInstalledPose
      case STEP_SECURE_SCREW:
        return this.screwHole
      case STEP_CONNECT_POWER:
        return this.powerConnector
    }
    return null
  }

  // ── Public API (called by Main) ────────────────────────────

  setActiveStep(step: number): void {
    this.buildOutlines()
    this.step = step
    for (const name of this.activeFor(step)) {
      const e = this.outlines[name]
      if (!e) continue
      e.state = "active"
      e.warnT = -1
      e.outline.setVisible(true)
    }
    if (this.guideArrow) this.guideArrow.enabled = this.getStepTarget(step) !== null
  }

  /** Step finished: confirmation flash on the kept outline, hide the rest of that step's outlines. */
  completeStep(step: number): void {
    this.buildOutlines()
    const keep = this.keptFor(step)
    for (const name of this.activeFor(step)) {
      const e = this.outlines[name]
      if (!e) continue
      if (name === keep) {
        e.state = "completed"
        e.confirmT = 0
        e.warnT = -1
      } else {
        e.state = "hidden"
        e.outline.setVisible(false)
      }
    }
  }

  /** Wrong release: amber flash on the current step's outlines. */
  warn(): void {
    for (const name of this.activeFor(this.step)) {
      const e = this.outlines[name]
      if (e) e.warnT = 0
    }
  }

  /** Final: everything dim, arrow hidden, soft glow pulse on the PC. */
  showCompletion(): void {
    this.step = STEP_COMPLETE
    for (const name in this.outlines) {
      const e = this.outlines[name]
      if (e.state === "active") {
        e.state = "completed"
        e.confirmT = 99
      }
    }
    if (this.guideArrow) this.guideArrow.enabled = false
    if (this.glowMat) {
      this.completionGlow.getSceneObject().enabled = true
      this.glowT = 0
    }
  }

  /** Test hook: "hidden" | "active" | "completed" for an outline name. */
  getOutlineState(name: string): string {
    const e = this.outlines[name]
    return e ? e.state : "missing"
  }

  /** Test hook: current RGBA of an outline. */
  getOutlineColor(name: string): vec4 | null {
    const e = this.outlines[name]
    return e ? e.outline.getColor() : null
  }

  isGlowPulsing(): boolean {
    return this.glowT >= 0
  }

  isArrowVisible(): boolean {
    return this.guideArrow ? this.guideArrow.enabled : false
  }

  // ── Per-frame ──────────────────────────────────────────────

  private onUpdate(): void {
    const dt = getDeltaTime()
    this.time += dt
    const pulse = 0.78 + 0.22 * Math.sin(this.time * 5)

    for (const name in this.outlines) {
      const e = this.outlines[name]
      if (e.state === "hidden") continue
      let c: vec4
      if (e.state === "active") {
        c = new vec4(this.activeColor.x, this.activeColor.y, this.activeColor.z, this.activeColor.w * pulse)
      } else {
        // completed: confirm (0.45s) → fade to dim (0.7s) → dim
        e.confirmT += dt
        const hold = 0.45
        const fade = 0.7
        if (e.confirmT < hold) c = this.confirmColor
        else {
          const k = Math.min(1, (e.confirmT - hold) / fade)
          c = vec4.lerp(this.confirmColor, this.completedColor, k)
        }
      }
      if (e.warnT >= 0) {
        e.warnT += dt
        const dur = 0.7
        if (e.warnT >= dur) e.warnT = -1
        else c = vec4.lerp(c, this.warningColor, Math.sin(Math.PI * (e.warnT / dur)))
      }
      e.outline.setColor(c)
    }

    // Guide arrow: bob above the current target, pointing down.
    const target = this.getStepTarget(this.step)
    if (this.guideArrow && this.guideArrow.enabled && target) {
      const p = target.getTransform().getWorldPosition()
      const bob = 1.2 * Math.sin(this.time * 4)
      this.guideArrow.getTransform().setWorldPosition(p.add(new vec3(0, this.arrowHeightCm + bob, 0)))
    }

    // Completion glow: three soft pulses, then off.
    if (this.glowT >= 0 && this.glowMat) {
      this.glowT += dt
      const total = 3.6
      if (this.glowT >= total) {
        this.glowT = -1
        this.completionGlow.getSceneObject().enabled = false
      } else {
        const s = Math.sin((this.glowT / total) * Math.PI * 3)
        const a = this.glowBase.w * s * s
        this.glowMat.mainPass.baseColor = new vec4(this.glowBase.x, this.glowBase.y, this.glowBase.z, a)
      }
    }
  }
}
