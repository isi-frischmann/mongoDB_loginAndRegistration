const path = require('path');

// server
const port = 5000;

// express
var express = require('express');
var app = express();

// bodyParser
var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true })); 

// view engine
app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

// static files
app.use(express.static(path.join(__dirname, './static')));

// use falsh messages
const flash = require('express-flash');
app.use(flash());

// session
const session = require('express-session');
app.use(session({
    secret: 'mySecretKey',
    resave: false,
    saveUninitialized: true,
    cookie: {maxAge: 600000}
}))

// use bcrypt
const bcrypt = require('bcrypt');

// require mongoose
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/loginAndRegistration');

// create new Schema for User
var UserSchema = new mongoose.Schema({
    fname: { type: String, required: [true, 'Firstname is required'],  minlength: [3, "First name needs to have more then 3 characters"] },
    lname: { type: String, required: [true, 'Firstname is required'] },
    email: { type: String, required: true, index: { unique: true } },
    birthday: { type: String, required: true },
    password: { type: String, format: "date" },
    confirmPassword: String
}, {timestamps: true})
// create collection
mongoose.model('User', UserSchema);
var User = mongoose.model('User');


app.get('/', function(req, res){
    res.render('index');
})

app.get('/process', function(req, res){
    if(req.session.userId){
        var sessionId = req.session.userId;
        User.findOne({  _id : sessionId}, function(err, specUser){
            console.log(specUser);
            if(err){
                for(var key in err){
                    res.redirect('/');
                }
            }
            else{
                // console.log("user found:", user);
                
                res.render('main', {user : specUser});
            }
        })
    }    
})

// routing for register
app.post('/register', function(req, res){
    if(req.body.password == req.body.c_pw){
        bcrypt.hash(req.body.password, 10, function(err, hashedPassw){ //10 = hash the password with 10 values
            if(err){
                for(var key in err.errors){
                    req.flash('addNewUser', err.errors[key].message);
                    // console.log("im inside the error", err);
                }
            }
            else{ //check if email address already exist in db
                User.findOne({ email : req.body.email }, function(err, oneUser){
                    if(err){
                        for(var key in err.errors){
                            req.flash('addNewUser', err.errors[key].message);
                            // console.log("im inside the error", err);
                        }
                    res.redirect('/');
                    } 
                    else{
                        if(oneUser){
                            // console.log("Email already exists");
                            res.redirect('/');
                        }
                        else{ //create a new user
                            // console.log("I creat a new user now");
                            User.create({
                                fname: req.body.fname, 
                                lname: req.body.lname, 
                                email: req.body.email,
                                password: hashedPassw,
                                confirmPassword: req.body.c_pw,
                                birthday: req.body.birthDate }, function(err, user){
                                    if(err){ //if there is an error send error message
                                        for(var key in err.errors){
                                            req.flash('addNewUser', err.errors[key].message);
                                            // console.log("im inside the error", err);
                                        }
                                    res.redirect('/');
                                    }
                                    else{ //if there is no error set the user id to session id 
                                        req.session.userId = user._id;
                                        req.session.fname = user.fname;
                                        // console.log("Password is hashed: ", user.password); 
                                        res.redirect('/process');
                                    }
                            })
                        }
                    }
                
            })
        }
    })}
    else{
        res.redirect('/');
    }
})

// routing for login
app.post('/login', function(req, res){
    var password = '';
        // check if email exists in db
        User.findOne({ email : req.body.email })
        .then( user => {
            if(!user){
                // console.log("I'm not even checking if you exist :P");
                req.flash('logInUser', 'User does not exists');
                res.redirect('/');
            }
            else{
                if(user){
                    // console.log("Email exist in DB and now check the bcrypt password");
                    // console.log("Testing my sessions!!!!!!!!!!", req.session);
                    // check if saved hashed password matches insertes password in the form
                    bcrypt.compare(req.body.password, user.password)
                    .then( result => {
                        console.log(user);
                        if(result){
                            req.session.userId = user._id;
                            req.session.fname = user.fname;
                            // console.log("That's the sessionID and also userID---------", user._id);
                            res.redirect('/process');
                        }
                        else{
                            req.flash('logInUser', 'You can not login, because your password is wrong');
                            res.redirect('/');
                        }                    
                    })
                }
            }
        })
})

const server = app.listen(port)