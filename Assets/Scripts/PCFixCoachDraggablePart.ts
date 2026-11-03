import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event, {PublicApi} from "SpectaclesInteractionKit.lspkg/Utils/Event"

/**
 * PCFixCoachDraggablePart — one grabbable stand-in part (slot cover, GPU, screw, power plug).
 *
 * Lives on the part's unit-scale wrapper SceneObject (Part_*). Visual children carry the
 * scale; this wrapper carries the box collider + SIK Interactable + InteractableManipulation
 * (translate only), so mouse Interactive Preview, hands and LEAF all drive it the same way.
 *
 * Owns: collider/interaction setup, hover tint, amber warning flash, tweened moves
 *       (return-home, snap-in).
 * Expects: visual children under this SceneObject (any RenderMeshVisuals are tinted).
 * Must not: decide whether a release is correct — PCFixCoachMain does that via onRelease.
 */
@component
export class PCFixCoachDraggablePart extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachDraggablePart – grabbable stand-in part</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Size (cm) of the invisible grab box. Make it larger than the part so small parts are easy to hit.")
  grabBoxSizeCm: vec3 = new vec3(8, 8, 8)

  @input
  @hint("Size (cm) of the highlight outline drawn around this part.")
  outlineSizeCm: vec3 = new vec3(6, 6, 6)

  @input("vec4", "{1.0, 0.72, 0.25, 1}")
  @widget(new ColorWidget())
  @hint("Tint used for the brief 'wrong place' flash.")
  warningTint: vec4

  @input
  @widget(new SliderWidget(0, 0.6, 0.05))
  @hint("How much the part brightens while aimed at (0 = no hover highlight).")
  hoverBrighten: number = 0.3
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Debug</span>')
  @ui.group_start("Debug")
  @input
  @hint("Draw the grab collider wireframe.")
  debugCollider: boolean = false
  @ui.group_end

  private _onGrab = new Event<void>()
  private _onRelease = new Event<vec3>()
  get onGrab(): PublicApi<void> {
    return this._onGrab.publicApi()
  }
  /** Fires on release with the part's world position. */
  get onRelease(): PublicApi<vec3> {
    return this._onRelease.publicApi()
  }

  private interactable: Interactable
  private manipulation: InteractableManipulation
  private collider: ColliderComponent
  private tintTargets: {mat: Material; base: vec4}[] = []
  private homeLocalPos: vec3
  private homeLocalRot: quat
  private interactive = false
  private dragging = false
  private hovered = false
  private flashT = 0
  private flashDuration = 0
  private tween: {from: vec3; to: vec3; t: number; dur: number; done?: () => void} | null = null

  onAwake(): void {
    const tr = this.getTransform()
    this.homeLocalPos = tr.getLocalPosition()
    this.homeLocalRot = tr.getLocalRotation()

    this.collider = this.sceneObject.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = this.grabBoxSizeCm
    this.collider.shape = shape
    this.collider.fitVisual = false
    this.collider.debugDrawEnabled = this.debugCollider

    this.interactable = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    this.interactable.targetingMode = 3
    this.manipulation = this.sceneObject.createComponent(
      InteractableManipulation.getTypeName()
    ) as InteractableManipulation
    this.manipulation.setCanRotate(false)
    this.manipulation.setCanScale(false)
    this.manipulation.setCanTranslate(true)

    this.collectTintTargets(this.sceneObject)
    this.applyInteractive()

    this.createEvent("OnStartEvent").bind(() => {
      this.manipulation.onManipulationStart.add(() => {
        if (!this.interactive) return
        this.dragging = true
        this.tween = null
        this._onGrab.invoke()
      })
      this.manipulation.onManipulationEnd.add(() => {
        if (!this.dragging) return
        this.dragging = false
        this._onRelease.invoke(this.getTransform().getWorldPosition())
      })
      this.interactable.onHoverEnter.add(() => {
        this.hovered = true
      })
      this.interactable.onHoverExit.add(() => {
        this.hovered = false
      })
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ── Public API ─────────────────────────────────────────────

  setInteractive(on: boolean): void {
    this.interactive = on
    this.applyInteractive()
  }

  isInteractive(): boolean {
    return this.interactive
  }

  isDragging(): boolean {
    return this.dragging
  }

  getHomeLocalPosition(): vec3 {
    return this.homeLocalPos
  }

  /** Smoothly move (local space) to a position; interaction is paused during the move. */
  moveToLocal(target: vec3, duration: number, done?: () => void): void {
    const from = this.getTransform().getLocalPosition()
    this.getTransform().setLocalRotation(this.homeLocalRot)
    if (duration <= 0) {
      this.getTransform().setLocalPosition(target)
      if (done) done()
      return
    }
    this.tween = {from: from, to: target, t: 0, dur: duration, done: done}
  }

  /** Wrong release: glide back home with a soft amber flash. */
  returnHome(duration: number, flashDuration: number): void {
    this.flash(flashDuration)
    this.moveToLocal(this.homeLocalPos, duration)
  }

  flash(duration: number): void {
    this.flashT = 0
    this.flashDuration = duration
  }

  isFlashing(): boolean {
    return this.flashDuration > 0 && this.flashT < this.flashDuration
  }

  // ── Internals ──────────────────────────────────────────────

  private applyInteractive(): void {
    if (this.interactable) this.interactable.enabled = this.interactive
    if (this.manipulation) this.manipulation.enabled = this.interactive
    if (this.collider) this.collider.enabled = this.interactive
    if (!this.interactive) this.hovered = false
  }

  private collectTintTargets(obj: SceneObject): void {
    if (obj.name.indexOf("Outline_") === 0) return // highlight outlines are driven by the guide controller
    const rmvs = obj.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]
    for (const rmv of rmvs) {
      if (!rmv.mainMaterial) continue
      const mat = rmv.mainMaterial.clone()
      rmv.mainMaterial = mat
      this.tintTargets.push({mat: mat, base: mat.mainPass.baseColor})
    }
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      this.collectTintTargets(obj.getChild(i))
    }
  }

  private onUpdate(): void {
    const dt = getDeltaTime()
    if (this.tween) {
      this.tween.t += dt
      const k = Math.min(1, this.tween.t / this.tween.dur)
      const e = 1 - Math.pow(1 - k, 3) // ease-out cubic
      this.getTransform().setLocalPosition(vec3.lerp(this.tween.from, this.tween.to, e))
      if (k >= 1) {
        const done = this.tween.done
        this.tween = null
        if (done) done()
      }
    }

    // Tint: amber flash (sin bump) wins over hover brighten.
    let amber = 0
    if (this.flashDuration > 0 && this.flashT < this.flashDuration) {
      this.flashT += dt
      amber = Math.sin(Math.PI * Math.min(1, this.flashT / this.flashDuration)) * 0.85
    }
    const hover = this.hovered && this.interactive && !this.dragging ? this.hoverBrighten : 0
    const white = new vec4(1, 1, 1, 1)
    for (const t of this.tintTargets) {
      let c = vec4.lerp(t.base, white, hover)
      if (amber > 0) c = vec4.lerp(c, this.warningTint, amber)
      t.mat.mainPass.baseColor = c
    }
  }
}
