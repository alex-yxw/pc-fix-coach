# PC Fix Coach: GPU Install

A hands-free AR repair guide for Snap Spectacles, built in Lens Studio.

Installing a graphics card takes both hands and your full attention on the motherboard. Phone and video guides make you stop, look away and find your place again. PC Fix Coach puts each instruction right beside the PC and the highlights on the part itself, so your eyes and hands stay on the work.

> **Demo video:** _add YouTube link_
> **Devpost:** _add submission link_

## What it does

You pinch a virtual table to place a full-size PC case, then follow five guided steps:

| Step | Task | How you complete it |
|---|---|---|
| 1 | Remove the PCIe slot cover | Grab the highlighted cover and pull it out of the case |
| 2 | Locate the PCIe x16 slot | Pinch the **Done** target next to the slot |
| 3 | Insert the GPU | Drag the GPU into the slot. It snaps in within about 5 cm |
| 4 | Secure the GPU | Drag the screw to the highlighted screw hole |
| 5 | Connect power | Drag the power plug into the GPU's power connector |

When the last step finishes, the Lens shows **"GPU Installed"** and the PC gives off a soft glow.

### Features

- **Step card that follows you:** shows "Step N of 5" beside the case, turns to face you, and moves to the side you're viewing from so it never covers the part you're working on.
- **In-place highlights:** the current part pulses brightly and an arrow points at its target. Finished parts stay as dim, light-colored outlines so you can see your progress.
- **Edge arrow:** when the next target is out of view, a large arrow at the edge of your view points to it.
- **Wrong-drop handling:** if you release a part in the wrong spot, it glides back to where it started with a brief amber flash, and the step stays active.
- **Real-world scale:** a mid-tower case (about 45 × 21 × 45 cm) sitting on a table at standard height (about 75 cm). You can walk around it.
- **Sound effects** for placing the PC, grabbing parts, snapping them in, finishing a step and a wrong drop.

## Why glasses?

Both hands are busy holding parts and screws, and your eyes need to stay on the motherboard. On glasses, the guidance sits on the part itself and moves with each step, with no phone to pick up and no video to pause.

## Current scope

The Lens Studio preview can't recognize real objects, so in this version **the whole PC is virtual**. Scene objects prefixed `STANDIN_` (the table and the PC case) are stand-ins for real hardware. You finish each step by dragging a virtual part into its highlighted spot.

The planned real-hardware version would line the guides up with a real PC (by pinching a few points on the case or by camera-based detection) and check each step with the Spectacles camera.

## Requirements

- [Lens Studio](https://ar.snap.com/lens-studio) **5.23** or later
- Target platform: **Spectacles**
- Packages (already included in `Packages/`):
  - Spectacles Interaction Kit (SIK)
  - Spectacles UI Kit
  - LEAF (testing framework)

## Getting started

1. Clone this repository.
2. Open `fixLen.esproj` in Lens Studio.
3. In the **Preview** panel, switch to **Interactive Preview**.
4. Controls in the preview:
   - **Click**: pinch or grab
   - **Click and drag**: move a part
   - **W A S D**: move around
   - **Q / E**: move down / up
   - **Right-drag** (or hold Shift): look around
5. Click the table to place the PC, then follow the instruction card.

## Project structure

```text
Assets/
├── Scripts/                     Lens logic (TypeScript)
│   ├── PCFixCoachMain.ts            Step state and flow (the single source of truth)
│   ├── PCFixCoachSceneContracts.ts  Step IDs, scene object names, instruction text
│   ├── PCFixCoachDraggablePart.ts   Grab, drag, snap and return-home behavior
│   ├── PCFixCoachPlacementSurface.ts Pinch-to-place on the table
│   ├── PCFixCoachGuideController.ts Highlights, guide arrow, completion glow
│   ├── PCFixCoachOutline.ts         Outline boxes around parts and targets
│   ├── PCFixCoachInstructionCardUI.ts Step card (UI Kit)
│   ├── PCFixCoachCardFollower.ts    Keeps the card beside the case, facing the user
│   ├── PCFixCoachDoneTargetUI.ts    Step 2 Done button
│   ├── PCFixCoachEdgeArrow.ts       Arrow at the edge of the view for off-screen targets
│   ├── PCFixCoachCable.ts           Simple power cable visual
│   └── PCFixCoachAudio.ts           Sound effects
├── Tests/                       LEAF test scenarios
├── PCFixCoach/                  Materials and meshes
└── GeneratedSFX/                Sound effects
devpost/
└── design-brief.md              Design brief and done criteria
```

`PCFixCoachMain` owns all step state. The other scripts only display it. Main is also available as `global.pcFixCoach` for debugging and tests (`currentStep`, `isPlaced`, `isComplete`, `getStateJson()`).

## Testing

The project uses [LEAF](https://developers.snap.com/spectacles) scenarios that run in the Lens Studio preview. They're grouped by done criterion:

| Criterion | What's tested |
|---|---|
| C1: PC placement | Pinch to place; the PC stays anchored while the user moves |
| C2: Step guidance | The card updates every step, moves between steps, and switches sides with the view |
| C3: GPU install | Drag-and-snap, snap distance and boundary cases, auto-advance |
| C4: Cable connection | Power plug snaps in and advances |
| C5: Progress and navigation | Finished parts dim, edge arrow points to off-screen targets, "GPU Installed" message |
| Extra | Wrong release returns the part home; table and Done target are within reach |

To run them, open the **LEAF** panel in Lens Studio, then choose the scenarios to run in the preview.

## Design

The full design brief, including placement measurements, interaction rules and done criteria, is in [`devpost/design-brief.md`](devpost/design-brief.md).

## License

[MIT](LICENSE)
