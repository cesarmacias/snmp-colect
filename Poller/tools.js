/* eslint-disable no-mixed-spaces-and-tabs */
"use strict";

/*
Funcion para validar si una variable es un objeto
 */
function isObject(a) {
	return !!a && a.constructor === Object;
}
/*
Funcion para elimiar un campo de un objeto, el campo puede ser entregado en "dot notation"
*/
function del_field_obj(obj, field) {
	let arr = field.split(".");
	let tmp = obj;
	for (let i of arr) {
		if (i in tmp) {
			tmp[i] = tmp[i] || {};
			if (!isObject(tmp[i])) {
				delete tmp[i];
			} else {
				tmp = tmp[i];
			}
	  	}
	}
	return obj;
}
/*
Funcion para expandir un objeto en formato "."
 */
function parseDotNotation(str, val, obj) {
	let currentObj = obj,
		keys = str.split("."),
		i,
		l = Math.max(1, keys.length - 1),
		key;

	for (i = 0; i < l; ++i) {
		key = keys[i];
		currentObj[key] = currentObj[key] || {};
		currentObj = currentObj[key];
	}

	currentObj[keys[i]] = val;
	delete obj[str];
}
function ObjExpand(obj) {
	for (const key in obj) {
		if (key.indexOf(".") !== -1) {
			parseDotNotation(key, obj[key], obj);
		}
	}
	return obj;
}
/*
    Custom Error Message
 */
class CustomError extends Error {
	constructor(ErrorName, ...params) {
		// Pasa los argumentos restantes (incluidos los específicos del proveedor) al constructor padre
		super(...params);
		// Mantiene un seguimiento adecuado de la pila para el lugar donde se lanzó nuestro error (solo disponible en V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, CustomError);
		}
		this.name = ErrorName;
	}
}
/*
	Function to get value of object sending in dot notation
 */
function get_ObjValue(obj, str) {
	let string = str.toString();
	let arr = string.split(".");
	let resp = obj;
	for (let key of arr) {
		if (key in resp) {
			resp = resp[key];
		} else {
			return undefined;
		}
	}
	return resp;
}

/*
Funciones a Exportar
 */
module.exports = {
	CustomError,
	isObject,
	ObjExpand,
	get_ObjValue,
	del_field_obj,
	parseDotNotation
};
