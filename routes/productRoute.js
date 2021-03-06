const express = require("express");
const { Server: HttpServer } = require("http");
const { Server: IOServer } = require("socket.io");

const route = express();

const SERVER = new HttpServer(route);
const io = new IOServer(SERVER);

const session = require("express-session");
const log4js = require("log4js");

// const MongoStore = require("connect-mongo");
const ramdomsChild = require("../utils/ramdomsChild");
const { fork } = require("child_process");
// const compressionModule = require('compression');


const ChatContainer = require("../src/daos/file/chatContainer");
const ProductosContainer = require("../src/daos/file/productosContainer");

// const util = require("util");
// const { fakerCreate } = require("../utils/mocks");
const { normalization } = require("../utils/normalizr");

const info = require("../utils/info");

const compressionRatio = require("../utils/calculator");
// const userLogged = require("../utils/sessions");

const fs = require("fs");
// const { response } = require("express");

route.use(express.json());
route.use(express.urlencoded({ extended: true }));
route.use(express.static("./public"));

const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;

const routes = require("../utils/controler");
const UserModel = require("../src/models/usuarios.js");
const validatePass = require("../utils/passValidatos");
const createHash = require("../utils/hashGenerator");
const { TIEMPO_EXPIRACION } = require("../src/config/globals");

route.use(
  session({
    secret: "diego",
    cookie: {
      httpOnly: false,
      secure: false,
      maxAge: parseInt(TIEMPO_EXPIRACION),
    },
    rolling: true,
    resave: true,
    saveUninitialized: true,
  })
);
// route.use(express.json());
// route.use(express.urlencoded({extended:true}));
route.use(passport.initialize());
route.use(passport.session());

route.set("views", "./views");

passport.use(
  "login",
  new LocalStrategy((username, password, done) => {
    UserModel.findOne({ username: username }, (err, user) => {
      if (err) {
        return done(err);
      }
      if (!user) {
        console.log("User not finded");
        return done(null, false);
      }
      if (!validatePass(user, password)) {
        console.log("password or user invalid");
        return done(null, false);
      }
      return done(null, user);
    });
  })
);

passport.use(
  "signup",
  new LocalStrategy(
    { passReqToCallback: true },
    (req, username, password, done) => {
      UserModel.findOne({ username: username }, (err, user) => {
        if (err) {
          console.log(`some issue happened: ${err}`);
          return done(err);
        }
        if (user) {
          console.log(`This User already exist. Try with some other `);
          return done(null, false);
        }
        console.log(req.body);
        const newUser = {
          firstName: req.body.lastName,
          lastName: req.body.firstName,
          email: req.body.email,
          username: username,
          password: createHash(password),
        };

        console.log(`NewUser:
            ${newUser}`);

        UserModel.create(newUser, (err, userWithId) => {
          if (err) {
            console.log(`some issue happened: ${err}`);
            return done(err);
          }
          console.log(userWithId);
          console.log("user created Successfuly");
          return done(null, userWithId);
        });
      });
    }
  )
);

passport.serializeUser((user, callback) => {
  callback(null, user._id);
});
passport.deserializeUser((id, callback) => {
  UserModel.findById(id, callback);
});

const productos = new ProductosContainer();

const chatContainer = new ChatContainer();

log4js.configure({
  appenders: {
    Console: { type: "console" },
    // errorFile: { type: "file", filename:'loggerError.log' },
    warnFile: {type:'file', filename:'warn.log'},
    errorFile: {type:'file', filename:'error.log'}
  }, 
  categories: {
    default: { appenders: ["warnFile","Console"], level: "warn" },
    info: { appenders: ["Console"], level: "info" },
    error: { appenders: ["errorFile","Console"], level: "error" },
  },
});

// INDEX--------------------------------
route.get("/", routes.getRoot);

// LOGIN--------------------------------
route.get("/login", routes.getLogin);
route.post(
  "/login",
  passport.authenticate("login", { failureRedirect: "/failLogin" }),
  routes.postLogin
);
route.get("/failLogin", routes.getFaillogin);

// SIGNUP--------------------------------
route.get("/signUp", routes.getSignup);
route.post(
  "/signUp",
  passport.authenticate("signup", { failureRedirect: "/failSingup" }),
  routes.postSignup
);
route.get("failSingup", routes.getFailsignup);

// LOGOUT--------------------------------
route.get("/logout", routes.getLogout);

// PRODUCTOS - --------------------------------
let compression = null;

io.on("connection", (socket) => {
try {

  console.log("EN LA WEB PRINCIPAL");
  let prueba = productos.read();
  socket.emit("messages", prueba);
  socket.on("new-message", (data1) => {
    productos.save(data1);
    prueba.push(data1);

    io.sockets.emit("messages", prueba);
  });
} catch (error) {
  let logger = log4js.getLogger("errorConsole");
  logger.error("PROBANDO EL LOG DE ERROR");
}
});

// CHAT- ---------------------------------
io.on("connection", (socket) => {
  try {
  // SI QUITO EL COMENTARIO DE LAS LINEAS 192 Y 193 PUEDO OBSERVER QUE SE MUESTRA EN LA CONSOLA EL ERROR DE MANERA CORRECTA
  // let logger = log4js.getLogger("error");
  // logger.error("PROBANDO EL LOG DE ERROR");

  const chat = chatContainer.read();
  const dataContainer = { id: 1, posts: [] };
  dataContainer.posts = chat;
  const chatNormalizado = normalization(dataContainer);
  console.log("USUARIO CONECTADO AL CHAT");
  socket.emit("chat", chatNormalizado);

  socket.on("newChat", (data) => {
    data.author.avatar = "avatar";
    chatContainer.save(data);
    // CHAT: TODO EL HISTORIAL. DATA: NUEVO POST GUARDADO
    chat.push(data);
    // DATACONTAINER: SE LE DA EL FORMATO PARA QUE SEA NORMALIZADO
    dataContainer.posts = chat;
    let dataNocomprimida = JSON.stringify(dataContainer).length;
    let dataNormalized = normalization(dataContainer);
    let dataComprimida = JSON.stringify(dataNormalized).length;
    compression = compressionRatio(dataNocomprimida, dataComprimida);
    });
    
    try {
      socket.emit("compression", compression);
    } catch (error) {
      let logger = log4js.getLogger("error");

      logger.error("Error: En la Compresion del Chat");
      console.log(error);
    }
  } catch (error) {
    let logger = log4js.getLogger("error");

    logger.error("Error: Hubo un error en la ruta del Chat");
    console.log(error);
  }
});
route.get("/productos", routes.postLogin, (req, res) => {
  res.render("main");
});
route.post("/productos", routes.postLogin, (req, res) => {
  res.render("main", { isUser: true });
});
route.get("/chat", routes.chatLogin, (req, res) => {
  res.render("about", { isUser: true });
});
route.get("/test/:num", (req, res) => {
  try {
    res.json(productos.mocks(req.params.num));
  } catch (err) {
    console.log(err);
  }
});
// route.use(compressionModule());

route.get("/info", info);

route.get("/api/randoms", (req, res) => {
try {
  let num = null;
  if (req.query.cant == undefined) {
    num = 100000000;
  } else {
    num = req.query.cant;
  }
  const child = fork("utils/ramdomsChild.js");
  child.send(num);
  child.on("message", (data) => {
    try {
      let mensaje = `Se han calculado en total, ${num} numeros:`;
      let result = JSON.parse(data);
      res.render("calculator", { mensaje, result });
    } catch (error) {
      console.log("ERROR");
      console.log(error);
    }
  });
} catch (error) {
  let logger = log4js.getLogger("errorConsole");

  logger.error("Log Error");
  console.log(error);
}
});

// FAIL ROUTE--------------------------------
route.get("*", (req, res) => {
  const logger = log4js.getLogger("warn");  
  logger.warn("Warn:404. Usuario No logeado")
  res.status(404).render("error",{});
});


module.exports = { SERVER, route };
