# Scene Grammar

Scene grammar is the only semantic-to-visual mapping layer. Domain code contains no final asset filenames.

| Mission semantic | Archetype | Graybox manifestation |
| --- | --- | --- |
| Basecamp checkpoint | `BASECAMP` | Tent/flag at the lowest secured point. |
| Normal route | `ASCENT` | Curved path between checkpoints. |
| Known checkpoint | `CAMP` | Tent, label, and evidence state. |
| Hidden checkpoint / unknown route | `FOG` | Cloud bank that remains selectable through semantic UI. |
| Blocking dependency/test failure | `CREVASSE` | Jagged dark crossing over the route. |
| Difficult technical work | `CLIFF` | Exposed vertical face. |
| Approval/policy gate | `PASS` | Narrow gate. |
| Deadline/external instability | `STORM` | Dark cloud and lightning mark. |
| Pending human choice | `ROUTE_FORK` | Two highlighted routes and fork beacon. |
| Evidence/approval security | `ANCHOR` | Fixed approval marker. |
| Scope expansion | `NEW_RIDGE` | Warm ridge line emerging above known work. |
| Invalidated checkpoint | `INVALID_ROUTE` | Crossed, collapsed terrain. |
| Deployment | `FINAL_APPROACH` | Upper camp and traverse. |
| Verified completion | `SUMMIT` | Flag/beacon at the final checkpoint. |

Intensity communicates active/critical emphasis but never carries the only explanation. Every important canvas entity is mirrored in DOM text and keyboard-accessible controls.
