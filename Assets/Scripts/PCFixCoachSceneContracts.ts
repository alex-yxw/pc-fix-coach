/**
 * PCFixCoachSceneContracts — stable names, step ids and default copy for the
 * "PC Fix Coach: GPU Install" overlay.
 *
 * Owns: step numbering (0 = awaiting placement, 1..5 = install steps, 6 = done),
 *       authored SceneObject names (used by LEAF tests and future agents),
 *       generated asset paths.
 * Must not: hold runtime state or touch the scene.
 */

export const STEP_AWAIT_PLACEMENT = 0
export const STEP_REMOVE_COVER = 1
export const STEP_LOCATE_SLOT = 2
export const STEP_INSERT_GPU = 3
export const STEP_SECURE_SCREW = 4
export const STEP_CONNECT_POWER = 5
export const STEP_COMPLETE = 6
export const TOTAL_STEPS = 5

/** Authored scene object names — keep in sync with the scene. Stand-ins are prefixed STANDIN_. */
export const SCENE_NAMES = {
  main: "PCFixCoach",
  table: "STANDIN_VirtualTable",
  tableSurface: "STANDIN_TableSurface",
  pcCase: "STANDIN_PCCase",
  slotCover: "Part_SlotCover",
  gpu: "Part_GPU",
  screw: "Part_Screw",
  powerPlug: "Part_PowerPlug",
  pcieSlot: "Target_PCIeSlot",
  gpuInstalledPose: "Target_GPUInstalledPose",
  screwHole: "Target_ScrewHole",
  screwInstalledPose: "Target_ScrewInstalledPose",
  powerConnector: "Target_PowerConnector",
  plugInstalledPose: "Target_PlugInstalledPose",
  coverDiscardSpot: "Anchor_CoverDiscardSpot",
  doneTarget: "DoneTarget",
  instructionCard: "InstructionCard",
  edgeArrow: "EdgeArrow",
  guideArrow: "GuideArrow",
  completionGlow: "CompletionGlow",
}

/** Default instruction copy, index = step number (0..6). Main exposes these as an @input. */
export const DEFAULT_STEP_TEXT: string[] = [
  "Pinch the virtual table to place the PC case.",
  "Grab the highlighted PCIe slot cover and pull it out of the case.",
  "This is the PCIe x16 slot. Pinch Done when you've found it.",
  "Grab the GPU and drag it into the highlighted PCIe x16 slot.",
  "Drag the screw to the highlighted hole to secure the GPU.",
  "Drag the power plug into the GPU's highlighted power connector.",
  "All 5 steps done. Your GPU is installed.",
]

export const STEP_HEADER_PLACEMENT = "Get started"
export const STEP_HEADER_COMPLETE = "GPU Installed"

export function stepHeader(step: number): string {
  if (step <= STEP_AWAIT_PLACEMENT) return STEP_HEADER_PLACEMENT
  if (step >= STEP_COMPLETE) return STEP_HEADER_COMPLETE
  return "Step " + step + " of " + TOTAL_STEPS
}
