# Project skills

Add reusable Eventnest workflows here when a task recurs or needs consistent steps. Use one directory per skill:

```text
.agents/skills/
  example-skill/
    SKILL.md
```

Each `SKILL.md` should state when to use the skill, the steps to follow, and any files or tools it depends on. Keep skills focused on repeatable workflows rather than general project facts; put architecture and product decisions in [`../architecture/project.md`](../architecture/project.md).

## Available skills

- [`frontend-development/SKILL.md`](frontend-development/SKILL.md) guides React frontend work.
- [`backend-development/SKILL.md`](backend-development/SKILL.md) guides Express and MongoDB backend work.

Read the root [`AGENTS.md`](../../AGENTS.md) first. These skills add task-specific guidance and do not replace the project-wide rules.
