# Checkpoint 0.1.0 config change list

Working config version: `1.1-skeleton (2026-10-31)`. Original source JSON is preserved in `docs/source/`. All pre-existing gameplay values are unchanged, including 60Hz simulation, 20Hz snapshots and 10Hz input resend. Every new key appears in its own group’s `_assumed`.

| Key | Change | Final value / documentation change |
|---|---|---|
| `_version` | Changed | "1.1-skeleton (2026-10-31)" |
| `network._assumed` | Changed | Appended: protocol_version, reconnect_initial_ms, reconnect_max_ms, reconnect_factor, reconnect_jitter_frac, heartbeat_interval_s, heartbeat_timeout_s, handshake_timeout_s, stale_input_s, max_message_bytes, max_buffered_bytes, message_burst, message_rate_per_s |
| `network.protocol_version` | Added | 1 |
| `network.reconnect_initial_ms` | Added | 500 |
| `network.reconnect_max_ms` | Added | 8000 |
| `network.reconnect_factor` | Added | 1.7 |
| `network.reconnect_jitter_frac` | Added | 0.2 |
| `network.heartbeat_interval_s` | Added | 2 |
| `network.heartbeat_timeout_s` | Added | 3 |
| `network.handshake_timeout_s` | Added | 10 |
| `network.stale_input_s` | Added | 0.5 |
| `network.max_message_bytes` | Added | 4096 |
| `network.max_buffered_bytes` | Added | 65536 |
| `network.message_burst` | Added | 60 |
| `network.message_rate_per_s` | Added | 30 |
| `rooms._assumed` | Changed | Appended: maintenance_interval_ms, code_attempts_max, token_bytes, max_rooms, max_connections, code_blocklist, reclaim_by_name_after_grace |
| `rooms.maintenance_interval_ms` | Added | 100 |
| `rooms.code_attempts_max` | Added | 1000 |
| `rooms.token_bytes` | Added | 32 |
| `rooms.max_rooms` | Added | 64 |
| `rooms.max_connections` | Added | 256 |
| `rooms.code_blocklist` | Added | list (6 entries; see config) |
| `rooms.reclaim_by_name_after_grace` | Added | true |
| `names._assumed` | Changed | Appended: blocklist |
| `names.blocklist` | Added | list (8 entries; see config) |
| `characters.card_pips_max` | Added | 5 |
| `characters._assumed` | Added | list (1 entries; see config) |

Heartbeat policy: a clean socket close starts the configured 3-second grace. For silent transport loss, the timeout is 3 seconds and disconnect time is anchored at last traffic, so detection does not add another grace period. Physical cellular latency and backgrounding remain to be validated. Reconnect jitter is cosmetic/network scheduling only. No gameplay RNG exists yet.

`stale_input_s` is reserved for the next checkpoint; no race input processing or simulation exists yet. The 64-room / 256-connection limits are protective assumed caps, not measured 60Hz capacity. Quantization, course geometry, initial race state and other missing tunables will be added with implementation and listed here at the next checkpoint.
