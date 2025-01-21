let lastMessageData = {};
// Global map to store build notifications keyed by their ID.
let buildNotificationsMap = {};

// Renders the build notifications quadrant:
function renderBuildNotifications() {
  const container = document.getElementById("build-notifications-subscription");
  container.innerHTML = "";

  // We keyed our map by buildId
  Object.keys(buildNotificationsMap).forEach((buildId) => {
    const msg = buildNotificationsMap[buildId];

    // Grab status from attributes
    const status = msg.attributes?.status || "Unknown";

    // Attempt to parse the JSON in msg.data (it has `substitutions.TRIGGER_NAME`)
    let parsedData;
    let triggerName = "Unknown Trigger";

    try {
      parsedData = JSON.parse(msg.data);
      // If it’s found, override our default "Unknown Trigger"
      if (parsedData?.substitutions?.TRIGGER_NAME) {
        triggerName = parsedData.substitutions.TRIGGER_NAME;
      }
    } catch (err) {
      // If parsing fails, leave triggerName as "Unknown Trigger"
    }

    // Create row
    const row = document.createElement("div");
    row.classList.add("message", "build-notification-row");
    row.textContent = `Build ID: ${buildId} | Status: ${status} | Trigger: ${triggerName}`;

    // On click, open JSON in a popup
    row.addEventListener("click", () => {
      const popupWindow = window.open("", "JSONPopup", "width=600,height=400,scrollbars=yes");
      popupWindow.document.write(
        `<pre style="font-family: monospace; white-space: pre;">${JSON.stringify(msg, null, 2)}</pre>`
      );
      popupWindow.document.close();
    });

    container.appendChild(row);
  });
}




// Main function to fetch messages and update the UI
function updateMessages() {
  fetch("/messages")
    .then((response) => response.json())
    .then((data) => {
      // -------------------------------------
      // 1) BUILD NOTIFICATIONS
      // -------------------------------------
      const buildMessages = data["build-notifications-subscription"] || [];
      buildMessages.forEach((msg) => {
        const buildId = msg.attributes.buildId;
        if (buildId) {
          buildNotificationsMap[buildId] = msg;
        }
      });
      renderBuildNotifications();

      // -------------------------------------
      // 2) DEPLOY COMMANDS 
      // -------------------------------------
      const deployCommands = data["deploy-commands-subscription"] || [];
      const deployCommandsContainer = document.getElementById("deploy-commands-subscription");

      if (
        !lastMessageData["deploy-commands-subscription"] ||
        lastMessageData["deploy-commands-subscription"].length !== deployCommands.length
      ) {
        deployCommandsContainer.innerHTML = "";
        deployCommands.forEach((msg) => {
          let command = "Unknown command";
          try {
            const parsed = JSON.parse(msg.data);
            if (parsed?.command) {
              command = parsed.command;
            }
          } catch (err) {
            // If parsing fails, leave command as unknown
          }

          const row = document.createElement("div");
          // Reuse the same styling (or make a custom class if you prefer)
          row.classList.add("message", "build-notification-row");

          row.textContent = `ID: ${msg.id} | Command: ${command}`;

          row.addEventListener("click", () => {
            const popupWindow = window.open("", "JSONPopup", "width=600,height=400,scrollbars=yes");
            popupWindow.document.write(
              `<pre style="font-family: monospace; white-space: pre;">${JSON.stringify(msg, null, 2)}</pre>`
            );
            popupWindow.document.close();
          });

          deployCommandsContainer.appendChild(row);
        });
      }

      // -------------------------------------
      // 3) CLOUD DEPLOY OPERATIONS 
      // -------------------------------------
      const operationsMessages = data["clouddeploy-operations-subscription"] || [];
      const operationsContainer = document.getElementById("clouddeploy-operations-subscription");

      if (
        !lastMessageData["clouddeploy-operations-subscription"] ||
        lastMessageData["clouddeploy-operations-subscription"].length !== operationsMessages.length
      ) {
        operationsContainer.innerHTML = "";

        operationsMessages.forEach((msg) => {
          // Pull the needed info out of msg.attributes
          const releaseId = msg.attributes?.ReleaseId || "Unknown Release ID";
          const action = msg.attributes?.Action || "Unknown Action";
          const pipelineId = msg.attributes?.DeliveryPipelineId || "Unknown Pipeline";

          const row = document.createElement("div");
          // Same styling, or define a separate .clouddeploy-operations-row if you prefer
          row.classList.add("message", "build-notification-row");

          row.textContent = `Release: ${releaseId} | Action: ${action} | Pipeline: ${pipelineId}`;

          // Click opens a popup with the complete JSON
          row.addEventListener("click", () => {
            const popupWindow = window.open("", "JSONPopup", "width=600,height=400,scrollbars=yes");
            popupWindow.document.write(
              `<pre style="font-family: monospace; white-space: pre;">${JSON.stringify(msg, null, 2)}</pre>`
            );
            popupWindow.document.close();
          });

          operationsContainer.appendChild(row);
        });
      }

      // -------------------------------------
      // CLOUD DEPLOY APPROVALS
      // -------------------------------------
      const approvalsMessages = data["clouddeploy-approvals-subscription"] || [];
      const approvalsContainer = document.getElementById("clouddeploy-approvals-subscription");

      if (
        !lastMessageData["clouddeploy-approvals-subscription"] ||
        lastMessageData["clouddeploy-approvals-subscription"].length !== approvalsMessages.length
      ) {
        approvalsContainer.innerHTML = "";

        approvalsMessages.forEach((msg) => {
          const { attributes } = msg;

          const rolloutId = attributes?.RolloutId || "Unknown Rollout";
          const releaseId = attributes?.ReleaseId || "Unknown Release";
          const pipelineId = attributes?.DeliveryPipelineId || "Unknown Pipeline";
          const action = attributes?.Action || "Unknown Action";

          const row = document.createElement("div");
          row.classList.add("message", "build-notification-row");
          row.textContent = `Rollout: ${rolloutId} | Release: ${releaseId} | Pipeline: ${pipelineId} | Action: ${action}`;

          // Click -> Open popup with full JSON
          row.addEventListener("click", () => {
            const popupWindow = window.open("", "JSONPopup", "width=600,height=400,scrollbars=yes");
            popupWindow.document.write(
              `<pre style="font-family: monospace; white-space: pre;">${JSON.stringify(msg, null, 2)}</pre>`
            );
            popupWindow.document.close();
          });

          // Show "Approve" button only if Action is "Required" AND manualApproval is missing
          if (action === "Required" && !("manualApproval" in attributes)) {
            const approveBtn = document.createElement("button");
            approveBtn.textContent = "Approve";
            approveBtn.style.marginLeft = "10px";

            approveBtn.addEventListener("click", (event) => {
              // Prevent the row click from firing
              event.stopPropagation();

              // Create a copy of the original message and update manualApproval
              const updatedMsg = JSON.parse(JSON.stringify(msg));
              updatedMsg.attributes.manualApproval = "true";

              // Log the updated message to verify in the console
              console.log("Approving, sending updated message:", updatedMsg);

              // Convert to string and send
              sendMessage(JSON.stringify(updatedMsg));
            });

            row.appendChild(approveBtn);
          }

          approvalsContainer.appendChild(row);
        });
      }
    })
  }



function clearMessages() {
  fetch("/clear-messages", { method: "POST" })
    .then((response) => {
      if (response.ok) {
        lastMessageData = {};
        // Also clear our global map for build notifications
        buildNotificationsMap = {};
        updateMessages();
      }
    })
    .catch((error) => console.error("Error clearing messages:", error));
}

// Modified to accept an optional parameter: sendMessage(jsonString)
function sendMessage(optionalMessage) {
  // If `optionalMessage` was provided, use it. Otherwise, read from textarea.
  let message;
  if (optionalMessage) {
    message = optionalMessage.trim().replace(/\n/g, "");
  } else {
    const messageInput = document.getElementById("message-input");
    message = messageInput.value.trim().replace(/\n/g, "");
  }

  console.log("Sending message:", message); // Log to confirm

  fetch("/send-message", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: message,
  })
    .then((response) => {
      if (response.ok) {
        // If we’re sending a custom message, we might not want to reset the textarea
        const messageInput = document.getElementById("message-input");
        if (messageInput) {
          messageInput.value = "";
        }
        updateMessages();
      } else {
        console.error("Failed to send message");
      }
    })
    .catch((error) => console.error("Error:", error));
}

// Auto-refresh
setInterval(updateMessages, 3000);
