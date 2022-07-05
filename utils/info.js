const parseArgs = require("minimist");

function info(req, res) {
  let argumentos = parseArgs(process.argv.slice(2));
  let plataforma = parseArgs(process.argv);
  let argumentosEntrada = argumentosFuncion();
  function argumentosFuncion() {
    if (argumentos._ == "") {
      return "No hay agurmentos agregados";
    } else {
      return `Los argumentos de entrada son: ${argumentos._}`;
    }
  }
  let nombrePlataforma = `PLATAFORMA UTILIZADA: ${process.platform}`;
  let versionNodeJs = `VERSION UTILIZADA DE NODE JS: ${process.version}`;
  let rss = `Memoria utiliazda: ${process.memoryUsage}`;
  let pathEjecucion = `PATH DE EJECUCION: ${process.cwd()}`;
  let processID = `ID DEL PROCESO: ${process.pid}`;
  let carpetaProyecto = `CARPETA DE PROYECTO: ${plataforma._[1]}`;

  res.render("information", {
    carpetaProyecto,
    processID,
    pathEjecucion,
    carpetaProyecto,
    rss,
    versionNodeJs,
    nombrePlataforma,
  });
}
module.exports = info;