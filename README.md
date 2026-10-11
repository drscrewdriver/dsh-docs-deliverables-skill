# dsh-docs-deliverables-skill

MIT | zero runtime deps | bundle plugin

A DSH bundle plugin that ships the **DSH plugin-development knowledge base as agent skills**: four skills (plugin dev contract / cross-version adaptation ledger covering the six 0.1.x–0.2.0 host lines / release & awesome-submission discipline / host architecture digests), served through the official `ctx.skills` provider registry — plus the raw `skills/` tree you can also drop into any `.agents/skills` directory.

Every technical claim inside the skills is code-verified against `deepseek-harness@0.2.0-rc.2` (main) and `0.1.7-rc.2` (auxiliary), labeled VERIFIED / FARM / PENDING / UNVERIFIED, with `file:line@version` anchors and a maintenance gate (`maintenance/skill-anchor-map.yaml`) that re-greps them on every host bump. No machine-absolute paths — references are workspace-relative (`<ws>` placeholder).

## Install (as a DSH plugin)

```sh
dsh plugin --profile web add github:drscrewdriver/dsh-docs-deliverables-skill
```

The bundle row mounts `src/index.js`, which registers a bundled SkillProvider over `skills/`. If a profile does not mount the skill registry, the plugin no-ops silently (soft `ctx.get('skills')` guard).

## Install (without the plugin host)

Copy the four directories under `skills/` into:
- `<your project>/.agents/skills/`  (project scope), or
- `~/.agents/skills/`  (user scope)

The layout is exactly the host's native discovery format (`<skill>/SKILL.md`), and Qoder/Trae-style agents read the same convention.

## Skills

| skill | one-liner |
|---|---|
| `dsh-plugin-dev` | plugin file structure, dual-half architecture, family section contract, 9-language i18n, judgment semantics |
| `dsh-plugin-peer-adapt` | symptom routing table → 38 change-point cards across six host lines, gates D/V/G, our 32-repo adaptation case law |
| `dsh-plugin-release` | awesome-dsh-plugin submission, npm registry/dist-tag discipline, stale-build triple defense |
| `dsh-host-internals` | 12 host-subsystem digests + 100 re-anchored source pointers @0.2.0 |

## Development

```sh
npm run verify   # layout + kebab-case + absolute-path portability gate (also runs on prepack)
```

## Status & boundaries

- Content is a point-in-time editorial snapshot (2026-10-11). It is **not** a live docs service; for on-demand library docs see `dsh-context7` / `dsh-mcp-context7`.
- Per-line runtime matrix (does each host profile mount `ctx.skills`) is PENDING — verified source-level across all six tags via `git grep registerProvider`, not yet installed per line.
- Before npm publish: add `repository` field, pin `--registry=https://registry.npmjs.org` for both publish and view (mirror contamination).

## License

MIT
