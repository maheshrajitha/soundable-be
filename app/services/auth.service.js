const uuidv1 = require('uuid').v1;
const uuidv5 = require('uuid').v5;
const Error = require('../error');
const errorValues = require('../error.values');
const mysqlUserRepository = require('../repositories/mysqlrepos/user.repository');
const bcrypt = require('../util/passwordFactory');
const mysqlSessionRepository = require('../repositories/mysqlrepos/session.repository');
const log = require('../logger.app');
const redisClient = require('../redis.client');
const env = process.env
let validateCredentials = (credentials, callback) => {
    let error = false;
    let errorType = {};
    if (credentials.password.length < 1 || typeof credentials.password === 'undefined') {
        error = true;
        errorType.passwordNotValied = 'Password Not Valied';
    }
    if (credentials.email.length < 1 || typeof credentials.email === 'undefined') {
        error = true;
        errorType.emailNotValied = 'Email Not Valied';
    }
    callback(error, errorType);
}

module.exports = {
    login: (req, res, next) => {
        validateCredentials(req.body, (validationError, validationException) => { 
            if (validationError)
                next(new Error(errorValues.INVALIED_REQUEST, validationException, 400));
            else {
                mysqlUserRepository.getOne({
                    email: req.body.email
                }, ['email', 'id', 'role', 'isActive', 'isConfirmed', 'name','password'], (userFetchingError, userByEmail) => {
                        if (userFetchingError) {
                            log.error(userByEmail);
                            next(new Error(errorValues.USER_NOT_FOUND, userByEmail, 401));
                        } else {
                            if (userByEmail.is_active) {
                                bcrypt.validatePassword(req.body.password, userByEmail.password, (passwordValidationError, isValied) => {
                                    if (passwordValidationError || !isValied)
                                        next(new Error(errorValues.PASSWORD_ERROR, 'Password Not Match', 401));
                                    else {
                                        let refreshTokenId = uuidv1();
                                        let accessTokenId = uuidv5('at', refreshTokenId);
                                        let newSession = {
                                            id: refreshTokenId,
                                            accessTokenId: accessTokenId,
                                            issuedDate: new Date().getTime(),
                                            role: userByEmail.role,
                                            loggedBy: userByEmail.email,
                                            userId: userByEmail.id
                                        }
                                        mysqlSessionRepository.save(newSession, (sessionSavingError, sessionSaved) => {
                                            if (sessionSavingError) {
                                                log.error('Database Error', sessionSaved);
                                                next(new Error(errorValues.DATABASE_ERROR, sessionSaved, 500));
                                            } else {
                                                redisClient.set(accessTokenId, JSON.stringify(newSession), (cacheSavingError, reply) => {
                                                    if (cacheSavingError) {
                                                        log.error('Cache Error', reply);
                                                        mysqlSessionRepository.deleteBy({
                                                            id: newSession.id
                                                        }, (deleteError, deleted) => {
                                                            if (deleteError)
                                                                next(new Error(errorValues.DATABASE_ERROR, deleted, 500));
                                                            else
                                                                next(new Error(errorValues.CACHE_ERROR, reply, 500));
                                                        });
                                                    } else {
                                                        res.cookie('at', accessTokenId, {
                                                            httpOnly: true,
                                                            maxAge: env.ACCESS_SESSION_TIMEOUT
                                                        });
                                                        res.cookie('rt', newSession.id, {
                                                            maxAge: env.REFRESH_SESSION_TIMEOUT,
                                                            httpOnly: true
                                                        });
                                                        delete userByEmail.password;
                                                        res.status(200).json(userByEmail);
                                                    }
                                                });
                                            }
                                        });
                                    }
                                });
                            } else
                                next(new Error(errorValues.USER_IS_DEACTIVATED, 'This User Deactivated', 401));
                        }
                });
            }
        });
    }
}