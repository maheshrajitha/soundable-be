const express = require('express');

const userService = require('./services/user.service');
const authService = require('./services/auth.service');

const router = express.Router();

const userRouter = express.Router();
userRouter.post('', userService.saveNewUser);

const authRouter = express.Router();
authRouter.post('', authService.login);

router.use('/user', userRouter);
router.use('/auth', authRouter);
module.exports = router;