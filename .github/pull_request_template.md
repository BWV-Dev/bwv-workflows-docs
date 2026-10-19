## Summary

Describe the documentation change and who needs it.

## Checklist

- [ ] Every page starts with a `👤 Responsible: …` role line.
- [ ] The Vietnamese page was updated, or its `source_hash` was intentionally left stale.
- [ ] Examples use fake repositories, paths, people, and small pull request numbers.
- [ ] No internal hosts, customer names, project names, costs, contact channels, or installation links appear.
- [ ] Security guidance states what to do and gives only a short reason.
- [ ] Recipe sources are pinned by a full commit SHA.
- [ ] Screenshots are tightly cropped and organization names, repository names, avatars, and pull request numbers are blurred.
- [ ] `generated/` only changed via `pnpm docs:export` from the engine checkout.
- [ ] `pnpm build`, `pnpm typecheck`, `pnpm check:i18n`, `pnpm test:i18n`, `pnpm content-guard`, and `pnpm test:content-guard` pass.
