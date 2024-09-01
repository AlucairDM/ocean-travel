Hooks.once('init', function() {
  console.log("Ocean Travel Module is initializing...");

  // Register the Ocean Travel Setup menu
  game.settings.registerMenu("ocean-travel", "oceanTravelSetup", {
    name: "Ocean Travel Setup",
    label: "Setup Ocean Travel",
    icon: "fas fa-ship",
    type: OceanTravelSetup,
    restricted: true
  });

  // Register the Ocean Travel Information menu
  game.settings.registerMenu("ocean-travel", "oceanTravelInfo", {
    name: "View Travel Information",
    label: "Travel Info",
    icon: "fas fa-info-circle",
    type: OceanTravelInfoMenu,
    restricted: true
  });

  // Register the GM Travel Setup menu
  game.settings.registerMenu("ocean-travel", "gmTravelSetup", {
    name: "GM Travel Setup",
    label: "Start Travel",
    icon: "fas fa-ship",
    type: GmTravelSetup,
    restricted: true
  });

  // Register settings for storing data
  game.settings.register("ocean-travel", "crewData", {
    name: "Crew Data",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register("ocean-travel", "passengerData", {
    name: "Passenger Data",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register("ocean-travel", "boatName", {
    name: "Boat Name",
    scope: "world",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register("ocean-travel", "scale", {
    name: "Scale",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("ocean-travel", "gridStyle", {
    name: "Grid Style",
    scope: "world",
    config: false,
    type: String,
    default: "square"
  });

  game.settings.register("ocean-travel", "boatSpeed", { // New setting for Boat Speed
    name: "Boat Speed",
    scope: "world",
    config: false,
    type: String,
    default: "medium"
  });
});

Hooks.once('ready', async function() {
  console.log("Ocean Travel Module is ready.");

  // Check if a "Travel" folder exists in the Compendium Browser
  let travelFolder = game.folders.find(f => f.name === "Travel" && f.type === "Compendium");

  // If the folder does not exist, create it
  if (!travelFolder) {
    try {
      travelFolder = await Folder.create({
        name: "Travel",
        type: "Compendium",
        icon: "fas fa-anchor"  // Optional: set an icon for the folder
      });
      console.log("Travel folder created successfully.");
    } catch (error) {
      console.error("Error creating Travel folder:", error);
    }
  } else {
    console.log("Travel folder already exists.");
  }

  // Get the compendium pack by its key (moduleName.packName)
  const pack = game.packs.get("ocean-travel.MyModuleMacros");  // Replace with your actual compendium name

  if (pack && travelFolder) {
    try {
      // Assign the folder to the compendium
      await pack.configure({ folder: travelFolder.id });
      console.log("Ocean Travel compendium successfully moved to the Travel folder.");
    } catch (error) {
      console.error("Error moving compendium to Travel folder:", error);
    }
  } else if (!pack) {
    console.error("Compendium not found. Ensure the key 'ocean-travel.MyModuleMacros' is correct.");
  } else if (!travelFolder) {
    console.error("Travel folder could not be created or found.");
  }

  Hooks.on('getSceneControlButtons', controls => {
    controls.push({
      name: "ocean-travel",
      title: "Ocean Travel",
      icon: "fas fa-anchor",
      layer: null,
      tools: [
        {
          name: "ship-setup",
          title: "Ship - Ocean Setup",
          icon: "fas fa-ship",
          onClick: () => {
            new OceanTravelSetup().render(true);
          },
          button: true
        }
      ],
      visible: game.user.isGM,
      activeTool: "ship-setup"
    });
  });
});

Hooks.on('renderCompendiumDirectory', async function(app, html, data) {
  console.log("Compendium Directory rendered.");

  // This hook can be used to further manipulate or style the compendium directory
  // For example, adding buttons, reorganizing folders, etc.
});

// Inject custom CSS for the Ocean Travel Info window
Hooks.once('ready', async function() {
  console.log("Injecting custom CSS for Ocean Travel Info window...");

  const style = document.createElement('style');
  style.innerHTML = `
    .ocean-travel-info {
      padding: 10px;
      font-family: Arial, sans-serif;
    }

    /* Boat Information */
    .ocean-travel-info h2 {
      text-align: center;
      margin-bottom: 15px;
      color: #333;
      font-weight: bold; /* Bold main heading */
    }

    /* Section Headings */
    .ocean-travel-info h3 {
      text-align: center;
      font-size: 16px;
      margin-top: 15px;
      margin-bottom: 10px;
      color: #444;
      font-weight: bold; /* Bold section headings */
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
    }

    /* Tile Layout for Crew and Passengers */
    .ocean-travel-info .tile-container {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      justify-content: space-between;
    }

    .ocean-travel-info .crew-member-info,
    .ocean-travel-info .passenger-info {
      background-color: transparent; /* Transparent background */
      border: 1px solid black; /* Black outline */
      border-radius: 5px;
      padding: 8px;
      flex: 1 1 calc(50% - 10px); /* Two columns with some gap */
      box-sizing: border-box;
    }

    .ocean-travel-info .crew-member-info p,
    .ocean-travel-info .passenger-info p {
      font-size: 13px;
      margin: 3px 0;
      color: #555;
    }

    /* Specific skill labels */
    .ocean-travel-info .skill-label {
      font-weight: bold; /* Make sure skill labels are bold */
      display: inline-block;
      width: 120px; /* Make sure all labels align nicely */
    }
  `;
  document.head.appendChild(style);

  console.log("CSS injection complete.");
});
