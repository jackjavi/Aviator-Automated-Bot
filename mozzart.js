const puppeteer = require("puppeteer");
const dotenv = require("dotenv");
dotenv.config();

const url = "https://www.mozzartbet.co.ke/en#/";
const username = process.env.MOZZARTUSERNAME;
const password = process.env.MOZZARTPASSWORD;

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  // Increase the navigation timeout to 60 seconds (60000 ms)
  page.setDefaultNavigationTimeout(60000000);

  await page.goto(url);

  // Helper function to wait for a specified duration
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  // Click the Aviator game link before login
  // Wait for the broader container to appear
  try {
    // Ensure the parent container is loaded
    await page.waitForSelector("div.horizontal-holder.dark.vb", {
      timeout: 10000,
    });

    // Adding a delay to ensure the element fully loads
    await sleep(2000);

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

  await sleep(2100);

  // Type username and password
  await page.type(
    'form.login-form-new input[type="text"][placeholder="Mobile number"]',
    username
  );

  await sleep(3100);

  await page.type(
    'form.login-form-new input[type="password"][placeholder="Password"]',
    password
  );

  // Click the login button and wait for navigation

  page.click("form.login-form-new button.login-button"),
    page.waitForNavigation({ waitUntil: "domcontentloaded" }),
    console.log("Clicked the login button.");

  // Wait for 5 seconds before interacting again
  await sleep(5000);

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

  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

        const betAmount = "7.00"; // Set amount as a string for page.type()

        try {
          // Wait for the amount input field to be visible
          await page.waitForSelector("div.input > input.font-weight-bold");

          // Focus on the input field by clicking on it
          const amountInput = await page.$(
            "div.input > input.font-weight-bold"
          );
          await amountInput.click();

          // Clear the input field by pressing Backspace repeatedly
          await page.keyboard.down("Control"); // Use Ctrl+A to select all text (works in most environments)
          await page.keyboard.press("a");
          await page.keyboard.up("Control");
          await page.keyboard.press("Backspace"); // Clear the selected text

          // Type the bet amount
          await page.type("div.input > input.font-weight-bold", betAmount, {
            delay: 100,
          });
          console.log(`Typed the bet amount: ${betAmount}.`);

          // Click the second "plus" button
          const plusButtons = await page.$$("button.plus.ng-star-inserted");
          console.log("plusButtons length:", plusButtons.length);

          if (plusButtons && plusButtons.length > 1) {
            await plusButtons[1].click(); // Clicks the second plus button
            console.log("Clicked the second plus button.");
          } else {
            console.log("Second plus button not found.");
          }

          // Now target and click the bet button
          const betButtonFrame = await waitForSelectorInFrames(
            page,
            "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted",
            60000
          );

          await betButtonFrame.evaluate(() => {
            const betButton = document.querySelector(
              "div.buttons-block > button.btn.btn-success.bet.ng-star-inserted"
            );

            if (betButton) {
              const buttonText = betButton.textContent.trim().toLowerCase();
              if (buttonText !== "cancel") {
                betButton.click();
                console.log("Bet placed successfully!");
              } else {
                console.log("Already Betting");
              }
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

            // Wait for 8 seconds before cashout
            await delay(8000);

            // Cash out
            try {
              await cashoutButton.click();
              console.log("Cashout successful!");
            } catch (error) {
              console.error("Error during cashout:", error.message);
            }

            isBetting = false; // Reset isBetting after cashout
            return; // Exit after cashout
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

  setInterval(logLatestAppBubbleValue, 4000);

  // Wait for 24 hours (86400000 ms)
  await new Promise((resolve) => setTimeout(resolve, 86400000));

  // Add a termination notification
  console.log("Process terminated successfully after 24 hours.");

  // Close the browser
  await browser.close();
})();
