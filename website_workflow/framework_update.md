# FRAMEWORK UPDATE — fix the website workflow itself
<!-- Run when the FLOW misbehaved: a gate was skipped, the interrogation
     missed something it should catch, a template/prompt has a gap, evidence
     rules proved too weak, a skill mapping was wrong. Subject = the
     workflow, never the website. -->

Input: my description of the flow failure.

## Steps
1. ROOT CAUSE: reconstruct exactly where the pipeline diverged — which file,
   which phase, which sentence allowed (or failed to forbid) the behavior.
   Quote the offending/missing text.
2. BLAST RADIUS across governed files (all of these are in scope, including
   this file itself):
   - .claude/commands/*.md AND website_workflow/commands/*.md — byte-identical
     duplicates (wrequest, brainstorm, website, waudit). Every command edit
     MUST be applied to BOTH copies or they drift silently.
   - website_workflow/website_flow.md, strategy_audit.md, decision_matrix.md,
     supabase_review.md, skills_map.md, README.md, design_library.md, image_prompts.md
   - website_workflow/checklists/*.md, templates/*.md
   - website_workflow/framework_update.md
   - website_workflow/site_profile_TEMPLATE.md, app_reality_TEMPLATE.md
   - .claude/skills/<name>/ — a skill's OWN files are in scope when the
     failure is that the skill does not load or is incomplete. A skill folder
     MUST contain SKILL.md (any other filename does not load) and every file
     its SKILL.md links to must exist. Verify by listing the folder, not by
     trusting the skills list. Prevents: the 2026-08-24 run, where
     web-illustration-asset-production-pipeline was mapped into the flow while
     its file was named <skill-name>.md and never loaded at all.
   Verify by grepping for the artefact being changed; do not trust this list
   to be complete. Prevents: the 2026-08-04 run, where the file needing the
   fix (decision_matrix.md) was absent from this list.
3. PROPOSE the minimal edit set: per file, exact before → after text.
   Rules: tighten, don't bloat; a fix that adds a rule must name the failure
   it prevents; never weaken an evidence requirement to make passing easier.
   GENERALISE, don't transcribe: incident → root principle → general rule →
   workflow gate → evidence requirement. Add the reusable pattern (RF-xxx,
   DP-xxx, a checklist question); never copy incident-specific implementation
   detail into the framework, and never fix only the instance when the class
   is what will recur.
4. GATE (owner): show the edit set and wait for approval.
5. APPLY the approved edits to every applicable governed file.
6. LOG the change. In a SITE repo: website_workflow/decisions_log.md (date,
   failure, root cause, files changed). In the FRAMEWORK MASTER, decisions_log.md
   is deliberately kept empty — log to the README Update log instead, same
   fields. Prevents: writing site entries into the master's log, which /winit
   would then copy into every new site. If the same failure class appears twice, escalate: the fix
   was insufficient — redo root cause, don't re-patch.
