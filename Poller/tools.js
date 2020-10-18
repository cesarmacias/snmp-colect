/*jslint node: true */
'use strict';

/*
Funcion para validar si una variable es un objeto
 */
function isObject(a) {
    return (!!a) && (a.constructor === Object);
}
/*
Funcion para expandir un objeto en formato "."
 */
function parseDotNotation(str, val, obj) {
    let currentObj = obj,
        keys = str.split("."),
        i, l = Math.max(1, keys.length - 1),
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
        super(...params)
        // Mantiene un seguimiento adecuado de la pila para el lugar donde se lanzó nuestro error (solo disponible en V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CustomError);
        }
        this.name = ErrorName;
    }
}

/*
Funciones a Exportar
 */
module.exports = {
    CustomError,
    isObject,
    ObjExpand
};