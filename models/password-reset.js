var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');
var crypto = require('crypto');
var nodemailer = require('nodemailer');
const passwordResetSchema = new mongoose.Schema({
    _userId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true },
    createdAt: { type: Date, required: true, default: Date.now, expires: 43200 }
});


var passwordReset = module.exports = mongoose.model('passwordReset', passwordResetSchema);

var User = require('./user');
var Token = require('./token');

module.exports.getUserByEmail = function (req, res, email, callback) {
    var query = { email: email };
    console.log(email);
    User.findOne(query, function (err, user) {
        if (err) {
            console.log("couldnt find the user");
        }
        else if (user == null) {
            console.log("user is null");
        }
        else {

            passwordReset.sendPasswordResetLink(req, res, user);
        }
    });
}

module.exports.sendPasswordResetLink = function (req, res, user) {


    // Create a verification token for this user
    var token = new Token({ _userId: user._id, token: crypto.randomBytes(16).toString('hex') });

    // Save the verification token
    token.save(function (err) {
        if (err) { return res.status(500).send({ msg: err.message }); }

        // Send the email
        console.log("sending mail")
        var transporter = nodemailer.createTransport("SMTP", { service: 'gmail', auth: { user: "algocodingpesu@gmail.com", pass: "********" } });
        var mailOptions = { from: 'algocodingpesu@gmail.com', to: user.email, subject: 'Password change link', text: 'Hello,\n\n' + 'Please change your password with the link: \nhttp:\/\/' + req.headers.host + '\/password-change\/' + token.token + '.\n' };
        transporter.sendMail(mailOptions, function (err) {
            if (err) { return res.status(500).send({ msg: err.message }); }
            res.status(200).send('A password change email has been sent to ' + user.email + '.');
        });
    });

}

module.exports.confirmPassword = function (req, res) {
    /*Should correct this */
    console.log("asserting token of confirm password");
    req.assert('token', 'Token cannot be blank').notEmpty();
    // req.sanitize('email').normalizeEmail({ remove_dots: false });
    console.log("asserted token");
    /* {end} Should correct this */

    // Check for validation errors    
    var errors = req.validationErrors();
    if (errors) return res.status(400).send(errors);

    if (req.body.password != req.body.password2) {
        console.log("passwords do not match");
        res.render('password-change', {
            errors:
            [{ msg: 'passwords do not match' }]
        });
    }
    else {

        // Find a matching token
        Token.findOne({ token: req.params.token }, function (err, token) {
            if (!token) return res.status(400).send({ type: 'not-verified', msg: 'We were unable to find a valid token. Your token my have expired.' });

            // If we found a token, find a matching user
            User.findOne({ _id: token._userId }, function (err, user) {
                if (!user) return res.status(400).send({ msg: 'We were unable to find a user for this token.' });
                if (user.isVerified) return res.status(400).send({ type: 'already-verified', msg: 'This user has already been verified.' });

                // Verify and save the user
                // user.isVerified = true;
                bcrypt.genSalt(10, function (err, salt) {
                    bcrypt.hash(req.body.password, salt, function (err, hash) {
                        user.password = hash;
                        user.save(function (err) {
                            if (err) { return res.status(500).send({ msg: err.message }); }
                            // res.status(200).send("Password changes succesfully..");
                            console.log('password changed succesfully');
                            // res.redirect('/users/login');
                            // req.flash('success_msg', 'You are registered and can now login');
                        });
                    });
                });
                user.password = req.body.password;
                user.save(function (err) {
                    if (err) { return res.status(500).send({ msg: err.message }); }
                    res.status(200).send("Password changes succesfully..");
                    console.log('password changed succesfully');
                    // res.redirect('/users/login');
                    // req.flash('success_msg', 'You are registered and can now login');
                });
            });
        });
    }

}


