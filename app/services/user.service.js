const uuidv1 = require('uuid').v1;
const userRepository = require('../repositories/mysqlrepos/user.repository');
const Error = require('../error');
const errorValues = require('../error.values');
const bcrypt = require('../util/passwordFactory');
let validateUser = (userDetails, callback) => {
    let error = false;
    let errorType = {};
    getUserByEmail(userDetails.email, (userExists, exception) => { 
        if (userExists) {
            error = true;
            errorType.emailAlreadyInUse = 'This Email Already In Use';
            callback(error, errorType);
        } else {
            if (typeof userDetails.name === 'undefined' || userDetails.name.length < 1) {
                error = true;
                errorType.nameNotValied = 'Name Not Valied';
            }
            if (typeof userDetails.email === 'undefined' || userDetails.email.length < 1) {
                error = true;
                errorType.emailNotValied = 'Email Not Valied';
            }
            if (typeof userDetails.password === 'undefined' || userDetails.password.length < 1) {
                error = true;
                errorType.passwordNotValied = 'Password Not Valied';
            }
            callback(error, errorType);
        }
    });
}

let getUserByEmail = (email, callback) => {
    userRepository.getOne({ email: email }, ['email'], (databaseError, userByEmail) => { 
        if (databaseError)
            callback(false, undefined);
        else
            callback(true, { error: 'Email Aready In Use', code: 409 });
    });
}

module.exports = {
    saveNewUser: (req, res, next) => {
        validateUser(req.body, (validationError, validationException) => { 
            if (validationError)
                next(new Error(errorValues.INVALIED_REQUEST, validationException, 400));
            else {
                bcrypt.encryptPassword(req.body.password, (hashingError, hashed) => { 
                    if (hashingError) {
                        next(new Error(errorValues.PASSWORD_HASHING_ERROR, hashed, 500));
                    } else {
                        let newUser = {
                            id: uuidv1(),
                            name: req.body.name,
                            password: hashed,
                            createdDatetime: new Date().getTime(),
                            email: req.body.email
                        }
                        userRepository.save(newUser, (savingError, saved) => {
                            if (savingError)
                                next(new Error(errorValues.DATABASE_ERROR, saved, 500));
                            else {
                                delete newUser.password;
                                res.status(200).json(newUser);
                            }
                        });
                    }
                });
            }
        });
    }
}