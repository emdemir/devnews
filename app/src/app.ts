import app from "./view";

// Banner displayed when app is started.
const banner = `\
   ___              _  __
  / _ \\ ___  _  __ / |/ /___  _    __ ___
 / // // -_)| |/ //    // -_)| |/|/ /(_-<
/____/ \\__/ |___//_/|_/ \\__/ |__,__//___/
------------- DevNews v1.0.0 ------------`;

app.listen(8080, () => {
    console.log(banner);
    console.info("Listening on :8080");
});
