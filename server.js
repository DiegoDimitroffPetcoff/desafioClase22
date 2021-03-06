const cluster = require("cluster");
const { fork } = require("child_process");
const { app } = require("./app");
const numCPUs = require("os").cpus().length;
// const path = require("path");
const { SERVER, route } = require("./routes/productRoute");

const dotenv = require("dotenv");
const { appendFile } = require("fs/promises");

const PORT = process.env.PORT || 8080;
const MODO = process.argv[2] || "fork";

if (MODO == "fork") {
SERVER.listen(PORT, () => {
  console.log(`Server on ${PORT}`);
})
SERVER.on("Error", (error) => console.log("error en servidor ${error}"));
} else {
  console.log("MODO= cluster");
  if (cluster.isMaster) {
    for (let index = 0; index < numCPUs; index++) {
      cluster.fork();
      console.log(`Server Master on ${PORT}`);
    }

    cluster.on("exit", (worker) => {});
  } else {
    SERVER.listen(PORT, () => {
      console.log(`Server Cluster on ${PORT}`);
    });
    SERVER.on("Error", (error) => console.log("error en servidor ${error}"));
  }
}

// app.listen(PORT, () => {
//   console.log(`Server on ${PORT}`);
// })
// SERVER.on("Error", (error) => console.log("error en servidor ${error}"));
