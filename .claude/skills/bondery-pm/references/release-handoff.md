# Release handoff

## Release queue → Released

When work ships in production:

1. Move card **Release queue** → **Released** after deploy smoke passes
2. Add changelog link comment (see `bondery-changelog`)
3. Coordinate with `bondery-release` operator runbook for tag/pin steps

## Patch vs minor

| Ship type | MAIN state | Also update |
|-----------|------------|-------------|
| Patch/minor fix | Release queue → Released | Changelog entry |
| Public initiative | ROADMAP Ready for Release → Released | `bondery-roadmap` release-day |

## Release handoff checklist

- [ ] Deploy smoke passed (`bondery-release`)
- [ ] Changelog entry exists for user-visible changes
- [ ] Card moved to Released with changelog link comment
- [ ] ROADMAP card updated if user-visible (`bondery-roadmap`)
