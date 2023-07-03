# roblox_mesh_compiler

Converts obj content to a roblox mesh.

## Usage
```js
const compiler = require('roblox_mesh_compiler') // require module

const obj_content = get_content_somehow() // type = string
const mesh_content = compiler
    .MESH
    .from_obj(obj_content) // type = number[]
```