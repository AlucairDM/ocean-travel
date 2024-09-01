class GmTravelSetup extends FormApplication {
    constructor(data = {}, options = {}) {
      super(data, options);
      this.resetData();
      this.crewMembers = game.settings.get("ocean-travel", "crewData") || {};
      this.passengerMembers = game.settings.get("ocean-travel", "passengerData") || {};
      this.baseDC = 18; // Define the base DC for boat handling
      this.baseSpeedKnots = game.settings.get("ocean-travel", "speedKnots") || 4; // Set a sensible default or retrieve from setup
      this.calculateByDistance = false; 
    }
  
    static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
        id: "gm-travel-setup",
        title: "GM Travel Setup",
        template: "modules/ocean-travel/templates/gm-travel.html",
        width: 700, 
        height: "auto",
        closeOnSubmit: true,
        submitOnChange: false,
        submitOnClose: true,
      });
    }
  
    resetData() {
      this.weatherRoll = null;
      this.weatherDescription = "";
    }
  
    getData() {
      const crewData = this._collectCrewData();
      const passengerData = this._collectPassengerData();
      const weatherModifier = this._getWeatherModifier(this.weatherRoll);
      const finalDC = this.baseDC + weatherModifier;
  
      return {
        crewData,
        passengerData,
        weatherRoll: this.weatherRoll,
        weatherDescription: this.weatherDescription,
        finalDC,
      };
    }
  
    activateListeners(html) {
      super.activateListeners(html);
      html.find("#generate-weather").click(this._onGenerateWeather.bind(this));
      html.find("#submit-setup").click(this._onSubmitTravel.bind(this));
      html.find("#calculation-mode").change(this._toggleCalculateMode.bind(this));
      html.find("#custom-days, #custom-hours").on("input", this._onCustomTravelTimeInput.bind(this));
  
      this._initializeCheckboxState(html);
      this._toggleCalculateMode({ target: { value: this.calculateByDistance ? "distance" : "time" } });
    }
  
    _updateObject(event, formData) {
      
      console.log("Form data submitted:", formData);
      return; 
    }
  
    _toggleCalculateMode(event) {
      const mode = event.target.value;
      if (mode === "distance") {
        this.calculateByDistance = true;
        this.element.find(".travel-time-section").hide();
        this.element.find(".distance-section").show();
      } else if (mode === "time") {
        this.calculateByDistance = false;
        this.element.find(".travel-time-section").show();
        this.element.find(".distance-section").hide();
      }
    }
  
    _initializeCheckboxState(html) {
      const nightTravelCheckbox = html.find("#night-travel");
      const travelTimeSelect = html.find("#travel-time");
  
      nightTravelCheckbox.prop("checked", false).prop("disabled", false);
  
      if (travelTimeSelect.val() === "24 hours" || travelTimeSelect.val() === "10 days") {
        nightTravelCheckbox.prop("checked", true).prop("disabled", true);
      }
  
      travelTimeSelect.change((event) => {
        const selectedTime = event.target.value;
        if (selectedTime === "24 hours" || selectedTime === "10 days") {
          nightTravelCheckbox.prop("checked", true).prop("disabled", true);
        } else {
          nightTravelCheckbox.prop("checked", false).prop("disabled", false);
        }
      });
    }
  
    _onCustomTravelTimeInput(event) {
      const customDays = parseInt(this.element.find("#custom-days").val()) || 0;
      const customHours = parseInt(this.element.find("#custom-hours").val()) || 0;
  
      if (customDays > 0 || customHours > 0) {
        this.element.find("#travel-time").prop("disabled", true);
      } else {
        this.element.find("#travel-time").prop("disabled", false);
      }
    }

  _collectCrewData() {
    const crewData = [];
    
    for (const [role, actorData] of Object.entries(this.crewMembers)) {
      const actor = game.actors.get(actorData.actorId);
      if (actor) {
        const primarySkill = this._getPrimarySkillForRole(role);
        const backupSkill = this._getBackupSkillForRole(role);
  
       
        const primarySkillModifier = this._calculateSkillBonus(actor, primarySkill);
        const backupSkillModifier = this._calculateSkillBonus(actor, backupSkill);
  
        crewData.push({
          role,
          actorName: actor.name,
          primarySkill: primarySkill ? primarySkill : "N/A",
          primarySkillBonus: primarySkillModifier !== "N/A" ? primarySkillModifier : 0,
          backupSkill: backupSkill ? backupSkill : "N/A",
          backupSkillBonus: backupSkillModifier !== "N/A" ? backupSkillModifier : 0
        });
  
      }
    }
  
    return crewData;
  }
  _calculateCrewModifiers(actor, role) {
    let primarySkillName, primaryAbilityKey;
    let backupSkillName;

    // Define primary and backup skills based on the role
    switch (role) {
      case "captain":
        primarySkillName = "Captain Lore";
        primaryAbilityKey = "cha";
        backupSkillName = "diplomacy";
        break;
      case "navigator":
        primarySkillName = "Sailing Lore";
        primaryAbilityKey = "wis";
        backupSkillName = "survival";
        break;
      case "helmsman":
        primarySkillName = "Sailing Lore";
        primaryAbilityKey = "str";
        backupSkillName = "diplomacy";
        break;
      case "firstMate":
        primarySkillName = "Leadership Lore";
        primaryAbilityKey = "cha";
        backupSkillName = "intimidation";
        break;
      case "cook":
        primarySkillName = "Cooking Lore";
        primaryAbilityKey = "int";
        backupSkillName = "crafting";
        break;
      case "bosun":
        primarySkillName = "Leadership Lore";
        primaryAbilityKey = "str";
        backupSkillName = "crafting";
        break;
      default:
       
        return "N/A";
    }

    // Fetch primary skill modifier
    const primarySkillItem = actor.items.find((i) => i.type === "lore" && i.name === primarySkillName);
    if (primarySkillItem) {
      return this._calculateSkillFromItem(actor, primarySkillItem, primaryAbilityKey);
    }

    // Fetch backup skill modifier
    const backupSkillData = actor.system.skills[backupSkillName];
    if (backupSkillData) {
      return this._calculateCoreSkillBonus(actor, backupSkillData);
    }

    
  }

  _calculatePassengerModifiers(actor, aidRole) {
    let primarySkillName, backupSkillName;

    // Define primary and backup skills based on the aid role
    switch (aidRole) {
      case "captain":
        primarySkillName = "Captain Lore";
        backupSkillName = "diplomacy";
        break;
      case "navigator":
        primarySkillName = "Sailing Lore";
        backupSkillName = "survival";
        break;
      case "helmsman":
        primarySkillName = "Sailing Lore";
        backupSkillName = "diplomacy";
        break;
      case "firstMate":
        primarySkillName = "Leadership Lore";
        backupSkillName = "intimidation";
        break;
      case "cook":
        primarySkillName = "Cooking Lore";
        backupSkillName = "crafting";
        break;
      case "bosun":
        primarySkillName = "Leadership Lore";
        backupSkillName = "crafting";
        break;
      default:
        
    }

    // Fetch primary skill modifier
    const primarySkillItem = actor.items.find((i) => i.type === "lore" && i.name === primarySkillName);
    if (primarySkillItem) {
      return this._calculateSkillFromItem(actor, primarySkillItem, primarySkillItem.system.ability);
    }

    // Fetch backup skill modifier
    const backupSkillData = actor.system.skills[backupSkillName];
    if (backupSkillData) {
      return this._calculateCoreSkillBonus(actor, backupSkillData);
    }

    
    return "N/A";
  }

  _calculateSkillFromItem(actor, skillItem, abilityKey) {
    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    const proficiencyRank = skillItem.system.proficient?.value || 0;
    const level = actor.system.details.level.value || 0;

    let proficiencyBonus;
    switch (proficiencyRank) {
      case 0: proficiencyBonus = 0; break; // Untrained
      case 1: proficiencyBonus = 2; break; // Trained
      case 2: proficiencyBonus = 4; break; // Expert
      case 3: proficiencyBonus = 6; break; // Master
      case 4: proficiencyBonus = 8; break; // Legendary
      default: proficiencyBonus = 0;
    }

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    return totalSkillBonus;
  }

  _calculateCoreSkillBonus(actor, skillData) {
    if (!skillData) return 0;

    const abilityKey = skillData.ability || skillData.attribute;
    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    const proficiencyBonus = skillData.rank * 2; // Trained = +2, Expert = +4, etc.
    const level = actor.system.details.level.value || 0;

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    return totalSkillBonus;
  }

  async _performAidChecks() {
    const aidResults = [];
    const finalDC = this.baseDC + this._getWeatherModifier(this.weatherRoll);

    for (const [role, actorData] of Object.entries(this.passengerMembers)) {
        const actor = game.actors.get(actorData.actorId);
        if (actor) {
            const aidRole = this.element.find(`select[name='aid-${role}']`).val();

            if (!aidRole) {
                console.warn(`Aid role for ${actor.name} (${role}) is undefined. Skipping.`);
                continue;
            }

            // Get primary and backup skills for aid role
            const primaryAidSkill = this._getPrimarySkillForAidRole(aidRole);
            const backupAidSkill = this._getBackupSkillForAidRole(aidRole);

            // Try to find the primary skill first
            const primarySkillItem = actor.items.find((i) => i.type === "lore" && i.name === primaryAidSkill);
            const backupSkillData = actor.system.skills[backupAidSkill];

            let rollResult, aidDC, success;
            let skillBonus = 0;
            let usedSkill = "";

            if (primarySkillItem) {
                skillBonus = this._calculateSkillBonus(actor, aidRole); 
                aidDC = 15;
                usedSkill = primaryAidSkill;
            } else if (backupSkillData) {
                skillBonus = this._calculateCoreSkillBonus(actor, backupSkillData);
                aidDC = 20;
                usedSkill = backupAidSkill;
            } else {
                console.warn(`No appropriate skill found for aiding ${aidRole} with ${actor.name}.`);
                continue;
            }

            try {
                const roll = new Roll(`1d20 + ${skillBonus}`);
                await roll.evaluate({ async: true }); 
                rollResult = roll.total;
                success = rollResult >= aidDC;
            } catch (error) {
                console.error(`Error evaluating roll for aiding ${aidRole} with ${actor.name}:`, error);
                continue;
            }

            aidResults.push({
                actorName: actor.name,
                aidRole,
                rollResult,
                success,
                dc: aidDC,
                skillUsed: usedSkill,
                modifier: skillBonus
            });
        }
    }

    // Send roll results to the GM
    let aidResultsMessage = "<h2>Aid Check Results</h2><ul>";
    aidResults.forEach(result => {
        aidResultsMessage += `<li>${result.actorName} aided ${result.aidRole} using ${result.skillUsed} with a roll of ${result.rollResult} (Modifier: ${result.modifier}), against a DC of ${result.dc}. ${result.success ? "Success!" : "Failure."}</li>`;
    });
    aidResultsMessage += "</ul>";

    ChatMessage.create({
        content: aidResultsMessage,
        whisper: ChatMessage.getWhisperRecipients("GM"),
    });

    return aidResults;
}




async _performRoleRolls(aidResults) {
    const results = [];
    const finalDC = this.baseDC + this._getWeatherModifier(this.weatherRoll);
  
    for (const [role, actorData] of Object.entries(this.crewMembers)) {
        const actor = game.actors.get(actorData.actorId);
        if (actor) {
            const totalAidModifier = aidResults
                .filter((aid) => aid.aidRole === role)
                .reduce((sum, aid) => sum + this._getAidModifier(aid), 0);
  
            const skillBonus = this._calculateSkillBonus(actor, role);
            if (skillBonus === "N/A") {
                console.warn(`No valid skill found for role ${role} for actor ${actor.name}. Skipping.`);
                continue;
            }
  
            const totalSkillBonus = Math.round(skillBonus + totalAidModifier);
  
            let rollResult;
            try {
                const roll = new Roll(`1d20 + ${totalSkillBonus}`);
                await roll.evaluate();  // Asynchronous evaluation without the { async: true } parameter
                rollResult = roll.total;
            } catch (error) {
                console.error(`Error evaluating roll for role ${role} with ${actor.name}:`, error);
                continue;
            }
  
            const success = rollResult >= finalDC;
            const criticalSuccess = rollResult >= finalDC + 10;
            const criticalFailure = rollResult < finalDC - 10;
  
            let resultType = success ? "Success" : "Failure";
            if (criticalSuccess) resultType = "Critical Success";
            if (criticalFailure) resultType = "Critical Failure";
  
            results.push({
                role,
                actorName: actor.name,
                rollResult,
                success,
                criticalSuccess,
                criticalFailure,
                dc: finalDC,
                resultType,
                totalModifier: totalSkillBonus
            });
  
            console.log(`${actor.name} (${role}): Rolled ${rollResult} against DC ${finalDC} - ${resultType} with aid modifier: ${totalAidModifier}`);
        } else {
            console.warn(`Invalid actor data for role: ${role}.`);
        }
    }
  
    // Send the detailed roll results to the GM
    let roleResultsMessage = "<h2>Role Roll Results</h2><ul>";
    results.forEach(result => {
        roleResultsMessage += `<li>${result.actorName} performed the role of ${result.role} with a roll of ${result.rollResult} (Total Modifier: ${result.totalModifier}), against a DC of ${result.dc}. ${result.resultType}.</li>`;
    });
    roleResultsMessage += "</ul>";
  
    ChatMessage.create({
        content: roleResultsMessage,
        whisper: ChatMessage.getWhisperRecipients("GM"),
    });
  
    return results;
  }
  
  

  _getAidModifier(aid) {
      const { rollResult, dc } = aid;

      if (rollResult >= dc + 10) return 2; // Critical success
      if (rollResult >= dc) return 1; // Success
      if (rollResult < dc - 10) return -2; // Critical failure
      return -1; // Failure
  }

  activateListeners(html) {
    super.activateListeners(html);
    html.find("#generate-weather").click(this._onGenerateWeather.bind(this));
    html.find("#submit-setup").click(this._onSubmitTravel.bind(this));
    html.find("#calculation-mode").change(this._toggleCalculateMode.bind(this));
    html.find("#custom-days, #custom-hours").on("input", this._onCustomTravelTimeInput.bind(this));
  
    this._initializeCheckboxState(html);
    this._toggleCalculateMode({ target: { value: this.calculateByDistance ? "distance" : "time" } });
    
    // **Add event listeners for aid role dropdowns**
    this._addAidRoleDropdownListeners(html);
}
_addAidRoleDropdownListeners(html) {
    html.find(".passenger-aid-dropdown").each((index, dropdown) => {
        $(dropdown).change((event) => {
            const aidRole = $(event.currentTarget).val();
            const aidIndex = $(event.currentTarget).data('index');

            // Fetch the primary and backup skills based on the selected aid role
            const primarySkill = this._getPrimarySkillForAidRole(aidRole);
            const backupSkill = this._getBackupSkillForAidRole(aidRole);

            // Update the corresponding HTML elements to show primary and backup skills
            html.find(`#primary-skill-${aidIndex}`).text(primarySkill || 'None');
            html.find(`#backup-skill-${aidIndex}`).text(backupSkill || 'None');
        });
    });
}


  _initializeCheckboxState(html) {
      const nightTravelCheckbox = html.find("#night-travel");
      const travelTimeSelect = html.find("#travel-time");

      nightTravelCheckbox.prop("checked", false).prop("disabled", false);

      if (travelTimeSelect.val() === "24 hours" || travelTimeSelect.val() === "10 days") {
          nightTravelCheckbox.prop("checked", true).prop("disabled", true);
      }

      travelTimeSelect.change((event) => {
          const selectedTime = event.target.value;
          if (selectedTime === "24 hours" || selectedTime === "10 days") {
              nightTravelCheckbox.prop("checked", true).prop("disabled", true);
          } else {
              nightTravelCheckbox.prop("checked", false).prop("disabled", false);
          }
      });
  }

  _onCustomTravelTimeInput(event) {
      const customDays = parseInt(this.element.find("#custom-days").val()) || 0;
      const customHours = parseInt(this.element.find("#custom-hours").val()) || 0;

      if (customDays > 0 || customHours > 0) {
          this.element.find("#travel-time").prop("disabled", true);
      } else {
          this.element.find("#travel-time").prop("disabled", false);
      }
  }

  async _onGenerateWeather(event) {
    event.preventDefault();

    const roll = new Roll("1d20");

    try {
        // Perform the roll asynchronously
        await roll.evaluate({ async: true });
        this.weatherRoll = roll.total;
        this.weatherDescription = this._getWeatherDescription(roll.total);
    } catch (error) {
        console.error(`Error generating weather roll:`, error);
    }

    // Update the HTML elements with the new weather information
    this.element.find("#weather-result").text(`${this.weatherRoll}`);
    this.element.find("#weather-description").text(this.weatherDescription);

    const weatherModifier = this._getWeatherModifier(this.weatherRoll);
    const finalDC = this.baseDC + weatherModifier;
    this.element.find("#final-dc").text(finalDC);
  }

  _getWeatherModifier(roll) {
      if (roll === null) return 0;

      if (roll <= 1) return +10;
      if (roll <= 4) return +5;
      if (roll <= 9) return +2;
      if (roll === 10 || roll === 11) return 0;
      if (roll <= 16) return -2;
      if (roll <= 19) return -5;
      if (roll === 20) return -10;

      return 0;
  }

  _calculateAdjustedSpeedForTime(roleResults, aidResults) {
      const totalModifier = roleResults.reduce((sum, result) => {
          if (result.criticalSuccess) return sum + 0.4;
          if (result.success) return sum + 0.2;
          if (result.criticalFailure) return sum -0.4;
          return sum - 0.2;
      }, 0);

      const adjustedSpeed = Math.max(this.baseSpeedKnots + totalModifier, 0);

      console.log(`Base Speed: ${this.baseSpeedKnots} knots`);
      console.log(`Total Modifier: ${totalModifier}`);
      console.log(`Adjusted Speed for Time: ${adjustedSpeed} knots`);

      return adjustedSpeed;
  }

  _getWeatherDescription(roll) {
      if (roll <= 1) return "No wind, perfectly calm - no movement.";
      if (roll <= 4) return "Very poor weather - significant obstacles to progress.";
      if (roll <= 9) return "Poor weather - moderate difficulty in navigation.";
      if (roll === 10 || roll === 11) return "Neutral weather - no significant impact.";
      if (roll <= 16) return "Good weather - favorable conditions for travel.";
      if (roll <= 19) return "Very good weather - greatly assists in progress.";
      if (roll === 20) return "Perfect weather - optimal conditions for maximum speed!";
      return "Unexpected weather condition.";
  }

  async _onSubmitTravel(event) {
      event.preventDefault();

      const aidResults = await this._performAidChecks();
      console.log("Passenger Aid Results:", aidResults);

      const roleResults = await this._performRoleRolls(aidResults);
      console.log("Travel Roll Results:", roleResults);

      const adjustedSpeed = this._calculateAndLogSpeed(roleResults, aidResults);

      if (this.calculateByDistance) {
          const distance = parseFloat(this.element.find("#travel-distance").val());
          if (isNaN(distance) || distance <= 0) {
              console.error("Invalid distance input.");
              ui.notifications.error("Invalid distance input.");
              return;
          }

          const totalTime = distance / adjustedSpeed;
          const days = Math.floor(totalTime / 24);
          const hours = Math.floor(totalTime % 24);

          this._sendDistanceTravelMessage(roleResults, aidResults, adjustedSpeed, distance, days, hours);
      } else {
        const travelTime = this._getCustomOrSelectedTime() || 1;  // Default to 1 hour if not set

        if (travelTime <= 0) {
            console.error("Travel time is zero or invalid. Cannot calculate distance.");
            ui.notifications.error("Travel time is zero or invalid. Cannot calculate distance.");
            return;
        }
        
        

          const totalDistance = this._calculateDistance(adjustedSpeed, travelTime, this.element.find("#night-travel").is(":checked"));
          this._sendTimeTravelMessage(roleResults, aidResults, adjustedSpeed, totalDistance, travelTime);
      }
  }

  _calculateAndLogSpeed(roleResults, aidResults) {
      const totalModifier = roleResults.reduce((sum, result) => {
          if (result.criticalSuccess) return sum + 0.4;
          if (result.success) return sum + 0.2;
          if (result.criticalFailure) return sum - 0.4;
          return sum - 0.2;
      }, 0);

      const adjustedSpeed = Math.max(this.baseSpeedKnots + totalModifier, 0);

      console.log(`Base Speed: ${this.baseSpeedKnots} knots`);
      console.log(`Total Modifier: ${totalModifier}`);
      console.log(`Adjusted Speed: ${adjustedSpeed} knots`);

      return adjustedSpeed;
  }

  _calculateDistanceForTime(adjustedSpeed, travelTime) {
      const nightTravel = this.element.find("#night-travel").is(":checked");

      let speedReduction = 0;
      if (nightTravel) {
          const nightHours = Math.floor(travelTime / 24) * 8;
          speedReduction = 2 * nightHours;
      }

      const effectiveSpeed = Math.max(adjustedSpeed - (speedReduction / travelTime), 0);

      const totalDistance = effectiveSpeed * travelTime;
      console.log(`Effective Speed: ${effectiveSpeed}, Total Distance: ${totalDistance}`);
      return totalDistance;
  }

  _calculateDistance(adjustedSpeed, totalTime, nightTravel) {
      let speedReduction = 0;

      if (nightTravel) {
          const nightHours = Math.floor(totalTime / 24) * 8;
          speedReduction = (2 * nightHours) / totalTime;
      }

      const effectiveSpeed = Math.max(adjustedSpeed - speedReduction, 0);

      const totalDistance = effectiveSpeed * totalTime;
      console.log(`Effective Speed: ${effectiveSpeed}, Total Distance: ${totalDistance}`);

      return totalDistance;
  }

  _getCustomOrSelectedTime() {
      const customDays = parseInt(this.element.find("#custom-days").val()) || 0;
      const customHours = parseInt(this.element.find("#custom-hours").val()) || 0;
      const totalCustomHours = (customDays * 24) + customHours;

      if (totalCustomHours > 0) {
          console.log(`Custom Time Selected: ${totalCustomHours} hours`);
          return totalCustomHours;
      }

      const travelTime = this.element.find("#travel-time").val();
      let timeInHours = 0;

      switch (travelTime) {
          case "1 hour":
              timeInHours = 1;
              break;
          case "12 hours":
              timeInHours = 12;
              break;
          case "24 hours":
              timeInHours = 24;
              break;
          case "10 days":
              timeInHours = 240;
              break;
          default:
              
      }

      console.log(`Dropdown Time Selected: ${timeInHours} hours`);
   
      return timeInHours;
  }

  _populateCrewRoles(crewData) {
    const container = this.element.find("#crew-roles-container");
    container.empty(); // Clear existing content
    for (const data of crewData) {
      const select = $(`<select name="role-${data.role}"><option value="">Select Role</option></select>`);
      select.append(`<option value="${data.primarySkill}">${data.primarySkill}</option>`);
      select.append(`<option value="${data.backupSkill}">${data.backupSkill}</option>`);
      container.append(`<label>${data.role} (${data.actorName})</label>`);
      container.append(select);
    }
  }
  _populatePassengerRoles(passengerData) {
    const container = this.element.find("#passenger-roles-container");
    container.empty(); // Clear existing content
    for (const data of passengerData) {
      const select = $(`<select name="aid-${data.role}"><option value="">Select Aid Role</option></select>`);
      select.append(`<option value="navigator">Navigator</option>`);
      select.append(`<option value="helmsman">Helmsman</option>`);
      select.append(`<option value="firstMate">First Mate</option>`);
      select.append(`<option value="cook">Cook</option>`);
      select.append(`<option value="bosun">Bosun</option>`);
      select.append(`<option value="captain">Captain</option>`);
      container.append(`<label>${data.role} (${data.actorName})</label>`);
      container.append(select);
    }
  }
  

  _calculateTilesTraveled(totalDistance) {
      const scale = game.settings.get("ocean-travel", "scale") || 1;
      const distanceInMiles = totalDistance * 1.15078;
      const tilesTraveled = Math.round(distanceInMiles / scale);
      console.log(`Tiles Traveled: ${tilesTraveled}`);
      return tilesTraveled;
  }

  _sendDistanceTravelMessage(roleResults, aidResults, adjustedSpeed, distance, days, hours) {
    let message = `<p>The journey begins under ${this.weatherDescription.toLowerCase()}.</p>`;

    // Initialize counts for successes and failures
    let successCount = 0;
    let failureCount = 0;

    roleResults.forEach((result) => {
        switch (result.role) {
            case "navigator":
                message += `<p>The navigator ${result.resultType === "Critical Success" ?
                    "skillfully plotted the course with remarkable insight, navigating through even the most challenging waters with ease." :
                    result.resultType === "Success" ?
                        "determined the best route with confidence, ensuring the journey stayed on track." :
                        result.resultType === "Failure" ?
                            "struggled to find the optimal path, causing some delays and uncertainties." :
                            "was completely lost, unable to provide a clear direction, leading to confusion and setbacks."}</p>`;
                break;
            case "helmsman":
                message += `<p>The helmsman ${result.resultType === "Critical Success" ?
                    "steered the ship with exceptional control and precision, making sharp maneuvers seem effortless." :
                    result.resultType === "Success" ?
                        "navigated the ship steadily, handling the helm with competence." :
                        result.resultType === "Failure" ?
                            "faced challenges in steering, leading to some rough handling of the vessel." :
                            "lost control of the ship multiple times, causing dangerous sways and close calls."}</p>`;
                break;
            case "firstMate":
                message += `<p>The first mate ${result.resultType === "Critical Success" ?
                    "coordinated the crew with excellent leadership, boosting morale and efficiency." :
                    result.resultType === "Success" ?
                        "supported the captain and crew effectively, ensuring smooth operations." :
                        result.resultType === "Failure" ?
                            "struggled to maintain order among the crew, causing minor disruptions." :
                            "caused discord among the crew, leading to chaos and confusion on deck."}</p>`;
                break;
            case "cook":
                message += `<p>The cook ${result.resultType === "Critical Success" ?
                    "provided delicious and invigorating meals that kept the crew's spirits high." :
                    result.resultType === "Success" ?
                        "kept the crew well-fed with hearty meals that sustained their energy." :
                        result.resultType === "Failure" ?
                            "served meals that were barely adequate, affecting the crew's morale." :
                            "prepared spoiled food that led to several crew members falling ill."}</p>`;
                break;
            case "bosun":
                message += `<p>The bosun ${result.resultType === "Critical Success" ?
                    "maintained the ship in pristine condition, ensuring everything was in perfect working order." :
                    result.resultType === "Success" ?
                        "kept the ship in good repair, handling necessary maintenance tasks efficiently." :
                        result.resultType === "Failure" ?
                            "struggled to keep up with maintenance, leading to minor issues on board." :
                            "neglected crucial repairs, resulting in significant damage to the ship."}</p>`;
                break;
            case "captain":
                message += `<p>The captain ${result.resultType === "Critical Success" ?
                    "led the crew with unmatched authority and strategic skill, making the right decisions at every turn." :
                    result.resultType === "Success" ?
                        "maintained a steady course with adept decision-making, guiding the crew effectively." :
                        result.resultType === "Failure" ?
                            "found it difficult to command effectively, causing moments of uncertainty." :
                            "panicked under pressure, making poor decisions that affected the journey's success."}</p>`;
                break;
        }

        // Tally successes and failures
        if (result.resultType === "Success" || result.resultType === "Critical Success") {
            successCount++;
        } else if (result.resultType === "Failure" || result.resultType === "Critical Failure") {
            failureCount++;
        }
    });

    // Adjust the thresholds for success and failure counts
    const summaryMessages = [
        "The crew operated flawlessly, showcasing their exceptional skills and synergy in every task.",
        "The journey was marked by numerous successes, with the crew overcoming most challenges with ease.",
        "Overall, the crew performed well, handling most situations competently.",
        "The journey, marked by moments of skillful navigation and some challenges, showcased the crew's ability to adapt and persevere.",
        "The crew struggled with many tasks, facing significant difficulties that affected their performance.",
        "The journey was fraught with failures and challenges, reflecting the crew's lack of coordination and preparation."
    ];

    // Determine which summary message to use based on the counts
    let summaryMessage;
    if (successCount === 6) {
        summaryMessage = summaryMessages[0]; // All successes
    } else if (successCount >= 4) {
        summaryMessage = summaryMessages[1]; // Majority successes
    } else if (successCount >= 2) {
        summaryMessage = summaryMessages[2]; // Some successes, some failures
    } else if (failureCount === 6) {
        summaryMessage = summaryMessages[5]; // All failures
    } else if (failureCount >= 4) {
        summaryMessage = summaryMessages[4]; // Majority failures
    } else {
        summaryMessage = summaryMessages[3]; // Mixed results
    }

    message += `<p>${summaryMessage}</p>`;

    const successfulAids = aidResults.filter(aid => aid.success).length;
    message += `<p>The passengers ${successfulAids > 0 ?
        `offered their assistance with ${successfulAids} successful attempts, providing some support in the tasks at hand.` :
        "tried to assist where they could, but their efforts often went unnoticed due to lack of experience."}</p>`;

    message += `<p>The journey covers a distance of ${distance.toFixed(2)} nautical miles, taking approximately ${Math.floor(days)} days and ${Math.floor(hours)} hours with an adjusted speed of ${adjustedSpeed.toFixed(2)} knots.</p>`;

    console.log("Distance-based travel message content:", message);
    console.log("Calculated Distance:", distance);
    console.log("Calculated Time (Days):", days);
    console.log("Calculated Time (Hours):", hours);
    console.log("Adjusted Speed:", adjustedSpeed);

    ChatMessage.create({ content: message });
}


_sendTimeTravelMessage(roleResults, aidResults, adjustedSpeed, totalDistance, travelTime) {
  let message = `<p>The journey begins under ${this.weatherDescription.toLowerCase()}.</p>`;

  // Initialize counts for successes and failures
  let successCount = 0;
  let failureCount = 0;

  roleResults.forEach((result) => {
      switch (result.role) {
          case "navigator":
              message += `<p>The navigator ${result.resultType === "Critical Success" ?
                  "skillfully plotted the course with remarkable insight, navigating through even the most challenging waters with ease." :
                  result.resultType === "Success" ?
                      "determined the best route with confidence, ensuring the journey stayed on track." :
                      result.resultType === "Failure" ?
                          "struggled to find the optimal path, causing some delays and uncertainties." :
                          "was completely lost, unable to provide a clear direction, leading to confusion and setbacks."}</p>`;
              break;
          case "helmsman":
              message += `<p>The helmsman ${result.resultType === "Critical Success" ?
                  "steered the ship with exceptional control and precision, making sharp maneuvers seem effortless." :
                  result.resultType === "Success" ?
                      "navigated the ship steadily, handling the helm with competence." :
                      result.resultType === "Failure" ?
                          "faced challenges in steering, leading to some rough handling of the vessel." :
                          "lost control of the ship multiple times, causing dangerous sways and close calls."}</p>`;
              break;
          case "firstMate":
              message += `<p>The first mate ${result.resultType === "Critical Success" ?
                  "coordinated the crew with excellent leadership, boosting morale and efficiency." :
                  result.resultType === "Success" ?
                      "supported the captain and crew effectively, ensuring smooth operations." :
                      result.resultType === "Failure" ?
                          "struggled to maintain order among the crew, causing minor disruptions." :
                          "caused discord among the crew, leading to chaos and confusion on deck."}</p>`;
              break;
          case "cook":
              message += `<p>The cook ${result.resultType === "Critical Success" ?
                  "provided delicious and invigorating meals that kept the crew's spirits high." :
                  result.resultType === "Success" ?
                      "kept the crew well-fed with hearty meals that sustained their energy." :
                      result.resultType === "Failure" ?
                          "served meals that were barely adequate, affecting the crew's morale." :
                          "prepared spoiled food that led to several crew members falling ill."}</p>`;
              break;
          case "bosun":
              message += `<p>The bosun ${result.resultType === "Critical Success" ?
                  "maintained the ship in pristine condition, ensuring everything was in perfect working order." :
                  result.resultType === "Success" ?
                      "kept the ship in good repair, handling necessary maintenance tasks efficiently." :
                      result.resultType === "Failure" ?
                          "struggled to keep up with maintenance, leading to minor issues on board." :
                          "neglected crucial repairs, resulting in significant damage to the ship."}</p>`;
              break;
          case "captain":
              message += `<p>The captain ${result.resultType === "Critical Success" ?
                  "led the crew with unmatched authority and strategic skill, making the right decisions at every turn." :
                  result.resultType === "Success" ?
                      "maintained a steady course with adept decision-making, guiding the crew effectively." :
                      result.resultType === "Failure" ?
                          "found it difficult to command effectively, causing moments of uncertainty." :
                          "panicked under pressure, making poor decisions that affected the journey's success."}</p>`;
              break;
      }

      // Tally successes and failures
      if (result.resultType === "Success" || result.resultType === "Critical Success") {
          successCount++;
      } else if (result.resultType === "Failure" || result.resultType === "Critical Failure") {
          failureCount++;
      }
  });

  // Adjust the thresholds for success and failure counts
  const summaryMessages = [
      "The crew operated flawlessly, showcasing their exceptional skills and synergy in every task.",
      "The journey was marked by numerous successes, with the crew overcoming most challenges with ease.",
      "Overall, the crew performed well, handling most situations competently.",
      "The journey, marked by moments of skillful navigation and some challenges, showcased the crew's ability to adapt and persevere.",
      "The crew struggled with many tasks, facing significant difficulties that affected their performance.",
      "The journey was fraught with failures and challenges, reflecting the crew's lack of coordination and preparation."
  ];

  // Determine which summary message to use based on the counts
  let summaryMessage;
  if (successCount === 6) {
      summaryMessage = summaryMessages[0]; // All successes
  } else if (successCount >= 4) {
      summaryMessage = summaryMessages[1]; // Majority successes
  } else if (successCount >= 2) {
      summaryMessage = summaryMessages[2]; // Some successes, some failures
  } else if (failureCount === 6) {
      summaryMessage = summaryMessages[5]; // All failures
  } else if (failureCount >= 4) {
      summaryMessage = summaryMessages[4]; // Majority failures
  } else {
      summaryMessage = summaryMessages[3]; // Mixed results
  }

  message += `<p>${summaryMessage}</p>`;

  const successfulAids = aidResults.filter(aid => aid.success).length;
  message += `<p>The passengers ${successfulAids > 0 ?
      `offered their assistance with ${successfulAids} successful attempts, providing some support in the tasks at hand.` :
      "tried to assist where they could, but their efforts often went unnoticed due to lack of experience."}</p>`;

  const distanceInMiles = totalDistance * 1.15078;
  const tilesTraveled = Math.round(distanceInMiles / (game.settings.get("ocean-travel", "scale") || 1));

  message += `<p>The ship traveled ${totalDistance.toFixed(2)} nautical miles (${distanceInMiles.toFixed(2)} miles), 
    covering approximately ${tilesTraveled} tiles on the map. The journey, marked by moments of skillful navigation and some challenges, showcased the crew's ability to adapt and persevere.</p>`;

  console.log("Time-based travel message content:", message);
  console.log("Calculated Distance:", totalDistance);
  console.log("Calculated Time:", travelTime);
  console.log("Adjusted Speed:", adjustedSpeed);

  ChatMessage.create({ content: message });
}


  _getPrimarySkillForRole(role) {
      switch (role) {
          case "navigator": return "Sailing Lore";
          case "helmsman": return "Sailing Lore";
          case "firstMate": return "Leadership Lore";
          case "cook": return "Cooking Lore";
          case "bosun": return "Leadership Lore";
          case "captain": return "Captain Lore";
          default: return "";
      }
  }

  _getBackupSkillForRole(role) {
      switch (role) {
          case "navigator": return "survival";
          case "helmsman": return "diplomacy";
          case "firstMate": return "intimidation";
          case "cook": return "crafting";
          case "bosun": return "crafting";
          case "captain": return "diplomacy";
          default: return "";
      }
  }

  _getPrimarySkillForAidRole(aidRole) {
      switch (aidRole) {
          case "navigator": return "Sailing Lore";
          case "helmsman": return "Sailing Lore";
          case "firstMate": return "Leadership Lore";
          case "cook": return "Cooking Lore";
          case "bosun": return "Leadership Lore";
          case "captain": return "Captain Lore";
          default: return "";
      }
  }

  _getBackupSkillForAidRole(aidRole) {
      switch (aidRole) {
          case "navigator": return "survival";
          case "helmsman": return "diplomacy";
          case "firstMate": return "intimidation";
          case "cook": return "crafting";
          case "bosun": return "crafting";
          case "captain": return "diplomacy";
          default: return "";
      }
  }

  _calculateCoreSkillBonus(actor, skillData) {
    if (!skillData) return 0;

    const abilityKey = skillData.ability || skillData.attribute; // Check the ability attribute
    console.log(`Calculating skill bonus for ${skillData}, ability: ${abilityKey}`); // Debugging line

    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    console.log(`Ability Modifier for ${abilityKey}: ${abilityModifier}`); // Debugging line

    const proficiencyBonus = skillData.rank * 2; // Trained = +2, Expert = +4, etc.
    const level = actor.system.details.level.value || 0;

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    return totalSkillBonus;
}


_collectPassengerData() {
    const passengerData = [];
  
    for (const [role, actorData] of Object.entries(this.passengerMembers)) {
      const actor = game.actors.get(actorData.actorId);
      if (actor) {
        const aidRole = this.element.find(`select[name='aid-${role}']`).val();
        const primarySkill = this._getPrimarySkillForRole(aidRole);
        const backupSkill = this._getBackupSkillForRole(aidRole);
  
        // Fetch the skill modifiers
        const primarySkillModifier = this._calculateSkillBonus(actor, primarySkill);
        const backupSkillModifier = this._calculateSkillBonus(actor, backupSkill);
  
        passengerData.push({
          role,
          actorName: actor.name,
          primarySkill: primarySkill ? primarySkill : "N/A",
          primarySkillBonus: primarySkillModifier !== "N/A" ? primarySkillModifier : 0,
          backupSkill: backupSkill ? backupSkill : "N/A",
          backupSkillBonus: backupSkillModifier !== "N/A" ? backupSkillModifier : 0
        });
  
    }
    }
  
    return passengerData;
  }

  _calculateSkillBonus(actor, role) {
    let primarySkillName, primaryAbilityKey;
    let backupSkillName;

    // Define primary and backup skills based on the role
    switch (role) {
        case "captain":
            primarySkillName = "Captain Lore";
            primaryAbilityKey = "cha";
            backupSkillName = "diplomacy";
            break;
        case "navigator":
            primarySkillName = "Sailing Lore";
            primaryAbilityKey = "wis";
            backupSkillName = "survival";
            break;
        case "helmsman":
            primarySkillName = "Sailing Lore";
            primaryAbilityKey = "str";
            backupSkillName = "diplomacy";
            break;
        case "firstMate":
            primarySkillName = "Leadership Lore";
            primaryAbilityKey = "cha";
            backupSkillName = "intimidation";
            break;
        case "cook":
            primarySkillName = "Cooking Lore";
            primaryAbilityKey = "int";
            backupSkillName = "crafting";
            break;
        case "bosun":
            primarySkillName = "Leadership Lore";
            primaryAbilityKey = "str";
            backupSkillName = "crafting";
            break;
        default:
            console.warn(`Role ${role} does not have defined skills.`);
            return "N/A";
    }

    // Check if the primary skill exists and calculate the skill bonus
    const primarySkillItem = actor.items.find((i) => i.type === "lore" && i.name === primarySkillName);
    if (primarySkillItem) {
        return this._calculateSkillFromItem(actor, primarySkillItem, primaryAbilityKey);
    }

    // If primary skill is not found, try to calculate using the backup skill
    const backupSkillData = actor.system.skills[backupSkillName];
    if (backupSkillData) {
        return this._calculateCoreSkillBonus(actor, backupSkillData);
    }

    console.warn(`Neither primary skill ${primarySkillName} nor backup skill ${backupSkillName} found for ${actor.name}.`);
    return "N/A";
}

_calculateSkillFromItem(actor, skillItem, abilityKey) {
    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    const proficiencyRank = skillItem.system.proficient?.value || 0;
    const level = actor.system.details.level.value || 0;

    let proficiencyBonus;
    switch (proficiencyRank) {
        case 0: proficiencyBonus = 0; break; // Untrained
        case 1: proficiencyBonus = 2; break; // Trained
        case 2: proficiencyBonus = 4; break; // Expert
        case 3: proficiencyBonus = 6; break; // Master
        case 4: proficiencyBonus = 8; break; // Legendary
        default: proficiencyBonus = 0;
    }

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    console.log(`Calculated Skill Bonus for ${skillItem.name} (${actor.name}): ${totalSkillBonus}`);
    return totalSkillBonus;
}

_calculateCoreSkillBonus(actor, skillData) {
    if (!skillData) return 0;

    const abilityKey = skillData.ability || skillData.attribute; // Ensure this field is correct
    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    const proficiencyBonus = skillData.rank * 2; // Trained = +2, Expert = +4, etc.
    const level = actor.system.details.level.value || 0;

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    console.log(`Core Skill Bonus Calculation: Ability Modifier (${abilityModifier}) + Proficiency Bonus (${proficiencyBonus}) + Level (${level}) = Total Skill Bonus (${totalSkillBonus})`);
    return totalSkillBonus;
}


_calculateCoreSkillBonus(actor, skillData) {
    if (!skillData) return 0;

    const abilityKey = skillData.ability || skillData.attribute; // Ensure this field is correct
    const abilityModifier = actor.system.abilities[abilityKey]?.mod || 0;
    const proficiencyBonus = skillData.rank * 2; // Trained = +2, Expert = +4, etc.
    const level = actor.system.details.level.value || 0;

    const totalSkillBonus = abilityModifier + proficiencyBonus + level;
    console.log(`Core Skill Bonus Calculation: Ability Modifier (${abilityModifier}) + Proficiency Bonus (${proficiencyBonus}) + Level (${level}) = Total Skill Bonus (${totalSkillBonus})`);
    return totalSkillBonus;
}



  

}

Hooks.once("init", function () {
    game.settings.registerMenu("ocean-travel", "gmTravelSetup", {
      name: "GM Travel Setup",
      label: "Start Travel",
      icon: "fas fa-ship",
      type: GmTravelSetup,
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
  
    game.settings.register("ocean-travel", "speedKnots", {
      name: "Boat Speed in Knots",
      scope: "world",
      config: false,
      type: Number,
      default: 4
    });
  
    game.settings.register("ocean-travel", "scale", {
      name: "Scale",
      scope: "world",
      config: false,
      type: Number,
      default: 1
    });
  });
