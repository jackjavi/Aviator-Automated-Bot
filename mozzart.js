import puppeteer from "puppeteer";
import fs from "fs";
import connectDatabase from "./utils/database.js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MOZZARTURL;
const username = process.env.MOZZARTUSERNAME;
const password = process.env.MOZZARTPASSWORD;

connectDatabase();

let currentBetIndex = 0;
let cashoutTriggered = false;
let betsData = [];

// Load bets data into memory
function loadBets() {
  try {
    const data = fs.readFileSync("bets.json", "utf8");
    betsData = JSON.parse(data);
    console.log("Bets data loaded into memory.");
  } catch (error) {
    console.error("Error loading bets data:", error.message);
    process.exit(1); // Exit if file can't be loaded
  }
}

// Helper to get the next bet
async function getNextBet() {
  if (cashoutTriggered) {
    // Reset to the first item if cashout has been triggered
    cashoutTriggered = false;
    currentBetIndex = 0;
    console.log("Resetting to the first bet due to cashout.");
  }

  if (currentBetIndex >= betsData.length) {
    // Loop back to the start if the end is reached
    currentBetIndex = 0;
    console.log("Reached the end of bets, looping back to the start.");
  }

  const betToProcess = betsData[currentBetIndex];
  currentBetIndex++;
  return betToProcess;
}

// Function to handle cashout trigger
function onCashout() {
  cashoutTriggered = true;
}

// Helper function to wait for a specified duration
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Increase the navigation timeout to 60 seconds (60000 ms)
  page.setDefaultNavigationTimeout(60000000);

  await page.goto(url);

  // Load the bets data into memory once
  loadBets();

  // Click "Cancel" on the notification popup
  try {
    await page.waitForSelector("#onesignal-slidedown-cancel-button", {
      timeout: 5000,
    });
    await page.click("#onesignal-slidedown-cancel-button");
    console.log("Cancelled the notification prompt.");
  } catch (error) {
    console.log("Notification prompt not found or already dismissed.");
  }

  // Reload the page
  await page.reload({ waitUntil: "networkidle2" });
  console.log("Page reloaded successfully.");

  // Click the Aviator game link before login
  // Wait for the broader container to appear
  try {
    // Ensure the parent container is loaded
    await page.waitForSelector("div.horizontal-holder.dark.vb", {
      timeout: 10000,
    });

    // Adding a delay to ensure the element fully loads
    await delay(2000);

    // Try finding and clicking the Aviator link with a more generalized selector
    await page.waitForSelector("a.aviator", { timeout: 5000 });
    await page.click("a.aviator");
    console.log("Clicked Aviator game link before login.");
  } catch (error) {
    console.log("Aviator game link not found.");
  }

  // Wait for the username and password fields to appear in the login form
  await page.waitForSelector(
    'form.login-form-new input[type="text"][placeholder="Mobile number"]'
  );
  await page.waitForSelector(
    'form.login-form-new input[type="password"][placeholder="Password"]'
  );

  await delay(2100);

  // Type username and password
  await page.type(
    'form.login-form-new input[type="text"][placeholder="Mobile number"]',
    username
  );

  await delay(3100);

  await page.type(
    'form.login-form-new input[type="password"][placeholder="Password"]',
    password
  );

  // Click the login button and wait for navigation

  page.click("form.login-form-new button.login-button"),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    console.log("Clicked the login button.");

  // Wait for 5 seconds before interacting again
  await delay(5000);

  // Click the Aviator link again after login
  try {
    // Wait for the container that includes the Aviator link
    await page.waitForSelector("a.aviator", { timeout: 10000 });

    // Click on the Aviator link
    await page.click("a.aviator");
    console.log("Clicked Aviator game link after login.");
  } catch (error) {
    console.log("Aviator game link not found after login.");
  }
  async function waitForSelectorInFrames(page, selector, timeout = 30000) {
    const startTime = new Date().getTime();
    let currentFrame = null;
    let frameFound = false;

    while (new Date().getTime() - startTime < timeout) {
      for (const frame of page.frames()) {
        try {
          await frame.waitForSelector(selector, { timeout: 1000 });
          currentFrame = frame;
          frameFound = true;
          break;
        } catch (error) {
          // Ignore the error and continue searching
        }
      }

      if (frameFound) break;

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    if (!frameFound) {
      throw new Error(`Selector "${selector}" not found in any frame.`);
    }

    return currentFrame;
  }

  let previousAppBubbleValue = null;
  let isBetting = false;

  const logLatestAppBubbleValue = async () => {
    try {
      if (isBetting) return;

      const frame = await waitForSelectorInFrames(
        page,
        ".payouts-wrapper .bubble-multiplier"
      );

      const appBubbleValue = await frame.evaluate(() => {
        const bubbleMultipliers = document.querySelectorAll(
          ".payouts-wrapper .bubble-multiplier"
        );
        const latestBubbleMultiplier = bubbleMultipliers[0];
        const value = latestBubbleMultiplier
          ? latestBubbleMultiplier.textContent.trim()
          : null;
        return value ? parseFloat(value.slice(0, -1)) : null;
      });

      console.log("Latest data win:", appBubbleValue);

      if (appBubbleValue >= 1.0 && appBubbleValue !== previousAppBubbleValue) {
        previousAppBubbleValue = appBubbleValue;
        isBetting = true;

        console.log("Placing a bet...");

        const bet = await getNextBet();

        const betAmount = bet.amount; // Set amount as a string for page.type()
        const betOdds = bet.odds;

        try {
          // Wait for the amount input field to be visible
          await page.waitForSelector("div.input > input.font-weight-bold");

          // Focus on the input field by clicking on it
          const amountInput = await page.$(
            "div.input > input.font-weight-bold"
          );
          await amountInput.click();

          // Clear the input field using multiple approaches
          // Step 1: Use Ctrl+A and Backspace to clear
          // await page.keyboard.down("Control"); // Use Ctrl+A to select all text
          // await page.keyboard.press("a");
          // await page.keyboard.up("Control");
          // await page.keyboard.press("Backspace"); // Clear the selected text

          // Step 2: Explicitly set the value to an empty string using evaluate
          await page.evaluate(() => {
            const inputField = document.querySelector(
              "div.input > input.font-weight-bold"
            );
            if (inputField) inputField.value = ""; // Clear the input value directly
          });

          // Type the bet amount
          await page.type(
            "div.input > input.font-weight-bold",
            betAmount.toString(),
            {
              delay: 100,
            }
          );
          console.log(`Typed the bet amount: ${betAmount}.`);

          // Click the second "minus" button
          const plusButtons = await page.$$("button.minus.ng-star-inserted");
          console.log("plusButtons length:", plusButtons.length);

          if (plusButtons && plusButtons.length > 1) {
            await plusButtons[1].click(); // Clicks the second minus button
            console.log("Clicked the second minus button.");
          } else {
            console.log("Second minus button not found.");
          }

          // Now target and click the first bet button
          const betButtonFrame = await waitForSelectorInFrames(
            page,
            "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted",
            60000
          );

          await betButtonFrame.evaluate(() => {
            // Get all matching buttons and select the first one
            const betButtons = document.querySelectorAll(
              "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted"
            );

            if (betButtons.length > 0) {
              const firstBetButton = betButtons[0]; // First button in the list
              const secondBetButton = betButtons[1]; // Second button in the list
              const buttonText = firstBetButton.textContent
                .trim()
                .toLowerCase();
              const secondButtonText = secondBetButton.textContent
                .trim()
                .toLowerCase();

              if (buttonText !== "cancel" && secondButtonText !== "cancel") {
                firstBetButton.click();
                console.log("Bet placed successfully on the first button!");
              } else {
                console.log("Already Betting");
              }
            } else {
              console.log("Bet button not found.");
            }
          });
        } catch (error) {
          console.log(
            "Failed to set the bet amount or place the bet:",
            error.message
          );
        }

        console.log("Waiting for round start...");

        // Wait for round start
        await page.waitForSelector("div.btn-tooltip.ng-star-inserted", {
          hidden: true,
          timeout: 60000,
        });

        console.log("Round started. Checking status for cashout...");

        // Monitor for cashout or failed bet status
        while (isBetting) {
          // Check the visibility of bet and cashout buttons
          const betButtons = await page.$$(
            "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted"
          );
          const cashoutButton = await page.$(
            "div.buttons-block > button.btn.btn-warning.cashout.ng-star-inserted"
          );

          // If more than one bet button is visible, assume a betting failure
          if (betButtons.length > 1) {
            console.log(
              "Multiple bet buttons detected. Bet likely failed. Resetting for next round..."
            );
            isBetting = false; // Reset isBetting to allow a new bet
            return; // Exit the function and start over
          }

          // Proceed with cashout if the cashout button is visible
          if (cashoutButton) {
            console.log("Waiting for cashout time...");

            let maxWaitTime;

            if (betOdds < 1.5) {
              maxWaitTime = betOdds * 2.25 * 1000; // Pre-calculated wait time
            } else if (betOdds >= 1.5 && betOdds < 2.1) {
              maxWaitTime = betOdds * 3.75 * 1000; // Pre-calculated wait time
            } else if (betOdds >= 2.1) {
              maxWaitTime = betOdds * 4.0 * 1000; // Pre-calculated wait time
            }

            const checkInterval = 100; // Time interval (in ms) to check button visibility
            const startTime = Date.now();

            let buttonStillVisible = true;

            while (Date.now() - startTime < maxWaitTime && buttonStillVisible) {
              try {
                // Recheck if the cashout button is still visible
                const cashoutButtonVisible = await page.evaluate(() => {
                  const cashoutBtn = document.querySelector(
                    "div.buttons-block > button.btn.btn-warning.cashout.ng-star-inserted"
                  );
                  return cashoutBtn !== null; // Return true if button is visible
                });

                if (!cashoutButtonVisible) {
                  console.log(
                    "Cashout button disappeared. Bet likely failed. Exiting wait..."
                  );
                  buttonStillVisible = false; // Break the loop
                  break;
                }

                // Small delay before checking again to avoid excessive CPU usage
                await delay(checkInterval);
              } catch (error) {
                console.error(
                  "Error while checking cashout button visibility:",
                  error.message
                );
                break;
              }
            }

            if (buttonStillVisible) {
              try {
                // Cash out as the button is still visible after waiting
                await cashoutButton.click();
                console.log("Cashout successful!");

                // Trigger reset logic for the next bet sequence
                onCashout();
              } catch (error) {
                console.log("Failed to cash out:", error.message);
              }
            } else {
              console.log("Skipping cashout as button is no longer visible.");
            }

            isBetting = false; // Reset isBetting flag
            return; // Exit after processing
          }

          // Delay to avoid excessive CPU usage
          await delay(500);
        }
      } else {
        console.log("No betting opportunity at the moment.");
      }
    } catch (error) {
      console.error(
        "Error while trying to log latest app bubble value:",
        error.message
      );
      isBetting = false; // Reset in case of error
    }
  };

  setInterval(logLatestAppBubbleValue, 3000); // change this time based on your pc performance

  // Wait for 24 hours (86400000 ms)
  await new Promise((resolve) => setTimeout(resolve, 86400000));

  // Add a termination notification
  console.log("Process terminated successfully after 24 hours.");

  // Close the browser
  await browser.close();
})();
