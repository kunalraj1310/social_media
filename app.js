require('dotenv').config();

const express = require('express');
const userschema = require('./models/user');
const postSchema = require('./models/post');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();

/* -------------------- Middlewares -------------------- */

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

app.set('view engine', 'ejs');

/* -------------------- Render Routes -------------------- */

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/posts', isLoggedIn, (req, res) => {
    res.render('posts');
});

/* -------------------- Profile Routes -------------------- */

app.get('/profile', isLoggedIn, async (req, res) => {
    const user = await userschema.findOne({
        email: req.user.email
    });

    const allposts = await postSchema
        .find()
        .populate('user')
        .sort({ _id: -1 });

    res.render('profile', {
        allPosts: allposts,
        user
    });
});

app.get('/myposts', isLoggedIn, async (req, res) => {
    const user = await userschema
        .findOne({ email: req.user.email })
        .populate('post');

    res.render('mypost', { user });
});

/* -------------------- Edit/Delete Routes -------------------- */

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    const post = await postSchema.findById(req.params.id);

    res.render('edit', { post });
});

app.get('/delete/:id', isLoggedIn, async (req, res) => {
    await postSchema.findOneAndDelete({
        _id: req.params.id
    });

    const user = await userschema.findOne({
        email: req.user.email
    });

    user.post.pull(req.params.id);

    await user.save();

    res.redirect('/profile');
});

/* -------------------- Register -------------------- */

app.post('/register', async (req, res) => {
    const existingUser = await userschema.findOne({
        email: req.body.email
    });

    if (existingUser) {
        return res.send('Email is already registered');
    }

    bcrypt.hash(req.body.password, 10, async (err, hash) => {
        if (err) {
            return res.send('Something went wrong');
        }

        const user = await userschema.create({
            username: req.body.username,
            email: req.body.email,
            password: hash
        });

        const token = jwt.sign(
            {
                email: user.email,
                userid: user._id
            },
            process.env.JWT_SECRET
        );

        res.cookie('token', token, {
            httpOnly: true
        });

        res.redirect('/profile');
    });
});

/* -------------------- Login -------------------- */

app.post('/login', async (req, res) => {
    const users = await userschema.findOne({
        email: req.body.email
    });

    if (!users) {
        return res.send('User not found');
    }

    bcrypt.compare(
        req.body.password,
        users.password,
        (err, result) => {
            if (!result) {
                return res.send('Invalid password');
            }

            const token = jwt.sign(
                {
                    email: users.email,
                    userid: users._id
                },
                process.env.JWT_SECRET
            );

            res.cookie('token', token, {
                httpOnly: true
            });

            res.redirect('/profile');
        }
    );
});

/* -------------------- Logout -------------------- */

app.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/');
});

/* -------------------- Create Post -------------------- */

app.post('/posts', isLoggedIn, async (req, res) => {
    const user = await userschema.findOne({
        email: req.user.email
    });

    const post = await postSchema.create({
        title: req.body.title,
        postcontent: req.body.posttext,
        user: req.user.userid
    });

    user.post.push(post._id);

    await user.save();

    res.redirect('/profile');
});

/* -------------------- Update Post -------------------- */

app.post('/update/:id', isLoggedIn, async (req, res) => {
    await postSchema.findByIdAndUpdate(
        req.params.id,
        {
            $set: {
                title: req.body.title,
                postcontent: req.body.postcontent
            }
        }
    );

    res.redirect('/profile');
});

/* -------------------- Like Feature -------------------- */

app.get('/like/:id', isLoggedIn, async (req, res) => {
    const post = await postSchema.findById(req.params.id);

    if (post.likes.includes(req.user.userid)) {
        post.likes.pull(req.user.userid);
    } else {
        post.likes.push(req.user.userid);
    }

    await post.save();

    res.redirect(req.get('referer') || '/profile');
});

/* -------------------- Auth Middleware -------------------- */

function isLoggedIn(req, res, next) {
    const token = req.cookies.token;

    if (!token) {
        return res.redirect('/login');
    }

    jwt.verify(
        token,
        process.env.JWT_SECRET,
        (err, decodedUser) => {
            if (err) {
                return res.redirect('/login');
            }

            req.user = decodedUser;
            next();
        }
    );
}

module.exports = app;
