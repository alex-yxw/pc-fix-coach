import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {
  FlexAlign,
  FlexAlignSelf,
  FlexDirection,
  FlexJustify,
} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"

/**
 * PCFixCoachInstructionCardUI — the ~25 x 10 cm instruction card ("Step N of 5" + instruction).
 *
 * Passive view (UIKit BackPlate + FlexLayout + raw Text). Main pushes content via
 * showStep(); placement/billboarding is done by PCFixCoachCardFollower on the parent.
 * Light text only — the Specs display is additive, so nothing here relies on dark pixels.
 *
 * Owns: card visuals. Must not: hold step state or decide what to show.
 */

// ── Type scale (canonical; see specs-build-ui patterns.md → Typography)
const FONT_SIZE_SCALE = 1.0
type TextRole =
  | "Title1" | "Title2" | "HeadlineXL" | "Headline1" | "Headline2"
  | "Subheadline" | "Button" | "Callout" | "Body" | "Caption"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title1: {size: 105, weight: 700}, Title2: {size: 93, weight: 700},
  HeadlineXL: {size: 62, weight: 700}, Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700}, Subheadline: {size: 41, weight: 700},
  Button: {size: 39, weight: 500}, Callout: {size: 39, weight: 700},
  Body: {size: 39, weight: 500}, Caption: {size: 38, weight: 500},
}
function roleSize(role: TextRole, distanceCm: number = 110): number {
  return TYPE_SCALE[role].size * FONT_SIZE_SCALE * (distanceCm / 110)
}
function applyTextRole(t: Text, role: TextRole, distanceCm: number = 110): void {
  t.size = roleSize(role, distanceCm)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

const ICON_STEP = requireAsset("../Icons/build.png") as Texture
const ICON_DONE = requireAsset("../Icons/task_alt.png") as Texture
const imageMaterial = requireAsset("../Materials/ImageMaterial.mat") as Material

const LAYOUT_Z_LIFT = 0.02

@component
export class PCFixCoachInstructionCardUI extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">PCFixCoachInstructionCardUI – step instruction card</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Card size in cm (width, height).")
  cardSizeCm: vec2 = new vec2(25, 10)

  @input
  @widget(new SliderWidget(40, 150, 5))
  @hint("Typical viewing distance (cm); text is scaled from the 110 cm Specs type scale.")
  viewDistanceCm: number = 90

  @input("vec4", "{1, 1, 1, 1}")
  @widget(new ColorWidget())
  @hint("Header ('Step N of 5') text color.")
  headerColor: vec4

  @input("vec4", "{0.92, 0.96, 1, 0.92}")
  @widget(new ColorWidget())
  @hint("Instruction text color (keep it light: black is invisible on Specs).")
  bodyColor: vec4

  @input("vec4", "{0.6, 1.0, 0.7, 1}")
  @widget(new ColorWidget())
  @hint("Header color for the final 'GPU Installed' confirmation.")
  completeColor: vec4
  @ui.group_end

  private headerText: Text
  private bodyTextComp: Text
  private iconMat: Material
  private pending: {header: string; body: string; complete: boolean} = {
    header: "Get started",
    body: "",
    complete: false,
  }
  private _header = ""
  private _body = ""
  private _complete = false

  onAwake(): void {
    this.sceneObject.createComponent("Component.Canvas")
    const backPlate = this.sceneObject.createComponent(BackPlate.getTypeName()) as BackPlate
    backPlate.size = this.cardSizeCm

    const W = this.cardSizeCm.x
    const H = this.cardSizeCm.y
    const PAD = 1.1

    const content = global.scene.createSceneObject("Content")
    content.setParent(this.sceneObject)
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const col = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    col.width = W
    col.height = H
    col.direction = FlexDirection.Column
    col.alignItems = FlexAlign.Stretch
    col.justifyContent = FlexJustify.Start
    col.rowGap = 0.5
    col.paddingTop = PAD
    col.paddingBottom = PAD
    col.paddingLeft = PAD + 0.3
    col.paddingRight = PAD + 0.3

    // Header row: icon + "Step N of 5"
    this.flexChild(content, {h: 2.4}, (rowHost) => {
      const row = rowHost.createComponent(FlexLayout.getTypeName()) as FlexLayout
      row.width = W - 2 * (PAD + 0.3)
      row.height = 2.4
      row.direction = FlexDirection.Row
      row.alignItems = FlexAlign.Center
      row.justifyContent = FlexJustify.Start
      row.columnGap = 0.7
      this.flexChild(rowHost, {w: 2.2, h: 2.2}, (iconHost) => {
        const img = iconHost.createComponent("Component.Image") as Image
        this.iconMat = imageMaterial.clone()
        this.iconMat.mainPass.baseTex = ICON_STEP
        this.iconMat.mainPass.depthTest = true
        this.iconMat.mainPass.depthWrite = false
        img.clearMaterials()
        img.addMaterial(this.iconMat)
        iconHost.getTransform().setLocalScale(new vec3(2.2, 2.2, 1))
      })
      const headerW = W - 2 * (PAD + 0.3) - 2.2 - 0.7
      this.flexChild(rowHost, {w: headerW, h: 2.4}, (textHost) => {
        const t = textHost.createComponent("Component.Text") as Text
        t.depthTest = true
        applyTextRole(t, "HeadlineXL", this.viewDistanceCm)
        t.horizontalAlignment = HorizontalAlignment.Left
        t.verticalAlignment = VerticalAlignment.Center
        t.horizontalOverflow = HorizontalOverflow.Overflow
        t.verticalOverflow = VerticalOverflow.Overflow
        t.layoutRect = Rect.create(-headerW / 2, headerW / 2, -1.2, 1.2)
        t.textFill.color = this.headerColor
        this.headerText = t
      })
    })

    // Instruction body (wraps to 2–3 lines)
    const bodyH = H - 2 * PAD - 2.4 - 0.5
    this.flexChild(content, {h: bodyH}, (bodyHost) => {
      const t = bodyHost.createComponent("Component.Text") as Text
      t.depthTest = true
      applyTextRole(t, "Headline1", this.viewDistanceCm)
      t.horizontalAlignment = HorizontalAlignment.Left
      t.verticalAlignment = VerticalAlignment.Top
      t.horizontalOverflow = HorizontalOverflow.Wrap
      t.verticalOverflow = VerticalOverflow.Overflow
      const bw = W - 2 * (PAD + 0.3)
      t.layoutRect = Rect.create(-bw / 2, bw / 2, -bodyH / 2, bodyH / 2)
      t.textFill.color = this.bodyColor
      this.bodyTextComp = t
    }, FlexAlignSelf.Stretch)

    this.apply()
  }

  // ── Public API (Main → UI) ─────────────────────────────────

  /** Show a header + instruction. `complete` switches to the final confirmation style. */
  showStep(header: string, body: string, complete: boolean = false): void {
    this.pending = {header: header, body: body, complete: complete}
    this.apply()
  }

  /** Test hooks */
  get currentHeader(): string {
    return this._header
  }
  get currentBody(): string {
    return this._body
  }
  get isCompleteStyle(): boolean {
    return this._complete
  }

  // ── Internals ──────────────────────────────────────────────

  private apply(): void {
    this._header = this.pending.header
    this._body = this.pending.body
    this._complete = this.pending.complete
    if (!this.headerText) return
    this.headerText.text = this._header
    this.bodyTextComp.text = this._body
    this.headerText.textFill.color = this._complete ? this.completeColor : this.headerColor
    if (this.iconMat) this.iconMat.mainPass.baseTex = this._complete ? ICON_DONE : ICON_STEP
  }

  private flexChild(
    parent: SceneObject,
    size: {w?: number; h?: number},
    builder: (child: SceneObject) => void,
    alignSelf?: FlexAlignSelf
  ): SceneObject {
    const child = global.scene.createSceneObject("Item")
    child.setParent(parent)
    child.getTransform().setLocalPosition(new vec3(0, 0, LAYOUT_Z_LIFT))
    const item = child.createComponent(FlexItem.getTypeName()) as FlexItem
    if (size.w !== undefined && size.w > 0) item.overrideWidth = size.w
    if (size.h !== undefined && size.h > 0) item.overrideHeight = size.h
    item.flexGrow = 0
    item.flexShrink = 0
    if (alignSelf !== undefined) item.alignSelf = alignSelf
    builder(child)
    // Children are picked up by FlexLayout's autoDiscoverItemsOnStart (built in onAwake,
    // before the layout initializes) — calling addItems here would throw.
    return child
  }
}
