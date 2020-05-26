let user = {
    id: {
        type: 'CHAR(36)',
        primaryKey: true,
        notNull: true
    },
    name: {
        type: 'VARCHAR(256)',
        notNull: true
    },
    password: {
        type: 'TEXT',
        notNull: true,
        hidden: true
    },
    email: {
        type: 'VARCHAR(256)',
        notNull: true
    },
    role: {
        type: 'TINYINT',
        DEFAULT: 1,
        notNull: true
    },
    isActive: {
        type: 'BOOLEAN',
        DEFAULT: 'FALSE',
        notNull: true
    },
    isConfirmed: {
        type: 'BOOLEAN',
        DEFAULT: 'FALSE',
        notNull: true
    },
    createdUser: {
        type: 'INT'
    },
    createdDatetime: {
        type: 'LONG'
    },
    lastUpdateUser: {
        type: 'INT'
    },
    lastUpdateDatetime: {
        type: 'long'
    },
    passwordRecoveryToken: {
        type: 'char(36)',
        unique: true
    },
    recoveryTokenDate: {
        type: 'LONG'
    }
}

module.exports = new (require('../../mysql/mysql.client'))('user', user);