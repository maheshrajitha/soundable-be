let session = {
    id: {
        type: 'CHAR(36)',
        primaryKey: true,
        notNull: true
    },
    accessTokenId: {
        type: 'CHAR(36)',
        notNull: true
    },
    issuedDate: {
        type: 'LONG',
        notNull: true
    },
    role: {
        type: 'TINYINT',
        notNull: true
    },
    loggedBy: {
        type: 'VARCHAR(100)',
        notNull: true
    },
    userId: {
        type: 'CHAR(36)',
        notNull:true
    }
}

module.exports = new (require('../../mysql/mysql.client'))('session', session);