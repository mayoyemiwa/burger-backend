const {Router} = require('express');
const authController = require('../controllers/authControllers');
const auth = require('../middleware/auth')

const router = Router();



router.get('/user/verify/:userID/:uniqueString', authController.verify_get);
router.get('/api/user/verified', authController.verified_get);
router.get('/api/user/pwdAuth/:email?', authController.auth_get);
router.get('/api/user/pwdredirect/', authController.redirect_get)
router.post('/api/signup', authController.signup_post)
router.post('/api/login', authController.login_post);
router.get('/api/login', auth, authController.login_get);
router.post('/api/refresh_token', authController.get_refresh_token);
router.post('/api/orders', authController.orders_get);
router.get('/api/logout', authController.logout_get);
router.post('/api/forgetPwd', authController.forgetpwd_post);
router.post('/api/pwdreset', auth, authController.pwdReset_post);
router.get('/api/pwdauthenticate', authController.pwdAuthenticate_get);


//SOCIOL LOGIN ROUTER
router.post('/api/google_login', authController.google_login_post);

module.exports = router;