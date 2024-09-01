// Inject custom CSS for the Ocean Travel Setup window
const styleSetup = document.createElement('style');
styleSetup.innerHTML = `
  /* Form header */
  #ocean-travel-setup .form-header {
    width: auto;
    text-align: center;
    margin-bottom: 10px;
  }

  #ocean-travel-setup .form-header h2 {
    margin: 0;
    padding: 8px;
    color: var(--text-color); /* Default Foundry text color */
    border-radius: var(--border-radius);
  }

  /* Force window width to fit content */
  #ocean-travel-setup {
    max-width: calc(150px + 200px + 220px + 40px + 100px); /* Columns width + margins + padding */
    margin: 0 auto;
  }

  /* Form columns */
  #ocean-travel-setup .form-columns {
    display: flex;
    justify-content: flex-start; /* Align columns to start */
    width: auto; /* Adjust to fit content */
    padding: 0; /* Remove padding from sides */
  }

  /* Individual columns */
  #ocean-travel-setup .form-column {
    margin: 0 10px; /* Slight margin between columns */
    padding: 10px;
    border: 1px solid var(--border-light-color);
    border-radius: var(--border-radius);
    background-color: var(--background-light);
    display: flex;
    flex-direction: column;
    align-items: center; /* Center content in the column */
  }

  /* Specific column widths */
  #ocean-travel-setup .column-crew {
    max-width: 150px; /* Crew Members column */
  }

  #ocean-travel-setup .column-info {
    max-width: 200px; /* Boat Information column */
  }

  #ocean-travel-setup .column-passengers {
    max-width: 220px; /* Passengers column */
    padding-right: 100px; /* Add padding to the right side */
  }

  #ocean-travel-setup .form-column h3 {
    text-align: center;
    margin-bottom: 10px;
    color: var(--primary-color);
  }

  /* Form groups */
  #ocean-travel-setup .form-group {
    margin-bottom: 10px;
    width: 100%;
    text-align: left;
  }

  #ocean-travel-setup .form-group label {
    display: inline-block;
    width: 90px; /* Adjust label width to fit smaller columns */
    font-weight: bold;
    text-align: right;
    margin-right: 5px;
  }

  #ocean-travel-setup .form-group input,
  #ocean-travel-setup .form-group select {
    width: calc(100% - 95px); /* Adjust input width to match label */
  }

  /* Crew and passenger containers */
  #ocean-travel-setup .crew-roles,
  #ocean-travel-setup #passenger-container {
    display: flex;
    flex-direction: column;
    align-items: center; /* Center the drop areas and images */
    width: 100%;
  }

  /* Crew and passenger members */
  #ocean-travel-setup .crew-member,
  #ocean-travel-setup .passenger-member {
    display: flex;
    align-items: center;
    justify-content: space-between; /* Space out content within each member */
    margin-bottom: 5px;
    padding: 5px;
    gap: 5px;
    width: 100%; /* Ensure full-width alignment */
    max-width: 130px; /* Adjust max-width for Crew Members */
  }

  #ocean-travel-setup .column-passengers .passenger-member {
    max-width: 200px; /* Adjust max-width for Passengers */
  }

  #ocean-travel-setup .role-title {
    min-width: 70px; /* Narrower role titles to fit within smaller columns */
    text-align: right;
    margin-right: 5px;
    font-weight: bold;
  }

  /* Drop areas and images */
  #ocean-travel-setup .drop-box {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #ocean-travel-setup .drop-area {
    width: 35px; /* Smaller drop area to fit within smaller columns */
    height: 35px;
    background-color: grey;
    border: 2px solid black;
    display: flex;
    justify-content: center;
    align-items: center;
    border-radius: var(--border-radius);
  }

  #ocean-travel-setup .crew-img {
    width: 35px; /* Match image size to drop area */
    height: 35px;
    border-radius: var(--border-radius);
    cursor: grab;
    position: absolute;
    top: 0;
    left: 0;
  }

  /* Button alignment */
  #ocean-travel-setup .form-buttons {
    display: flex;
    justify-content: center; /* Center buttons within their container */
    gap: 10px;
    margin-top: 15px;
    text-align: center; /* Ensure text is centered */
  }

  /* Add Passenger and Submit buttons */
  #ocean-travel-setup button#add-passenger,
  #ocean-travel-setup button#submit-setup {
    padding: 8px 12px;
    border-radius: var(--border-radius);
    cursor: pointer;
    width: 100%;
    max-width: 150px; /* Smaller button width */
    text-align: center; /* Ensure button text is centered */
  }

  /* Remove button */
  .remove-passenger {
    margin-left: 10px;
    cursor: pointer;
    background-color: #ff5555;
    color: white;
    border: none;
    border-radius: 3px;
    padding: 3px 6px; /* Narrower padding */
    width: auto; /* Auto width to match content */
  }

  .remove-passenger:hover {
    background-color: #ff3333;
  }
`;
document.head.appendChild(styleSetup);

class OceanTravelSetup extends FormApplication {
  constructor(data = {}, options = {}) {
    super(data, options);
    this.crewMembers = game.settings.get("ocean-travel", "crewData") || {};
    this.passengerMembers = game.settings.get("ocean-travel", "passengerData") || {};
    this.passengerCount = Object.keys(this.passengerMembers).length;
    this.boatName = game.settings.get("ocean-travel", "boatName") || "";
    this.scale = game.settings.get("ocean-travel", "scale") || 0;
    this.gridStyle = game.settings.get("ocean-travel", "gridStyle") || "square";
    this.nauticalMiles = 0;
    this.speedMph = game.settings.get("ocean-travel", "speedMph") || 0; // Retrieve saved speed in mph
    this.speedKnots = game.settings.get("ocean-travel", "speedKnots") || 0; // Retrieve saved speed in knots
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "ocean-travel-setup",
      title: "Ocean Travel Setup",
      template: "modules/ocean-travel/templates/ocean-travel-setup.html",
      width: "auto",
      height: "auto"
    });
  }

  activateListeners(html) {
    super.activateListeners(html);

    this._populateSavedData(html);

    html.find("#scale").on("input", this._onScaleInput.bind(this));
    html.find("#speed-mph").on("input", this._onSpeedInput.bind(this)); // Listen for speed input changes
    this._activateDragAndDrop(html);

    html.find("#add-passenger").click(this._onAddPassenger.bind(this));
    html.find("#submit-setup").click(this._onSubmit.bind(this));

    html.on("click", ".remove-passenger", this._onRemovePassenger.bind(this));
  }

  _populateSavedData(html) {
    html.find("#boat-name").val(this.boatName);
    html.find("#scale").val(this.scale);
    html.find("#grid-style").val(this.gridStyle);
    html.find("#speed-mph").val(this.speedMph); // Populate speed input in mph
    html.find("#speed-knots").text(this.speedKnots.toFixed(2)); // Show speed in knots

    for (const [role, actorData] of Object.entries(this.crewMembers)) {
      const roleElement = html.find(`.crew-member[data-role="${role}"]`);
      if (roleElement.length > 0) {
        const crewImgElement = roleElement.find(".crew-img");
        const dropArea = roleElement.find(".drop-area");

        crewImgElement.attr("src", actorData.img).show();
        crewImgElement.attr("data-actor-id", actorData.actorId);
        dropArea.css({ backgroundColor: "transparent", borderColor: "transparent" });
      }
    }

    for (const [role, actorData] of Object.entries(this.passengerMembers)) {
      const passengerContainer = html.find("#passenger-container");
      this._addPassengerElement(passengerContainer, role, actorData);
    }
  }

  _onScaleInput(event) {
    const scaleInMiles = event.target.value;
    this.nauticalMiles = (scaleInMiles * 0.868976).toFixed(2);
  }

  _onSpeedInput(event) {
    this.speedMph = parseFloat(event.target.value) || 0;
    this.speedKnots = (this.speedMph * 0.868976).toFixed(2); // Convert mph to knots
    this.element.find("#speed-knots").text(this.speedKnots); // Update the displayed knots value
    console.log(`Speed set to ${this.speedMph} mph (${this.speedKnots} knots)`); // Debugging statement
  }

  _activateDragAndDrop(html) {
    html.find(".crew-member, .passenger-member").each((index, element) => {
      element.addEventListener("dragover", this._onDragOver.bind(this));
      element.addEventListener("drop", this._onDrop.bind(this));

      const imgElement = element.querySelector(".crew-img");
      if (imgElement) {
        imgElement.addEventListener("dragstart", this._onDragStartRemove.bind(this));
      }
    });
  }

  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  async _onDrop(event) {
    event.preventDefault();
    const data = JSON.parse(event.dataTransfer.getData("text/plain"));
    const actor = await fromUuid(data.uuid);

    if (actor) {
      const roleElement = event.currentTarget.closest(".crew-member, .passenger-member");
      const role = roleElement.dataset.role;

      const actorData = { actorId: actor.id, img: actor.img, name: actor.name };

      if (role.startsWith("passenger")) {
        this.passengerMembers[role] = actorData;
      } else {
        this.crewMembers[role] = actorData;
      }

      const crewImgElement = roleElement.querySelector(".crew-img");

      crewImgElement.src = actor.img;
      crewImgElement.style.display = "block";
      crewImgElement.draggable = true;

      const dropArea = roleElement.querySelector(".drop-area");
      dropArea.style.backgroundColor = "transparent";
      dropArea.style.borderColor = "transparent";

      console.log(`Dropped ${actor.name} into ${role}`); // Debugging statement
    }
  }

  _onDragStartRemove(event) {
    const roleElement = event.currentTarget.closest(".crew-member, .passenger-member");
    const role = roleElement.dataset.role;

    if (role.startsWith("passenger")) {
      delete this.passengerMembers[role];
    } else {
      delete this.crewMembers[role];
    }

    const imgElement = roleElement.querySelector(".crew-img");
    imgElement.style.display = "none";
    imgElement.src = "";

    const dropArea = roleElement.querySelector(".drop-area");
    dropArea.style.backgroundColor = "grey";
    dropArea.style.borderColor = "black";

    console.log(`Removed actor from ${role}`); // Debugging statement
  }

  _onAddPassenger(event) {
    this.passengerCount++;
    const newPassengerRole = `passenger${this.passengerCount}`;
    const passengerContainer = this.element.find("#passenger-container");

    console.log(`Adding new passenger with role: ${newPassengerRole}`); // Debugging statement
    this._addPassengerElement(passengerContainer, newPassengerRole);
  }

  _addPassengerElement(container, role, actorData = null) {
    const newPassenger = `
      <div class="passenger-member" data-role="${role}">
        <span class="role-title">${role.replace('passenger', 'Passenger ')}:</span>
        <div class="drop-box">
          <div class="drop-area"></div>
          <img class="crew-img" src="" alt="" style="display:none;">
        </div>
        <button type="button" class="remove-passenger" data-role="${role}">Remove</button>
      </div>`;

    container.append(newPassenger);
    this._activateDragAndDrop(container);

    if (actorData) {
      const passengerElement = container.find(`[data-role="${role}"]`);
      const crewImgElement = passengerElement.find(".crew-img");
      const dropArea = passengerElement.find(".drop-area");

      crewImgElement.attr("src", actorData.img).show();
      crewImgElement.attr("data-actor-id", actorData.actorId);
      dropArea.css({ backgroundColor: "transparent", borderColor: "transparent" });
    }

    console.log(`Passenger added:`, role, actorData); // Debugging statement
  }

  _onRemovePassenger(event) {
    const role = event.currentTarget.dataset.role;
    delete this.passengerMembers[role];
    this.element.find(`[data-role="${role}"]`).remove();
    console.log(`Passenger removed: ${role}`); // Debugging statement
  }

  async _onSubmit(event) {
    event.preventDefault();

    const boatName = this.element.find("#boat-name").val();
    const scale = this.element.find("#scale").val();
    const gridStyle = this.element.find("#grid-style").val();

    console.log("Saving Crew Data:", this.crewMembers); // Debugging statement
    console.log("Saving Passenger Data:", this.passengerMembers); // Debugging statement

    // Save all settings, including speed in mph and knots
    await game.settings.set("ocean-travel", "crewData", this.crewMembers);
    await game.settings.set("ocean-travel", "passengerData", this.passengerMembers);
    await game.settings.set("ocean-travel", "boatName", boatName);
    await game.settings.set("ocean-travel", "scale", scale);
    await game.settings.set("ocean-travel", "gridStyle", gridStyle);
    await game.settings.set("ocean-travel", "speedMph", this.speedMph); // Save speed in mph
    await game.settings.set("ocean-travel", "speedKnots", this.speedKnots); // Save speed in knots

    ui.notifications.info("Ocean Travel Setup saved successfully!");

    this.close();
  }

  _collectCrewData() {
    const crewData = {};

    for (const [role, actorData] of Object.entries(this.crewMembers)) {
      const actor = game.actors.get(actorData.actorId);
      if (actor) {
        crewData[role] = {
          name: actor.name,
          sailingSkills: this._getSailingSkills(actor)
        };
      }
    }

    return crewData;
  }

  _collectPassengerData() {
    const passengerData = {};

    for (const [role, actorData] of Object.entries(this.passengerMembers)) {
      const actor = game.actors.get(actorData.actorId);
      if (actor) {
        passengerData[role] = {
          name: actor.name,
          sailingSkills: this._getSailingSkills(actor)
        };
      }
    }

    return passengerData;
  }

  _getSailingSkills(actor) {
    const skills = {
      "Sailing Lore": this._calculateSkill(actor, "Sailing Lore"),
      "Captain Lore": this._calculateSkill(actor, "Captain Lore"),
      "Leadership Lore": this._calculateSkill(actor, "Leadership Lore"),
      "Cooking Lore": this._calculateSkill(actor, "Cooking Lore")
    };

    console.log(`Sailing skills for ${actor.name}:`, skills);
    return skills;
  }

  _calculateSkill(actor, skillName) {
    const skill = actor.items.find(i => i.type === "lore" && i.name === skillName);
    if (!skill) {
      console.warn(`Skill ${skillName} not found for ${actor.name}`);
      return "N/A";
    }

    const proficiency = (skill.system.proficiency?.rank || 0) * 2;
    const abilityMod = skill.system.attributes?.mod || 0;
    const itemBonus = 0;  // Assuming no item bonus for now
    const miscBonus = 0;  // Assuming no misc bonus for now

    const totalSkill = proficiency + abilityMod + itemBonus + miscBonus;
    return totalSkill;
  }
}

// Register the form application and settings
Hooks.once("init", function () {
  game.settings.registerMenu("ocean-travel", "oceanTravelSetup", {
    name: "Ocean Travel Setup",
    label: "Setup Ocean Travel",
    icon: "fas fa-ship",
    type: OceanTravelSetup,
    restricted: true
  });

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

  game.settings.register("ocean-travel", "speedMph", {
    name: "Speed in MPH",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  game.settings.register("ocean-travel", "speedKnots", {
    name: "Speed in Knots",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  // Register Handlebars helper 'notEmpty'
  Handlebars.registerHelper('notEmpty', function (obj) {
    return obj && Object.keys(obj).length > 0;
  });
});
