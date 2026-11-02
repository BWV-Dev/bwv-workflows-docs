| Command | What it does |
|---|---|
| `/bwv run <workflow> [on <branch>]` | Run a workflow that declares `on.manual`. |
| `/bwv retry [name]` | Run a workflow or group again; with no name, everything that failed. |
| `/bwv recreate <group\|workflow\|#pr>` | Recreate a group or workflow output; for `#pr`, stop loading that closed batch so the plan redoes its work. |
| `/bwv status` | List the latest BWV check run of this pull request. |
| `/bwv provenance <sha>=<pr>` | Name the source pull request of a commit whose origin is ambiguous. |
