const main = require('../src/main')
const file_system = require('node:fs/promises')

const _ = (async ()=>{
	const obj_content = (await file_system.readFile('./test/test.obj'))
		.toString()

	const byte_array = main.MESH.from_obj(obj_content)

	await file_system.writeFile('./test/out.mesh', Buffer.from(byte_array))
	console.log('done')
})()