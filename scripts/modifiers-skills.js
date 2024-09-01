class ModifiersAndSkillsWindow extends FormApplication {
  constructor(object = {}, options = {}) {
    super(object, options);
    this.selectedActor = null; // Initialize with no actor selected
    this.customSkills = [
      { name: "Sailing Lore", key: "sailingLore", ability: "wis", selector: "sailing-lore" },
      { name: "Captain Lore", key: "captainLore", ability: "cha", selector: "captain-lore" },
      { name: "Leadership Lore", key: "leadershipLore", ability: "cha", selector: "leadership-lore" },
      { name: "Cooking Lore", key: "cookingLore", ability: "int", selector: "cooking-lore" },
      // Additional roles
      { name: "Helmsman Lore", key: "helmsmanLore", ability: "str", selector: "helmsman-lore" },
      { name: "Navigation Lore", key: "navigationLore", ability: "wis", selector: "navigation-lore" }
    ];
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "modifiers-skills-window",
      title: "Modifiers and Skills Manager",
      template: "modules/ocean-travel/templates/modifiers-skills.html", // Ensure this matches your template file path
      width: 400,
      height: "auto",
      closeOnSubmit: false
    });
  }

  getData() {
    console.log("ModifiersAndSkillsWindow - Fetching data");

    // Fetch all actors in the game to populate the dropdown
    const actors = game.actors.map(actor => ({
      id: actor.id,
      name: actor.name
    }));

    // Return the selected actor data and custom skills
    return {
      actors: actors,
      selectedActor: this.selectedActor,
      skills: this.selectedActor ? this.selectedActor.items.filter(i => i.type === "lore") : [],
      customSkills: this.customSkills
    };
  }

  activateListeners(html) {
    super.activateListeners(html);
    console.log("ModifiersAndSkillsWindow - Activating listeners");

    // Actor selection dropdown
    html.find("#actor-select").change(this._onActorSelect.bind(this));

    // Listeners for assign/remove skill buttons
    html.find(".assign-skill").click(this._onAssignSkill.bind(this));
    html.find(".remove-skill").click(this._onRemoveSkill.bind(this));
  }

  _onActorSelect(event) {
    const actorId = event.currentTarget.value;
    this.selectedActor = game.actors.get(actorId);
    this.render(); // Re-render the form with the new actor selected
  }

  async _onAssignSkill(event) {
    event.preventDefault();
    if (!this.selectedActor) {
      ui.notifications.warn("Please select an actor from the dropdown.");
      return;
    }

    const skillKey = document.querySelector('#skill-select').value;
    const skillConfig = this.customSkills.find(skill => skill.key === skillKey);
    if (!skillConfig) return;

    const skillName = skillConfig.name;
    const ability = skillConfig.ability;
    const selector = skillConfig.selector;

    // Capture the rank immediately when the button is clicked
    const rank = parseInt(document.querySelector(`#skill-rank`).value);

    // Check if the skill item already exists
    const existingSkillItem = this.selectedActor.items.find(i => i.name === skillName && i.type === "lore");

    if (existingSkillItem) {
      ui.notifications.warn(`Skill ${skillName} already exists as a Lore item.`);
      return;
    }

    const proficiencyBonus = (rank) => {
      switch (rank) {
        case 1: return 2;  // Trained
        case 2: return 4;  // Expert
        case 3: return 6;  // Master
        case 4: return 8;  // Legendary
        default: return 0; // Untrained
      }
    };

    const abilityMod = this.selectedActor.system.abilities[ability]?.mod || 0;
    const level = this.selectedActor.system.details.level?.value || 0;

    // Create a new item (lore skill) with the rule elements and proficiency
    const newItemData = {
      name: skillName,
      type: "lore",
      img: "icons/svg/book.svg", // Example icon for Lore skills
      system: {
        proficient: { value: rank }, // Set the rank directly here
        modifiers: [{
          name: `${skillName} Modifier`,
          type: "proficiency",
          modifier: proficiencyBonus(rank),
          ability: ability,
          label: `${skillName}`
        }],
        rules: [
          {
            key: "FlatModifier",
            selector: selector,
            type: "ability",
            ability: ability
          },
          {
            key: "AdjustModifier",
            selectors: [selector],
            predicate: {
              all: ["modifier:type:ability"],
              not: [`modifier:ability:${ability}`]
            },
            suppress: true
          }
        ],
        attributes: { mod: abilityMod }, // Properly set the ability modifier
        custom: "", // Any additional custom modifiers or notes
        breakdown: `Proficiency (${proficiencyBonus(rank)}) + Ability Mod (${abilityMod}) + Level (${level})`
      }
    };

    console.log(`Creating new lore item ${skillName} for ${this.selectedActor.name}:`, newItemData);
    await this.selectedActor.createEmbeddedDocuments("Item", [newItemData]);

    this.render(); // Re-render the form to update the skill list
  }

  async _onRemoveSkill(event) {
    event.preventDefault();
    if (!this.selectedActor) {
      ui.notifications.warn("Please select an actor from the dropdown.");
      return;
    }

    const skillKey = document.querySelector('#skill-select').value;
    const skillConfig = this.customSkills.find(skill => skill.key === skillKey);
    if (!skillConfig) return;

    const skillName = skillConfig.name;

    // Find the existing item (lore skill) with the same name
    const existingItem = this.selectedActor.items.find(i => i.name === skillName && i.type === "lore");
    if (existingItem) {
      console.log(`Removing skill: ${skillName}`);
      await this.selectedActor.deleteEmbeddedDocuments("Item", [existingItem.id]);
    } else {
      ui.notifications.warn(`Skill ${skillName} does not exist on ${this.selectedActor.name}.`);
    }

    this.render(); // Re-render the form to update the skill list
  }

  async _updateObject(event, formData) {
    // No additional processing needed
  }
}

// Register the Modifiers and Skills Manager menu in the settings
Hooks.once('init', function() {
  console.log("Registering Modifiers and Skills Manager in settings menu");

  // Correctly defined 'ifEquals' helper
  Handlebars.registerHelper('ifEquals', function(arg1, arg2, options) {
    if (arg1 == arg2) {
      return options.fn(this); // When the condition is met
    } else {
      return options.inverse(this); // When the condition is not met
    }
  });

  // Correctly defined 'isCustomSkill' helper
  Handlebars.registerHelper('isCustomSkill', function(skillKey, customSkills, options) {
    const isCustom = customSkills.some(skill => skill.key === skillKey);
    if (isCustom) {
      return options.fn(this); // Render the content if it's a custom skill
    } else {
      return options.inverse(this); // Otherwise render the inverse content
    }
  });

  game.settings.registerMenu("ocean-travel", "modifiersSkillsManager", {
    name: "Modifiers and Skills Manager",
    label: "Manage Modifiers & Skills",
    hint: "Add or remove custom skills and modifiers for actors.",
    icon: "fas fa-tools",
    type: ModifiersAndSkillsWindow,
    restricted: true
  });
});
