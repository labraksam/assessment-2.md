var express = require('express')
var slug = require('slug')
var bodyParser = require('body-parser')
var mongo = require('mongodb')
var argon2 = require('argon2')
var session = require('express-session')
var multer = require('multer')

require('dotenv').config()

var db = null

// Create a new URL based on the .env credentials
var url = 'mongodb://' + process.env.DB_HOST + ':' + process.env.DB_PORT

// Make connection to the database
mongo.MongoClient.connect(url, function(err, client) {
  if (err) throw err
  db = client.db(process.env.DB_NAME)
})

var upload = multer({dest: 'static/upload/'})

var app = express()
  .set('view engine', 'ejs')
  .set('views', 'src/view')
  .use(express.static('static'))
  .use(bodyParser.urlencoded({
    extended: true
  }))
  .use(session({
    resave: false,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET
  }))

  app.use('/images', express.static('src/images'))

  .get('/', home)
  .get('/login', login)
  .get('/profile/:id', singleProfile)
  .get('/signup', signup)
  .post('/signup', upload.single('cover'), doSignup)
  .post('/doLogin', doLogin)
  .get('/dashboard', dashboard)
  .get('/logout', logout)
  .get('/myprofile', myprofile)
  .delete('/:id', remove)
  .get('*', notFound)


  .listen(8080)

function dashboard(req, res) {

  var data = {
    session: req.session.user,
    users: ''
  }

  if (data.session) {
    console.log('ingelogd')
    db.collection('users').find().toArray(done)

    function done(err, allUsers) {
      if (err) {} else {
        console.log(data)
        data.users = allUsers

        res.render('dashboard/dashboard.ejs', data)
      }
    }
  } else {
    console.log('niet ingelogd')
    res.render('dashboard/dashboard.ejs', data)
  }
}

function home(req, res) {
  var data = {
    session: req.session.user
  }

  res.render('index.ejs', data)
}

function login(req, res) {
  var data = {
    session: req.session.user
  }
  res.render('front/login.ejs', data)
}

function doLogin(req, res) {
  var username = req.body.username
  var password = req.body.password

  if (!username || !password) {
    res
      .status(400)
      .send('Username or password are missing')

    return
  }

  var dbUsers = db.collection('users')

  dbUsers.findOne({
      email: username
    }, function(err, user) {
      if (err) {
        console.log(err)
    } else {
      try {
        argon2.verify(user.password, password)
          .then(onverify)
      } catch (err) {
        res.redirect('front/login.ejs')
        console.log(err)
      }

      function onverify(match) {
        if (match) {
          // Logged in
          req.session.user = user

          var data = {
            session: req.session.user,
            users: ''
          }

          res.redirect('dashboard')


        } else {
          res.status(401).send('Password incorrect')
        }
      }
    }
  })
}

function profile(req, res) {
  console.log(req.params.userID)
  res.render('dashboard/profile.ejs', {
    userID: req.params.userID,
    yourowngender: 'boy',
    preferenceGender: 'girl'
  })
}

function signup(req, res) {
  var data = {
    session: req.session.user
  }

  res.render('front/signup.ejs', data)
}

function doSignup(req, res) {

  var currentUser = req.body.email
  var password = req.body.password
  var passwordAgain = req.body.passwordAgain
  var min = 2
  var max = 16

  if (!currentUser || !password) {
    res
      .status(400)
      .send('Username or password are missing')
    return
  }

  if (password.length < min || password.length > max) {
    res
      .status(400)
      .send(
        'Password must be between ' + min +
        ' and ' + max + ' characters'
      )
    return
  }
  // Zoek naar een database table user
  var users = db.collection('users')

  // Zoeke een user
  users.findOne({
    // De input gebruikersnaam zoeken
    username: currentUser
  }, function(err, user) {
    if (err) { console.log(err) }
    else {
      argon2.hash(password).then(onhash)
    }
  })

  function onhash(hash) {
    db.collection('users').insertOne({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: hash,
      cover: req.file ? req.file.filename : null,
      gender: req.body.gender,
      gender_pref: req.body.gender_pref,
      birthday: req.body.birthday,
      age_pref_min: req.body.age_pref_min,
      age_pref_max: req.body.age_pref_max
    }, doneInserting)

    function doneInserting(err, user) {
      req.session.user = user.ops[0]

      var data = {
        session: req.session.user
      }

      res.redirect('dashboard')
    }
  }
}

function logout(req, res) {
  req.session.destroy(function (err) {
    if (err) {
      next(err)
    } else {
      res.redirect('/')
    }
  })
}

function singleProfile(req, res) {
  var data = {
    session: req.session.user,
    param: req.params.id,
    currentUser: ''
  }
  if (data.session) {
    console.log('render vanaf sessie')
    var mongoID = new mongo.ObjectID(req.params.id)
    db.collection('users').findOne({
      _id: mongoID}, function(err, user) {
      if (err) { console.log(err) }
      else {
        data.currentUser = user
        res.render('dashboard/profile.ejs', data)
      }
    })
  } else {

    res.render('dashboard/profile.ejs', data)
  }
}

function notFound(req, res) {
  var data = {
    session: req.session.user,
    errorMessage: '404, pagina niet gevonden!'
  }

  res.render('front/error', data)
}

function myprofile(req, res) {
  var data = {
  session: req.session.user,
  }

  res.render('dashboard/myprofile.ejs', data)
}

function remove(req, res) {
  var id = req.params.id

  data = data.filter(function (value) {
    return user.id !== id
  })

  res.json({status: 'ok'})
}
