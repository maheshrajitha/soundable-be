const bcrypt = require('bcrypt');

module.exports = {
    encryptPassword: (plainPassword, callback) => {
        if (typeof plainPassword === 'undefined' || plainPassword === '') {
            callback(false, undefined);
        } else {
            bcrypt.hash(plainPassword, 12, callback);
        }
    },
    validatePassword: (plainPassword, encryptPassword , callback) => {
        bcrypt.compare(plainPassword, encryptPassword, callback);
    }
}