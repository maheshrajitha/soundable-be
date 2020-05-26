const express = require('express');
const http = require('http');
const cookieParser = require('cookie-parser');
const log = require('./logger.app');
require('dotenv').config({
    path: `.env.${process.env.NODE_ENV}`
});
const env = process.env;
const app = express();
const httpServer = http.createServer(app);
require('./redis.client').connect();
require('./mongo/client').connect(err => {
    if (err)
        process.exit(0);
});
httpServer.listen(env.APP_SERVER_PORT, () => {
    log.info(`${env.APP_NAME} Started On Port ${env.APP_SERVER_PORT}`);
});
app.use(cookieParser());
app.use(express.json());
app.get("/stop", (req, res) => {
    log.info("Stoping the server!!");
    res.json({
        message: "Stoped the server"
    });
    process.exit(1);
}); // Server Termination End point
app.use(require('./router.app'));
app.use((err, req, res, next) => {
    if (
        typeof err.error === "object" &&
        typeof err.error.message === "string" &&
        typeof err.error.code === "string"
    ) {
        err.message = err.error.message;
        err.error = err.error.code;
    } else {
        err.message = err.error;
        err.error = "UNEXPECTED_ERROR";
    }
    log.debug(`Responsed Error '${err.message}'`);
    let statusCode = err.statusCode || 500;
    delete err.statusCode;
    return res.status(statusCode).json(err);
}); // error handler