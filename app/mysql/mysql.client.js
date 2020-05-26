const mysql = require('mysql');
const errors = require('./mysql.errors');
const env = process.env;
const logger = require('./logger');
let dbConnection;

/**
 * this method get the connection from the connection pool
 * @param {function} callback 
 */
let getConnection = function (callback) {
    let connect = mysql.createPool({
        connectionLimit: env.MYSQL_POOL_SIZE,
        host: env.MYSQL_HOST,
        user: env.MYSQL_USER,
        password: env.MYSQL_PASSWORD,
        database: env.MYSQL_DATABASE,
        port: env.MYSQL_PORT,
        multipleStatements: true,
    });
    connect.getConnection((err, connection) => {
        if (err) {
            console.log(err);
            callback(true, err);
        } else {
            logger.info(`Connected to ${env.MYSQL_DATABASE}`)
            dbConnection = connection;
            dbConnection.release();
            callback(false, dbConnection);
            
            
        }
    });
}
/**
 * this method get the instance of connection
 * @param {function} callback 
 */
let getInstance = function (callback) {
    if (!dbConnection) {
        getConnection(callback);
    } else {
        callback(false, dbConnection);        
    }
};
/**
 * we should check our database has the table, it will do with this method
 * @param {object} model 
 * @param {string} table 
 * @param {function} callback 
 */
let validateTable = function (model, table, callback) {
    getInstance(function (error, connection) {
        if (error) {
            callback(true, 'error');
        } else {
            connection.query('show tables like  "' + table.toLowerCase() + '"', (error, dbResponse) => {
                if (error) {
                    dbConnection = false;
                } else {
                    if (dbResponse.length === 0) {

                        let tableQuery = `create table ${table.toLowerCase()} (${Object.keys(model).map(key => `${attributeToTableAttribute(key)} ${model[key].type} ${model[key].primaryKey ? 'primary key' : ''} ${model[key].DEFAULT ? 'DEFAULT ' + model[key].DEFAULT : ''} ${model[key].unique ? 'UNIQUE' : ''} ${model[key].notNull ? 'NOT NULL' : 'NULL'}`)})`.trim();
                        connection.query(tableQuery, (error, dbResponse) => {
                            if (error) {
                                dbConnection = false;
                            } else {
                                callback(error, connection);
                            }
                        })
                    } else {
                        callback(false, connection);
                    }
                }
            })
        }
    })
}


/**
 * 
 * @param {object} object 
 * this will conver to object to table attributes
 * let obj = {firstName : 'name'} to {first_name : 'name'}
 */
let objectKeyToSnakeCase = (object) => {
    let savingDataObject = {};
    Object.keys(object).map(key => {
        savingDataObject[key.split(/(?=[A-Z])/).join('_').toLowerCase()] = object[key]
    });
    return savingDataObject;
}

let fieldListToTableAttributes = (fieldList) =>  fieldList.map(field => field.split(/(?=[A-Z])/).join('_').toLowerCase());

let attributeToTableAttribute = (attribute) => attribute.split(/(?=[A-Z])/).join('_').toLowerCase();

let allFieldsWithoutHiddenFields = (tableObject) => (Object.keys(tableObject).map(tableField => {
    if (!tableObject[tableField].hidden)
        return attributeToTableAttribute(tableField);
}).filter(tableField => tableField !== undefined));

module.exports = function (table, model) {
    /**
     * save function promise version
     * this method will insert data to mysql table
     * @param {object} data
     */
    this.savePromise = function (data) {
        return new Promise((resolve, reject) => {
            validateTable(model, table.toLowerCase(), (err, connection) => {
                if (err) {
                    reject(err);
                } else {
                    connection.query('insert into ' + table.toLowerCase + ' SET ?', data, (error, dbResponse) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(dbResponse);
                        }
                    })
                }
            })
        })
    };
    /**
     * save method callback version
     * this method will insert data to my sql table
     * @param {function} callback
     * @param {object} data
     * @returns void
    */
    this.save = function (data, callback) {
        if (data === null || typeof data !== 'object') {
            callback(true, errors.SAVING_ERROR);
        } else {
            validateTable(model, table, function (error, connection) {
                if (error) {
                    callback(true, errors.VALIDATE_TABLE_ERROR);
                } else {
                    connection.query('insert into ' + table.toLowerCase() + ' SET ?', objectKeyToSnakeCase(data), (error, dbResponse) => {
                        if (error) {
                            logger.error(error);
                            callback(true, errors.SAVING_ERROR);
                        } else {
                            callback(false, dbResponse);
                        }
                    })
                }
            });
        }
    };
    /**
     * we can select data with this method
     * this method will provide query like this 'select * from mytable where id=1'
     * @param {object} data
     * @param {function} callback
     * @returns void
     */
    this.getOne = function (data, fieldList, callback) {
        if (Object.keys(data).length > 1) {
            callback(true, errors.SELECT_QUERY_PARAMS_LENGTH_IS_NOT_VALIED);
        } else {
            validateTable(model, table, function (error, connection) {
                if (error) {
                    callback(true, connection);
                } else {
                    if (!Array.isArray(fieldList)) {
                        connection.query("select "+allFieldsWithoutHiddenFields(model).toString()+" from " + table.toLowerCase() + " where ?", objectKeyToSnakeCase(data), (err, results) => {
                            if (err) {
                                logger.error(err + data.length);
                                callback(true, errors.MYSQL_SYNTAX_ERROR);
                            } else {
                                if (results.length === 0) {
                                    callback(true, errors.RECORD_NOT_FOUND);
                                } else {
                                    callback(false, results[0]);
                                }

                            }
                        });
                    } else {
                        connection.query("select "+fieldListToTableAttributes(fieldList).toString()+" from " + table.toLowerCase() + " where ?", objectKeyToSnakeCase(data), (err, results) => {
                            if (err) {
                                logger.error(err + data.length);
                                callback(true, errors.MYSQL_SYNTAX_ERROR);
                            } else {
                                if (results.length === 0) {
                                    callback(true, errors.RECORD_NOT_FOUND);
                                } else {
                                    callback(false, results[0]);
                                }

                            }
                        });
                    }
                }
            })
        }
    };
    /**
     * this method will update a record this method will provide query like update mytable set username= jhon doe where id=1
     * @param {object} data
     * @param {function} callback
     * @returns void
     */
    this.update = function (data, callback) {
        validateTable(model, table, function (validationError, connection) {
            if (validationError) {
                callback(true, connection);
            } else {
                // let updateObject = {}
                // Object.keys(data).map(key => {
                //     updateObject[key.split(/(?=[A-Z])/).join('_').toLowerCase()] = data[key]
                // });
                connection.query("update " + table.toLowerCase() + " SET ? where ?", objectKeyToSnakeCase(data), (updateError, responseFromDatabase) => {
                    if (updateError) {
                        logger.error(updateError);
                        callback(true, errors.MYSQL_SYNTAX_ERROR);
                    } else {
                        callback(false, responseFromDatabase);
                    }
                })
            }
        })
    };
    /**
     * this metho get record values by a condition this method will provide a query like select * from mytable where id<1
     * @param {string} greaterThanWhat
     * @param {string} condition
     * @param {object} data
     * @param {object} data
     * @param {function} callback
     * @returns void
     */

    this.getByCondition = function (greaterThanWhat, condition, data, fieldList, callback) {
        validateTable(model, table, function (validationError, connection) {
            if (validationError) {
                callback(true, connection);
            } else {
                if (Array.isArray(fieldList)) {
                    connection.query(`select ${fieldListToTableAttributes(fieldList).toString()} from ${table.toLowerCase()} where ${attributeToTableAttribute(greaterThanWhat)}${condition} ?`, objectKeyToSnakeCase(data), (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.MYSQL_SYNTAX_ERROR);
                        } else {
                            callback(false, dbResponse);
                        }
                    });
                } else {
                    connection.query(`select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()} where ${attributeToTableAttribute(greaterThanWhat)}${condition} ?`, objectKeyToSnakeCase(data), (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.MYSQL_SYNTAX_ERROR);
                        } else {
                            callback(false, dbResponse);
                        }
                    });
                }
            }
        });
    };

    /**
     * this method will return all results of a table with pageble
     * @param {string} coloumnName
     * @param {string} order
     * @param {number} limit
     * @param {number} pageNumber
     * @param {function} callback
     * @returns void
     */
    this.getAllPagable = function (order, coloumnName, limit, pageNumber,fieldList, callback) {
        validateTable(model, table, function (validationError, connection) {
            if (validationError) {
                callback(true, connection);
            } else {
                let offSet = (limit * pageNumber) - limit;
                //let offSet= 0;
                if (!Array.isArray(fieldList))
                    connection.query(`select ${fieldListToTableAttributes(fieldList).toString()} from ${table.toLowerCase()} order by ${coloumnName} ${order} limit ${offSet},${limit}; select count(*) from ${table}`, (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.VALIDATE_TABLE_ERROR);
                        } else {
                            let results = {
                                data: dbResponse[0],
                                counts: dbResponse[1][0],
                                pages: Math.round(dbResponse[1][0]['count(*)'] / limit),
                                nextPage: Math.round(dbResponse[1][0]['count(*)'] / limit) + 1 < parseInt(pageNumber) + 1 ? 1 : parseInt(pageNumber) + 1
                            }
                            callback(false, results);
                        }
                    });
                else
                    connection.query(`select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()} order by ${coloumnName} ${order} limit ${offSet},${limit}; select count(*) from ${table}`, (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.VALIDATE_TABLE_ERROR);
                        } else {
                            let results = {
                                data: dbResponse[0],
                                counts: dbResponse[1][0],
                                pages: Math.round(dbResponse[1][0]['count(*)'] / limit),
                                nextPage: Math.round(dbResponse[1][0]['count(*)'] / limit) + 1 < parseInt(pageNumber) + 1 ? 1 : parseInt(pageNumber) + 1
                            }
                            callback(false, results);
                        }
                    });
            }
        })
    };
    /**
     * this method will delete a record from table this method will provide a query like delete from mytable where id='1'
     * to run above query the data object should like this data={id : 1}
     * data object should contain only one value
     * @param {object} data
     * @param {function} callback
     * @returns void
     */
    this.deleteBy = (data, callback) => {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, connection);
            } else {
                connection.query(`delete from ${table.toLowerCase()} where ?`, objectKeyToSnakeCase(data), (databaseError, dbResponse) => {
                    if (databaseError) {
                        logger.error(databaseError);
                        callback(true, errors.MYSQL_SYNTAX_ERROR);
                    } else {
                        callback(false, dbResponse);
                    }
                });
            }
        });
    };
    this.getByGate = (data, gate, condition, callback) => {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, connection);
            } else {
                if (Object.keys(data).length > 1) {
                    let dbData = objectKeyToSnakeCase(data);
                    let query = `select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()} where ${Object.keys(dbData).map(key => key + condition + '"' + dbData[key] + '"' + ' ' + gate + ' ').join('')}`
                    connection.query(query.substring(0, query.lastIndexOf(gate)).trimLeft(), (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.RECORD_NOT_FOUND);
                        } else {
                            callback(false, dbResponse);
                        }
                    });
                }
            }
        });
    };
    this.queryBuilder = (query,fieldList, callback) => {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, errors.MYSQL_SYNTAX_ERROR);
            } else {
                if (Array.isArray(fieldList)) {
                    connection.query(`select ${fieldListToTableAttributes(fieldList).toString()} from ${table.toLowerCase()} where ${query}`, (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.MYSQL_SYNTAX_ERROR);
                        } else {
                            if (dbResponse.length == 0) {
                                callback(true, errors.RECORD_NOT_FOUND);
                            } else {
                                callback(false, JSON.parse(JSON.stringify(dbResponse)));
                            }
                        }
                    });
                } else
                    connection.query(`select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()} where ${query}`, (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.MYSQL_SYNTAX_ERROR);
                        } else {
                            if (dbResponse.length == 0) {
                                callback(true, errors.RECORD_NOT_FOUND);
                            } else {
                                callback(false, JSON.parse(JSON.stringify(dbResponse)));
                            }
                        }
                    });
            }
        })
    };
    this.getAll = (callback) => {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, errors.VALIDATE_TABLE_ERROR);
            } else {
                connection.query(`select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()}`, (databaseError, dbResponse) => {
                    if (databaseError) {
                        callback(true, errors.MYSQL_SYNTAX_ERROR);
                    } else {
                        callback(false, dbResponse);
                    }
                })
            }
        })
    };
    /**
     * This method will run your own query
     * you can run join queries or any customized query with this method
     * @param {function} callback
     * @param {string} customizedQuery
     */
    this.runQuery = (customizedQuery, callback) => {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, errors.VALIDATE_TABLE_ERROR);
            } else {
                connection.query(customizedQuery, (databaseError, dbResponse) => {
                    if (databaseError) {
                        callback(true, errors.MYSQL_SYNTAX_ERROR);
                    } else {
                        callback(false, dbResponse);
                    }
                })
            }
        })
    };
    this.getOnePromise = async (data) => {
        return new Promise((resolve, reject) => {
            validateTable(model, table, (validationError, connection) => {
                if (validationError)
                    reject(connection);
                else {
                    connection.query(`select * from ${table.toLowerCase()} where ?`, data, (err, dbResponse) => {
                        if (err || dbResponse.length === 0)
                            reject(dbResponse);
                        else {
                            resolve(dbResponse);
                        }
                    })
                }
            })
        })
    };
    this.updateOne = (updateBy, updateByValue, data, callback) => {
        if (updateByValue !== null && data !== null) {
            validateTable(model, table, (validationError, connection) => {
                if (validationError) {
                    callback(true, errors.VALIDATE_TABLE_ERROR);
                } else {
                    connection.query("update " + table.toLowerCase() + " SET ? WHERE " + attributeToTableAttribute(updateBy) + "= '" + updateByValue + "'", objectKeyToSnakeCase(data), (dbUpdateError, dbResponse) => {
                        if (dbUpdateError) {
                            logger.error(dbUpdateError);
                            callback(true, dbResponse);
                        } else {
                            callback(false, dbResponse);
                        }
                    });
                }
            });
        } else {
            callback(true, { error: 'VALUE MUST BE NOT NULL' });
        }
    };

    /**
     * get by condition
     * 
     */
    this.getByConditionPageble = function (fieldList, data, condition, getByWhat, pageNo, limit, orderBy = 'DESC', callback) {
        validateTable(model, table, (tableValidationError, connection) => {
            if (tableValidationError)
                callback(true, errors.VALIDATE_TABLE_ERROR);
            else {
                let offSet = (limit * pageNo) - limit;
                if (Array.isArray(fieldList))
                    connection.query(`select ${fieldListToTableAttributes(fieldList).toString()} from ${table.toLowerCase()} where ${attributeToTableAttribute(getByWhat)}${condition} ? ORDER By ${orderBy} limit ${offSet} , ${limit}; select count(*) from ${table}`, objectKeyToSnakeCase(data), (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.RECORD_NOT_FOUND);
                        } else {
                            let results = {
                                data: dbResponse[0],
                                count: dbResponse[1][0],
                                pages: Math.round(dbResponse[1][0]['count(*)'] / limit),
                                nextPage: Math.round(dbResponse[1][0]['count(*)'] / limit) + 1 < parseInt(pageNo) + 1 ? 1 : parseInt(pageNo) + 1
                            }
                            callback(false, results);
                        }
                    });
                else
                    connection.query(`select ${allFieldsWithoutHiddenFields(model).toString()} from ${table.toLowerCase()} where ${attributeToTableAttribute(getByWhat)}${condition} ? ORDER By ${orderBy} limit ${offSet} , ${limit}; select count(*) from ${table}`, objectKeyToSnakeCase(data), (databaseError, dbResponse) => {
                        if (databaseError) {
                            logger.error(databaseError);
                            callback(true, errors.RECORD_NOT_FOUND);
                        } else {
                            let results = {
                                data: dbResponse[0],
                                count: dbResponse[1][0],
                                pages: Math.round(dbResponse[1][0]['count(*)'] / limit),
                                nextPage: Math.round(dbResponse[1][0]['count(*)'] / limit) + 1 < parseInt(pageNo) + 1 ? 1 : parseInt(pageNo) + 1
                            }
                            callback(false, results);
                        }
                    });
            }
        });
    };

    /**
     * delete method this method will execute customized delete query
     * @param {query}string
     * @param {callback}function
     */
    this.delete = function (query, callback) {
        validateTable(model, table, (validationError, connection) => {
            if (validationError) {
                callback(true, connection);
            } else {
                connection.query(`delete from ${table.toLowerCase()} where ${query}`, (databaseError, dbResponse) => {
                    if (databaseError) {
                        logger.error(databaseError);
                        callback(true, errors.MYSQL_SYNTAX_ERROR);
                    } else {
                        callback(false, dbResponse);
                    }
                });
            }
        });
    }
}