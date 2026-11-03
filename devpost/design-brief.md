---
status: approved
---

# Design brief: PC Fix Coach: GPU Install

<!-- Filled in by plan-lens from the learner's interview. Use the learner's words. Mark any value they didn't choose as (default). -->

## The one spatial moment
While installing a GPU, the user keeps their eyes and hands on the PC. Arrows and highlights sit on the actual components, showing exactly where to insert, remove or connect something. The instruction for the current step sits right beside the case, so they never look down at a phone or stop working to check instructions.

## Why it belongs on glasses
- Uses: draws in the world, leaves your body free, shares your view (in the real version)
- Why it's better than the phone or laptop version: Both hands are busy holding parts and screws, and the eyes need to stay on the motherboard. A phone or video guide makes you stop, look away and find your place again. Here the guidance is on the part itself and moves with each step.

## Product or overlay
- Type: overlay. In the real version, it guides a physical repair on a real PC.
- What the real version would sense: the motherboard, PCIe slot, screws, cables and power connector, and whether each step has been completed.
- Stand-in for the preview: the preview can't recognize real objects, so the whole PC is virtual. A virtual PC case with a motherboard, slot cover, GPU, screw and power cable sits on a virtual table at real size. Step completion is detected when the user drags a virtual part into its highlighted spot and it snaps into place. Step 2 has nothing to move, so it uses a pinchable Done target.

## Where things live
- Where the user is looking during the main task: the open side of the PC case, at the component for the current step. Users can move around the virtual PC naturally. The whole PC does not need to fit in view; only the current component needs to stay clearly visible.
- Virtual table: in front of the user at start, standard table height about 75 cm (default), about 120 x 60 cm top (default).
- PC case: placed on the virtual table with one pinch, at real-world scale, mid-tower about 45 cm tall x 21 cm wide x 45 cm deep (default). Side panel open, facing the user (default). Stays anchored to the table so the user can walk around it and look from different angles. Starts about 70 cm from the user, a little below eye level (default).
- Instruction text: just above and slightly to the side of the case, so it stays visible without covering the component being worked on. About 10 cm above the top of the case and 15 cm to the side (default), card about 25 x 10 cm (default), light text. Shows a clear progress indicator, such as "Step 3 of 5", so users always know where they are. Moves with the current step so it stays near the part. As the user moves around the PC, the card turns to face them and shifts to the side of the case they're viewing from, so it never covers the current component (default for how it shifts).
- Highlights and arrows: on or right next to the current step's component (slot cover, PCIe x16 slot, GPU, screw hole, power connector).
- Loose parts for dragging (GPU, screw, power plug): set on the table beside the case, within arm's reach (default).
- Done target (step 2 only): large, about 8 cm across (default), right next to the highlighted PCIe slot.
- Edge arrow: large, at the edge of the user's view, pointing toward the current target when it's out of view. Adjusts to the user's viewing angle as they move.

## Hands and input
- Place the PC: pinch on the virtual table.
- Step 1, remove the PCIe slot cover: grab the highlighted cover and drag it out of the case. The step completes once it is pulled clear (default).
- Step 2, locate the PCIe x16 slot: pinch the large Done target next to the slot.
- Step 3, insert the GPU: grab the virtual GPU, drag it toward the highlighted slot and release. It snaps into place when close enough, about 5 cm (default).
- Step 4, secure the GPU: grab the screw and drag it to the highlighted screw hole. It snaps in when close enough. The screw's grab area is bigger than the screw itself so it's easy to hit (default).
- Step 5, connect power: grab the plug end of the power cable and drag it into the highlighted connector, where it snaps in. The cable is shown simply; no bendy cable simulation (default).
- A snap completes the step on its own. No second confirmation.
- Invalid drag: if a part is released in the wrong location, it smoothly returns to its original position with a subtle visual warning, such as a brief soft amber flash (default). The current step stays active.
- Targets are big and highlight when aimed at.
- Voice (if any) and the button that does the same job: none.

## When things show
- Current step's instruction, arrows and highlights: show when the step starts. This step is always the brightest and most visually prominent.
- Completed step's arrows and highlights: fade out after a short visual confirmation and stay as a subtle dimmed outline in a light color at low brightness (not grey or black). This shows progress and which parts are already done.
- Done target: shows only during step 2, hides when pinched.
- Final step: when the power plug snaps in, all highlights become dim, a clear "GPU Installed" confirmation appears, and the PC shows a subtle completion effect, such as a soft glow pulse (default).
- If something needs attention out of view: a large directional arrow at the edge of the view points toward the target and rotates as the user moves their view. It disappears once the target comes into view, and then the normal highlight and instruction appear on the part.

## Done criteria
Each one can be checked in Lens Studio's preview.
1. **PC placement:** The user can pinch to place a virtual PC case on the virtual table, and the PC remains anchored while the user moves around it.
2. **Step-by-step guidance:** Each instruction appears beside the PC, with clear arrows and highlights pointing to the correct component without blocking the work area.
3. **GPU installation:** The user can grab and drag the virtual GPU into the highlighted PCIe slot. When it gets close enough, it snaps into the correct position and automatically advances to the next step.
4. **Cable connection:** The user can drag the power plug into the highlighted connector, triggering a snap animation and automatic progression.
5. **Progress and navigation:** Completed components remain visible as subtle, low-brightness, light-colored outlines. If the next target is outside the field of view, a directional edge arrow guides the user toward it. After the final step, the Lens displays a clear "GPU Installed" message.

## Out of scope
- Recognizing a real PC, motherboard, slot, screws or cables.
- Detecting that a real component has been installed.
- Thumbs-up or other hand-pose gestures. The preview's mouse can only pinch, grab and drag.
- Other repairs or assembly tasks beyond this five-step GPU install.
- Undo or going back to a previous step.
- Saving progress between sessions.

## Risks and open questions
- The real version depends on recognizing real PC parts and detecting completed steps. The preview fakes this with virtual parts that snap into place. "Feel unproven" on real hardware.
- Dragging small parts (screw, power plug) with real hand tracking may be fiddly. Precision is "feel unproven" until tried on glasses.
- Because a snap completes the step automatically, an accidental snap moves on with no way back in this version.
- The glasses' view is narrow, so a full mid-tower at 70 cm won't fit in view at once. By design, only the current component needs to be in view; the edge arrow and the instruction card that follows the user's angle handle the rest. Comfort is "feel unproven".

## Build notes for CLAD
- Build for SPECS so it runs and can be demonstrated in Lens Studio's preview. No SPECS device is available.
- Use Spectacles Interaction Kit (SIK) and UI Kit for all interactions, so they work with the mouse in Interactive Preview and with LEAF.
- Build any stand-in exactly as described above, and keep it obvious in the scene.
- Use real-world scale in centimeters. Keep content inside the user's view during the main task.
- The display is additive: black renders as transparent. Don't rely on black or very dark content to be seen; keep text light and readable from where the user stands.
- Get the basic flow working first, then add detail.
- Write LEAF scenarios for each done criterion, run them in preview, and report which pass. Say which criteria have no test.
- Don't record, identify, or follow people.

## After the build: judge it
This part is for you, after CLAD finishes.

1. **Does it work?** Ask your agent which LEAF tests passed and which done criteria have no test.
2. **Walk around it.** Open the preview in Interactive Preview. Use WASD to move, Q and E to go down and up, and right-drag (or hold Shift) to look around. Clicking acts as a pinch. Stand where a user would and look at the task.
3. **Ask the three questions.**
   - Does it use what I'm looking at?
   - Does it put something in my space, where it belongs?
   - Does it free my hands or let me keep my eyes up?
   - Would it be just as good on a phone? If so, what would make it need the glasses?
4. **Check comfort.**
   - Everything I need is in view while I do the task. Nothing sits at the edges, behind me, or stuck to my face.
   - Every control is within reach of someone standing there.
   - Text reads easily from where I stand. No dark UI disappearing.
   - Things show when needed and get out of the way.
5. **Label what you know.** Write "logic proven" next to anything the tests and preview show working, and "feel unproven" next to anything only real glasses could tell you (comfort over time, real hand tracking, real recognition).
6. **Fix with design notes, not code.** Tell your agent what to change in design terms, for example: "Move the step card 15 cm lower and next to the pan. Make the Next button twice as big. Re-run the tests." If a fix takes under a minute, like nudging a panel, do it yourself in the scene.
7. **Submit.** Record a video under 3 minutes of your Lens in the preview, public on YouTube. Make your repo public with your Lens Studio project and this `devpost/` folder. Details are on the hackathon site: https://learn-specs.devpost.com/resources
