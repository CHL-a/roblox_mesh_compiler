const parse_obj = require('wavefront-obj-parser')
const {Vector3} = require('@math.gl/core')
const {BitstreamWriter, BufferedWritable} = require('@astronautlabs/bitstream')

/**
 * @typedef {import('@astronautlabs/bitstream').Writable} WritableInterface
 */

/**
 * @class
 * @implements {WritableInterface} (how the heck do interfaces work)
 */
class ByteArrayWriter { 
	constructor(){
		this.byte_array = []
	}

	/**
	 * 
	 * @param {Uint8Array} chunk 
	 */
	write = chunk => 
		chunk.forEach(
			x => this.byte_array.push(x)
		)
}

/**
 * @class
 */
class WriterModifed extends BitstreamWriter {
	/**
	 * 
	 * @param {ByteArrayWriter} byte_array_stream 
	 * @param  {...any} args 
	 */
	constructor(byte_array_stream, ...args){
		super(byte_array_stream, ...args)

		/**
		 * @type {ByteArrayWriter}
		 */
		this.byte_array_stream = byte_array_stream
	}

	/**
	 * 
	 * @param {number} n \# of bytes to reverse
	 */
	reversePreviousBytes = n => {
		var byte_array = this.byte_array_stream.byte_array
		var temp = []

		for (let i = 0; i < n; i++) 
			temp.push(byte_array.pop())

		this.writeTupleBytes(...temp)
	}

	/**
	 * 
	 * @param {number} n 
	 */
	writeLEFloat = n => {
		this.writeFloat(32,n)
		this.reversePreviousBytes(4)
	}

	/**
	 * @param {number} n
	 */
	writeLEInt = n => {
		this.write(32, n)
		this.reversePreviousBytes(4)
	}

	/**
	 * 
	 * @param  {...number} bytes 
	 * @returns {void}
	 */
	writeTupleBytes = (...bytes) => 
		bytes.forEach(b=>
			this.write(8, b)
		)
	
	/**
	 * 
	 * @param {string} s 
	 * @returns 
	 */
	writeStringBytes = s =>
		this.writeString(s.length,s)
}

class MESH {
	/**
	 * @param {string} s from obj
	 */
	static from_obj = s => {
		const obj_object = parse_obj(s)

		// check vertex normalsm 
		const {
			vertexPositionIndices,
			vertexNormalIndices,
			vertexPositions,
			vertexNormals
		} = obj_object
		
		for (let i = 0; i < vertexPositionIndices.length; i+=4) {
			if (vertexPositionIndices[i+3] != -1)
				console.log(`what does it mean when that number is not -1 in position indexes? i=${i}`)
			
			if (vertexNormalIndices[i+3] != -1)
				console.log(`what does it mean when that number is not -1 in normal indexes? i=${i}`)

			if (!(
					Number.isNaN(vertexNormalIndices[i]) && 
					Number.isNaN(vertexNormalIndices[i+1]) &&
					Number.isNaN(vertexNormalIndices[i+2])
				)) continue
			
			const index_0 = vertexPositionIndices[i],
				index_1 = vertexPositionIndices[i + 1],
				index_2 = vertexPositionIndices[i + 2]


			const middle = new Vector3(
					vertexPositions[index_0 * 3],
					vertexPositions[index_0 * 3 + 1],
					vertexPositions[index_0 * 3 + 2]
				),
				v = new Vector3(
					vertexPositions[index_1 * 3],
					vertexPositions[index_1 * 3 + 1],
					vertexPositions[index_1 * 3 + 2]
				),
				w = new Vector3(
					vertexPositions[index_2 * 3],
					vertexPositions[index_2 * 3 + 1],
					vertexPositions[index_2 * 3 + 2]
				)


			const v_vect = middle.clone().subtract(v),
				w_vect = middle.clone().subtract(w)

			let cross = v_vect.cross(w_vect)

			if (cross.magnitude())
				cross = cross.multiplyByScalar(1/cross.magnitude())

			let normal_amount = vertexNormals.length
			vertexNormals.push(cross.x,cross.y,cross.z)

			for (let j = 0; j < 3; j++)
				vertexNormalIndices[i + j] = normal_amount + j
		}

		// write result
		const result = new WriterModifed(
			new ByteArrayWriter()
		)

		// write version and 5 specific bytes
		result.writeStringBytes('version 2.00')

		result.writeTupleBytes(
			0x0A, 0x0C, 0x00, 0x28, 0x0C
		)

		// vertex amount
		const face_amount = (vertexPositionIndices.length >> 2)
		result.writeLEInt(face_amount * 3)

		// face amount
		result.writeLEInt(face_amount)
		
		// iterate per vertex and normal, each iteration appends
		// a vertex position, a normal vector, and some bytes that 
		// are probably related but such implementation will 
		// not be used
		console.log(obj_object)
		for (let i = 0; i < vertexPositionIndices.length; i+=4) 
			// ^ per face

			for (let j = 0; j < 3; j++) { // per vertex

				// pos
				for (let k = 0; k < 3; k++) // per axis
					result.writeLEFloat(
						vertexPositions[
							vertexPositionIndices[i + j] * 3
							 + k
						]
					)

				// norm
				for (let k = 0; k < 3; k++)
					result.writeLEFloat(
						vertexNormals[
							vertexNormalIndices[i + k]
						]
					)

				// other
				result.writeTupleBytes(0,0,0,0)
				result.writeLEFloat(1)
				result.writeTupleBytes(
					0,0,0,0,
					0xFF,0xFF,0xFF,0xFF
				)
			}

		// iterate per face
		for (let i = 0; i < face_amount * 3; i++)
			result.writeLEInt(i)

		return result.byte_array_stream.byte_array
	}
}

module.exports = {
	object: MESH,
}