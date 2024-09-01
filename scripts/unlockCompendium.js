Hooks.on("ready", async function() {
    // Replace 'ocean-travel.MyModuleMacros' with your actual module name and compendium name
    const pack = game.packs.get("ocean-travel.MyModuleMacros");
    if (pack && pack.locked) {
        await pack.configure({ locked: false });
        console.log("Compendium 'MyModuleMacros' has been unlocked.");
    }
});
