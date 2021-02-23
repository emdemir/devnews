import path = require("path");

// Banner displayed when the web presentation layer is started.
const webBanner = `\
   ___              _  __
  / _ \\ ___  _  __ / |/ /___  _    __ ___
 / // // -_)| |/ //    // -_)| |/|/ /(_-<
/____/ \\__/ |___//_/|_/ \\__/ |__,__//___/
------------- DevNews v1.0.0 ------------`;
// Banner displayed when the API presentation layer is started.
const apiBanner = `\
   ___              _  __
  / _ \\ ___  _  __ / |/ /___  _   [ API ]
 / // // -_)| |/ //    // -_)| |/|/ /(_-<
/____/ \\__/ |___//_/|_/ \\__/ |__,__//___/
----------- DevNews API v1.0.0 -----------`;

const programName = path.basename(process.argv[1]);

const showHelpAndExit = (status: number = 0) => {
    console.info("Usage:", programName, "[-h|--help] --mode|-m [api|web]");
    process.exit(status);
}

// Check for --help
if (process.argv.indexOf("-h") !== -1 || process.argv.indexOf("--help") !== -1) {
    showHelpAndExit();
}

// Get the mode
let modeFlag = process.argv.indexOf("--mode");
if (modeFlag === -1) modeFlag = process.argv.indexOf("-m");

if (modeFlag === -1) {
    console.error(programName + ": no mode supplied\n");
    showHelpAndExit(1);
}

const mode = process.argv[modeFlag + 1];
if (mode === undefined) {
    console.error(programName + ": mode missing after mode flag\n");
    showHelpAndExit(1);
}

if (!["api", "web"].includes(mode)) {
    console.error(programName + ": invalid mode\n");
    showHelpAndExit(1);
}

if (mode === "web") {
    const app = require("./web").default;
    app.listen(8080, () => {
        console.log(webBanner);
        console.info("Listening on :8080");
    });
} else {
    const app = require("./api").default;
    app.listen(8080, () => {
        console.log(apiBanner);
        console.info("Listening on :8080");
    });
}
